import { Injectable } from '@angular/core';
import { ExportColumn, ExportService } from '../contracts/export.service';

const BOM_UTF8 = '﻿';

// Export/impression 100% client-side (F2/F10/F12) — jamais d'appel serveur. Le format
// serveur (Excel/PDF, spec §1.12) reste TBC et n'est pas simulé ici.
@Injectable()
export class ExportMockService implements ExportService {
  exportToCsv<T extends Record<string, unknown>>(rows: T[], columns: ExportColumn<T>[], filename: string): void {
    // Séparateur `;` + BOM UTF-8 : convention Excel FR (la virgule est le séparateur
    // décimal en fr-FR, donc `,` casserait l'ouverture directe dans Excel).
    const entete = columns.map(c => this._echapper(c.label)).join(';');
    const lignes = rows.map(row => columns.map(c => this._echapper(row[c.key])).join(';'));
    const contenu = [entete, ...lignes].join('\r\n');

    const blob = new Blob([BOM_UTF8 + contenu], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    lien.click();
    URL.revokeObjectURL(url);
  }

  print(): void {
    window.print();
  }

  private _echapper(valeur: unknown): string {
    return `"${String(valeur ?? '').replace(/"/g, '""')}"`;
  }
}
