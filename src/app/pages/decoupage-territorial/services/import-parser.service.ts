import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Country, City, Arrondissement, Sector, Quartier } from '../../../models/countries-org.model';
import { ImportRow, ImportStatistics, RowSeverity, RowStatus, TerritorialUnit } from '../models/models';
import { normalizeName } from './territorial-utils';
import { TerritoryHttpService } from '../../../services/territory-http.service';
import { API_UNIT_TYPE_CODES, TerritoryService } from './territory.service';

export interface ParsedRow {
  rowNumber: number;
  values: string[];
  raw: Record<string, string>;
}

export type ImportPreviewRow = Omit<ImportRow, 'id' | 'import_id' | 'created_at'>;
type ImportUnitType = typeof API_UNIT_TYPE_CODES[number];

export interface ImportNode {
  key: string;
  typeCode: ImportUnitType;
  name: string;
  parentType: ImportUnitType | null;
  parentKey: string | null;
  latitude?: number;
  longitude?: number;
}

export interface ImportRecord {
  rowNumber: number;
  path: string;
  nodes: ImportNode[];
}

export interface AnalysisResult {
  rows: ImportPreviewRow[];
  records: ImportRecord[];
  statistics: ImportStatistics;
}

export interface ImportExecutionResult {
  created: number;
  reused: number;
  errors: number;
  retryableErrors: number;
  duplicates: number;
  verified: boolean;
  verificationError: string | null;
  rows: ImportPreviewRow[];
}

interface ImportAttempt {
  id: string | null;
  retryAllowed: boolean;
}

export interface ImportDraft {
  id: string;
  fileName: string;
  rows: ImportPreviewRow[];
  records: ImportRecord[];
  statistics: ImportStatistics;
  attemptedNodes?: Record<string, ImportAttempt>;
  result?: ImportExecutionResult;
}

interface CsvRecord {
  lineNumber: number;
  cells: string[];
}

const CSV_COLUMNS = ['Pays', 'Ville', 'Arrondissement', 'Secteur', 'Quartier', 'Latitude', 'Longitude'];
const COLUMN_INDEX = {
  country: 0,
  city: 1,
  arrondissement: 2,
  sector: 3,
  neighborhood: 4,
  latitude: 5,
  longitude: 6,
} as const;
const ALLOWED_PARENT_TYPES: Record<ImportUnitType, readonly ImportUnitType[]> = {
  COUNTRY: [],
  CITY: ['COUNTRY'],
  ARRONDISSEMENT: ['CITY'],
  SECTOR: ['CITY', 'ARRONDISSEMENT'],
  NEIGHBORHOOD: ['CITY', 'ARRONDISSEMENT', 'SECTOR'],
};
const DRAFT_STORAGE_PREFIX = 'territorial-import-draft:';

@Injectable({ providedIn: 'root' })
export class ImportParserService {
  constructor(
    private readonly api: TerritoryHttpService,
    private readonly territory: TerritoryService,
  ) {}

  async parseFile(file: File): Promise<ParsedRow[]> {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      throw new Error('IMPORT_FILE_INVALID: seuls les fichiers CSV (.csv) sont acceptés.');
    }

