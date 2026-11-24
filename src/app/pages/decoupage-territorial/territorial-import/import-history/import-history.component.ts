import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ImportParserService } from '../../services/import-parser.service';
import { PageHeaderComponent } from '../../../../shared/decoupage-territorial/page-header.component';
import { formatDate } from '../../services/territorial-utils';
import { Download, Eye, FileSpreadsheet, History as HistoryIcon } from 'lucide-angular';
import { IconComponent } from '../../../../shared/decoupage-territorial/icon.component';

const STATUS_LABELS: Record<string, string> = {
  UPLOADED: 'Téléversé',
  VALIDATING: 'En analyse',
  VALIDATED: 'Validé',
  VALIDATION_FAILED: 'Validation échouée',
  COMMITTING: 'En application',
  COMPLETED: 'Terminé',
  FAILED: 'Échoué',
  CANCELLED: 'Annulé',
};

@Component({
  selector: 'app-import-history',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent, IconComponent],
  templateUrl: './import-history.component.html',
  styleUrl: './import-history.component.scss',
})
export class ImportHistoryComponent {
  constructor(public parser: ImportParserService) {}

  icons = { Download, Eye, FileSpreadsheet, HistoryIcon };

  get imports() {
    return this.parser.listImports();
  }

  statusLabel(s: string): string {
    return STATUS_LABELS[s] ?? s;
  }

  statusClass(s: string): string {
    return {
      COMPLETED: 'st-completed',
      FAILED: 'st-error',
      VALIDATION_FAILED: 'st-error',
      CANCELLED: 'st-muted',
      VALIDATED: 'st-info',
    }[s] ?? 'st-muted';
  }

  downloadReport(id: string) {
    const imp = this.parser.getImport(id);
    if (!imp) return;
    const rows = this.parser.getImportRows(id);
    this.parser.generateReport(rows, imp.statistics, imp.file_name).then((blob) => {
      this.parser.downloadBlob(blob, `rapport-import-${id}.csv`);
    });
  }

  fmt = formatDate;
}
