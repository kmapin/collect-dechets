import { ChartConfiguration } from 'chart.js';
import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardKpi } from '../../models';
import { FINANCE_DATA_SERVICE } from '../../data-access/tokens/finance-data.token';
import { EXPORT_SERVICE } from '../../data-access/tokens/export.token';
import { CLIENT_DATA_SERVICE } from '../../data-access/tokens/client-data.token';
import { Client } from '../../models/client.model';
import { FinanceStatsSeries, MontantTotalFilter, RepartitionModePaiement } from '../../data-access/contracts/finance-data.service';
import { formatMontantXof } from '../../utils/money.util';
import { periodeCourante, plageDerniersMois, labelPeriodeFr } from '../../utils/periode.util';
import { Periode } from '../../models';
import { KpiCardComponent } from '../../shared/kpi-card/kpi-card.component';
import { PeriodSelectorComponent, PeriodSelectorMode } from '../../shared/period-selector/period-selector.component';
import { FinanceChartComponent, FinanceChartTableRow } from '../../shared/chart/finance-chart.component';
import { ErrorStateComponent } from '../../shared/states/error-state/error-state.component';
import { EmptyStateComponent } from '../../shared/states/empty-state/empty-state.component';
import { ResetFiltersButtonComponent } from '../../shared/filters/reset-filters-button/reset-filters-button.component';
import { buildCollectedOverTimeConfig } from './charts/collected-over-time.chart';
import { buildPaidVsUnpaidConfig } from './charts/paid-vs-unpaid.chart';
import { buildRevenueBreakdownConfig } from './charts/revenue-breakdown.chart';
import { hasNonDefaultFilters, loadFilters, saveFilters } from '../../../../../shared/filter-persistence.util';

const FILTERS_KEY = 'financialDashboard.dashboard';
interface DashboardFilters {
  filtreZone: string;
  filtrePlanType: '' | 'standard' | 'premium' | 'enterprise';
  filtreClientId: string | null;
  filtreClientLabel: string;
  mode: PeriodSelectorMode;
  nombreMoisGraphiques: number;
  periodeMode: 'fenetre' | 'personnalisee';
  customDebutMois: string;
  customFinMois: string;
}
const FILTERS_DEFAULTS: DashboardFilters = {
  filtreZone: '',
  filtrePlanType: '',
  filtreClientId: null,
  filtreClientLabel: '',
  mode: 'court',
  nombreMoisGraphiques: 6,
  periodeMode: 'fenetre',
  customDebutMois: '',
  customFinMois: '',
};
const KPI_FILTERS_DEFAULTS = {
  filtreZone: FILTERS_DEFAULTS.filtreZone,
  filtrePlanType: FILTERS_DEFAULTS.filtrePlanType,
  filtreClientId: FILTERS_DEFAULTS.filtreClientId,
};

