import { ChangeDetectorRef, Component, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterModule } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { forkJoin, Observable } from "rxjs";
import { map } from "rxjs/operators";
import { AuthService } from "../../../services/auth.service";
import { AgencyService } from "../../../services/agency.service";
import { CollectionService } from "../../../services/collection.service";
import { NotificationService } from "../../../services/notification.service";
import { RegisterUserData, User } from "../../../models/user.model";
import { Agency } from "../../../models/agency.model";
import { OUAGA_DATA } from "../../../data/mock-data";
import { Admin } from "../../../services/admin";
import {
  MOCK_CITIES,
  MOCK_ARRONDISSEMENTS,
} from "../../../data/countries-org.mock";
import { FilterParams } from "../../../models/filterParams.model";
import { Signalement } from "../../shared_pages/signalement/signalement";
import { MiniChart } from "../../shared_pages/mini-chart/mini-chart";
import { CoverageMap, type CoverageMapZone } from "../../shared_pages/coverage-map/coverage-map";
import { NotificationBell, type BellNotification } from "../../shared_pages/notification-bell/notification-bell";
import { MunicipalityMockDataService } from "./mocks/municipality-mock-data.service";
import type {
  PerformanceOverview,
  MonthlyTrendPoint,
  PerformanceRecord,
  PerformanceIndicator,
  PerformanceGroupType,
  ZoneFrequencyRecord,
  ZoneFrequencyIndicator,
  CollectionFrequency,
} from "./mocks/municipality-mock.types";
import { buildWasteBreakdownConfig } from "./charts/waste-breakdown.chart";
import { buildCollectionEvolutionConfig } from "./charts/collection-evolution.chart";
import { buildPerformanceIndicatorsConfig } from "./charts/performance-indicators.chart";
import { comparePerformance, aggregatePerformanceRecords } from "./utils/performance.util";
import { aggregateZoneFrequencyRecords } from "./utils/zone-frequency.util";
import { aggregateVolume, type VolumeAggregate } from "./utils/volume.util";
import { MOCK_NETWORK_DELAY_MS } from "./mocks/municipality-mock.constants";
import type { ChartConfiguration } from "chart.js";

/**
 * Plafond de récupération pour loadAllSignalements() (Prompt 03) — <app-signalement>
 * pagine déjà côté client sur le tableau complet reçu, donc pas besoin de pagination
 * serveur ici, juste d'un volume suffisant. Provisoire : à ajuster selon le vrai volume
 * de signalements municipaux (le backend clampe à 500 max, voir services/qrValidation.js).
 */
const INCIDENTS_FETCH_LIMIT = 300;

/**
 * Vrai vocabulaire `PlanningV2.typeDechets`/`Collecte.wasteType` (Prompt 08) — remplace
 * les 4 catégories inventées du mock (`WASTE_TYPE_POOL`, mocks/municipality-mock.constants.ts,
 * encore utilisé par les sections Volume/Performance/Fréquence par zone, toujours mockées,
 * hors périmètre de ce prompt). Label + couleur d'affichage uniquement — le backend ne
 * renvoie que la clé d'enum.
 */
const WASTE_TYPE_DISPLAY: Record<string, { label: string; color: string }> = {
  menagers: { label: 'Ménagers', color: '#4caf50' },
  recyclables: { label: 'Recyclables', color: '#2196f3' },
  verts: { label: 'Déchets verts', color: '#8bc34a' },
  encombrants: { label: 'Encombrants', color: '#ff9800' },
  speciaux: { label: 'Spéciaux', color: '#9c27b0' },
};

/** The Statistiques tab's single shared "Période" selector — see statisticsPeriod. */
export type StatisticsPeriod = "today" | "week" | "month" | "quarter" | "year";

export interface Incident {
  _id: string;
  agency?: {
    _id: string;
    name?: string;
  };
  agencyId?: {
    _id: string;
    name?: string;
  };
  clientId?:{
    _id: string;
    firstName?: string;
    lastName ?:string;
    email?:string
  };
  collectorId?: {
    _id: string;
    firstName?: string;
    lastName ?:string;
    email?:string
  }
  photos?: string[];
  agencyName: string;
  type:
    | "missed_collection"
    | "compliance_issue"
    | "complaint"
    | "technical_issue";
  comment: string;
  description: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  date: Date;
  status: "open" | "pending" | "resolved"|'Collected' |'Reported'|'Scheduled';
  /** Champ réel Collecte.resolutionStatus — `status` ci-dessus reste 'Reported' pour
   * toujours après résolution (services/collecte.service.js::resolveReport ne le touche
   * jamais), donc c'est le SEUL champ qui indique si un signalement est vraiment traité. */
  resolutionStatus?: "pending" | "in_progress" | "resolved";
  /** Champ réel Collecte.resolutionTeamId (renommé depuis assignedTeamId, Phase 2 du
   * nettoyage Planning/Signalement/Assignation) — équipe affectée à la résolution. */
  resolutionTeamId?: { _id: string; name?: string } | null;
}
// Aligné champ-à-champ sur la vraie réponse de GET /api/statistics
// (services/globalState.js::getDashboardStats + controllers/globalSate.js) — vérifié
// contre l'implémentation réelle, pas contre la doc OpenAPI seule (Prompt 01,
// BACKEND_INTEGRATION.md §0.1). `totalRevenue`/`averageRating`/`complianceRate`
// n'existent nulle part dans le backend actuel — retirés plutôt qu'inventés ; à
// réintroduire quand Milestone 05 (Agency Performance Metrics) leur donnera une vraie
// source. `activeAgencies`/`todayCollections`/`completeCollections`/`pendingReports`
// renommés pour matcher les noms réels des champs API.
export interface CityBreakdownEntry {
  city: string;
  numberOfAgencies?: number;
  numberOfClients?: number;
  numberOfCollections?: number;
}

export interface MunicipalityStatistics {
  totalMunicipalityAgents: number;
  totalManagers: number;
  totalCollectors: number;
  totalClients: number;
  totalActiveClients: number;

  totalAgencies: number;
  totalActiveAgencies: number;
  totalInactiveAgencies: number;
  totalDeletedAgencies: number;

  agenciesByCity: CityBreakdownEntry[];
  clientsByCity: CityBreakdownEntry[];
  collectionsByCity: CityBreakdownEntry[];

  totalCollections: number;
  dailyCollections: number;
  monthlyCollections: number;
  /**
   * Collectes du jour avec statut 'Collected'. `services/globalState.js` calcule cette
   * valeur sous ce nom, mais `controllers/globalSate.js::getDashboardStats()` ne
   * l'exposait jusqu'ici que sous l'alias `totalCollectionsCollected` (pluriel) — champ
   * ajouté côté backend (voir EditRecap.md) pour exposer aussi le nom exact attendu ici.
   */
  dailyCollectionCollected: number;
  /**
   * Total de collectes signalées un jour ou l'autre, résolues ou non — voir
   * pendingReportsCount pour le compte réellement en attente. Même remarque que
   * ci-dessus : ajouté côté backend en plus de l'alias `totalCollectionsReported`.
   */
  totalCollectionReported: number;
  /** Signalements dont resolutionStatus n'est pas 'resolved' — le vrai compte "en attente". */
  pendingReportsCount: number;

  monthlyClientSubscriptions: number;
  monthlyClientPercentage: number;
}

export interface AgencyAudit {
  id: string;
  name: string;
  status: string;
  clients: number;
  collectors: number;
  zones: number;
  collectionsToday: number;
  completionRate: number;
  /** null tant qu'aucune entité review/notation n'existe dans le schéma (Prompt 05) — jamais fabriqué à 0. */
  rating: number | null;
  /** null tant que le conflit de scoping JWT avec le module Finance n'est pas résolu (Prompt 05). */
  revenue: number | null;
  lastAudit: Date;
  /** null tant qu'aucune règle de conformité définie n'existe (Prompt 05) — jamais fabriqué à 0. */
  complianceScore: number | null;
  issues: string[];
}

export interface WasteStatistic {
  /** Vraie clé d'enum backend (menagers|recyclables|verts|encombrants|speciaux, Prompt 08). */
  type: string;
  /** Libellé français d'affichage (WASTE_TYPE_DISPLAY) — distinct de `type` depuis que
   * celui-ci est la clé d'enum réelle, pas déjà un libellé comme au temps du mock. */
  label: string;
  /** Nombre de collectes de ce type dans la fenêtre — PAS un poids en kg (aucune source
   * réelle de poids nulle part dans le schéma, voir EditRecap.md). */
  quantity: number;
  percentage: number;
  trend: "up" | "down" | "stable";
  color: string;
}

export interface ZoneStatistic {
  cities: any;
  country: any;
  name: string;
  agencies: number;
  clients: number;
  collections: number;
  coverage: number;
  incidents: number;
}

export interface GroupedZoneStatistics {
  country: string;
  cities: ZoneStatistic[];
}

@Component({
  selector: 'app-municipality-dashboard',
  imports: [CommonModule, RouterModule, FormsModule, Signalement, MiniChart, CoverageMap, NotificationBell],
  templateUrl: './municipality-dashboard.html',
  styleUrl: './municipality-dashboard.scss'
})
export class MunicipalityDashboard  implements OnInit {
  currentUser: RegisterUserData | null = null;
  activeTab = "overview";

  isLoadingIncidents = false;

