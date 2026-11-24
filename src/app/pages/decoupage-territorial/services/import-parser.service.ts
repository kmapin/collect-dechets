import { Injectable } from '@angular/core';
import { TerritorialProfile, TerritorialUnit, ImportRow, ImportStatistics, RowStatus, RowSeverity } from '../models/models';
import { normalizeName, cleanCell, isBlank, TEMPLATE_KEYS } from './import-utils';
import { TerritoryService } from './territory.service';

export interface ParsedRow {
  rowNumber: number;
  values: string[];
  raw: Record<string, string>;
}

export interface AnalysisResult {
  rows: Omit<ImportRow, 'id' | 'import_id' | 'created_at'>[];
  statistics: ImportStatistics;
}

export const TEMPLATE_COLUMNS = ['Région', 'Province', 'Ville', 'Arrondissement', 'Secteur', 'Village', 'Quartier'];

interface MockImport {
  id: string;
  file_name: string;
  country_code: string;
  status: string;
  statistics: ImportStatistics;
  idempotency_key: string;
  uploaded_by: string;
  created_at: string;
  confirmed_at: string | null;
  completed_at: string | null;
  rows: ImportRow[];
}

@Injectable({ providedIn: 'root' })
export class ImportParserService {
  private imports: MockImport[] = [];

  constructor(private territory: TerritoryService) {}

