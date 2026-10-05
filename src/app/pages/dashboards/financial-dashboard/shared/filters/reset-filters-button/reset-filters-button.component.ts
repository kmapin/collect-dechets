import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

// Bouton "Réinitialiser les filtres" partagé par tous les onglets du tableau de bord
// financier — même convention visuelle que agency-dashboard.html (icône refresh + libellé),
// affiché seulement quand au moins un filtre diffère de ses valeurs par défaut (voir
// shared/filter-persistence.util.ts::hasNonDefaultFilters côté appelant).
@Component({
  selector: 'app-reset-filters-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reset-filters-button.component.html',
  styleUrl: './reset-filters-button.component.scss',
})
export class ResetFiltersButtonComponent {
  @Input() visible = true;
  @Output() reset = new EventEmitter<void>();
}