  // "Performance Globale" satisfaction/compliance — GET /municipality/performance-overview
  // (réel, Prompt 07). Voir loadPerformanceOverview().
  performanceOverview: PerformanceOverview | null = null;
  isLoadingPerformanceOverview = false;
  // isPerformanceOverviewMocked / isAgencyPerformanceMocked supprimés (Prompt 15, §7) :
  // les deux valaient déjà `false` en dur (complianceRate/performance d'agence sont de
  // vrais agrégats serveur depuis les Prompts 05/07 ; averageSatisfaction reste `null`
  // honnête plutôt qu'une donnée démo, voir EditRecap.md) — aucun badge "Démo" ne
  // s'affichait donc plus jamais. Retirés avec leurs 2 usages dans le template plutôt
  // que laissés comme des indicateurs toujours faux.
  isLoadingWasteStatistics = false;
  /** Rebuilt only when wasteStatistics actually changes (see loadWasteStatistics()) —
   * never bind a template method call to [config], it would create a new object every
   * change-detection cycle and constantly tear down/rebuild the chart (killing hover/tooltips). */
  wasteChartConfig: ChartConfiguration | null = null;
  monthlyTrend: MonthlyTrendPoint[] = [];
  isLoadingMonthlyTrend = false;
  collectionEvolutionConfig: ChartConfiguration | null = null;

  // "Graphiques de performance" (Prompt 09) — actual vs. target by zone/waste type/collector.
  performanceRecords: PerformanceRecord[] = [];
  isLoadingPerformanceIndicators = false;
  performanceGroupBy: PerformanceGroupType = 'zone';
  performanceZoneFilter = 'all';
  performanceWasteTypeFilter = 'all';
  performanceCollectorFilter = 'all';
  performanceChartConfig: ChartConfiguration | null = null;
  underperformingIndicators: PerformanceIndicator[] = [];
  performanceZoneOptions: string[] = [];
  performanceWasteTypeOptions: string[] = [];
  performanceCollectorOptions: { id: string; name: string }[] = [];

  // "Fréquence de collecte par zone" (Prompt 10) — planned vs. actual cadence per zone.
  zoneFrequencyRecords: ZoneFrequencyRecord[] = [];
  isLoadingZoneFrequency = false;
  zoneFrequencyZoneFilter = 'all';
  zoneFrequencyWasteTypeFilter = 'all';
  /** false = descending (worst zones first, the default "quickly identify" order). */
  zoneFrequencySortAscending = false;
  zoneFrequencyIndicators: ZoneFrequencyIndicator[] = [];
  zoneFrequencyZoneOptions: string[] = [];
  zoneFrequencyWasteTypeOptions: string[] = [];

  /**
   * "Volume Global Collecté" (Prompt 12, real backend) — no longer its own fetch or its
   * own zone/type/collector filters: `GET /municipality/monthly-trend` (Prompt 09,
   * already loaded for "Évolution des Collectes") is a platform-wide aggregate with no
   * such dimensions, so this is now recomputed directly from `monthlyTrend` whenever it
   * loads (see loadMonthlyTrend()) rather than fetched/filtered separately.
   */
  volumeAggregate: VolumeAggregate | null = null;

  /** "Rapport Global" button (Prompt 15) — client-side PDF assembly, no backend. */
  isGeneratingReport = false;

  agencyAudits: AgencyAudit[] = [];
  filteredAgencies: AgencyAudit[] = [];
  /** Recomputed once in loadAgencyAudits()'s subscribe, not called directly from the
   * template's @for — getTopPerformingAgencies() maps to brand-new objects each call,
   * which under `track agency` (by identity) made Angular destroy/recreate this list on
   * every change-detection cycle (NG0956), churning the DOM forever. */
  topPerformingAgencies: { name: string; completionRate: number }[] = [];
  wasteStatistics: WasteStatistic[] = [];
  zoneStatistics: GroupedZoneStatistics[] = [];
  /** "Couverture Territoriale" table vs. map toggle (Prompt 13) — additive, table stays available. */
  coverageView: "table" | "map" = "table";
  /** Same zoneStatistics data, reshaped + coordinate-enriched for <app-coverage-map> —
   * recomputed in buildZoneStatisticsFromAdminStats(), right after zoneStatistics itself
   * updates. Coordinates stay mock for now (Prompt 14, decided with the user): a real
   * replacement (Admin.getCities$()) exists and is ready, but the real City collection
   * currently has no populated coordinates — see EditRecapFront.md, Prompt 14. */
  coverageMapZones: CoverageMapZone[] = [];
  incidents: Incident[] = [];
  filteredIncidents: Incident[] = [];
  /** Recomputed once in loadAllSignalements()'s subscribe — same reason as
   * topPerformingAgencies above: getIncidentBreakdown() builds new objects each call. */
  incidentBreakdown: { type: string; count: number; percentage: number }[] = [];

  /**
   * Header notification bell (Prompt 14) — derived from data this dashboard
   * already loads (incidents, agency compliance), not a separate invented
   * feed. Rebuilt in buildNotifications() whenever `incidents`/`agencyAudits`
   * (re)load; `readNotificationIds` survives those rebuilds so marking a
   * notification read doesn't get silently undone the next time the OTHER
   * source finishes loading (they load independently in loadMunicipalityData()).
   */
  notifications: BellNotification[] = [];
  private readNotificationIds = new Set<string>();
  // zoneStatistics: ZoneStatistic[] = [];

  // Filters
  agenciesFilter = "";
  complianceFilter = "all";
  /**
   * Single shared source of truth for "which period is selected" across the
   * Statistiques tab (Prompt 12) — a Signal (not a plain property) so every
   * one of the five load methods below (07–11) reads the exact same value
   * rather than each keeping its own independent copy. Written only via
   * onStatisticsPeriodChange(), never directly from the template (ngModel
   * can't two-way-bind straight to a signal).
   */
  statisticsPeriod = signal<StatisticsPeriod>("month");
  /** True while a Période change is fanning out to all five sections at once —
   * a single coordinating indicator instead of five independently-timed spinners. */
  isRefreshingStatistics = false;
  /** "Exporter" button (Prompt 16) — client-side export scoped to the Statistiques tab only. */
  statisticsExportFormat: "csv" | "excel" | "pdf" = "csv";
  isExportingStatistics = false;
  incidentsFilter: "all" | "open" | "pending" | "resolved" = "all";
  severityFilter: "all" | "Low" | "Medium" | "High" | "Critical" = "all";
  searchTerm="";
  neighborhoodFilter="";
  // incidentsFilter = "all";

  agenciesFilterParams: FilterParams = {
      status: this.agenciesFilter,
      search:this.searchTerm
  }
  tabs = [
    { id: "overview", label: "Vue d'ensemble", icon: "dashboard", badge: null },
    { id: "agencies", label: "Audit Agences", icon: "business", badge: 0 },
    { id: "statistics", label: "Statistiques", icon: "analytics", badge: null },
    { id: "incidents", label: "Incidents", icon: "report_problem", badge: 0 },
    // {
    //   id: "communications",
    //   label: "Communications",
    //   icon: "campaign",
    //   badge: null,
    // },
  ];
  statisticsAdmin: MunicipalityStatistics | null = null;
  clientGrowth: number = 0;

  constructor(
    private authService: AuthService,
    private agencyService: AgencyService,
    private adminService: Admin,
    private collectionService: CollectionService,
    private notificationService: NotificationService,
    private router: Router,
    private cd: ChangeDetectorRef,
    private mockDataService: MunicipalityMockDataService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadMunicipalityData();
    this.getClientGrowth();
    this.filterIncidents();
  }

  loadMunicipalityData(): void {
    this.loadAgencyAudits(this.agenciesFilterParams);
    this.loadWasteStatistics();
    this.loadMonthlyTrend();
    this.loadPerformanceIndicators();
    this.loadZoneFrequency();
    this.loadAllSignalements();
    // showAdminStatistics() alimente aussi zoneStatistics/coverageMapZones une fois la
    // réponse reçue (buildZoneStatisticsFromAdminStats()) — plus d'appel séparé ici
    // (l'ancien loadZoneStat() appelait une route confirmée inexistante, voir Prompt 01).
    this.showAdminStatistics();
    this.loadPerformanceOverview();
    // this.loadIncidents();
  }

  /**
   * GET /municipality/performance-overview (Prompt 07). `complianceRate` est un vrai
   * agrégat serveur (Collected / (total - Cancelled), toutes agences) — plus mocké.
   * `averageSatisfaction` reste toujours `null` : aucune entité rating/review/feedback
   * n'existe nulle part dans le schéma backend actuel (confirmé en relisant tous les
   * modèles réels, pas seulement les schémas Swagger déclarés) — escaladé comme question
   * produit (voir EditRecap.md), jamais fabriqué en proxy sans décision explicite.
   */
  loadPerformanceOverview(): void {
    this.isLoadingPerformanceOverview = true;
    this.adminService.getPerformanceOverview$().subscribe({
      next: (response: any) => {
        this.performanceOverview = response?.data ?? null;
        this.isLoadingPerformanceOverview = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement de la performance globale:', err);
        this.performanceOverview = null;
        this.isLoadingPerformanceOverview = false;
      },
    });
  }

