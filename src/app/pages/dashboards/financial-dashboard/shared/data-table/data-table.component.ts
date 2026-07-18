import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DataTableColumn<T> {
  key: keyof T;
  label: string;
  align?: 'left' | 'right';
  sortable?: boolean;
  format?: (row: T) => string;
}

// Table générique réutilisable (F3/F4 et au-delà) : tri client-side, squelette de
// chargement, état vide — le tri reste local à l'écran (les params serveur-style ne
// couvrent que page/filtre/période, voir ARCHITECTURE.md §4).
@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
})
export class DataTableComponent<T> {
  @Input({ required: true }) columns: DataTableColumn<T>[] = [];
  @Input() rows: T[] = [];
  @Input() loading = false;
  @Input() skeletonRows = 5;
  @Input() emptyMessage = 'Aucune donnée.';

  readonly sortKey = signal<keyof T | null>(null);
  readonly sortDirection = signal<'asc' | 'desc'>('asc');

  get rowsTriees(): T[] {
    const key = this.sortKey();
    if (!key) return this.rows;
    const direction = this.sortDirection() === 'asc' ? 1 : -1;
    return [...this.rows].sort((a, b) => {
      const va = a[key];
      const vb = b[key];
      if (va === vb) return 0;
      return va! > vb! ? direction : -direction;
    });
  }

  get squelettePlaceholders(): number[] {
    return Array.from({ length: this.skeletonRows }, (_, i) => i);
  }

  trierPar(col: DataTableColumn<T>): void {
    if (!col.sortable) return;
    if (this.sortKey() === col.key) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(col.key);
      this.sortDirection.set('asc');
    }
  }

  ariaSort(col: DataTableColumn<T>): 'ascending' | 'descending' | null {
    if (this.sortKey() !== col.key) return null;
    return this.sortDirection() === 'asc' ? 'ascending' : 'descending';
  }

  valeur(row: T, col: DataTableColumn<T>): string {
    if (col.format) return col.format(row);
    return String(row[col.key] ?? '');
  }
}
