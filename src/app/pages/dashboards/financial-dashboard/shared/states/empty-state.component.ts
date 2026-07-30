import { Component, Input } from '@angular/core';

// Message vide standard, contextuel par écran (ex. "Aucune facture générée pour cette
// période") — icône + texte, jamais un tableau/graphe simplement absent sans explication.
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  @Input({ required: true }) message = '';
  @Input() icon = 'inbox';
}
