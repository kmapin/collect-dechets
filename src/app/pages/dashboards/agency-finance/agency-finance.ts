import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

// PrimeNG
import { ChartModule }          from 'primeng/chart';
import { TableModule }          from 'primeng/table';
import { ButtonModule }         from 'primeng/button';
import { TagModule }            from 'primeng/tag';
import { ToastModule }          from 'primeng/toast';
import { DialogModule }         from 'primeng/dialog';
import { SelectModule }         from 'primeng/select';
import { InputNumberModule }    from 'primeng/inputnumber';
import { InputTextModule }      from 'primeng/inputtext';
import { TextareaModule }       from 'primeng/textarea';
import { SkeletonModule }       from 'primeng/skeleton';
import { MessageService }       from 'primeng/api';
import { TooltipModule }        from 'primeng/tooltip';
import { CardModule }           from 'primeng/card';
import { DividerModule }        from 'primeng/divider';
import { ProgressBarModule }    from 'primeng/progressbar';

// Services & Models
import { AuthService }     from '../../../services/auth.service';
import { FinanceService }  from '../../../services/finance.service';
import {
  FinancialSummary,
  PaymentTransaction,
  WithdrawalRecord,
  PaymentMethod,
  FinanceFilters,
} from '../../../models/finance.model';

// jsPDF for export
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-agency-finance',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    ChartModule,
    TableModule,
    ButtonModule,
    TagModule,
    ToastModule,
    DialogModule,
    SelectModule,
    InputNumberModule,
    InputTextModule,
    TextareaModule,
    SkeletonModule,
    TooltipModule,
    CardModule,
    DividerModule,
    ProgressBarModule,
  ],
  providers: [MessageService, DatePipe, DecimalPipe],
  templateUrl: './agency-finance.html',
  styleUrls: ['./agency-finance.scss'],
})
export class AgencyFinance implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // ── State ────────────────────────────────────────────────────
  agencyId = '';
  isLoadingSummary   = true;
  isLoadingChart     = true;
  isLoadingTx        = true;
  isLoadingWd        = true;
  isSubmittingWd     = false;
  showWithdrawalDialog = false;

  // ── Data ─────────────────────────────────────────────────────
  summary: FinancialSummary | null = null;
  transactions: PaymentTransaction[]       = [];
  withdrawals:  WithdrawalRecord[]         = [];
  totalTx    = 0;
  totalWd    = 0;
  pageWd     = 1;
  pageTx     = 1;
  readonly pageSize = 10;

  // ── Chart ────────────────────────────────────────────────────
  // 'week' retiré (item 3) : GET /finance/dashboard/stats (FinanceStatsService.
  // getStatsParPeriode) n'agrège qu'au mois — aucune granularité hebdomadaire réelle
  // n'existe côté backend, mieux vaut ne pas proposer une option qu'on ne peut pas servir.
  chartPeriod: 'month' | 'year' = 'month';
  chartData:    any = {};
  chartOptions: any = {};

  readonly periodOptions: { label: string; value: 'month' | 'year' }[] = [
    { label: 'Ce mois',       value: 'month' },
    { label: 'Cette année',   value: 'year'  },
  ];

  // ── Withdrawal form ──────────────────────────────────────────
  readonly methodOptions = [
    { label: 'Orange Money',  value: PaymentMethod.ORANGE_MONEY  },
    { label: 'Moov Money',    value: PaymentMethod.MOOV_MONEY    },
    { label: 'Telecel Money', value: PaymentMethod.TELECEL_MONEY },

  ];

  // ── Collapse state ───────────────────────────────────────────
  txExpanded   = true;
  wdExpanded   = true;
  chartExpanded = true;

  // ── Tx filters ───────────────────────────────────────────────
  txFilters: FinanceFilters = { page: 1, limit: this.pageSize };
  wdFilters: FinanceFilters = { page: 1, limit: this.pageSize };
  withdrawalForm!: FormGroup;

  constructor(
    private authService: AuthService,
    private financeService: FinanceService,
    private fb: FormBuilder,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private datePipe: DatePipe,
    private decimalPipe: DecimalPipe,
  ) {}

  // ══════════════════════════════════════════════════════════════
  ngOnInit(): void {
    this.buildWithdrawalForm();
    this.buildChartOptions();

    const user = this.authService.currentUser;
    this.agencyId = (user as any)?.agencyId?._id ?? (user as any)?.agencyId ?? '';

    if (this.agencyId) {
      this.loadAll();
    } else {
      // Fallback : écouter l'observable
      this.authService.currentUser$
        .pipe(takeUntil(this.destroy$))
        .subscribe((u) => {
          if (u) {
            this.agencyId = (u as any)?.agencyId?._id ?? (u as any)?.agencyId ?? '';
            if (this.agencyId) this.loadAll();
          }
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Load all data ────────────────────────────────────────────
  private loadAll(): void {
    this.loadSummary();
    this.loadChartData();
    this.loadTransactions();
    this.loadWithdrawals();
  }

  loadSummary(): void {
    this.isLoadingSummary = true;
    this.financeService
      .getFinancialSummary(this.agencyId)
      .pipe(takeUntil(this.destroy$), finalize(() => (this.isLoadingSummary = false)))
      .subscribe({
        next: (d) => { this.summary = d; this.cdr.markForCheck(); },
        error: (err) => {
          console.error('[AgencyFinance] loadSummary:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de charger le résumé financier.',
          });
        },
      });
  }

  loadChartData(): void {
    this.isLoadingChart = true;
    this.financeService
      .getChartData(this.agencyId, this.chartPeriod)
      .pipe(takeUntil(this.destroy$), finalize(() => (this.isLoadingChart = false)))
      .subscribe({
        next: (d) => {
          this.chartData = this.buildChartDataset(d);
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('[AgencyFinance] loadChartData:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de charger le graphique.',
          });
        },
      });
  }

  loadTransactions(): void {
    this.isLoadingTx = true;
    this.financeService
      .getTransactions(this.agencyId, this.txFilters)
      .pipe(takeUntil(this.destroy$), finalize(() => (this.isLoadingTx = false)))
      .subscribe({
        next: (r) => {
          this.transactions = r.data;
          this.totalTx      = r.total;
          this.cdr.markForCheck();
        },
      });
  }

  loadWithdrawals(): void {
    this.isLoadingWd = true;
    this.financeService
      .getWithdrawals(this.agencyId, this.wdFilters)
      .pipe(takeUntil(this.destroy$), finalize(() => (this.isLoadingWd = false)))
      .subscribe({
        next: (r) => {
          this.withdrawals = r.data;
          this.totalWd     = r.total;
          this.cdr.markForCheck();
        },
      });
  }

  // ── Chart builder ────────────────────────────────────────────
  private buildChartDataset(d: any) {
    const docStyle = getComputedStyle(document.documentElement);
    return {
      labels: d.labels,
      datasets: [
        {
          label: 'Revenus nets (XOF)',
          data: d.revenues,
          backgroundColor:  'rgba(34, 197, 94, 0.15)',
          borderColor:      '#22c55e',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#22c55e',
          pointRadius: 4,
        },
      ],
    };
  }

  private buildChartOptions(): void {
    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { family: 'Inter, sans-serif', size: 12 }, color: '#6b7280' },
        },
        tooltip: {
          callbacks: {
            label: (ctx: any) =>
              ` ${ctx.dataset.label}: ${this.formatCurrency(ctx.raw)}`,
          },
        },
      },
      scales: {
        x: {
          grid:  { display: false },
          ticks: { color: '#9ca3af', font: { size: 11 } },
        },
        y: {
          grid:  { color: 'rgba(107,114,128,0.1)' },
          ticks: {
            color: '#9ca3af',
            font:  { size: 11 },
            callback: (v: number) => this.formatCurrency(v),
          },
        },
      },
    };
  }

  onPeriodChange(): void {
    this.loadChartData();
  }

  // ── Withdrawal form ──────────────────────────────────────────
  private buildWithdrawalForm(): void {
    this.withdrawalForm = this.fb.group({
      amount:        [null, [Validators.required, Validators.min(1_000)]],
      method:        [PaymentMethod.ORANGE_MONEY, Validators.required],
      accountNumber: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  openWithdrawalDialog(): void {
    this.withdrawalForm.reset({ method: PaymentMethod.ORANGE_MONEY });
    this.showWithdrawalDialog = true;
  }

  submitWithdrawal(): void {
    if (this.withdrawalForm.invalid) {
      this.withdrawalForm.markAllAsTouched();
      return;
    }
    if (!this.summary || this.withdrawalForm.value.amount > this.summary.availableBalance) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Solde insuffisant',
        detail: 'Le montant demandé dépasse votre solde disponible.',
      });
      return;
    }

    const { amount, method, accountNumber } = this.withdrawalForm.value;
    // Corrigé (item 3) : demanderRetrait$() (POST /finance/retraits, vrai workflow
    // Super Admin) remplace payment$() (POST /transactions/send-money, legacy, débit
    // immédiat sans validation) — body attendu par TransactionService.demanderRetrait.
    const payload = {
      montant: amount,
      customerMsisdn: accountNumber,
      operator: method,
    };

    this.isSubmittingWd = true;
    this.financeService
      .demanderRetrait$(payload)
      .pipe(finalize(() => (this.isSubmittingWd = false)))
      .subscribe({
        next: () => {
          this.showWithdrawalDialog = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Demande envoyée',
            detail: 'Votre demande de retrait est en attente de validation par le Super Admin.',
          });
          this.loadSummary();
          this.loadWithdrawals();
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: err?.error?.message ?? 'Une erreur est survenue.',
          });
        },
      });
  }

  // ── Pagination ───────────────────────────────────────────────
  onTxPageChange(event: any): void {
    this.txFilters.page = Math.floor(event.first / event.rows) + 1;
    this.loadTransactions();
  }

  onWdPageChange(event: any): void {
    this.wdFilters.page = Math.floor(event.first / event.rows) + 1;
    this.loadWithdrawals();
  }

  // ── Filtres paiements ────────────────────────────────────────
  applyTxFilters(): void {
    this.txFilters.page = 1;
    this.loadTransactions();
  }

  resetTxFilters(): void {
    this.txFilters = { page: 1, limit: this.pageSize };
    this.loadTransactions();
  }

  // ── Filtres retraits ─────────────────────────────────────────
  applyWdFilters(): void {
    this.wdFilters.page = 1;
    this.loadWithdrawals();
  }

  resetWdFilters(): void {
    this.wdFilters = { page: 1, limit: this.pageSize };
    this.loadWithdrawals();
  }

  // ── Helpers ──────────────────────────────────────────────────
  formatCurrency(value: number | null | undefined): string {
    if (value == null) return '—';
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
    }).format(value) + ' XOF';
  }

  // Corrigé (item 3) : ces deux maps ne correspondaient à AUCUNE valeur réellement écrite
  // par le backend (ni models/transaction.js, ni models/Withdraw.js) — un statut réel
  // s'affichait donc toujours tel quel, jamais traduit. Couvre les deux énums réels (pas
  // de collision de clé entre les deux modèles).
  getStatusSeverity(
    status: string
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const map: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
      // Transaction (models/transaction.js)
      INITIATED:            'info',
      OTP_PENDING:          'warn',
      PENDING:              'warn',
      COMPLETED:            'success',
      COMPLETED_WITH_ERROR: 'warn',
      FAILED:               'danger',
      CANCELLED:            'secondary',
      // Withdraw (models/Withdraw.js)
      EN_ATTENTE_VALIDATION: 'warn',
      REJETE:                'danger',
    };
    return map[status] ?? 'secondary';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      // Transaction (models/transaction.js)
      INITIATED:            'Initié',
      OTP_PENDING:          'OTP en attente',
      PENDING:              'En attente',
      COMPLETED:            'Complété',
      COMPLETED_WITH_ERROR: 'Complété avec erreur',
      FAILED:               'Échoué',
      CANCELLED:            'Annulé',
      // Withdraw (models/Withdraw.js)
      EN_ATTENTE_VALIDATION: 'En attente de validation',
      REJETE:                'Rejeté',
    };
    return map[status] ?? status;
  }

  getMethodLabel(method: string): string {
    const map: Record<string, string> = {
      ORANGE_MONEY:  'Orange Money',
      MOOV_MONEY:    'Moov Money',
      TELECEL_MONEY: 'Telecel Money',
      BANK_TRANSFER: 'Virement Bancaire',
    };
    return map[method] ?? method;
  }

  commissionRate(): number {
    if (!this.summary?.totalCollected) return 0;
    return Math.round((this.summary.totalCommission / this.summary.totalCollected) * 100);
  }

  // ── EXPORTS ──────────────────────────────────────────────────
  exportCSV(type: 'transactions' | 'withdrawals'): void {
    const isWd = type === 'withdrawals';
    const data = isWd ? this.withdrawals : this.transactions;
    const headers = isWd
      ? ['Référence', 'Montant (XOF)', 'Opérateur', 'Téléphone', 'Statut', 'Date']
      : ['Référence', 'Client', 'Téléphone', 'Montant', 'Commission', 'Net', 'Mode', 'Statut', 'Date'];

    const rows = isWd
      ? (data as WithdrawalRecord[]).map((w) => [
          w.reference ?? '—',
          w.amount,
          this.getMethodLabel(w.operator),
          w.customerMsisdn,
          this.getStatusLabel(w.status),
          this.datePipe.transform(w.createdAt, 'dd/MM/yyyy HH:mm') ?? '',
        ])
      : (data as PaymentTransaction[]).map((t) => [
          t.reference,
          t.clientName,
          t.clientPhone ?? '—',
          t.amount,
          t.commission,
          t.netAmount,
          this.getMethodLabel(t.method),
          this.getStatusLabel(t.status),
          this.datePipe.transform(t.createdAt, 'dd/MM/yyyy HH:mm') ?? '',
        ]);

    const csvContent = [headers, ...rows]
      .map((r) => r.map((v) => `"${v}"`).join(';'))
      .join('\n');

    this.downloadFile(
      '\uFEFF' + csvContent,
      `${type}_${this.today()}.csv`,
      'text/csv;charset=utf-8;'
    );
  }

  exportExcel(type: 'transactions' | 'withdrawals'): void {
    // XLS-compatible TSV with UTF-8 BOM
    const isWd = type === 'withdrawals';
    const data = isWd ? this.withdrawals : this.transactions;
    const headers = isWd
      ? ['Référence', 'Montant (XOF)', 'Opérateur', 'Téléphone', 'Statut', 'Date']
      : ['Référence', 'Client', 'Téléphone', 'Montant', 'Commission', 'Net', 'Mode', 'Statut', 'Date'];

    const rows = isWd
      ? (data as WithdrawalRecord[]).map((w) => [
          w.reference ?? '—',
          w.amount,
          this.getMethodLabel(w.operator),
          w.customerMsisdn,
          this.getStatusLabel(w.status),
          this.datePipe.transform(w.createdAt, 'dd/MM/yyyy HH:mm') ?? '',
        ])
      : (data as PaymentTransaction[]).map((t) => [
          t.reference,
          t.clientName,
          t.clientPhone ?? '—',
          t.amount,
          t.commission,
          t.netAmount,
          this.getMethodLabel(t.method),
          this.getStatusLabel(t.status),
          this.datePipe.transform(t.createdAt, 'dd/MM/yyyy HH:mm') ?? '',
        ]);

    const tsvContent = [headers, ...rows].map((r) => r.join('\t')).join('\n');
    this.downloadFile(
      '\uFEFF' + tsvContent,
      `${type}_${this.today()}.xls`,
      'application/vnd.ms-excel;charset=utf-8;'
    );
  }

  exportPDF(type: 'transactions' | 'withdrawals'): void {
    const isWd = type === 'withdrawals';
    const data = isWd ? this.withdrawals : this.transactions;
    const doc  = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(16);
    doc.setTextColor(31, 41, 55);
    doc.text(
      isWd ? 'Historique des Retraits' : 'Historique des Paiements',
      14,
      18
    );
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`Exporté le ${this.datePipe.transform(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 26);

    const head = isWd
      ? [['Référence', 'Montant (XOF)', 'Opérateur', 'Téléphone', 'Statut', 'Date']]
      : [['Référence', 'Client', 'Téléphone', 'Montant', 'Commission', 'Net', 'Mode', 'Statut', 'Date']];

    const body = isWd
      ? (data as WithdrawalRecord[]).map((w) => [
          w.reference ?? '—',
          this.formatCurrency(w.amount),
          this.getMethodLabel(w.operator),
          w.customerMsisdn,
          this.getStatusLabel(w.status),
          this.datePipe.transform(w.createdAt, 'dd/MM/yyyy') ?? '',
        ])
      : (data as PaymentTransaction[]).map((t) => [
          t.reference,
          t.clientName,
          t.clientPhone ?? '—',
          this.formatCurrency(t.amount),
          this.formatCurrency(t.commission),
          this.formatCurrency(t.netAmount),
          this.getMethodLabel(t.method),
          this.getStatusLabel(t.status),
          this.datePipe.transform(t.createdAt, 'dd/MM/yyyy') ?? '',
        ]);

    autoTable(doc, {
      head,
      body,
      startY: 32,
      styles:      { fontSize: 8, cellPadding: 3 },
      headStyles:  { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });

    doc.save(`${type}_${this.today()}.pdf`);
  }

  private today(): string {
    return this.datePipe.transform(new Date(), 'yyyyMMdd') ?? '';
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  goBack(): void {
    this.router.navigate(['/dashboard/agency']);
  }
}