// F1 (cartes KPI) + F2 (graphiques longue durée + export) du tableau de bord financier.
@Component({
  selector: 'app-finance-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    KpiCardComponent,
    PeriodSelectorComponent,
    FinanceChartComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    ResetFiltersButtonComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly financeData = inject(FINANCE_DATA_SERVICE);
  private readonly exportService = inject(EXPORT_SERVICE);
  private readonly clientData = inject(CLIENT_DATA_SERVICE);

  readonly formatMontant = formatMontantXof;

  private readonly persistedFiltres = loadFilters(FILTERS_KEY, FILTERS_DEFAULTS);
  readonly filtreZone = signal(this.persistedFiltres.filtreZone);
  readonly filtrePlanType = signal<'' | 'standard' | 'premium' | 'enterprise'>(this.persistedFiltres.filtrePlanType);
  readonly filtreClientRecherche = signal(this.persistedFiltres.filtreClientLabel);
  readonly filtreClientSelectionne = signal<Client | null>(null);
  readonly clientsSuggeres = signal<Client[]>([]);
  readonly clientDropdownOuvert = signal(false);
  readonly filtresNonDefaut = computed(() => hasNonDefaultFilters(
    { filtreZone: this.filtreZone(), filtrePlanType: this.filtrePlanType(), filtreClientId: this.filtreClientSelectionne()?.idClient ?? null },
    KPI_FILTERS_DEFAULTS,
  ));

  private get filtresActifs(): MontantTotalFilter {
    return {
      zone: this.filtreZone() || undefined,
      idClient: this.filtreClientSelectionne()?.idClient || undefined,
      planType: this.filtrePlanType() || undefined,
    };
  }

  onFiltresChange(): void {
    this.persisterFiltres();
    this.chargerKpi();
    this.chargerGraphiques();
  }

  resetFiltres(): void {
    this.filtreZone.set(FILTERS_DEFAULTS.filtreZone);
    this.filtrePlanType.set(FILTERS_DEFAULTS.filtrePlanType);
    this.filtreClientSelectionne.set(null);
    this.filtreClientRecherche.set(FILTERS_DEFAULTS.filtreClientLabel);
    this.clientsSuggeres.set([]);
    this.clientDropdownOuvert.set(false);
    this.onFiltresChange();
  }

  private persisterFiltres(): void {
    saveFilters(FILTERS_KEY, {
      filtreZone: this.filtreZone(),
      filtrePlanType: this.filtrePlanType(),
      filtreClientId: this.filtreClientSelectionne()?.idClient ?? null,
      filtreClientLabel: this.filtreClientRecherche(),
      mode: this.mode(),
      nombreMoisGraphiques: this.nombreMoisGraphiques(),
      periodeMode: this.periodeMode(),
      customDebutMois: this.customDebutMois(),
      customFinMois: this.customFinMois(),
    });
  }

  rechercherClients(): void {
    const search = this.filtreClientRecherche().trim();
    this.clientDropdownOuvert.set(true);
    this.clientData.getClients({ page: 1, pageSize: 10, filter: search ? { search } : undefined }).subscribe({
      next: (page) => this.clientsSuggeres.set(page.items),
      error: () => this.clientsSuggeres.set([]),
    });
  }

  selectionnerClient(client: Client | null): void {
    this.filtreClientSelectionne.set(client);
    this.filtreClientRecherche.set(client ? `${client.prenom} ${client.nom}` : '');
    this.clientDropdownOuvert.set(false);
    this.onFiltresChange();
  }

  // ── Fenêtre des graphiques/export (item 6 : "au-delà de la fenêtre fixe de 6 mois") ──
  readonly nombreMoisGraphiques = signal(this.persistedFiltres.nombreMoisGraphiques);
  readonly optionsFenetre = [6, 12, 24];

  // Période personnalisée (en plus des fenêtres fixes 6/12/24 mois) : deux <input
  // type="month"> (format natif "AAAA-MM"), appliquée seulement au clic sur "Appliquer"
  // pour ne pas relancer les requêtes à chaque frappe.
  readonly periodeMode = signal<'fenetre' | 'personnalisee'>(this.persistedFiltres.periodeMode);
  readonly customDebutMois = signal(this.persistedFiltres.customDebutMois);
  readonly customFinMois = signal(this.persistedFiltres.customFinMois);
  readonly erreurPeriodePersonnalisee = signal<string | null>(null);
  private periodePersonnalisee: { debut: Periode; fin: Periode } | null = null;

  readonly labelPeriodeGraphiques = computed(() => {
    if (this.periodeMode() === 'personnalisee' && this.periodePersonnalisee) {
      return `du ${labelPeriodeFr(this.periodePersonnalisee.debut)} au ${labelPeriodeFr(this.periodePersonnalisee.fin)}`;
    }
    return `${this.nombreMoisGraphiques()} derniers mois`;
  });

  onFenetreChange(): void {
    this.chargerGraphiques();
  }

  setFenetre(n: number): void {
    this.nombreMoisGraphiques.set(n);
    this.periodeMode.set('fenetre');
    this.periodePersonnalisee = null;
    this.erreurPeriodePersonnalisee.set(null);
    this.persisterFiltres();
    this.onFenetreChange();
  }

  private parseMoisInput(value: string): Periode | null {
    const [anneeStr, moisStr] = (value || '').split('-');
    const annee = Number(anneeStr);
    const mois = Number(moisStr);
    if (!annee || !mois || mois < 1 || mois > 12) return null;
    return { annee, mois };
  }

  appliquerPeriodePersonnalisee(): void {
    const debut = this.parseMoisInput(this.customDebutMois());
    const fin = this.parseMoisInput(this.customFinMois());
    if (!debut || !fin) {
      this.erreurPeriodePersonnalisee.set('Choisissez un mois de début et un mois de fin.');
      return;
    }
    if (debut.annee * 12 + debut.mois > fin.annee * 12 + fin.mois) {
      this.erreurPeriodePersonnalisee.set('Le mois de début doit précéder le mois de fin.');
      return;
    }
    this.erreurPeriodePersonnalisee.set(null);
    this.periodePersonnalisee = { debut, fin };
    this.periodeMode.set('personnalisee');
    this.persisterFiltres();
    this.chargerGraphiques();
  }

  reinitialiserPeriodePersonnalisee(): void {
    this.customDebutMois.set('');
    this.customFinMois.set('');
    this.erreurPeriodePersonnalisee.set(null);
    if (this.periodeMode() === 'personnalisee') {
      this.periodePersonnalisee = null;
      this.periodeMode.set('fenetre');
      this.persisterFiltres();
      this.chargerGraphiques();
    }
  }

  // KPI 
  readonly mode = signal<PeriodSelectorMode>('court');
  readonly kpi = signal<DashboardKpi | null>(null);
  readonly chargementKpi = signal(true);
  readonly erreurKpi = signal<string | null>(null);

  readonly estVide = computed(() => {
    const k = this.kpi();
    return !!k && k.totalCollecte === 0 && k.enAttente === 0 && k.soldeDisponible === 0;
  });

  // Graphiques
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
    // Rehydratation de la période personnalisée persistée (periodePersonnalisee n'est
    // pas stocké tel quel — seuls customDebutMois/customFinMois le sont, recalculés ici
    // avec le même parseMoisInput qu'appliquerPeriodePersonnalisee).
    if (this.periodeMode() === 'personnalisee') {
      const debut = this.parseMoisInput(this.customDebutMois());
      const fin = this.parseMoisInput(this.customFinMois());
      this.periodePersonnalisee = debut && fin ? { debut, fin } : null;
      if (!this.periodePersonnalisee) this.periodeMode.set('fenetre');
    }
    if (this.persistedFiltres.filtreClientId) {
      this.clientData.getClient(this.persistedFiltres.filtreClientId).subscribe({
        next: client => this.filtreClientSelectionne.set(client),
        error: () => {},
      });
    }
    this.chargerKpi();
    this.chargerGraphiques();
  }

  onModeChange(mode: PeriodSelectorMode): void {
    this.mode.set(mode);
    this.persisterFiltres();
    this.chargerKpi();
  }

  reessayerKpi(): void {
    this.chargerKpi();
  }

  reessayerGraphiques(): void {
    this.chargerGraphiques();
  }

  private plageActive(): { debut: Periode; fin: Periode } {
    return this.periodeMode() === 'personnalisee' && this.periodePersonnalisee
      ? this.periodePersonnalisee
      : plageDerniersMois(this.nombreMoisGraphiques());
  }

  // Étend l'export au-delà des 6 mois fixes + applique les mêmes filtres zone/client/
  // type de tarif que les KPI affichés à l'écran.
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
      `stats-financieres-${this.periodeMode() === 'personnalisee' ? 'periode' : this.nombreMoisGraphiques() + 'mois'}-${periodeCourante().annee}-${periodeCourante().mois}`,
    );
  }

  private chargerKpi(): void {
    this.chargementKpi.set(true);
    this.erreurKpi.set(null);
    const periode = this.mode() === 'court' ? periodeCourante() : undefined;

    this.financeData.getDashboardKpi(periode, this.filtresActifs).subscribe({
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
    const plage = this.plageActive();
    const filtres = this.filtresActifs;

    this.financeData.getStats(plage, filtres).subscribe({
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
