import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

// Valeurs alignées sur les variantes de couleur .stat-icon d'agency-dashboard.scss :
// neutre → primary (bleu), positif → secondary (vert), attention → error (rouge).
export type KpiCardTone = 'neutre' | 'positif' | 'attention';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kpi-card.component.html',
  styleUrl: './kpi-card.component.scss',
})
export class KpiCardComponent {
  @Input() label = '';
  @Input() value = '';
  @Input() icon = 'payments';
  @Input() tone: KpiCardTone = 'neutre';
  @Input() sousTexte?: string;
  @Input() loading = false;
}
