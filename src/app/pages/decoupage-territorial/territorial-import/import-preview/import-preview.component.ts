import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TerritoryService } from '../../services/territory.service';
import { ImportParserService } from '../../services/import-parser.service';
import { ImportRow, ImportStatistics, ROW_STATUS_LABELS } from '../../models/models';
import { PageHeaderComponent } from '../../../../shared/decoupage-territorial/page-header.component';
import { CheckCircle2, AlertTriangle, XCircle, Download, ShieldCheck, Loader2, Info } from 'lucide-angular';
import { IconComponent } from '../../../../shared/decoupage-territorial/icon.component';

@Component({
  selector: 'app-import-preview',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent, IconComponent],
  templateUrl: './import-preview.component.html',
  styleUrl: './import-preview.component.scss',
})
export class ImportPreviewComponent implements OnInit {
  importId = '';
  fileName = '';
  rows = signal<ImportRow[]>([]);
  stats = signal<ImportStatistics | null>(null);
  status = signal<string>('');
  filter = signal<'all' | 'errors' | 'warnings' | 'created'>('all');
  confirming = signal(false);
  confirmed = signal(false);
  confirmResult = signal<{ created: number; reused: number; reactivated: number; errors: number } | null>(null);
  error = signal<string | null>(null);

  Math = Math;
  icons = { CheckCircle2, AlertTriangle, XCircle, Download, ShieldCheck, Loader2, Info };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private territory: TerritoryService,
    private parser: ImportParserService
  ) {}

  ngOnInit() {
    this.importId = this.route.snapshot.paramMap.get('id') ?? '';
    const imp = this.parser.getImport(this.importId);
    if (!imp) {
      this.error.set('Import introuvable.');
      return;
    }
    this.fileName = imp.file_name;
    this.rows.set(this.parser.getImportRows(this.importId));
    this.stats.set(imp.statistics);
    this.status.set(imp.status);
  }

  get filteredRows(): ImportRow[] {
    const f = this.filter();
    return this.rows().filter((r) => {
      if (f === 'errors') return r.severity === 'error';
      if (f === 'warnings') return r.severity === 'warning';
      if (f === 'created') return r.status === 'CREATE';
      return true;
    });
  }

  get hasBlockingErrors(): boolean {
    return this.rows().some((r) => r.severity === 'error');
  }

  get statusLabel(): typeof ROW_STATUS_LABELS {
    return ROW_STATUS_LABELS;
  }

  setFilter(f: 'all' | 'errors' | 'warnings' | 'created') {
    this.filter.set(f);
  }

  async confirm() {
    if (this.hasBlockingErrors || this.confirming()) return;
    this.confirming.set(true);
    this.error.set(null);
    try {
      const result = this.parser.confirmImport(this.importId);
      this.confirmResult.set(result);
      this.confirmed.set(true);
      const imp = this.parser.getImport(this.importId);
      if (imp) {
        this.stats.set(imp.statistics);
        this.status.set(imp.status);
      }
    } catch (e: any) {
      this.error.set(e.message);
    } finally {
      this.confirming.set(false);
    }
  }

  async cancel() {
    try {
      this.parser.cancelImport(this.importId);
      this.router.navigate(['territorial/import/history']);
    } catch (e: any) {
      this.error.set(e.message);
    }
  }

  downloadReport() {
    const stats = this.stats();
    if (!stats) return;
    this.parser.generateReport(this.rows(), stats, this.fileName).then((blob) => {
      this.parser.downloadBlob(blob, `rapport-import-${this.importId}.csv`);
    });
  }
}
