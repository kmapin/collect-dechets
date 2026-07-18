import { ChartConfiguration } from 'chart.js';
import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardKpi } from '../../models';
import { FINANCE_DATA_SERVICE } from '../../data-access/tokens/finance-data.token';
import { EXPORT_SERVICE } from '../../data-access/tokens/export.token';
import { FinanceStatsSeries, RepartitionModePaiement } from '../../data-access/contracts/finance-data.service';
import { formatMontantXof } from '../../utils/money.util';
import { periodeCourante, plageDerniersMois } from '../../utils/periode.util';
import { KpiCardComponent } from '../../shared/kpi-card/kpi-card.component';
import { PeriodSelectorComponent, PeriodSelectorMode } from '../../shared/period-selector/period-selector.component';
import { FinanceChartComponent, FinanceChartTableRow } from '../../shared/chart/finance-chart.component';
import { ErrorStateComponent } from '../../shared/states/error-state.component';
import { EmptyStateComponent } from '../../shared/states/empty-state.component';
import { buildCollectedOverTimeConfig } from './charts/collected-over-time.chart';
import { buildPaidVsUnpaidConfig } from './charts/paid-vs-unpaid.chart';
import { buildRevenueBreakdownConfig } from './charts/revenue-breakdown.chart';

const NOMBRE_MOIS_GRAPHIQUES = 6; // F2 : "stats longue durée" — fenêtre glissante fixe pour le MVP

// F1 (cartes KPI) + F2 (graphiques longue durée + export) du tableau de bord financier.
@Component({
  selector: 'app-finance-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    KpiCardComponent,
    PeriodSelectorComponent,
    FinanceChartComponent,
    ErrorStateComponent,
    EmptyStateComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly financeData = inject(FINANCE_DATA_SERVICE);
  private readonly exportService = inject(EXPORT_SERVICE);

  readonly formatMontant = formatMontantXof;

  // ── KPI (F1) ──────────────────────────────────────────────────
  readonly mode = signal<PeriodSelectorMode>('court');
  readonly kpi = signal<DashboardKpi | null>(null);
  readonly chargementKpi = signal(true);
  readonly erreurKpi = signal<string | null>(null);

  readonly estVide = computed(() => {
    const k = this.kpi();
    return !!k && k.totalCollecte === 0 && k.enAttente === 0 && k.soldeDisponible === 0;
  });

  // ── Graphiques (F2) ───────────────────────────────────────────
  readonly chargementGraphiques = signal(true);
  readonly erreurGraphiques = signal<string | null>(null);
  private readonly stats = signal<FinanceStatsSeries | null>(null);
  private readonly repartition = signal<RepartitionModePaiement[]>([]);

  readonly configCollecte = computed<ChartConfiguration | null>(() => {
    const s = this.stats();
    return s ? buildCollectedOverTimeConfig(s) : null;
  });
  readonly lignesCollecte = computed<FinanceChartTableRow[]>(() => {
    const s = this.stats();
    if (!s) return [];
    return s.labels.map((label, i) => ({ label, value: this.formatMontant(s.totalCollecte[i]) }));
  });

  readonly configPayeesImpayees = computed<ChartConfiguration | null>(() => {
    const s = this.stats();
    return s ? buildPaidVsUnpaidConfig(s) : null;
  });
  readonly lignesPayeesImpayees = computed<FinanceChartTableRow[]>(() => {
    const s = this.stats();
    if (!s) return [];
    return s.labels.map((label, i) => ({
      label,
      value: `${s.facturesPayees[i]} payées / ${s.facturesImpayees[i]} impayées`,
    }));
  });

  readonly configRepartition = computed<ChartConfiguration | null>(() => {
    const r = this.repartition();
    return r.length ? buildRevenueBreakdownConfig(r) : null;
  });
  readonly lignesRepartition = computed<FinanceChartTableRow[]>(() =>
    this.repartition().map(r => ({ label: r.mode, value: this.formatMontant(r.montant) })),
  );

  constructor() {
    this.chargerKpi();
    this.chargerGraphiques();
  }

  onModeChange(mode: PeriodSelectorMode): void {
    this.mode.set(mode);
    this.chargerKpi();
  }

  reessayerKpi(): void {
    this.chargerKpi();
  }

  reessayerGraphiques(): void {
    this.chargerGraphiques();
  }

  exporterCsv(): void {
    const s = this.stats();
    if (!s) return;
    const rows = s.labels.map((label, i) => ({
      periode: label,
      totalCollecte: s.totalCollecte[i],
      facturesPayees: s.facturesPayees[i],
      facturesImpayees: s.facturesImpayees[i],
    }));
    this.exportService.exportToCsv(
      rows,
      [
        { key: 'periode', label: 'Période' },
        { key: 'totalCollecte', label: 'Total collecté (FCFA)' },
        { key: 'facturesPayees', label: 'Factures payées' },
        { key: 'facturesImpayees', label: 'Factures impayées' },
      ],
      `stats-financieres-${periodeCourante().annee}-${periodeCourante().mois}`,
    );
  }

  private chargerKpi(): void {
    this.chargementKpi.set(true);
    this.erreurKpi.set(null);
    const periode = this.mode() === 'court' ? periodeCourante() : undefined;

    this.financeData.getDashboardKpi(periode).subscribe({
      next: kpi => {
        this.kpi.set(kpi);
        this.chargementKpi.set(false);
      },
      error: () => {
        this.erreurKpi.set('Impossible de charger les indicateurs financiers pour le moment.');
        this.chargementKpi.set(false);
      },
    });
  }

  private chargerGraphiques(): void {
    this.chargementGraphiques.set(true);
    this.erreurGraphiques.set(null);
    const plage = plageDerniersMois(NOMBRE_MOIS_GRAPHIQUES);

    this.financeData.getStats(plage).subscribe({
      next: stats => {
        this.stats.set(stats);
        this.chargementGraphiques.set(false);
      },
      error: () => {
        this.erreurGraphiques.set('Impossible de charger les statistiques.');
        this.chargementGraphiques.set(false);
      },
    });

    this.financeData.getRepartitionModePaiement(plage).subscribe({
      next: repartition => this.repartition.set(repartition),
      error: () => this.repartition.set([]),
    });
  }
}