  /**
   * Prompt 05 — completionRate/collectionsToday/complianceScore/revenue/rating/issues
   * viennent maintenant de GET /api/state_agencies/:agencyId/stats (réel, étendu), un
   * appel par agence (`forkJoin`) puisque cet endpoint n'a pas de variante batch — nombre
   * d'agences resté faible dans toutes les données vues jusqu'ici (dizaines, pas
   * milliers), donc le coût N+1 reste négligeable ; à revisiter si ça change.
   * `complianceScore`/`revenue`/`rating` restent `null` (aucune source réelle nulle part
   * dans le schéma / conflit de scoping JWT pour revenue — voir EditRecap.md) : jamais
   * remplacés par 0, le template affiche "Non disponible" pour ces 3 cas précis.
   * `clients`/`collectors`/`zones` restent sourcés de la liste d'agences elle-même
   * (inchangé) : ce prompt étend les métriques de performance, pas ces 3 compteurs déjà
   * réels avant ce correctif.
   */
  loadAgencyAudits(agenciesFilterParams?: FilterParams ): void {
    this.agencyService.getAllAgenciesFromApi(agenciesFilterParams).subscribe({
      next: (agencies) => {
        const list = agencies?.data ?? [];
        if (!list.length) {
          this.agencyAudits = [];
          this.filteredAgencies = [];
          this.topPerformingAgencies = [];
          this.buildNotifications();
          return;
        }

        const requests: Observable<{ agency: any; stats: any }>[] = list.map((agency: any) =>
          this.agencyService.getAgencyStats$(agency?._id).pipe(
            map((res: any) => ({ agency, stats: res?.success !== false ? (res?.data ?? null) : null }))
          )
        );

        forkJoin(requests).subscribe((results) => {
          this.agencyAudits = results.map(({ agency, stats }) => ({
            id: agency?._id,
            name: agency?.name,
            status: agency?.status || "inactive",
            clients: agency?.clients?.length || 0,
            collectors: agency?.employees?.length || 0,
            zones: agency?.zoneActivite?.length || 0,
            userId: agency?.userId,
            lastAudit: new Date(),
            collectionsToday: stats?.collectionsToday ?? 0,
            completionRate: stats?.completionRate ?? 0,
            complianceScore: stats?.complianceScore ?? null,
            revenue: stats?.revenue ?? null,
            rating: stats?.rating ?? null,
            issues: stats?.issues ?? [],
          }));
          this.filteredAgencies = [...this.agencyAudits];
          this.topPerformingAgencies = this.getTopPerformingAgencies();
          this.buildNotifications();
          const auditTab = this.tabs.find((tab) => tab.id === "agencies");
          if (auditTab) {
            auditTab.badge = this.agencyAudits.length;
            this.cd.detectChanges();
          }
        });
      },
      error: (err) => {
        console.error("Erreur lors du chargement des agences:", err);
        this.notificationService.showError(
          "Erreur",
          "Impossible de charger la liste des agences."
        );
      },
    });
  }

  /**
   * GET /municipality/waste-statistics (Prompt 08) — plus mocké. Le backend ne renvoie
   * que la clé d'enum réelle (menagers/recyclables/...) ; `WASTE_TYPE_DISPLAY` fournit le
   * libellé français et la couleur d'affichage, absents de la réponse serveur.
   */
  loadWasteStatistics(onDone?: () => void): void {
    this.isLoadingWasteStatistics = true;
    const { days } = this.getPeriodConfig(this.statisticsPeriod());
    this.adminService.getWasteStatistics$(days).subscribe({
      next: (response: any) => {
        const rows = response?.data ?? [];
        const stats: WasteStatistic[] = rows.map((row: any) => ({
          type: row.type,
          label: WASTE_TYPE_DISPLAY[row.type]?.label ?? row.type,
          quantity: row.quantity,
          percentage: row.percentage,
          trend: row.trend,
          color: WASTE_TYPE_DISPLAY[row.type]?.color ?? '#9ca3af',
        }));
        this.wasteStatistics = stats;
        this.wasteChartConfig = buildWasteBreakdownConfig(stats);
        this.isLoadingWasteStatistics = false;
        onDone?.();
      },
      error: (err) => {
        console.error("Erreur lors du chargement de la répartition des déchets:", err);
        this.wasteStatistics = [];
        this.wasteChartConfig = null;
        this.isLoadingWasteStatistics = false;
        onDone?.();
      },
    });
  }

  hasWasteData(): boolean {
    return this.wasteStatistics.some((w) => w.quantity > 0);
  }

  /**
   * GET /municipality/monthly-trend (Prompt 09) — plus mocké. Réutilise côté serveur
   * exactement la même agrégation de base que loadWasteStatistics() (Prompt 08) : garanti
   * de ne jamais diverger sur une fenêtre qui se recoupe (exigence explicite du roadmap).
   */
  /**
   * Also drives "Volume Global Collecté" (Prompt 12) — `volumeAggregate` is derived
   * from this same `trend` array (`aggregateVolume()`), not a separate fetch. Both the
   * success and error paths recompute it so it never keeps a stale value from a
   * previous period once this section starts (re)loading.
   */
  loadMonthlyTrend(onDone?: () => void): void {
    this.isLoadingMonthlyTrend = true;
    const { months } = this.getPeriodConfig(this.statisticsPeriod());
    this.adminService.getMonthlyTrend$(months).subscribe({
      next: (response: any) => {
        const trend: MonthlyTrendPoint[] = response?.data ?? [];
        this.monthlyTrend = trend;
        this.collectionEvolutionConfig = buildCollectionEvolutionConfig(trend);
        this.volumeAggregate = aggregateVolume(trend);
        this.isLoadingMonthlyTrend = false;
        onDone?.();
      },
      error: (err) => {
        console.error("Erreur lors du chargement de l'évolution des collectes:", err);
        this.monthlyTrend = [];
        this.collectionEvolutionConfig = null;
        this.volumeAggregate = aggregateVolume([]);
        this.isLoadingMonthlyTrend = false;
        onDone?.();
      },
    });
  }

  hasMonthlyTrendData(): boolean {
    return this.monthlyTrend.some((point) => point.totalCollections > 0);
  }

  /**
   * Mock-backed for now (see MunicipalityMockDataService) — no endpoint
   * exists yet for per-collector actual-vs-target performance. Loads the
   * flat record list once, derives the filter dropdown option lists from
   * it, then applies whatever filters/grouping are currently selected.
   */
  loadPerformanceIndicators(onDone?: () => void): void {
    this.isLoadingPerformanceIndicators = true;
    const { seed } = this.getPeriodConfig(this.statisticsPeriod());
    this.mockDataService.getPerformanceRecords$(seed).subscribe({
      next: (records) => {
        this.performanceRecords = records;
        this.performanceZoneOptions = Array.from(new Set(records.map((r) => r.zoneName))).sort();
        this.performanceWasteTypeOptions = this.mockDataService.getWasteTypeLabels();
        this.performanceCollectorOptions = records.map((r) => ({ id: r.collectorId, name: r.collectorName }));
        this.applyPerformanceFilters(onDone);
      },
      error: (err) => {
        console.error("Erreur lors du chargement des indicateurs de performance:", err);
        this.performanceRecords = [];
        this.performanceChartConfig = null;
        this.underperformingIndicators = [];
        this.isLoadingPerformanceIndicators = false;
        onDone?.();
      },
    });
  }

  /**
   * §4 (Prompt 13) — the shared "Période" → parameter translation, and the definitive
   * record of which Statistiques-tab sections that selection actually affects. Kept up
   * to date as sections migrate off mock data (most recently Prompt 12); this replaces
   * five section-local translations with one, per the roadmap's own request.
   *
   *  - `days`: a real date-range window (backend computes `from`/`to` from it, or the
   *    frontend could pass explicit `from`/`to` instead — `days` is the equivalent
   *    shorthand both server and client already agree on, not a mock stand-in). Sent to:
   *      - waste breakdown (`GET /waste-statistics`, Prompt 08) — fully period-affected.
   *      - zone frequency's ACTUAL side only (`GET /zone-frequency`, Prompt 11) —
   *        `plannedFrequency` in that same response reflects whatever Planning is
   *        currently most-recently-created per zone/wasteType, REGARDLESS of `days`;
   *        there's no "planned frequency as of a past date" in the schema. Confirmed
   *        with the backend (see its own resolvePeriodWindow()/getZoneFrequency
   *        comments), not silently assumed. Changing Période visibly moves
   *        `actualFrequency` but never `plannedFrequency` for the same row.
   *      - waste records (`GET /waste-records`, Prompt 12) — fully period-affected, but
   *        not currently called by any Statistiques-tab section (no raw-record list UI
   *        exists yet; the endpoint is available for a future one).
   *  - `months`: how many trailing months the evolution chart shows (`GET
   *    /monthly-trend`, Prompt 09) — fully period-affected, and also what "Volume
   *    Global Collecté" derives from (Prompt 12: no separate fetch/window of its own,
   *    see aggregateVolume()). Shorter periods show fewer months rather than
   *    collapsing to a single point, so the trend line still reads as a trend at every
   *    period (an explicit judgment call — "today"/"week" don't map onto "months of
   *    trend" literally, so this degrades gracefully instead of forcing a
   *    literal-but-useless 1-month chart).
   *  - `seed`: performance indicators — the one section with NO real backend endpoint
   *    at all yet (still `MunicipalityMockDataService`, per-collector snapshot, no date
   *    field on its records whatsoever). A distinct seed per period reshuffles the mock
   *    numbers as a stand-in for period-sensitivity; this is NOT part of the real
   *    from/to contract the other four sections share, and will be removed once/if that
   *    endpoint is built for real rather than extended to accept a period.
   */
  private getPeriodConfig(period: StatisticsPeriod): { days: number; months: number; seed: number } {
    const configs: Record<StatisticsPeriod, { days: number; months: number; seed: number }> = {
      today: { days: 1, months: 3, seed: 91001 },
      week: { days: 7, months: 3, seed: 91101 },
      month: { days: 30, months: 6, seed: 91202 },
      quarter: { days: 90, months: 9, seed: 91303 },
      year: { days: 365, months: 12, seed: 91404 },
    };
    return configs[period];
  }

