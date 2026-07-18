import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Client } from '../../../models';
import { StatusBadgeComponent } from '../../../shared/status-badge/status-badge.component';
import { badgeStatutClient } from '../../../shared/status-badge/status-badge.util';

// F7 — Informations générales du client, lecture seule (édition TBC, spec §1.12).
@Component({
  selector: 'app-client-info-tab',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent],
  templateUrl: './info-tab.component.html',
  styleUrl: './info-tab.component.scss',
})
export class InfoTabComponent {
  @Input() client: Client | null = null;
  @Input() loading = false;

  readonly badgeStatut = badgeStatutClient;
}
