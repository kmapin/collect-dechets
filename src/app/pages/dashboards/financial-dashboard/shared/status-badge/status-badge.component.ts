import { Component, Input } from '@angular/core';

export type StatusBadgeVariant = 'success' | 'neutral' | 'warning' | 'danger';

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