  setPerformanceGroupBy(groupBy: PerformanceGroupType): void {
    this.performanceGroupBy = groupBy;
    this.applyPerformanceFilters();
  }

  /**
   * Purely client-side (already-loaded performanceRecords, no new fetch) —
   * the brief loading flag is a UX-consistency simulation matching how the
   * other mock-backed sections on this tab show a loading state, not a
   * real request.
   */
  applyPerformanceFilters(onDone?: () => void): void {
    this.isLoadingPerformanceIndicators = true;
    setTimeout(() => {
      const filtered = this.performanceRecords.filter(
        (record) =>
          (this.performanceZoneFilter === "all" || record.zoneName === this.performanceZoneFilter) &&
          (this.performanceWasteTypeFilter === "all" || record.wasteType === this.performanceWasteTypeFilter) &&
          (this.performanceCollectorFilter === "all" || record.collectorId === this.performanceCollectorFilter)
      );

      const indicators = aggregatePerformanceRecords(filtered, this.performanceGroupBy);
      this.performanceChartConfig = indicators.length > 0 ? buildPerformanceIndicatorsConfig(indicators) : null;
      this.underperformingIndicators = indicators.filter(
        (indicator) => comparePerformance(indicator.actual, indicator.target) === "under"
      );
      this.isLoadingPerformanceIndicators = false;
      onDone?.();
    }, MOCK_NETWORK_DELAY_MS);
  }

  hasPerformanceIndicatorsData(): boolean {
    return !!this.performanceChartConfig;
  }

  /**
   * Mock-backed for now (see MunicipalityMockDataService) — no endpoint
   * exists yet for planned-vs-actual collection frequency. Same load
   * pattern as loadPerformanceIndicators(): fetch the flat records once,
   * derive filter option lists, then apply filters/sort.
   */
  /**
   * GET /municipality/zone-frequency (Prompt 11, real backend). `days` (not `seed` — the
   * mock's seed-reshuffle hack has no real equivalent) drives the ACTUAL side's real
   * date-range window server-side; the PLANNED side reflects current Planning policy
   * regardless of window. `zoneFrequencyWasteTypeOptions` now lists the 5 real enum keys
   * (WASTE_TYPE_DISPLAY) rather than the mock's French-labeled placeholders — the
   * filter's `[value]` must match `record.wasteType`'s raw key, display via getWasteTypeLabel().
   */
  loadZoneFrequency(onDone?: () => void): void {
    this.isLoadingZoneFrequency = true;
    const { days } = this.getPeriodConfig(this.statisticsPeriod());
    this.adminService.getZoneFrequency$(days).subscribe({
      next: (response: any) => {
        const records: ZoneFrequencyRecord[] = response?.data ?? [];
        this.zoneFrequencyRecords = records;
        this.zoneFrequencyZoneOptions = Array.from(new Set(records.map((r) => r.zoneName))).sort();
        this.zoneFrequencyWasteTypeOptions = Object.keys(WASTE_TYPE_DISPLAY);
        this.applyZoneFrequencyFilters(onDone);
      },
      error: (err) => {
        console.error("Erreur lors du chargement de la fréquence de collecte par zone:", err);
        this.zoneFrequencyRecords = [];
        this.zoneFrequencyIndicators = [];
        this.isLoadingZoneFrequency = false;
        onDone?.();
      },
    });
  }

  /**
   * Purely client-side (already-loaded zoneFrequencyRecords, no new fetch) —
   * same UX-consistency simulated delay as applyPerformanceFilters().
   */
  applyZoneFrequencyFilters(onDone?: () => void): void {
    this.isLoadingZoneFrequency = true;
    setTimeout(() => {
      const filtered = this.zoneFrequencyRecords.filter(
        (record) =>
          (this.zoneFrequencyZoneFilter === "all" || record.zoneName === this.zoneFrequencyZoneFilter) &&
          (this.zoneFrequencyWasteTypeFilter === "all" || record.wasteType === this.zoneFrequencyWasteTypeFilter)
      );

      const indicators = aggregateZoneFrequencyRecords(filtered);
      this.zoneFrequencyIndicators = this.zoneFrequencySortAscending ? indicators.reverse() : indicators;
      this.isLoadingZoneFrequency = false;
      onDone?.();
    }, MOCK_NETWORK_DELAY_MS);
  }

  toggleZoneFrequencySort(): void {
    this.zoneFrequencySortAscending = !this.zoneFrequencySortAscending;
    this.zoneFrequencyIndicators = [...this.zoneFrequencyIndicators].reverse();
  }

  hasZoneFrequencyData(): boolean {
    return this.zoneFrequencyIndicators.length > 0;
  }

  /** Real backend enum (Prompt 11, Planning.frequency) — replaces the mock's former daily/weekly/monthly. */
  getFrequencyLabel(frequency: CollectionFrequency): string {
    const labels: Record<CollectionFrequency, string> = {
      unique: "Ponctuelle",
      hebdomadaire: "Hebdomadaire",
      bimensuel: "Bimensuelle",
      mensuel: "Mensuelle",
      none: "Aucune",
    };
    return labels[frequency];
  }

  /** French display label for a real waste-type enum key (WASTE_TYPE_DISPLAY) — the
   * zone-frequency filter/table work with the raw key (menagers, ...), not a label. */
  getWasteTypeLabel(type: string): string {
    return WASTE_TYPE_DISPLAY[type]?.label ?? type;
  }

  /** `volumeAggregate` is now derived directly in loadMonthlyTrend() (Prompt 12) — see
   * its own comment for why "Volume Global Collecté" no longer has a separate fetch. */
  hasVolumeData(): boolean {
    return !!this.volumeAggregate && this.volumeAggregate.targetCollections > 0;
  }

  // loadZoneStatistics() supprimée (Prompt 15, §7) : confirmée sans aucun appelant par
  // grep sur tout `src/` (pas seulement ce fichier) — remplacée depuis par
  // buildZoneStatisticsFromAdminStats() ci-dessous. `AgencyService.getAgenceStats()`
  // (qu'elle appelait) N'EST PAS supprimée : `admin-dashboard.ts` a sa PROPRE
  // `loadZoneStatistics()`, distincte de celle-ci, toujours réellement appelée — la
  // prémisse du prompt ("confirmée morte") n'était vraie que pour cet appelant-ci, pas
  // pour la méthode de service elle-même. Vérifié avant de supprimer quoi que ce soit,
  // pas juste ce fichier.

  /**
   * Statistiques par ville pour l'onglet "Couverture Territoriale". Dérivées directement
   * de `statisticsAdmin` (déjà chargé par showAdminStatistics()) plutôt que d'un appel
   * HTTP séparé : l'ancien `Admin.getAllStatisticCity()` appelait `/auth/city/municipality`,
   * une route confirmée absente de tout le backend (Prompt 01, BACKEND_INTEGRATION.md
   * §0.2 — grep exhaustif de routes/*.js et du reste du repo backend, zéro résultat).
   * Les nombres agences/clients/collectes par ville viennent bien de vraies agrégations
   * serveur (agenciesByCity/clientsByCity/collectionsByCity, services/globalState.js).
   *
   * `coverage` (compliance) et `incidents` (signalements) restent à 0 : aucune de ces deux
   * notions n'existe par ville nulle part dans le backend actuel (ni sur Agency, ni sur
   * Collecte) — laissés à 0 plutôt qu'une valeur inventée, à combler par un futur jalon si
   * cette donnée devient nécessaire.
   *
   * Limitation distincte, non résolue ici : la liste des villes elle-même vient de
   * `MOCK_CITIES` (data/countries-org.mock.ts), un catalogue statique de 5 pays, pas de la
   * vraie API territoriale (`GET /cities`, territory.route.js). Signalé comme dépendance
   * mock séparée, hors du périmètre de cet alignement de contrat statistiques.
   */
  buildZoneStatisticsFromAdminStats(): void {
    const stats = this.statisticsAdmin;
    const grouped: { [key: string]: ZoneStatistic[] } = {};

    MOCK_CITIES.forEach((city) => {
      const country = city.country.name || "Burkina Faso";
      if (!grouped[country]) {
        grouped[country] = [];
      }

      grouped[country].push({
        country,
        name: city.name,
        agencies: stats?.agenciesByCity?.find((c) => c.city === city.name)?.numberOfAgencies ?? 0,
        clients: stats?.clientsByCity?.find((c) => c.city === city.name)?.numberOfClients ?? 0,
        collections: stats?.collectionsByCity?.find((c) => c.city === city.name)?.numberOfCollections ?? 0,
        coverage: 0,
        incidents: 0,
        cities: [],
      });
    });

    this.zoneStatistics = Object.keys(grouped).map((country) => ({
      country,
      cities: grouped[country],
    }));
    this.coverageMapZones = this.buildCoverageMapZones();
  }

