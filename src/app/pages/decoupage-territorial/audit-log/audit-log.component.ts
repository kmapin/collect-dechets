import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TerritoryService } from '../services/territory.service';
import { PageHeaderComponent } from '../../../shared/decoupage-territorial/page-header.component';
import { formatDate } from '../services/territorial-utils';
import { ScrollText } from 'lucide-angular';
import { IconComponent } from '../../../shared/decoupage-territorial/icon.component';

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Création',
  UPDATE: 'Modification',
  DEACTIVATE: 'Désactivation',
  ACTIVATE: 'Réactivation',
  IMPORT_ANALYZE: 'Analyse d\'import',
  IMPORT_CONFIRM: 'Confirmation d\'import',
};

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, IconComponent],
  templateUrl: './audit-log.component.html',
  styleUrl: './audit-log.component.scss',
})
export class AuditLogComponent {
  constructor(public territory: TerritoryService) {}

  icons = { ScrollText };

  get logs() {
    return this.territory.getAuditLogs();
  }

  actionLabel(a: string): string {
    return ACTION_LABELS[a] ?? a;
  }

  fmt = formatDate;
}