    let text: string;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
    } catch {
      throw new Error('IMPORT_FILE_ENCODING: le fichier doit être encodé en UTF-8.');
    }
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    if (!text.trim()) throw new Error('IMPORT_FILE_INVALID: le fichier est vide.');

    const delimiter = this.sniffDelimiter(text);
    const records = this.parseCsvText(text, delimiter);
    const header = records.shift();
    if (!header) throw new Error('IMPORT_FILE_INVALID: le fichier est vide.');

    const normalizedHeaders = header.cells.map((cell) => normalizeName(cell.trim()));
    const columnIndexes = new Map<string, number>();
    for (const column of CSV_COLUMNS) {
      const index = normalizedHeaders.indexOf(normalizeName(column));
      if (index >= 0) columnIndexes.set(column, index);
    }
    for (const required of ['Pays', 'Ville']) {
      if (!columnIndexes.has(required)) {
        throw new Error(`IMPORT_COLUMN_MISSING: colonne « ${required} » manquante.`);
      }
    }

    const rows = records
      .filter((record) => record.cells.some((cell) => cell.trim() !== ''))
      .map((record) => ({
        rowNumber: record.lineNumber,
        values: CSV_COLUMNS.map((column) => {
          const index = columnIndexes.get(column);
          return index === undefined ? '' : (record.cells[index] ?? '').trim();
        }),
        raw: {},
      }));
    if (rows.length === 0) {
      throw new Error('IMPORT_FILE_INVALID: le fichier ne contient aucune ligne de données.');
    }
    return rows;
  }

  analyze(parsedRows: ParsedRow[], existingUnits: TerritorialUnit[]): AnalysisResult {
    const existing = this.indexUnits(existingUnits);
    const planned = new Set<string>();
    const reusedInPreview = new Set<string>();
    const seenPaths = new Set<string>();
    const rows: ImportPreviewRow[] = [];
    const records: ImportRecord[] = [];
    const statistics: ImportStatistics = {
      totalRows: parsedRows.length,
      created: 0,
      reused: 0,
      duplicates: 0,
      errors: 0,
    };

    for (const parsed of parsedRows) {
      const country = parsed.values[COLUMN_INDEX.country]?.trim() ?? '';
      const city = parsed.values[COLUMN_INDEX.city]?.trim() ?? '';
      const arrondissement = parsed.values[COLUMN_INDEX.arrondissement]?.trim() ?? '';
      const sector = parsed.values[COLUMN_INDEX.sector]?.trim() ?? '';
      const neighborhood = parsed.values[COLUMN_INDEX.neighborhood]?.trim() ?? '';
      const latitudeText = parsed.values[COLUMN_INDEX.latitude]?.trim() ?? '';
      const longitudeText = parsed.values[COLUMN_INDEX.longitude]?.trim() ?? '';

      const invalid = this.validateRow({
        country,
        city,
        arrondissement,
        sector,
        neighborhood,
        latitudeText,
        longitudeText,
      });
      if (invalid) {
        rows.push(this.errorRow(parsed.rowNumber, invalid));
        statistics.errors++;
        continue;
      }

      const coordinates = latitudeText && longitudeText
        ? { latitude: Number(latitudeText), longitude: Number(longitudeText) }
        : undefined;
      const nodes = this.buildNodes({
        country,
        city,
        arrondissement,
        sector,
        neighborhood,
        coordinates,
      });
      const relationError = this.validateRelations(nodes);
      if (relationError) {
        rows.push(this.errorRow(parsed.rowNumber, relationError, nodes));
        statistics.errors++;
        continue;
      }

      const leaf = nodes[nodes.length - 1];
      const duplicateInFile = seenPaths.has(leaf.key);
      const leafWasKnown = existing.has(leaf.key) || planned.has(leaf.key);
      if (leaf.typeCode === 'NEIGHBORHOOD' && !coordinates && !leafWasKnown) {
        rows.push(this.errorRow(parsed.rowNumber, 'Un quartier à créer doit avoir une latitude et une longitude.', nodes));
        statistics.errors++;
        continue;
      }
      seenPaths.add(leaf.key);
      if (duplicateInFile) statistics.duplicates++;

      for (const node of nodes) {
        if (existing.has(node.key)) {
          reusedInPreview.add(node.key);
        } else if (!planned.has(node.key)) {
          planned.add(node.key);
          statistics.created++;
        }
      }

      records.push({
        rowNumber: parsed.rowNumber,
        path: nodes.map((node) => node.name).join(' / '),
        nodes,
      });
      rows.push({
        row_number: parsed.rowNumber,
        path: nodes.map((node) => node.name).join(' / '),
        type_code: leaf.typeCode,
        name: leaf.name,
        status: duplicateInFile ? 'DUPLICATE_IN_FILE' : existing.has(leaf.key) ? 'REUSE' : 'CREATE',
        parent_path: nodes.slice(0, -1).map((node) => node.name).join(' / ') || null,
        message: duplicateInFile
          ? 'Chemin répété dans le fichier; la même unité ne sera créée qu’une fois.'
          : existing.has(leaf.key)
            ? 'Unité existante; elle sera conservée sans modification.'
            : 'À créer dans le référentiel via l’API.',
        severity: duplicateInFile ? 'warning' : 'ok',
      });
    }

    statistics.reused = reusedInPreview.size;
    return { rows, records, statistics };
  }

  saveDraft(draft: ImportDraft): void {
    sessionStorage.setItem(`${DRAFT_STORAGE_PREFIX}${draft.id}`, JSON.stringify(draft));
  }

  getDraft(id: string): ImportDraft | null {
    const stored = sessionStorage.getItem(`${DRAFT_STORAGE_PREFIX}${id}`);
    if (!stored) return null;
    try {
      return JSON.parse(stored) as ImportDraft;
    } catch {
      sessionStorage.removeItem(`${DRAFT_STORAGE_PREFIX}${id}`);
      return null;
    }
  }

  removeDraft(id: string): void {
    sessionStorage.removeItem(`${DRAFT_STORAGE_PREFIX}${id}`);
  }

  async confirmImport(draftId: string): Promise<ImportExecutionResult> {
    const draft = this.getDraft(draftId);
    if (!draft) throw new Error('L’aperçu de cet import a expiré. Veuillez sélectionner et analyser le CSV à nouveau.');
    if (draft.result?.verified && draft.result.retryableErrors === 0) return draft.result;
    if (draft.records.length === 0) throw new Error('Aucune ligne valide à envoyer à l’API.');

    this.restoreAttemptState(draft);
    await this.territory.loadApiUnits();
    const initialIndex = this.indexUnits(this.territory.getApiUnits());
    const createdIds = new Map<string, string>();
    const failedKeys = new Map<string, string>();
    const reusedKeys = new Set<string>();

    for (const record of draft.records) {
      let parentId: string | null = null;
      for (const node of record.nodes) {
        const existing = initialIndex.get(node.key);
        if (existing) {
          const previousAttempt = draft.attemptedNodes?.[node.key];
          if (previousAttempt?.id === existing.id) createdIds.set(node.key, existing.id);
          else if (previousAttempt) reusedKeys.add(node.key);
          parentId = existing.id;
          continue;
        }
        const createdId = createdIds.get(node.key);
        if (createdId) {
          parentId = createdId;
          continue;
        }
        const previousError = failedKeys.get(node.key);
        if (previousError) {
          failedKeys.set(`row:${record.rowNumber}`, `Dépendance non créée : ${previousError}`);
          break;
        }
        const previousAttempt = draft.attemptedNodes?.[node.key];
        if (previousAttempt && !previousAttempt.retryAllowed) {
          const message = 'Une tentative précédente n’a pas pu être confirmée. Aucune nouvelle écriture ne sera envoyée pour éviter un doublon; relancez la vérification du référentiel.';
          failedKeys.set(node.key, message);
          failedKeys.set(`row:${record.rowNumber}`, message);
          break;
        }

        const attempt: ImportAttempt = { id: null, retryAllowed: false };
        draft.attemptedNodes ??= {};
        draft.attemptedNodes[node.key] = attempt;
        this.saveDraft(draft);
        try {
          const created = await this.createNode(node, parentId);
          if (!created.id) throw new Error('L’API n’a pas retourné l’identifiant de l’unité créée.');
          createdIds.set(node.key, created.id);
          attempt.id = created.id;
          parentId = created.id;
        } catch (error: unknown) {
          const message = this.apiErrorMessage(error);
          attempt.retryAllowed = this.isDefinitiveApiRejection(error);
          failedKeys.set(node.key, message);
          failedKeys.set(`row:${record.rowNumber}`, message);
          this.saveDraft(draft);
          break;
        }
        this.saveDraft(draft);
      }
    }

    let verifiedUnits: TerritorialUnit[];
    try {
      verifiedUnits = await this.territory.loadApiUnits();
    } catch (error: unknown) {
      const message = this.apiErrorMessage(error);
      const rows = this.applyExecutionErrors(
        draft.rows,
        draft.records,
        new Map(draft.records.map((record) => [
          `row:${record.rowNumber}`,
          failedKeys.get(`row:${record.rowNumber}`) ?? `Écriture envoyée, mais impossible de vérifier sa présence dans le référentiel : ${message}`,
        ])),
      );
      const result: ImportExecutionResult = {
        created: 0,
        reused: 0,
        errors: rows.filter((row) => row.severity === 'error').length,
        retryableErrors: draft.records.length,
        duplicates: draft.statistics.duplicates,
        verified: false,
        verificationError: `Rechargement du référentiel impossible : ${message}`,
        rows,
      };
      draft.result = result;
      this.saveDraft(draft);
      return result;
    }

    const finalIndex = this.indexUnits(verifiedUnits);
    const persistedCreated = new Set<string>();
    const rowErrors = new Map<string, string>();
    for (const record of draft.records) {
      for (const node of record.nodes) {
        if (initialIndex.has(node.key)) reusedKeys.add(node.key);
      }
    }

    for (const [key, id] of createdIds) {
      const unit = finalIndex.get(key);
      if (unit?.id === id) persistedCreated.add(key);
      else failedKeys.set(key, 'L’unité créée n’a pas été retrouvée après rechargement depuis l’API.');
    }
    for (const key of failedKeys.keys()) {
      if (key.startsWith('row:')) continue;
      if (finalIndex.has(key)) {
        reusedKeys.add(key);
      }
    }

    for (const record of draft.records) {
      const recordedError = failedKeys.get(`row:${record.rowNumber}`);
      if (recordedError) {
        const unresolved = record.nodes.find((node) => !finalIndex.has(node.key));
        if (unresolved) rowErrors.set(`row:${record.rowNumber}`, recordedError);
      }
      const missing = record.nodes.find((node) => !finalIndex.has(node.key));
      if (missing && !rowErrors.has(`row:${record.rowNumber}`)) {
        rowErrors.set(`row:${record.rowNumber}`, failedKeys.get(missing.key)
          ?? 'Une unité du chemin n’a pas été confirmée par le référentiel après rechargement.');
      }
    }

    const rows = this.applyExecutionStatuses(
      draft.rows,
      draft.records,
      rowErrors,
      initialIndex,
      finalIndex,
    );
    const result: ImportExecutionResult = {
      created: persistedCreated.size,
      reused: reusedKeys.size,
      errors: rows.filter((row) => row.severity === 'error').length,
      retryableErrors: rowErrors.size,
      duplicates: draft.statistics.duplicates,
      verified: true,
      verificationError: null,
      rows,
    };
    draft.result = result;
    this.saveDraft(draft);
    return result;
  }

  async generateTemplate(): Promise<Blob> {
    return new Blob(['\ufeff' + CSV_COLUMNS.join(';') + '\r\n'], { type: 'text/csv;charset=utf-8' });
  }

  async generateReport(rows: ImportPreviewRow[], stats: ImportStatistics, fileName: string): Promise<Blob> {
    const output = [
      ['Fichier', fileName],
      ['Lignes analysées', stats.totalRows],
      ['Unités créées et vérifiées', stats.created],
      ['Unités réutilisées', stats.reused],
      ['Doublons dans le fichier', stats.duplicates],
      ['Lignes en erreur', stats.errors],
      [],
      ['Ligne', 'Chemin', 'Type', 'Nom', 'Statut', 'Sévérité', 'Message'],
      ...rows.map((row) => [
        row.row_number,
        row.path ?? '',
        row.type_code ?? '',
        row.name ?? '',
        row.status ?? '',
        row.severity,
        row.message ?? '',
      ]),
    ].map((line) => line.map((value) => this.escapeCsv(String(value))).join(';'));
    return new Blob(['\ufeff' + output.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  }

  downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  private validateRow(input: {
    country: string;
    city: string;
    arrondissement: string;
    sector: string;
    neighborhood: string;
    latitudeText: string;
    longitudeText: string;
  }): string | null {
    if (!input.country) return 'La colonne « Pays » est obligatoire.';
    if (!input.city) {
      if (input.arrondissement || input.sector || input.neighborhood) {
        return 'Relation territoriale invalide : une subdivision doit être rattachée à une Ville.';
      }
      return 'La colonne « Ville » est obligatoire.';
    }
    if ((input.latitudeText && !input.longitudeText) || (!input.latitudeText && input.longitudeText)) {
      return 'Latitude et longitude doivent être renseignées ensemble.';
    }
    if ((input.latitudeText || input.longitudeText) && !input.neighborhood) {
      return 'Les coordonnées du fichier s’appliquent à un Quartier; renseignez aussi la colonne « Quartier ».';
    }
    if (input.latitudeText && input.longitudeText) {
      const latitude = Number(input.latitudeText);
      const longitude = Number(input.longitudeText);
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
        return 'La latitude doit être un nombre compris entre -90 et 90.';
      }
      if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        return 'La longitude doit être un nombre compris entre -180 et 180.';
      }
    }
    return null;
  }

  private buildNodes(input: {
    country: string;
    city: string;
    arrondissement: string;
    sector: string;
    neighborhood: string;
    coordinates?: { latitude: number; longitude: number };
  }): ImportNode[] {
    const nodes: ImportNode[] = [];
    const append = (typeCode: ImportUnitType, name: string, parentType: ImportUnitType | null) => {
      const parentKey = nodes.length ? nodes[nodes.length - 1].key : null;
      const key = this.nodeKey(parentKey, typeCode, name);
      nodes.push({
        key,
        typeCode,
        name,
        parentType,
        parentKey,
        ...(typeCode === 'NEIGHBORHOOD' && input.coordinates ? input.coordinates : {}),
      });
    };

    append('COUNTRY', input.country, null);
    append('CITY', input.city, 'COUNTRY');
    if (input.arrondissement) append('ARRONDISSEMENT', input.arrondissement, 'CITY');
    if (input.sector) append('SECTOR', input.sector, input.arrondissement ? 'ARRONDISSEMENT' : 'CITY');
    if (input.neighborhood) {
      const parentType = input.sector
        ? 'SECTOR'
        : input.arrondissement
          ? 'ARRONDISSEMENT'
          : 'CITY';
      append('NEIGHBORHOOD', input.neighborhood, parentType);
    }
    return nodes;
  }

  private validateRelations(nodes: ImportNode[]): string | null {
    for (const node of nodes) {
      if (node.parentType && !ALLOWED_PARENT_TYPES[node.typeCode].includes(node.parentType)) {
        return `Relation territoriale invalide : ${node.parentType} → ${node.typeCode} n’est pas prise en charge par les champs de relation du backend.`;
      }
    }
    return null;
  }

  private indexUnits(units: TerritorialUnit[]): Map<string, TerritorialUnit> {
    const result = new Map<string, TerritorialUnit>();
    const keyById = new Map<string, string>();
    const ordered = [...units].sort((a, b) => a.depth - b.depth);
    for (const unit of ordered) {
      const parentKey = unit.parent_id
        ? keyById.get(unit.parent_id) ?? `missing-parent:${unit.parent_id}`
        : null;
      const key = this.nodeKey(parentKey, unit.type_code as ImportUnitType, unit.name);
      keyById.set(unit.id, key);
      result.set(key, unit);
    }
    return result;
  }

  private nodeKey(parentKey: string | null, typeCode: string, name: string): string {
    return `${parentKey ?? 'ROOT'}|${typeCode}|${normalizeName(name)}`;
  }

  private restoreAttemptState(draft: ImportDraft): void {
    if (!draft.attemptedNodes) draft.attemptedNodes = {};
    if (!draft.result || (draft.result.verified && draft.result.retryableErrors === 0)) return;

    const erroredRows = new Set(
      draft.result.rows
        .filter((row) => row.status === 'ERROR')
        .map((row) => row.row_number),
    );
    for (const record of draft.records) {
      if (!erroredRows.has(record.rowNumber)) continue;
      for (const node of record.nodes) {
        draft.attemptedNodes[node.key] ??= { id: null, retryAllowed: false };
      }
    }
    this.saveDraft(draft);
  }

  private isDefinitiveApiRejection(error: unknown): boolean {
    return error instanceof HttpErrorResponse
      && error.status >= 400
      && error.status < 500
      && ![408, 409, 425, 429].includes(error.status);
  }

  private async createNode(node: ImportNode, parentId: string | null): Promise<Country | City | Arrondissement | Sector | Quartier> {
    switch (node.typeCode) {
      case 'COUNTRY':
        return firstValueFrom(this.api.createCountry({ name: node.name }));
      case 'CITY':
        if (!parentId || node.parentType !== 'COUNTRY') throw new Error('Pays parent introuvable pour la Ville.');
        return firstValueFrom(this.api.createCity({ name: node.name, countryId: parentId }));
      case 'ARRONDISSEMENT':
        if (!parentId || node.parentType !== 'CITY') throw new Error('Ville parente introuvable pour l’Arrondissement.');
        return firstValueFrom(this.api.createArrondissement({ name: node.name, cityId: parentId }));
      case 'SECTOR':
        if (!parentId) throw new Error('Unité parente introuvable pour le Secteur.');
        return firstValueFrom(this.api.createSector({
          name: node.name,
          ...(node.parentType === 'ARRONDISSEMENT' ? { arrondissementId: parentId } : { cityId: parentId }),
        }));
      case 'NEIGHBORHOOD':
        if (!parentId) throw new Error('Unité parente introuvable pour le Quartier.');
        if (node.latitude === undefined || node.longitude === undefined) {
          throw new Error('Un Quartier à créer doit avoir une latitude et une longitude.');
        }
        return firstValueFrom(this.api.createNeighborhood({
          name: node.name,
          ...(node.parentType === 'SECTOR' ? { sectorId: parentId } : {}),
          ...(node.parentType === 'ARRONDISSEMENT' ? { arrondissementId: parentId } : {}),
          ...(node.parentType === 'CITY' ? { cityId: parentId } : {}),
          latitude: node.latitude,
          longitude: node.longitude,
        }));
    }
  }

  private applyExecutionErrors(
    rows: ImportPreviewRow[],
    records: ImportRecord[],
    errors: Map<string, string>,
  ): ImportPreviewRow[] {
    const validRowNumbers = new Set(records.map((record) => record.rowNumber));
    return rows.map((row) => {
      const message = errors.get(`row:${row.row_number}`);
      if (!message || !validRowNumbers.has(row.row_number)) return row;
      return { ...row, status: 'ERROR', severity: 'error', message };
    });
  }

  private applyExecutionStatuses(
    rows: ImportPreviewRow[],
    records: ImportRecord[],
    errors: Map<string, string>,
    initialIndex: Map<string, TerritorialUnit>,
    finalIndex: Map<string, TerritorialUnit>,
  ): ImportPreviewRow[] {
    const recordsByRow = new Map(records.map((record) => [record.rowNumber, record]));
    return rows.map((row) => {
      const error = errors.get(`row:${row.row_number}`);
      if (error) return { ...row, status: 'ERROR', severity: 'error', message: error };

      const record = recordsByRow.get(row.row_number);
      if (!record || row.status === 'DUPLICATE_IN_FILE') return row;
      const leaf = record.nodes[record.nodes.length - 1];
      if (initialIndex.has(leaf.key)) {
        return {
          ...row,
          status: 'REUSE',
          severity: 'ok',
          message: 'Unité existante; elle a été conservée sans modification.',
        };
      }
      if (record.nodes.every((node) => finalIndex.has(node.key))) {
        return {
          ...row,
          status: 'VERIFIED',
          severity: 'ok',
          message: 'Création confirmée après rechargement du référentiel backend.',
        };
      }
      return row;
    });
  }

  private errorRow(rowNumber: number, message: string, nodes: ImportNode[] = []): ImportPreviewRow {
    return {
      row_number: rowNumber,
      path: nodes.map((node) => node.name).join(' / '),
      type_code: nodes[nodes.length - 1]?.typeCode ?? null,
      name: nodes[nodes.length - 1]?.name ?? null,
      status: 'ERROR',
      parent_path: nodes.slice(0, -1).map((node) => node.name).join(' / ') || null,
      message,
      severity: 'error',
    };
  }

  private sniffDelimiter(text: string): string {
    const counts = new Map([[';', 0], [',', 0], ['\t', 0]]);
    let quoted = false;
    for (let index = 0; index < text.length; index++) {
      const character = text[index];
      if (character === '"') {
        if (quoted && text[index + 1] === '"') index++;
        else quoted = !quoted;
      } else if (!quoted && (character === '\r' || character === '\n')) {
        break;
      } else if (!quoted && counts.has(character)) {
        counts.set(character, (counts.get(character) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }

  private parseCsvText(text: string, delimiter: string): CsvRecord[] {
    const records: CsvRecord[] = [];
    let cells: string[] = [];
    let cell = '';
    let quoted = false;
    let line = 1;
    let recordLine = 1;
    let closedQuote = false;
    const endRecord = () => {
      cells.push(cell);
      records.push({ lineNumber: recordLine, cells });
      cells = [];
      cell = '';
      closedQuote = false;
      recordLine = line + 1;
    };

    for (let index = 0; index < text.length; index++) {
      const character = text[index];
      if (quoted) {
        if (character === '"') {
          if (text[index + 1] === '"') {
            cell += '"';
            index++;
          } else {
            quoted = false;
            closedQuote = true;
          }
        } else {
          cell += character;
          if (character === '\n') line++;
        }
        continue;
      }

      if (closedQuote && character !== delimiter && character !== '\r' && character !== '\n' && character !== ' ') {
        throw new Error('IMPORT_FILE_INVALID: guillemet inattendu après un champ CSV cité.');
      }
      if (character === '"' && cell.length === 0 && !closedQuote) {
        quoted = true;
      } else if (character === delimiter) {
        cells.push(cell);
        cell = '';
        closedQuote = false;
      } else if (character === '\r' || character === '\n') {
        if (character === '\r' && text[index + 1] === '\n') index++;
        endRecord();
        line++;
        recordLine = line;
      } else if (!closedQuote) {
        cell += character;
      }
    }

    if (quoted) throw new Error('IMPORT_FILE_INVALID: champ CSV entre guillemets non terminé.');
    if (cell.length > 0 || cells.length > 0 || closedQuote) {
      cells.push(cell);
      records.push({ lineNumber: recordLine, cells });
    }
    return records;
  }

  private escapeCsv(value: string): string {
    return /[;"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  }

  private apiErrorMessage(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const response = (error as { error?: unknown }).error;
      if (typeof response === 'object' && response !== null && 'message' in response) {
        const message = (response as { message?: unknown }).message;
        if (typeof message === 'string') return message;
      }
    }
    return error instanceof Error ? error.message : 'Erreur inconnue retournée par l’API.';
  }
}
