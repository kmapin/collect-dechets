// Export/impression client-side uniquement (F2, F10, F12) — aucun appel serveur.
// Implémentation concrète (ExportMockService) : Prompt 8.
export interface ExportColumn<T> {
  key: keyof T;
  label: string;
}

export abstract class ExportService {
  abstract exportToCsv<T extends Record<string, unknown>>(
    rows: T[],
    columns: ExportColumn<T>[],
    filename: string,
  ): void;
  abstract print(): void;
}
