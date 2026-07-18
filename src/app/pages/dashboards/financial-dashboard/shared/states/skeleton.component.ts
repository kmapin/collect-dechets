import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SkeletonVariant = 'table-rows' | 'block';

// Squelette générique — variante 'table-rows' pour les listes (payments, withdrawals,
// clients, monthly-tracking : même forme de lignes pulsantes partout), 'block' pour un
// rectangle simple (chart, KPI). Les KPI cards et le wrapper de graphique gardent leur
// squelette dédié (déjà au format exact de leur mise en page finale — best practice
// "skeletons match final layout" — pas de bénéfice à les remplacer ici).
@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './skeleton.component.html',
  styleUrl: './skeleton.component.scss',
})
export class SkeletonComponent {
  @Input() variant: SkeletonVariant = 'block';
  @Input() rows = 5;
  @Input() columns = 4;

  get rowIndexes(): number[] {
    return Array.from({ length: this.rows }, (_, i) => i);
  }

  get columnIndexes(): number[] {
    return Array.from({ length: this.columns }, (_, i) => i);
  }
}