  /**
   * Reshapes the already-loaded zoneStatistics (same data as the tabular
   * Couverture Territoriale view) into what <app-coverage-map> needs, adding
   * only a coordinate lookup (mock — see MunicipalityMockDataService.
   * getZoneCoordinates(), kept on purpose for now, Prompt 14). Not a second
   * dataset: same agencies/clients/collections/incidents/coverage numbers
   * the table already shows.
   */
  private buildCoverageMapZones(): CoverageMapZone[] {
    const zones: CoverageMapZone[] = [];
    for (const group of this.zoneStatistics) {
      for (const city of group.cities) {
        const coordinates = this.mockDataService.getZoneCoordinates(city.name);
        if (!coordinates) {
          continue;
        }
        zones.push({
          id: city.name,
          name: city.name,
          coordinates,
          agencies: city.agencies,
          clients: city.clients,
          collections: city.collections,
          incidents: city.incidents,
          coverage: city.coverage,
        });
      }
    }
    return zones;
  }

  /**Listes des signalements des users */
  /**
   * Charge les signalements (Prompt 03, BACKEND_INTEGRATION.md §0.5) — appelait
   * auparavant getAllReports() sans aucun paramètre : le backend retombait sur ses
   * défauts (`limit=25, skip=0`, aucun filtre de statut), donc ce tableau ne montrait
   * jamais que les 25 collectes les plus récentes de l'agence, de N'IMPORTE QUEL statut
   * (Scheduled/Collected/... noyant les vrais signalements), jamais le vrai total.
   *
   * `status: 'Reported'` : seule valeur de l'enum Collecte.status qui correspond à un
   * signalement réel (voir models/Collecte.js) — sans ce filtre, le badge "Incidents" et
   * getIncidentBreakdown() comptaient des collectes normales, pas des signalements.
   *
   * `limit: INCIDENTS_FETCH_LIMIT` : <app-signalement> pagine déjà côté client sur
   * l'intégralité du tableau reçu (pagedIncidents, signalement.ts) — pas de pagination
   * serveur nécessaire ici, juste un plafond assez généreux pour couvrir le volume réel de
   * signalements. 300 est un plafond provisoire (backend clampé à 500 max, Prompt 03) : à
   * ajuster si le volume réel de signalements municipaux dépasse ce seuil, ou à remplacer
   * par un vrai infinite-scroll si ça devient courant.
   *
   * Filtré en plus sur `resolutionStatus !== 'resolved'` : `status: 'Reported'` seul
   * inclut aussi les signalements déjà résolus (resolveReport() ne change jamais `status`,
   * voir Prompt 01/EditRecap.md). Sans ce filtre, le badge de l'onglet et le tableau
   * comptaient un signalement de plus que la carte KPI "Incidents non résolus"
   * (statisticsAdmin.pendingReportsCount, qui applique déjà ce même filtre côté serveur) —
   * les deux nombres doivent représenter la même chose.
   */
  loadAllSignalements() {
    this.isLoadingIncidents = true;
    this.adminService.getAllReports({ status: 'Reported', limit: INCIDENTS_FETCH_LIMIT }).subscribe({
      next: (response: any) => {
        this.incidents = (response.collectes ?? []).filter(
          (i: Incident) => i.resolutionStatus !== 'resolved'
        );
        this.isLoadingIncidents = false;
        this.filteredIncidents = [...this.incidents];
        this.incidentBreakdown = this.getIncidentBreakdown();
        this.buildNotifications();
        console.log("signalements in response", response);
        console.log("signalements in dashboard", this.filteredIncidents);
        const incidentsTab = this.tabs.find((tab) => tab.id === "incidents");
        if (incidentsTab) {
          incidentsTab.badge = this.incidents.length;
          this.cd.detectChanges();
        }
      },
    });
  }

  // Utility methods
  getAgencyStatusText(status?: string): string {
    if (!status) {
      return `${this.statisticsAdmin?.totalActiveAgencies} actives`;
    }
    const statusTexts = {
      active: "Active",
      inactive: "Inactive",
      suspended: "Suspendue",
    };
    return statusTexts[status as keyof typeof statusTexts] || status;
  }

  getClientStatusText(status?: string): string {
    if (!status) {
      return `${this.statisticsAdmin?.totalClients} actives`;
    }
    const statusTexts = {
      active: "Active",
      inactive: "Inactive",
      suspended: "Suspendue",
    };
    return statusTexts[status as keyof typeof statusTexts] || status;
  }

  getClientGrowth() {
    this.clientGrowth = Math.floor(Math.random() * 10) + 5;
    this.cd.detectChanges();
  }

  getCollectionRate(): number {
    const collected = this.statisticsAdmin?.dailyCollectionCollected ?? 0;
    const total = this.statisticsAdmin?.dailyCollections ?? 0;
    if (total === 0) return 0;
    return Math.round((collected / total) * 100);
  }

  // Aucune source réelle pour un taux de conformité aujourd'hui (ni sur /api/statistics,
  // ni ailleurs dans l'API — voir Prompt 01). Retourne un état honnête plutôt qu'un calcul
  // sur une donnée mockée ; à rebrancher quand Milestone 05 (Agency Performance Metrics)
  // exposera un vrai complianceScore/complianceRate.
  getComplianceText(): string {
    return "Non disponible";
  }

  getIncidentSeverity(): string {
    const pending = this.statisticsAdmin?.pendingReportsCount ?? 0;
    if (pending <= 5) return "Faible";
    if (pending <= 10) return "Modéré";
    return "Élevé";
  }

  getStars(rating: number): number[] {
    if (!rating || rating < 0) return [];
    return new Array(Math.floor(rating)).fill(0);
  }

  getTrendIcon(trend: string): string {
    const icons = {
      up: "trending_up",
      down: "trending_down",
      stable: "trending_flat",
    };
    return icons[trend as keyof typeof icons] || "trending_flat";
  }

  getCoverageBadgeClass(coverage: number): string {
    if (coverage >= 75) return "coverage-excellent";
    if (coverage >= 55) return "coverage-good";
    return "coverage-poor";
  }

  getRecentIncidents(): Incident[] {
    return this.incidents.slice(0, 5);
  }

  getSeverityIcon(severity: string): string {
    const icons = {
      critical: "dangerous",
      high: "priority_high",
      medium: "warning",
      low: "info",
    };
    return icons[severity as keyof typeof icons] || "i";
  }

  getSeverityText(severity: string): string {
    const texts = {
      critical: "Critique",
      high: "Élevée",
      medium: "Moyenne",
      low: "Faible",
    };
    return texts[severity as keyof typeof texts] || severity;
  }

  getIncidentTypeText(type: string): string {
    const types = {
      missed_collection: "Collecte manquée",
      problem: "Collecte manquée",
      compliance_issue: "Non-conformité",
      complaint: "Réclamation",
      technical_issue: "Problème technique",
      regular: "Incident non précisé",
      other: "Autre",
    };
    return types[type as keyof typeof types] || type;
  }

  getIncidentStatusText(status: string): string {
    const statuses = {
      open: "Ouvert",
      pending: "En cours",
      resolved: "Résolu",
      reported: "En cours",
      scheduled: "Programmée",
      collected: "Effectuée",
    };
    return statuses[status as keyof typeof statuses] || status;
  }

  getComplianceClass(score: number | null): string {
    if (score === null) return "unknown";
    if (score >= 95) return "excellent";
    if (score >= 85) return "good";
    return "poor";
  }

  getTopPerformingAgencies(): any[] {
    // Sort a copy — `this.agencyAudits` now has real completionRate variance
    // (Prompt 06), so sorting in place here would silently reorder the
    // Audit Agences tab's own list every time this method runs.
    return [...this.agencyAudits]
      .sort((a, b) => b.completionRate - a.completionRate)
      .slice(0, 5)
      .map((agency) => ({
        name: agency.name,
        completionRate: agency.completionRate,
      }));
  }

  /**
   * `incidents` defaults to `this.incidents` (the full unfiltered set, what the
   * Statistiques tab's "Incidents par Catégorie" card shows) — generateGlobalReport()
   * passes `this.filteredIncidents` instead so the report's breakdown matches
   * whatever the Incidents tab's own filters currently show on screen.
   */
  getIncidentBreakdown(incidents: Incident[] = this.incidents): { type: string; count: number; percentage: number }[] {
    const total = incidents.length;
    if (total === 0) {
      return [];
    }

    // Grouped by display label (not the raw `type` key) so aliases the
    // backend may still send — e.g. legacy 'problem' vs 'missed_collection',
    // both mapped to "Collecte manquée" by getIncidentTypeText() — merge
    // into a single bucket instead of appearing twice.
    const countsByLabel = new Map<string, number>();
    for (const incident of incidents) {
      const label = this.getIncidentTypeText(incident.type);
      countsByLabel.set(label, (countsByLabel.get(label) ?? 0) + 1);
    }

    return Array.from(countsByLabel.entries()).map(([type, count]) => ({
      type,
      count,
      percentage: Math.round((count / total) * 100),
    }));
  }