  async parseFile(file: File): Promise<ParsedRow[]> {
    const ext = file.name.toLowerCase().split('.').pop() ?? '';
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      throw new Error('IMPORT_FILE_INVALID: seuls les fichiers .xlsx et .csv sont acceptés.');
    }
    if (ext === 'csv') return this.parseCsv(file);
    return this.parseDelimited(file.name, await file.text(), ',');
  }

  private parseCsv(file: File): Promise<ParsedRow[]> {
    return file.text().then((text) => {
      const delim = this.sniffDelimiter(text);
      return this.parseDelimited(file.name, text, delim);
    });
  }

  private sniffDelimiter(text: string): string {
    const firstLine = text.split(/\r?\n/)[0] ?? '';
    const semi = (firstLine.match(/;/g) ?? []).length;
    const comma = (firstLine.match(/,/g) ?? []).length;
    const tab = (firstLine.match(/\t/g) ?? []).length;
    if (tab > semi && tab > comma) return '\t';
    return semi >= comma ? ';' : ',';
  }

  private parseDelimited(fileName: string, text: string, delimiter: string): ParsedRow[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
    if (lines.length === 0) throw new Error('IMPORT_FILE_INVALID: le fichier est vide.');

    const header = this.splitLine(lines[0], delimiter).map((h) => cleanCell(h).toLowerCase());
    const colIndex: Record<string, number> = {};
    TEMPLATE_COLUMNS.forEach((col, i) => {
      const idx = header.indexOf(col.toLowerCase());
      if (idx >= 0) colIndex[col] = idx;
    });
    for (const required of ['Région', 'Province', 'Ville']) {
      if (!(required in colIndex)) {
        throw new Error(`IMPORT_COLUMN_MISSING: colonne « ${required} » manquante.`);
      }
    }

    const rows: ParsedRow[] = [];
    let rowNumber = 1;
    for (let i = 1; i < lines.length; i++) {
      const cells = this.splitLine(lines[i], delimiter);
      const values = TEMPLATE_COLUMNS.map((col) => {
        const idx = colIndex[col];
        return idx !== undefined ? cleanCell(cells[idx] ?? '') : '';
      });
      if (values.every((v) => isBlank(v))) continue;
      rows.push({ rowNumber, values, raw: {} });
      rowNumber++;
    }
    return rows;
  }

  private splitLine(line: string, delimiter: string): string[] {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (c === delimiter && !inQuotes) {
        out.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
    out.push(cur);
    return out;
  }

  // ===== Analyse =====

  analyze(parsedRows: ParsedRow[], profile: TerritorialProfile, existingUnits: TerritorialUnit[]): AnalysisResult {
    const resultRows: Omit<ImportRow, 'id' | 'import_id' | 'created_at'>[] = [];
    const stats: ImportStatistics = { totalRows: parsedRows.length, created: 0, reused: 0, updated: 0, duplicates: 0, errors: 0, reactivated: 0 };

    const keyOf = (parentId: string | null, typeCode: string, normName: string) => `${parentId ?? 'ROOT'}|${typeCode}|${normName}`;
    const existingMap = new Map<string, TerritorialUnit>();
    for (const u of existingUnits) existingMap.set(keyOf(u.parent_id, u.type_code, u.normalized_name), u);
    const inFileMap = new Map<string, 'create' | 'existing'>();

    for (const parsed of parsedRows) {
      const parts = this.buildPathParts(parsed);
      if (parts.length === 0) {
        resultRows.push(this.errRow(parsed.rowNumber, 'Ligne vide : au moins Région, Province et Ville sont obligatoires.'));
        stats.errors++;
        continue;
      }
      if (isBlank(parsed.values[2])) {
        resultRows.push(this.errRow(parsed.rowNumber, 'La colonne « Ville » est obligatoire et ne peut pas être vide.'));
        stats.errors++;
        continue;
      }

      const validation = this.validateLine(parts, profile);
      if (!validation.ok) {
        resultRows.push({
          row_number: parsed.rowNumber,
          path: parts.map((p) => p.name).join(' / '),
          type_code: parts[parts.length - 1].typeCode,
          name: parts[parts.length - 1].name,
          status: 'ERROR',
          parent_path: parts.slice(0, -1).map((p) => p.name).join(' / ') || null,
          message: validation.message,
          severity: 'error',
        });
        stats.errors++;
        continue;
      }

      let parentId: string | null = null;
      let leafStatus: RowStatus = 'CREATE';
      let leafMessage = '';
      let leafSeverity: RowSeverity = 'ok';

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLeaf = i === parts.length - 1;
        const key = keyOf(parentId, part.typeCode, part.normName);
        const existing = existingMap.get(key);
        const inFile = inFileMap.get(key);

        if (existing) {
          if (isLeaf) {
            if (inFile) {
              leafStatus = 'DUPLICATE_IN_FILE';
              leafMessage = 'Répétition dans le fichier — l\'unité existante sera réutilisée.';
              leafSeverity = 'warning';
              stats.duplicates++;
            } else if (!existing.active) {
              leafStatus = 'REACTIVATE';
              leafMessage = 'Unité inactive retrouvée — réactivation proposée.';
              leafSeverity = 'warning';
              stats.reactivated++;
            } else {
              leafStatus = 'REUSE';
              leafMessage = 'Existe déjà — l\'unité sera réutilisée (aucun renommage).';
              leafSeverity = 'ok';
              stats.reused++;
            }
          }
          inFileMap.set(key, 'existing');
          parentId = existing.id;
        } else if (inFile) {
          if (isLeaf) {
            leafStatus = 'DUPLICATE_IN_FILE';
            leafMessage = 'Répétition dans le fichier — une seule unité sera créée.';
            leafSeverity = 'warning';
            stats.duplicates++;
          }
        } else {
          if (isLeaf) {
            leafStatus = 'CREATE';
            leafMessage = 'À créer';
            leafSeverity = 'ok';
            stats.created++;
          }
          inFileMap.set(key, 'create');
        }
      }

      resultRows.push({
        row_number: parsed.rowNumber,
        path: parts.map((p) => p.name).join(' / '),
        type_code: parts[parts.length - 1].typeCode,
        name: parts[parts.length - 1].name,
        status: leafStatus,
        parent_path: parts.slice(0, -1).map((p) => p.name).join(' / ') || null,
        message: leafMessage,
        severity: leafSeverity,
      });
    }

    return { rows: resultRows, statistics: stats };
  }

  private errRow(rowNumber: number, message: string) {
    return {
      row_number: rowNumber,
      path: '',
      type_code: null,
      name: null,
      status: 'ERROR' as RowStatus,
      parent_path: null,
      message,
      severity: 'error' as RowSeverity,
    };
  }

  private buildPathParts(parsed: ParsedRow): { typeCode: string; name: string; normName: string }[] {
    const map = ['REGION', 'PROVINCE', 'CITY', 'ARRONDISSEMENT', 'SECTOR', 'VILLAGE', 'NEIGHBORHOOD'];
    const parts: { typeCode: string; name: string; normName: string }[] = [];
    for (let i = 0; i < TEMPLATE_COLUMNS.length; i++) {
      const val = cleanCell(parsed.values[i]);
      if (isBlank(val)) continue;
      parts.push({ typeCode: map[i], name: val, normName: normalizeName(val) });
    }
    return parts;
  }

  private validateLine(
    parts: { typeCode: string; name: string; normName: string }[],
    profile: TerritorialProfile
  ): { ok: boolean; message: string } {
    for (let i = 0; i < parts.length - 1; i++) {
      const parent = parts[i].typeCode;
      const child = parts[i + 1].typeCode;
      const allowed = profile.allowed_relations.some((r) => r.parent === parent && r.child === child);
      if (!allowed) {
        const pl = profile.types.find((t) => t.code === parent)?.label ?? parent;
        const cl = profile.types.find((t) => t.code === child)?.label ?? child;
        return { ok: false, message: `Relation interdite : ${pl} → ${cl}. Le profil territorial n'autorise pas ce rattachement.` };
      }
    }
    return { ok: true, message: '' };
  }

  // ===== Cycle de vie des imports (mock en mémoire) =====

  async createImport(fileName: string, countryCode: string): Promise<MockImport> {
    const imp: MockImport = {
      id: `imp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file_name: fileName,
      country_code: countryCode,
      status: 'VALIDATED',
      statistics: { totalRows: 0, created: 0, reused: 0, updated: 0, duplicates: 0, errors: 0, reactivated: 0 },
      idempotency_key: `${Date.now()}-mock`,
      uploaded_by: 'Administrateur',
      created_at: new Date().toISOString(),
      confirmed_at: null,
      completed_at: null,
      rows: [],
    };
    this.imports.unshift(imp);
    return imp;
  }

  saveImportRows(importId: string, rows: Omit<ImportRow, 'id' | 'import_id' | 'created_at'>[]) {
    const imp = this.imports.find((i) => i.id === importId);
    if (!imp) return;
    imp.rows = rows.map((r, i) => ({
      ...r,
      id: `row-${importId}-${i}`,
      import_id: importId,
      created_at: new Date().toISOString(),
    }));
  }

  getImportRows(importId: string): ImportRow[] {
    return this.imports.find((i) => i.id === importId)?.rows ?? [];
  }

  getImport(id: string): MockImport | null {
    return this.imports.find((i) => i.id === id) ?? null;
  }

  listImports(): MockImport[] {
    return [...this.imports];
  }

  cancelImport(id: string): void {
    const imp = this.imports.find((i) => i.id === id);
    if (!imp) return;
    if (imp.status === 'COMPLETED') throw new Error('Un import terminé ne peut pas être annulé.');
    imp.status = 'CANCELLED';
  }

  // ===== Confirmation =====

  confirmImport(importId: string): { created: number; reused: number; reactivated: number; errors: number } {
    const imp = this.imports.find((i) => i.id === importId);
    if (!imp) throw new Error('Import introuvable.');
    if (imp.status === 'COMPLETED') throw new Error('IMPORT_ALREADY_CONFIRMED');
    if (imp.status !== 'VALIDATED') throw new Error('L\'import doit être validé avant confirmation.');

    imp.status = 'COMMITTING';

    const rows = imp.rows;
    const profile = this.territory.getProfile(imp.country_code);
    if (!profile) throw new Error('Profil territorial introuvable.');

    const keyOf = (parentId: string | null, t: string, n: string) => `${parentId ?? 'ROOT'}|${t}|${n}`;
    const existing = new Map<string, TerritorialUnit>();
    for (const u of this.territory.listUnits({ pageSize: 100000 }).data) {
      existing.set(keyOf(u.parent_id, u.type_code, u.normalized_name), u);
    }
    const inFileCreated = new Map<string, TerritorialUnit>();

    let created = 0, reused = 0, reactivated = 0, errors = 0;

    for (const row of rows) {
      if (row.severity === 'error') { errors++; continue; }
      if (row.status !== 'CREATE' && row.status !== 'REACTIVATE') {
        if (row.status === 'REUSE') reused++;
        continue;
      }
      const parts = (row.path ?? '').split(' / ').map((s) => s.trim()).filter(Boolean);
      let parentId: string | null = null;

      for (let i = 0; i < parts.length; i++) {
        const name = parts[i];
        const typeCode = this.typeAtPosition(profile, i, parts.length, row.type_code);
        const norm = normalizeName(name);
        const key = keyOf(parentId, typeCode, norm);
        const isLeaf = i === parts.length - 1;

        let unit = existing.get(key) ?? inFileCreated.get(key);
        if (unit) {
          if (isLeaf && row.status === 'REACTIVATE' && !unit.active) {
            this.territory.setUnitActive(unit.id, true);
            reactivated++;
          } else if (isLeaf) {
            reused++;
          }
          parentId = unit.id;
        } else {
          unit = this.territory.createUnit({
            countryCode: imp.country_code,
            typeCode,
            name,
            parentId,
            createdBy: 'import',
          });
          inFileCreated.set(key, unit);
          existing.set(key, unit);
          if (isLeaf) created++;
          parentId = unit.id;
        }
      }
    }

    imp.statistics = { ...imp.statistics, created, reused, reactivated, errors };
    imp.status = 'COMPLETED';
    imp.confirmed_at = new Date().toISOString();
    imp.completed_at = imp.confirmed_at;

    this.territory.logAudit('IMPORT_CONFIRM', 'territorial_imports', importId, imp.file_name, imp.statistics);
    return { created, reused, reactivated, errors };
  }

  private typeAtPosition(profile: TerritorialProfile, position: number, total: number, leafType: string | null): string {
    const types = [...profile.types].filter((t) => t.code !== 'COUNTRY').sort((a, b) => a.order - b.order);
    if (position === total - 1 && leafType) return leafType;
    return types[Math.min(position, types.length - 1)]?.code ?? 'SECTOR';
  }

  // ===== Téléchargements =====

  async generateTemplate(profile: TerritorialProfile): Promise<Blob> {
    const sep = '\t';
    const lines: string[] = [];
    lines.push(TEMPLATE_COLUMNS.join(sep));
    lines.push(['Région A', 'Province A', 'Ville X', 'Arrondissement 1', 'Secteur 1', '', ''].join(sep));
    lines.push(['Région A', 'Province A', 'Ville X', 'Arrondissement 1', 'Secteur 2', '', ''].join(sep));
    lines.push(['Région A', 'Province A', 'Ville X', 'Arrondissement 2', 'Secteur 3', '', ''].join(sep));
    lines.push(['Région A', 'Province B', 'Ville Y', '', '', 'Village 1', ''].join(sep));
    lines.push(['Région A', 'Province B', 'Ville Y', '', '', 'Village 2', ''].join(sep));

    const instructions = [
      'INSTRUCTIONS POUR LE REMPLISSAGE',
      '',
      '1. Colonnes obligatoires : Région, Province et Ville.',
      '2. Colonnes facultatives : Arrondissement, Secteur, Village et Quartier peuvent être vides.',
      '3. Une cellule vide signifie que ce niveau n\'est pas renseigné pour la ligne.',
      '4. Ne pas inventer d\'arrondissement pour compléter une ligne.',
      '5. Conserver les noms tels que fournis (la comparaison ignore la casse et les accents).',
      '6. Plusieurs lignes peuvent partager la même région, province et ville.',
      '7. Les doublons sont détectés par type + parent + nom normalisé.',
      '',
      'EXEMPLE',
      'Région A / Province A / Ville X / Arrondissement 1 / Secteur 1',
      'Région A / Province B / Ville Y / Village 1 (sans arrondissement)',
    ].join('\n');

    const content = lines.join('\n') + '\n\n' + instructions;
    return new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8' });
  }

  async generateReport(rows: ImportRow[], stats: ImportStatistics, fileName: string): Promise<Blob> {
    const sep = '\t';
    const out: string[] = [];
    out.push('RAPPORT D\'IMPORTATION');
    out.push(['Fichier', fileName].join(sep));
    out.push(['Date', new Date().toLocaleString('fr-FR')].join(sep));
    out.push('');
    out.push(['Indicateur', 'Valeur'].join(sep));
    out.push(['Lignes analysées', stats.totalRows].join(sep));
    out.push(['Unités créées', stats.created].join(sep));
    out.push(['Unités réutilisées', stats.reused].join(sep));
    out.push(['Unités réactivées', stats.reactivated].join(sep));
    out.push(['Doublons détectés', stats.duplicates].join(sep));
    out.push(['Lignes rejetées', stats.errors].join(sep));
    out.push('');
    out.push(['Ligne', 'Chemin', 'Type', 'Nom', 'Statut', 'Sévérité', 'Message'].join(sep));
    for (const r of rows) {
      out.push([r.row_number, r.path ?? '', r.type_code ?? '', r.name ?? '', r.status ?? '', r.severity, r.message ?? ''].join(sep));
    }
    return new Blob(['\ufeff' + out.join('\n')], { type: 'text/csv;charset=utf-8' });
  }

  downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
