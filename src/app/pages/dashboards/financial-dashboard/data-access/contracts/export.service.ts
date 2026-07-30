// Export client-side uniquement (F2, F10, F12) — aucun appel serveur.
// Implémentation concrète : ExportClientService (data-access/export/).
export interface ExportColumn<T> {
  key: keyof T;
  label: string;
}

export interface ExportPdfOptions {
  titre: string;
  /** Une ligne, ou plusieurs (ex. agence + client) — chacune sur sa propre ligne sous le titre. */
  sousTitre?: string | string[];
  total?: { label: string; valeur: string };
}

export abstract class ExportService {
  abstract exportToCsv<T extends Record<string, unknown>>(
    rows: T[],
    columns: ExportColumn<T>[],
    filename: string,
  ): void;
  /** Génère un vrai document PDF (jsPDF/autoTable) — pas un window.print() de la page. */
  abstract exportToPdf<T extends Record<string, unknown>>(
    rows: T[],
    columns: ExportColumn<T>[],
    filename: string,
    options: ExportPdfOptions,
  ): void;
}
