import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ExportColumn, ExportPdfOptions, ExportService } from '../contracts/export.service';

const BOM_UTF8 = '﻿';

@Injectable()
export class ExportClientService implements ExportService {
  exportToCsv<T extends Record<string, unknown>>(rows: T[], columns: ExportColumn<T>[], filename: string): void {
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

  exportToPdf<T extends Record<string, unknown>>(
    rows: T[],
    columns: ExportColumn<T>[],
    filename: string,
    options: ExportPdfOptions,
  ): void {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.setTextColor(31, 41, 55);
    doc.text(options.titre, 14, 18);

    let startY = 24;
    if (options.sousTitre) {
      const lignes = Array.isArray(options.sousTitre) ? options.sousTitre : [options.sousTitre];
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      lignes.forEach((ligne, i) => doc.text(ligne, 14, 26 + i * 6));
      startY = 26 + lignes.length * 6 + 6;
    }

    autoTable(doc, {
      head: [columns.map(c => c.label)],
      body: rows.map(row => columns.map(c => String(row[c.key] ?? ''))),
      startY,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });

    if (options.total) {
      const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
      doc.setFontSize(11);
      doc.setTextColor(31, 41, 55);
      doc.text(`${options.total.label} : ${options.total.valeur}`, 14, finalY + 10);
    }

    doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  }

  private _echapper(valeur: unknown): string {
    return `"${String(valeur ?? '').replace(/"/g, '""')}"`;
  }
}