  /**
   * Header notification bell content (Prompt 14) — recent incidents +
   * agencies with a compliance concern, merged and sorted by date. Called
   * from both loadAgencyAudits() and loadAllSignalements()'s subscribes
   * (they load independently), so it must tolerate running before the other
   * source has arrived yet — an empty `this.incidents`/`this.agencyAudits`
   * just contributes nothing, not an error.
   */
  private buildNotifications(): void {
    const incidentNotifications: BellNotification[] = [...this.incidents]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
      .map((incident) => {
        const id = `incident-${incident._id}`;
        return {
          id,
          icon: "report_problem",
          title: this.getIncidentTypeText(incident.type),
          message: `${incident.agencyName} — ${incident.comment || incident.description || "Aucun détail fourni."}`,
          date: new Date(incident.date),
          read: this.readNotificationIds.has(id),
          severity: this.severityForIncident(incident.severity),
        };
      });

    // agency.complianceScore reste toujours `null` aujourd'hui (Prompt 05 : aucune règle de
    // conformité définie, aucune source réelle) — les comparaisons `< 85`/`< 70` ci-dessous
    // ne s'appliquent donc que si une vraie valeur existe un jour, jamais sur `null`.
    const complianceNotifications: BellNotification[] = this.agencyAudits
      .filter((agency) => agency.issues.length > 0 || (agency.complianceScore !== null && agency.complianceScore < 85) || agency.status !== "active")
      .map((agency) => {
        const id = `agency-${agency.id}`;
        const reason = agency.issues.length > 0
          ? agency.issues[0]
          : agency.complianceScore !== null
            ? `Score de conformité : ${agency.complianceScore}%`
            : `Agence ${agency.status}`;
        return {
          id,
          icon: "business",
          title: `Conformité — ${agency.name}`,
          message: reason,
          date: new Date(agency.lastAudit),
          read: this.readNotificationIds.has(id),
          severity: ((agency.complianceScore !== null && agency.complianceScore < 70) || agency.status === "suspended" ? "high" : "medium") as BellNotification["severity"],
        };
      });

    this.notifications = [...incidentNotifications, ...complianceNotifications]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 20);
  }

  private severityForIncident(severity: Incident["severity"]): BellNotification["severity"] {
    switch (severity) {
      case "Critical":
        return "critical";
      case "High":
        return "high";
      case "Medium":
        return "medium";
      default:
        return "low";
    }
  }

  onNotificationMarkAsRead(id: string): void {
    this.readNotificationIds.add(id);
    this.notifications = this.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
  }

  onAllNotificationsMarkAsRead(): void {
    this.notifications.forEach((n) => this.readNotificationIds.add(n.id));
    this.notifications = this.notifications.map((n) => ({ ...n, read: true }));
  }

  // Statistics
  showAdminStatistics(): void {
    this.adminService.getAllStatistics().subscribe({
      next: (statistics: { stats: MunicipalityStatistics }) => {
        this.statisticsAdmin = statistics.stats;
        this.buildZoneStatisticsFromAdminStats();
      },
      error: (err) => {
        console.error("Erreur lors de la récupération des statistiques:", err);
      },
    });
  }

  // Filter methods
  filterAgencies(): void {
    // this.filteredAgencies = this.agencyAudits.filter((agency) => {
    //   const statusMatch =
    //     this.agenciesFilter === "all" || agency.status === this.agenciesFilter;
    //   let complianceMatch = true;

    //   if (this.complianceFilter === "excellent") {
    //     complianceMatch = agency.complianceScore >= 95;
    //   } else if (this.complianceFilter === "good") {
    //     complianceMatch =
    //       agency.complianceScore >= 85 && agency.complianceScore < 95;
    //   } else if (this.complianceFilter === "poor") {
    //     complianceMatch = agency.complianceScore < 85;
    //   }

    //   return statusMatch && complianceMatch;
    // });
    this.agenciesFilterParams = {
      status: this.agenciesFilter,
      search:this.searchTerm
    }
    console.log('agenciesFilterParams', this.agenciesFilterParams);
    this.loadAgencyAudits(this.agenciesFilterParams);
  }


  filterIncidents(): void {
    this.filteredIncidents = this.incidents.filter((incident) => {
      const statusMatch =
        this.incidentsFilter === "all" ||
        incident.status === this.incidentsFilter;
      const severityMatch =
        this.severityFilter === "all" ||
        incident.severity === this.severityFilter;
      return statusMatch && severityMatch;
    });
  }

  /**
   * Wires up Signalement's `assignReport`/`resolvedIncident` outputs (Prompt 17) —
   * previously unlistened here, so a manager-role user's Assigner/Traiter/Résoudre
   * clicks inside this dashboard's Incidents tab were silently dropped (the events
   * fired, nothing downstream reacted). This is a purely local/optimistic mutation
   * of `incidents` — `filteredIncidents` is then re-derived via filterIncidents() so
   * the currently active status/severity filters stay respected — no backend call,
   * matching every other mock-backed feature on this dashboard. Signalement's own
   * `currentUser?.role === 'manager'` gate on these buttons is untouched here: which
   * roles can SEE these actions is a product decision, explicitly out of scope for
   * this prompt.
   *
   * TODO(backend): once real assign/resolve endpoints exist, replace this optimistic
   * local mutation with a real persisted call (and a rollback path if it fails)
   * instead of mutating `incidents` directly.
   */
  /**
   * Appelait auparavant seulement `target.status = "pending"`/`assignedTo` en mémoire —
   * jamais persisté, et une valeur ('pending') qui n'existe même pas dans le vrai enum
   * `Collecte.status`. Appelle maintenant le vrai `PATCH /collectes/:id/assign-team`
   * (Admin.assignReportToTeam$, Prompt 06) et met à jour l'incident depuis la réponse
   * serveur seulement après confirmation.
   *
   * Note (Prompt 06, confirmé par l'utilisateur) : "Seuls les managers peuvent
   * assigner/résoudre" — ce handler reste donc **inatteignable en pratique** pour un
   * agent de mairie : <app-signalement> ne rend le bouton "Assigner" que pour
   * `currentUser?.role === 'manager'`, jamais 'municipality'. Corrigé quand même (au
   * lieu de laisser une mutation locale fictive) par cohérence avec le reste du
   * dashboard et au cas où cette règle de visibilité évoluerait.
   */
  onAssignReport(payload: { incidentId: string; teamId: string }): void {
    const assignedBy = this.currentUser?._id ?? this.currentUser?.id ?? '';
    this.adminService.assignReportToTeam$(payload.incidentId, payload.teamId, assignedBy).subscribe({
      next: (response: any) => {
        const updated = response?.data;
        const target = this.incidents.find((i) => i._id === payload.incidentId);
        if (target) {
          target.resolutionTeamId = updated?.resolutionTeamId ?? target.resolutionTeamId;
          target.resolutionStatus = updated?.resolutionStatus ?? 'in_progress';
        }
        this.filterIncidents();
        this.incidentBreakdown = this.getIncidentBreakdown();
        this.buildNotifications();
        this.notificationService.showSuccess("Signalement affecté", "Le signalement a été affecté à l'équipe.");
      },
      error: (err) => {
        console.error("Erreur lors de l'affectation du signalement:", err);
        this.notificationService.showError("Erreur", "Impossible d'affecter ce signalement pour le moment.");
      },
    });
  }

  /**
   * Appelait auparavant seulement `target.status = "resolved"` en mémoire — jamais
   * persisté (aucun appel réseau), donc annulé au prochain rechargement, et incohérent
   * avec le filtre de loadAllSignalements() (qui exclut resolutionStatus === 'resolved'
   * depuis ce même correctif) : l'incident aurait affiché "Résolue" localement tout en
   * continuant à compter dans "Incidents non résolus" jusqu'au rechargement suivant.
   * Appelle maintenant le vrai `PATCH /collectes/:id/resolve` (Admin.resolveCollecte$,
   * déjà écrit mais jamais appelé depuis aucun dashboard) et retire l'incident de la liste
   * seulement après confirmation serveur — cohérent avec le fait que resolveReport() ne
   * remet jamais `status` à autre chose que 'Reported' (voir EditRecap.md, Prompt 01).
   */
  onResolvedIncident(incidentId: string): void {
    const resolvedBy = this.currentUser?._id ?? this.currentUser?.id ?? '';
    this.adminService.resolveCollecte$(incidentId, resolvedBy, 'Résolu depuis le tableau de bord municipal').subscribe({
      next: () => {
        this.incidents = this.incidents.filter((i) => i._id !== incidentId);
        this.filterIncidents();
        this.incidentBreakdown = this.getIncidentBreakdown();
        this.buildNotifications();
        const incidentsTab = this.tabs.find((tab) => tab.id === "incidents");
        if (incidentsTab) incidentsTab.badge = this.incidents.length;
        this.notificationService.showSuccess("Incident résolu", "L'incident a été marqué comme résolu.");
      },
      error: (err) => {
        console.error("Erreur lors de la résolution de l'incident:", err);
        this.notificationService.showError("Erreur", "Impossible de résoudre cet incident pour le moment.");
      },
    });
  }

  // Action methods
  /**
   * Client-side PDF assembly (Prompt 15) — no backend endpoint exists yet, so
   * this reads whatever's already in component state (same convention as
   * every other mock-backed section on this dashboard) rather than fetching
   * anything new. Mirrors the jsPDF/autoTable conventions already established
   * in team-list.ts/planning-detail.ts (default `jsPDF` import, standalone
   * `autoTable(doc, {...})`, lazy `await import(...)` so the libraries don't
   * bloat the initial bundle for a rarely-used action).
   *
   * Every section pulls from the CURRENTLY FILTERED/scoped state, not raw
   * totals: agencies from `filteredAgencies`, incidents from
   * `filteredIncidents`, and the Statistiques-tab sections from whatever
   * `statisticsPeriod`/per-section filters are active — so the report matches
   * what's actually on screen when the user clicks the button.
   */
  async generateGlobalReport(): Promise<void> {
    if (this.isGeneratingReport) {
      return;
    }
    this.isGeneratingReport = true;
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = 12;
      const finalY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
      const ensureSpace = (y: number, needed = 30): number => {
        if (y + needed > pageHeight - 15) {
          doc.addPage();
          return 20;
        }
        return y;
      };
      const sectionTitle = (title: string, y: number): number => {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(title, marginX, y);
        return y + 6;
      };
      const darkHeader: [number, number, number] = [30, 41, 59];
      const zebraRow: [number, number, number] = [248, 250, 252];
      const tableStyles = {
        headStyles: { fillColor: darkHeader, textColor: 255, fontSize: 9, fontStyle: "bold" as const },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: zebraRow },
        margin: { left: marginX, right: marginX },
      };

      // Header band
      doc.setFillColor(22, 163, 74);
      doc.rect(0, 0, pageWidth, 24, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.text("SAHELYS – Rapport Global Municipal", marginX, 14);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Exporté le ${new Date().toLocaleDateString("fr-FR")} · Période : ${this.getPeriodLabel(this.statisticsPeriod())}`,
        marginX,
        20
      );

      let y = 32;

      // Section 1 — Header KPIs
      y = sectionTitle("Indicateurs clés", y);
      autoTable(doc, {
        startY: y,
        head: [["Indicateur", "Valeur"]],
        body: [
          ["Agences actives", `${this.statisticsAdmin?.totalActiveAgencies ?? "—"} / ${this.statisticsAdmin?.totalAgencies ?? "—"}`],
          ["Clients totaux", `${this.statisticsAdmin?.totalClients ?? "—"}`],
          [
            "Collectes aujourd'hui",
            `${this.statisticsAdmin?.dailyCollectionCollected ?? "—"} / ${this.statisticsAdmin?.dailyCollections ?? "—"} (${this.getCollectionRate()}%)`,
          ],
          ["Incidents non résolus", `${this.statisticsAdmin?.pendingReportsCount ?? 0}`],
        ],
        ...tableStyles,
      });
      y = finalY() + 10;

      // Section 2 — Agency audit summary (respects the Audit Agences tab's own search/status filters)
      y = ensureSpace(y);
      y = sectionTitle(`Synthèse des agences (${this.filteredAgencies.length})`, y);
      if (this.filteredAgencies.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [["Agence", "Statut", "Clients", "Collecteurs", "Complétion", "Conformité"]],
          body: this.filteredAgencies.map((a) => [
            a.name,
            this.getAgencyStatusText(a.status),
            `${a.clients}`,
            `${a.collectors}`,
            `${a.completionRate}%`,
            a.complianceScore !== null ? `${a.complianceScore}%` : "Non disponible",
          ]),
          ...tableStyles,
        });
        y = finalY() + 10;
      } else {
        y = this.noDataLine(doc, "Aucune agence ne correspond aux filtres actuels.", marginX, y);
      }

      // Section 3 — Incident breakdown (respects the Incidents tab's own status/severity filters)
      y = ensureSpace(y);
      const incidentBreakdown = this.getIncidentBreakdown(this.filteredIncidents);
      y = sectionTitle(`Répartition des incidents (${this.filteredIncidents.length})`, y);
      if (incidentBreakdown.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [["Type", "Nombre", "Part"]],
          body: incidentBreakdown.map((b) => [b.type, `${b.count}`, `${b.percentage}%`]),
          ...tableStyles,
        });
        y = finalY() + 10;
      } else {
        y = this.noDataLine(doc, "Aucun incident sur le périmètre sélectionné.", marginX, y);
      }

      // Section 4 — Waste breakdown (Prompts 07/12 — already period-scoped via statisticsPeriod)
      if (this.wasteStatistics.length > 0) {
        y = ensureSpace(y);
        y = sectionTitle("Répartition des déchets", y);
        autoTable(doc, {
          startY: y,
          head: [["Type de déchet", "Nb. collectes", "Part", "Tendance"]],
          body: this.wasteStatistics.map((w) => [w.label, `${w.quantity}`, `${w.percentage}%`, w.trend]),
          ...tableStyles,
        });
        y = finalY() + 10;
      }

      // Section 5 — Performance indicators (Prompt 09 — respects its zone/waste-type/collector filters + groupBy)
      const filteredPerformanceRecords = this.performanceRecords.filter(
        (record) =>
          (this.performanceZoneFilter === "all" || record.zoneName === this.performanceZoneFilter) &&
          (this.performanceWasteTypeFilter === "all" || record.wasteType === this.performanceWasteTypeFilter) &&
          (this.performanceCollectorFilter === "all" || record.collectorId === this.performanceCollectorFilter)
      );
      const performanceIndicators = aggregatePerformanceRecords(filteredPerformanceRecords, this.performanceGroupBy);
      if (performanceIndicators.length > 0) {
        y = ensureSpace(y);
        y = sectionTitle("Indicateurs de performance", y);
        autoTable(doc, {
          startY: y,
          head: [["Regroupement", "Réel", "Objectif", "Statut"]],
          body: performanceIndicators.map((p) => [
            p.label,
            `${p.actual}%`,
            `${p.target}%`,
            this.getPerformanceStatusLabel(comparePerformance(p.actual, p.target)),
          ]),
          ...tableStyles,
        });
        y = finalY() + 10;
      }

      // Section 6 — Zone frequency (Prompt 10 — `zoneFrequencyIndicators` is already filtered
      // AND reflects the current sort-order toggle, so it's used directly rather than
      // re-derived from the raw records, which would silently ignore toggleZoneFrequencySort()).
      if (this.hasZoneFrequencyData()) {
        y = ensureSpace(y);
        y = sectionTitle("Fréquence de collecte par zone", y);
        autoTable(doc, {
          startY: y,
          head: [["Zone", "Type de déchet", "Prévue", "Réelle", "Statut"]],
          body: this.zoneFrequencyIndicators.map((i) => [
            i.zoneName,
            i.wasteType,
            this.getFrequencyLabel(i.plannedFrequency),
            this.getFrequencyLabel(i.actualFrequency),
            this.getZoneFrequencyStatusLabel(i.status),
          ]),
          ...tableStyles,
        });
        y = finalY() + 10;
      }

      // Section 7 — Volume global (Prompt 12 — derived from monthlyTrend, reflects statisticsPeriod
      // via that same load; "Réel"/"Objectif" are collection COUNTS, not a weight — see EditRecap.md)
      if (this.volumeAggregate) {
        y = ensureSpace(y);
        y = sectionTitle("Volume global collecté", y);
        autoTable(doc, {
          startY: y,
          head: [["Collectes réalisées", "Collectes planifiées", "% de l'objectif", "Statut"]],
          body: [
            [
              `${this.volumeAggregate.actualCollections}`,
              `${this.volumeAggregate.targetCollections}`,
              `${this.volumeAggregate.percentageOfTarget}%`,
              this.getPerformanceStatusLabel(this.volumeAggregate.status),
            ],
          ],
          ...tableStyles,
        });
      }

      // Footer — page numbers
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`SAHELYS – page ${i}/${pages}`, marginX, pageHeight - 10);
      }

      doc.save(`rapport-global-municipal-${new Date().toISOString().slice(0, 10)}.pdf`);
      this.notificationService.showSuccess("Rapport généré", "Le rapport global a été téléchargé avec succès.");
    } catch (err) {
      console.error("Erreur lors de la génération du rapport global:", err);
      this.notificationService.showError("Erreur", "Impossible de générer le rapport global.");
    } finally {
      this.isGeneratingReport = false;
    }
  }

  private noDataLine(doc: import("jspdf").jsPDF, text: string, marginX: number, y: number): number {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(text, marginX, y);
    doc.setTextColor(15, 23, 42);
    return y + 10;
  }

  private getPeriodLabel(period: StatisticsPeriod): string {
    const labels: Record<StatisticsPeriod, string> = {
      today: "Aujourd'hui",
      week: "Cette semaine",
      month: "Ce mois",
      quarter: "Ce trimestre",
      year: "Cette année",
    };
    return labels[period];
  }

  private getPerformanceStatusLabel(status: "under" | "on-target" | "over"): string {
    const labels: Record<"under" | "on-target" | "over", string> = {
      under: "Sous l'objectif",
      "on-target": "Conforme",
      over: "Objectif dépassé",
    };
    return labels[status];
  }

  private getZoneFrequencyStatusLabel(status: "insufficient" | "adequate" | "exceeds"): string {
    const labels: Record<"insufficient" | "adequate" | "exceeds", string> = {
      insufficient: "Zone insuffisamment desservie",
      adequate: "Conforme",
      exceeds: "Au-delà de l'objectif",
    };
    return labels[status];
  }

  viewAgencyDetails(agencyId: string): void {
    this.notificationService.showInfo(
      "Détails",
      "Ouverture des détails de l'agence"
    );
    this.router.navigate(["/agencies", agencyId]);
  }

  auditAgency(agencyId: string): void {
    this.notificationService.showInfo(
      "Audit",
      "Lancement de l'audit de l'agence"
    );
  }

  contactAgency(agencyId?: string): void {
    this.router.navigate(["/agencies", agencyId]);
    this.notificationService.showInfo(
      "Contact",
      "Ouverture des informations de contact"
    );
  }

  /** Template (ngModelChange) handler — ngModel can't write to a signal directly. */
  onStatisticsPeriodChange(period: StatisticsPeriod): void {
    this.statisticsPeriod.set(period);
    this.updateStatistics();
  }

  /** Guards against a stale fan-out (see updateStatistics()) clearing the
   * refreshing flag / firing the toast after a newer one has superseded it. */
  private statisticsRefreshToken = 0;

  /**
   * Fans the shared statisticsPeriod out to all five Prompt 07–11 sections
   * at once (Prompt 12) — a single coordinating isRefreshingStatistics flag
   * instead of five independently-timed spinners; the toast now confirms a
   * real reload rather than being the only effect. Each section's own local
   * filters (zone/type/collector/groupBy/sort) are left exactly as the user
   * set them — reloading only re-fetches that section's period-scoped data
   * and re-applies those existing filters against it (unchanged from how
   * each load*() already worked).
   *
   * A generation token guards against rapidly changing the period twice in a
   * row: without it, whichever fan-out happens to finish LAST would clear
   * the flag/fire the toast — even if that's the stale, first-triggered one
   * completing after a second, newer selection already started its own
   * fan-out. Only the fan-out matching the CURRENT token is allowed to
   * finalize.
   */
  updateStatistics(): void {
    const token = ++this.statisticsRefreshToken;
    this.isRefreshingStatistics = true;
    // 4, not 5 (Prompt 12): "Volume Global Collecté" no longer has its own fetch — it's
    // derived inside loadMonthlyTrend() from the same response, so it completes as part
    // of that section rather than needing its own fan-out slot.
    let remaining = 4;
    const onSectionDone = () => {
      remaining--;
      if (remaining === 0 && token === this.statisticsRefreshToken) {
        this.isRefreshingStatistics = false;
        this.notificationService.showInfo("Statistiques", "Statistiques actualisées");
      }
    };
    this.loadWasteStatistics(onSectionDone);
    this.loadMonthlyTrend(onSectionDone);
    this.loadPerformanceIndicators(onSectionDone);
    this.loadZoneFrequency(onSectionDone);
  }

  /**
   * Whether ANY section on the Statistiques tab currently has data to export —
   * each underlying `hasXData()` check already reflects that section's own
   * active filters (e.g. `hasPerformanceIndicatorsData()` is false once
   * filters narrow its indicators to zero), so this stays accurate without
   * re-deriving anything. Drives both the "Exporter" button's disabled state
   * and its empty-state message.
   */
  hasStatisticsExportData(): boolean {
    return (
      this.hasWasteData() ||
      this.hasMonthlyTrendData() ||
      this.hasPerformanceIndicatorsData() ||
      this.hasZoneFrequencyData() ||
      this.hasVolumeData()
    );
  }

  /**
   * Statistiques-tab export (Prompt 16) — distinct from generateGlobalReport()
   * (Prompt 15, the header's broader KPI/agency/incident summary): scoped
   * ONLY to the five Statistiques-tab sections, each read from whatever's
   * currently filtered/displayed (same "reflect the screen" rule as the
   * global report). No new format-specific duplication of the filter logic —
   * buildStatisticsExportSections() assembles one shared {headers, rows}
   * shape that all three formats (CSV/Excel/PDF) render from.
   */
  async exportStatistics(): Promise<void> {
    if (this.isExportingStatistics || !this.hasStatisticsExportData()) {
      return;
    }
    this.isExportingStatistics = true;
    try {
      const sections = this.buildStatisticsExportSections();
      const filenameBase = `statistiques-municipal-${this.statisticsPeriod()}-${new Date().toISOString().slice(0, 10)}`;

      if (this.statisticsExportFormat === "csv") {
        this.exportStatisticsCsv(sections, filenameBase);
      } else if (this.statisticsExportFormat === "excel") {
        await this.exportStatisticsExcel(sections, filenameBase);
      } else {
        await this.exportStatisticsPdf(sections, filenameBase);
      }

      this.notificationService.showSuccess("Export réussi", "Le fichier des statistiques a été téléchargé.");
    } catch (err) {
      console.error("Erreur lors de l'export des statistiques:", err);
      this.notificationService.showError("Erreur", "Impossible de générer le fichier d'export.");
    } finally {
      this.isExportingStatistics = false;
    }
  }

  private buildStatisticsExportSections(): { title: string; headers: string[]; rows: (string | number)[][] }[] {
    const sections: { title: string; headers: string[]; rows: (string | number)[][] }[] = [];

    if (this.hasWasteData()) {
      sections.push({
        title: "Répartition des déchets",
        headers: ["Type de déchet", "Nb. collectes", "Part (%)", "Tendance"],
        rows: this.wasteStatistics.map((w) => [w.label, w.quantity, w.percentage, w.trend]),
      });
    }

    if (this.hasMonthlyTrendData()) {
      sections.push({
        title: "Évolution des collectes",
        headers: ["Mois", "Collectes totales", "Collectes réalisées"],
        rows: this.monthlyTrend.map((m) => [m.label, m.totalCollections, m.completedCollections]),
      });
    }

    if (this.hasPerformanceIndicatorsData()) {
      const filteredPerformanceRecords = this.performanceRecords.filter(
        (record) =>
          (this.performanceZoneFilter === "all" || record.zoneName === this.performanceZoneFilter) &&
          (this.performanceWasteTypeFilter === "all" || record.wasteType === this.performanceWasteTypeFilter) &&
          (this.performanceCollectorFilter === "all" || record.collectorId === this.performanceCollectorFilter)
      );
      const performanceIndicators = aggregatePerformanceRecords(filteredPerformanceRecords, this.performanceGroupBy);
      sections.push({
        title: "Indicateurs de performance",
        headers: ["Regroupement", "Réel (%)", "Objectif (%)", "Statut"],
        rows: performanceIndicators.map((p) => [
          p.label,
          p.actual,
          p.target,
          this.getPerformanceStatusLabel(comparePerformance(p.actual, p.target)),
        ]),
      });
    }

    // `zoneFrequencyIndicators` is already filtered AND reflects the current
    // sort-order toggle (see generateGlobalReport()'s Section 6 comment).
    if (this.hasZoneFrequencyData()) {
      sections.push({
        title: "Fréquence de collecte par zone",
        headers: ["Zone", "Type de déchet", "Fréquence prévue", "Fréquence réelle", "Statut"],
        rows: this.zoneFrequencyIndicators.map((i) => [
          i.zoneName,
          i.wasteType,
          this.getFrequencyLabel(i.plannedFrequency),
          this.getFrequencyLabel(i.actualFrequency),
          this.getZoneFrequencyStatusLabel(i.status),
        ]),
      });
    }

    if (this.hasVolumeData() && this.volumeAggregate) {
      sections.push({
        title: "Volume global collecté",
        headers: ["Collectes réalisées", "Collectes planifiées", "% de l'objectif", "Statut"],
        rows: [
          [
            this.volumeAggregate.actualCollections,
            this.volumeAggregate.targetCollections,
            this.volumeAggregate.percentageOfTarget,
            this.getPerformanceStatusLabel(this.volumeAggregate.status),
          ],
        ],
      });
    }

    return sections;
  }

  /** `;` separator + UTF-8 BOM — opens correctly in French-locale Excel, same convention as
   * ExportClientService.exportToCsv() in the financial dashboard. */
  private exportStatisticsCsv(
    sections: { title: string; headers: string[]; rows: (string | number)[][] }[],
    filenameBase: string
  ): void {
    const lines: string[] = [];
    for (const section of sections) {
      lines.push(section.title);
      lines.push(section.headers.map((h) => `"${h}"`).join(";"));
      for (const row of section.rows) {
        lines.push(row.map((cell) => `"${cell}"`).join(";"));
      }
      lines.push("");
    }
    const csv = lines.join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${filenameBase}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /** One worksheet per section (SheetJS) — genuinely tabular columns, not a dumped JSON blob. */
  private async exportStatisticsExcel(
    sections: { title: string; headers: string[]; rows: (string | number)[][] }[],
    filenameBase: string
  ): Promise<void> {
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    sections.forEach((section, index) => {
      const worksheet = XLSX.utils.aoa_to_sheet([section.headers, ...section.rows]);
      // Excel sheet names: max 31 chars, no reserved characters — index prefix keeps them
      // unique even if two section titles were to collide after truncation.
      const sheetName = `${index + 1}. ${section.title}`.slice(0, 31);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });
    XLSX.writeFile(workbook, `${filenameBase}.xlsx`);
  }

  /** Mirrors generateGlobalReport()'s jsPDF/autoTable conventions (Prompt 15). */
  private async exportStatisticsPdf(
    sections: { title: string; headers: string[]; rows: (string | number)[][] }[],
    filenameBase: string
  ): Promise<void> {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 12;
    const finalY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    const darkHeader: [number, number, number] = [30, 41, 59];
    const zebraRow: [number, number, number] = [248, 250, 252];

    doc.setFillColor(22, 163, 74);
    doc.rect(0, 0, pageWidth, 24, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.text("SAHELYS – Statistiques Municipales", marginX, 14);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Exporté le ${new Date().toLocaleDateString("fr-FR")} · Période : ${this.getPeriodLabel(this.statisticsPeriod())}`,
      marginX,
      20
    );

    let y = 32;
    for (const section of sections) {
      if (y + 30 > pageHeight - 15) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(section.title, marginX, y);
      y += 6;
      autoTable(doc, {
        startY: y,
        head: [section.headers],
        body: section.rows.map((row) => row.map((cell) => `${cell}`)),
        headStyles: { fillColor: darkHeader, textColor: 255, fontSize: 9, fontStyle: "bold" },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: zebraRow },
        margin: { left: marginX, right: marginX },
      });
      y = finalY() + 10;
    }

    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`SAHELYS – page ${i}/${pages}`, marginX, pageHeight - 10);
    }

    doc.save(`${filenameBase}.pdf`);
  }

}
