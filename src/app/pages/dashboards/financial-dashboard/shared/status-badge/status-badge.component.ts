import { Component, Input } from '@angular/core';

export type StatusBadgeVariant = 'success' | 'neutral' | 'warning' | 'danger';

// Badge icône + texte générique — jamais de statut porté par la seule couleur
// (accessibilité, clarté pour utilisateurs peu lettrés — spec §1.5/§1.13). Réutilisé
// par F6 (statut/retard client), F12 (payé/impayé) et au-delà.
@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [],
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.scss',
})
export class StatusBadgeComponent {
  @Input({ required: true }) label = '';
  @Input() icon = 'circle';
  @Input() variant: StatusBadgeVariant = 'neutral';
}
