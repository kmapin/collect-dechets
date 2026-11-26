import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ImportDraft, ImportExecutionResult, ImportParserService, ImportPreviewRow } from '../../services/import-parser.service';
import { ImportStatistics, ROW_STATUS_LABELS } from '../../models/models';
import { PageHeaderComponent } from '../../../../shared/decoupage-territorial/page-header.component';
import { CheckCircle2, AlertTriangle, XCircle, Download, ShieldCheck, Loader2, Info, RefreshCw } from 'lucide-angular';
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
  rows = signal<ImportPreviewRow[]>([]);
  stats = signal<ImportStatistics | null>(null);
  recordsCount = signal(0);
  filter = signal<'all' | 'created' | 'warnings' | 'errors'>('all');
  confirming = signal(false);
  result = signal<ImportExecutionResult | null>(null);
  error = signal<string | null>(null);

  icons = { CheckCircle2, AlertTriangle, XCircle, Download, ShieldCheck, Loader2, Info, RefreshCw };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly parser: ImportParserService,
  ) {}

  ngOnInit(): void {
    this.importId = this.route.snapshot.paramMap.get('id') ?? '';
    const draft: ImportDraft | null = this.parser.getDraft(this.importId);
    if (!draft) {
      this.error.set('Aperçu introuvable ou expiré. Sélectionnez et analysez à nouveau le fichier CSV.');
      return;
    }
    this.applyDraft(draft);
  }

  get filteredRows(): ImportPreviewRow[] {
    const filter = this.filter();
    return this.rows().filter((row) => {
      if (filter === 'errors') return row.severity === 'error';
      if (filter === 'warnings') return row.severity === 'warning';
      if (filter === 'created') return row.status === 'CREATE' || row.status === 'VERIFIED';
      return true;
    });
  }

  get statusLabel(): typeof ROW_STATUS_LABELS {
    return ROW_STATUS_LABELS;
  }

  get hasImportableRows(): boolean {
    return this.recordsCount() > 0;
  }

  get hasPreviewErrors(): boolean {
    return this.rows().some((row) => row.severity === 'error');
  }

  get createdRowsCount(): number {
    return this.rows().filter((row) => row.status === 'CREATE' || row.status === 'VERIFIED').length;
  }

  get createdFilterLabel(): string {
    return this.result()?.verified ? 'Confirmées' : 'À créer';
  }

  get canRetry(): boolean {
    const result = this.result();
    return !result || !result.verified || result.retryableErrors > 0;
  }

  get isComplete(): boolean {
    return this.result()?.verified === true && this.result()?.retryableErrors === 0;
  }

  setFilter(filter: 'all' | 'created' | 'warnings' | 'errors'): void {
    this.filter.set(filter);
  }

  async confirm(): Promise<void> {
    if (!this.hasImportableRows || this.confirming() || this.isComplete) return;
    this.confirming.set(true);
    this.error.set(null);
    try {
      const result = await this.parser.confirmImport(this.importId);
      this.result.set(result);
      this.rows.set(result.rows);
      const current = this.stats();
      if (current) {
        this.stats.set({
          ...current,
          created: result.created,
          reused: result.reused,
          duplicates: result.duplicates,
          errors: result.errors,
        });
      }
      if (!result.verified && result.verificationError) {
        this.error.set(result.verificationError);
      }
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'L’import n’a pas pu être envoyé au backend.');
    } finally {
      this.confirming.set(false);
    }
  }

  cancel(): void {
    if (this.result()) {
      void this.router.navigate(['/territorial/units']);
      return;
    }
    this.parser.removeDraft(this.importId);
    void this.router.navigate(['/territorial/import']);
  }

  async downloadReport(): Promise<void> {
    const stats = this.stats();
    if (!stats) return;
    const report = await this.parser.generateReport(this.rows(), stats, this.fileName);
    this.parser.downloadBlob(report, `rapport-import-${this.importId}.csv`);
  }

  private applyDraft(draft: ImportDraft): void {
    this.fileName = draft.fileName;
    this.rows.set(draft.result?.rows ?? draft.rows);
    this.stats.set(draft.result
      ? {
          ...draft.statistics,
          created: draft.result.created,
          reused: draft.result.reused,
          duplicates: draft.result.duplicates,
          errors: draft.result.errors,
        }
      : draft.statistics);
    this.recordsCount.set(draft.records.length);
    this.result.set(draft.result ?? null);
  }
}
