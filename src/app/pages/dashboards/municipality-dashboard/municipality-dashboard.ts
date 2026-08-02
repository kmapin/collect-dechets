import { ChangeDetectorRef, Component, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterModule } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { AuthService } from "../../../services/auth.service";
import { AgencyService } from "../../../services/agency.service";
import { CollectionService } from "../../../services/collection.service";
import { NotificationService } from "../../../services/notification.service";
import { RegisterUserData, User } from "../../../models/user.model";
import { Agency } from "../../../models/agency.model";
import { Collection, CollectionStatus } from "../../../models/collection.model";
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
  MockWasteRecord,
} from "./mocks/municipality-mock.types";
import { buildWasteBreakdownConfig } from "./charts/waste-breakdown.chart";
import { buildCollectionEvolutionConfig } from "./charts/collection-evolution.chart";
import { buildPerformanceIndicatorsConfig } from "./charts/performance-indicators.chart";
import { comparePerformance, aggregatePerformanceRecords } from "./utils/performance.util";
import { aggregateZoneFrequencyRecords } from "./utils/zone-frequency.util";
import { aggregateVolume, type VolumeAggregate } from "./utils/volume.util";
import { MOCK_NETWORK_DELAY_MS } from "./mocks/municipality-mock.constants";
import type { ChartConfiguration } from "chart.js";

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
  assignedTo?: string;
}
export interface MunicipalityStatistics {
  totalAgencies: number;
  activeAgencies: number;
  totalClients: number;
  totalCollectors: number;
  todayCollections: number;
  reportsFromClients?: {
    total: number;
    resolved: number;
    pending: number;
  };
  completeCollections: number;
  totalRevenue: number;
  averageRating: number;
  pendingReports: number;
  complianceRate: number;
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
  rating: number;
  revenue: number;
  lastAudit: Date;
  complianceScore: number;
  issues: string[];
}

export interface WasteStatistic {
  type: string;
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

  // Data
  statistics: MunicipalityStatistics = {
    totalAgencies: 15,
    activeAgencies: 14,
    totalClients: 12500,
    totalCollectors: 85,
    todayCollections: 450,
    completeCollections: 425,
    totalRevenue: 485000,
    averageRating: 4.2,
    pendingReports: 8,
    complianceRate: 92,
  };

  isLoadingIncidents = false;

  // "Performance Globale" satisfaction/compliance — mock-backed until a real
  // endpoint exists (see loadPerformanceOverview()).
  performanceOverview: PerformanceOverview | null = null;
  isLoadingPerformanceOverview = false;
  /** Flip to false in one line once loadPerformanceOverview() calls a real API. */
  readonly isPerformanceOverviewMocked = true;
  /** Flip to false in one line once loadAgencyAudits() sources performance fields from a real endpoint. */
  readonly isAgencyPerformanceMocked = true;
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

  // "Volume Global Collecté" (Prompt 11) — actual vs. target weight, same
  // shared MockWasteRecord fact table as the waste-breakdown (07) and
  // collection-evolution (08) charts, not a disconnected number.
  volumeAllRecords: MockWasteRecord[] = [];
  isLoadingVolumeGlobal = false;

  /** "Rapport Global" button (Prompt 15) — client-side PDF assembly, no backend. */
  isGeneratingReport = false;
  volumeZoneFilter = 'all';
  volumeWasteTypeFilter = 'all';
  volumeCollectorFilter = 'all';
  volumeAggregate: VolumeAggregate | null = null;
  volumeZoneOptions: string[] = [];
  volumeWasteTypeOptions: string[] = [];
  volumeCollectorOptions: { id: string; name: string }[] = [];

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
   * recomputed in loadZoneStat()'s subscribe, right after zoneStatistics itself updates. */
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
  statisticsAdmin: any;
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
    this.loadVolumeGlobal();
    this.loadAllSignalements();
    this.showAdminStatistics();
    this.loadPerformanceOverview();
    // Source de vérité pour la couverture territoriale (API réelle) — loadZoneStatistics()
    // (mock local) a été retiré du flux d'init car son résultat était de toute façon
    // écrasé par cet appel.
    this.loadZoneStat();
    // this.loadIncidents();
  }

  /**
   * Mock-backed for now (see MunicipalityMockDataService) — no endpoint
   * exists yet for satisfaction/compliance. Swap the body for a real
   * `this.adminService.getPerformanceOverview().subscribe({ next, error })`
   * call later; the loading flag and property are already wired for it.
   */
  loadPerformanceOverview(): void {
    this.isLoadingPerformanceOverview = true;
    this.performanceOverview = this.mockDataService.getPerformanceOverview();
    this.isLoadingPerformanceOverview = false;
  }

  loadAgencyAudits(agenciesFilterParams?: FilterParams ): void {
    this.agencyService.getAllAgenciesFromApi(agenciesFilterParams).subscribe({
      next: (agencies) => {
        this.agencyAudits = agencies.data.map((agency: any) => {
          const id = agency?._id;
          // completionRate/rating/revenue/collectionsToday/complianceScore/issues
          // are mock-enriched (see isAgencyPerformanceMocked) — no real endpoint
          // computes these per-agency yet. Seeded by the agency's real id so
          // values stay stable across reloads/re-filters instead of reshuffling.
          const performance = this.mockDataService.getAgencyPerformanceMetrics(id);
          return {
            id,
            name: agency?.name,
            status: agency?.status || "inactive",
            clients: agency?.clients?.length || 0,
            collectors: agency?.employees?.length || 0,
            zones: agency?.zoneActivite?.length || 0,
            userId: agency?.userId,
            lastAudit: new Date(),
            ...performance,
          };
        });
        this.filteredAgencies = [...this.agencyAudits];
        this.topPerformingAgencies = this.getTopPerformingAgencies();
        this.buildNotifications();
        console.log(" this.agencyAudits", this.agencyAudits);
        console.log(" this.agencies", agencies);
        const auditTab = this.tabs.find((tab) => tab.id === "agencies");
        if (auditTab) {
          auditTab.badge = this.agencyAudits.length;
          this.cd.detectChanges();
        }
      },
      error: (err) => {
        console.error("Erreur lors du chargement des agences:", err);
        this.notificationService.showError(
          "Erreur",
          "Impossible de charger la liste des agences."
        );
      },
    });

    //   this.agencyAudits = [
    //     {
    //       id: '1',
    //       name: 'EcoClean Services',
    //       status: 'active',
    //       clients: 1250,
    //       collectors: 8,
    //       zones: 3,
    //       collectionsToday: 45,
    //       completionRate: 96,
    //       rating: 4.5,
    //       revenue: 32450,
    //       lastAudit: new Date('2024-01-10'),
    //       complianceScore: 95,
    //       issues: []
    //     },
    //     {
    //       id: '2',
    //       name: 'GreenWaste Solutions',
    //       status: 'active',
    //       clients: 850,
    //       collectors: 6,
    //       zones: 2,
    //       collectionsToday: 32,
    //       completionRate: 88,
    //       rating: 4.2,
    //       revenue: 22100,
    //       lastAudit: new Date('2024-01-08'),
    //       complianceScore: 82,
    //       issues: ['Retards fréquents', 'Signalements clients']
    //     },
    //     {
    //       id: '3',
    //       name: 'WasteManager Pro',
    //       status: 'suspended',
    //       clients: 450,
    //       collectors: 3,
    //       zones: 1,
    //       collectionsToday: 0,
    //       completionRate: 0,
    //       rating: 3.8,
    //       revenue: 0,
    //       lastAudit: new Date('2024-01-05'),
    //       complianceScore: 65,
    //       issues: ['Non-conformité réglementaire', 'Licence expirée']
    //     }
    //   ];
  }

  /**
   * Mock-backed for now (see MunicipalityMockDataService) — no endpoint
   * exists yet for waste-type breakdown. The Observable shape (delay +
   * subscribe) mirrors a real HTTP call so swapping the body for
   * `this.someService.getWasteBreakdown().subscribe({ next, error })` later
   * requires no changes to the template or the chart component.
   */
  loadWasteStatistics(onDone?: () => void): void {
    this.isLoadingWasteStatistics = true;
    const { days } = this.getPeriodConfig(this.statisticsPeriod());
    this.mockDataService.getWasteStatistics$(days).subscribe({
      next: (stats) => {
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
   * Mock-backed for now (see MunicipalityMockDataService) — no endpoint
   * exists yet for the 12-month collection trend. Same Observable shape as
   * loadWasteStatistics() for the same reason (see its comment).
   */
  loadMonthlyTrend(onDone?: () => void): void {
    this.isLoadingMonthlyTrend = true;
    const { months } = this.getPeriodConfig(this.statisticsPeriod());
    this.mockDataService.getMonthlyTrend$(months).subscribe({
      next: (trend) => {
        this.monthlyTrend = trend;
        this.collectionEvolutionConfig = buildCollectionEvolutionConfig(trend);
        this.isLoadingMonthlyTrend = false;
        onDone?.();
      },
      error: (err) => {
        console.error("Erreur lors du chargement de l'évolution des collectes:", err);
        this.monthlyTrend = [];
        this.collectionEvolutionConfig = null;
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
   * Translates the shared "Période" selection into whatever shape each of
   * the five sections actually needs:
   *  - `days`: a real date-range window (waste breakdown, volume global —
   *    both filter MockWasteRecord.scheduledDate directly).
   *  - `months`: how many trailing months the evolution chart shows. Shorter
   *    periods show fewer months rather than collapsing to a single point,
   *    so the trend line still reads as a trend at every period (an
   *    explicit judgment call — "today"/"week" don't map onto "months of
   *    trend" literally, so this degrades gracefully instead of forcing a
   *    literal-but-useless 1-month chart).
   *  - `seed`: performance indicators (09) and zone frequency (10) have no
   *    date field on their records at all (one snapshot per collector /
   *    per zone×wasteType, not a time series) — real date filtering isn't
   *    possible for them, so a distinct seed per period reshuffles their
   *    mock numbers instead. Documented here rather than as a "pending
   *    Prompt 12" caveat, since this IS Prompt 12.
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
  loadZoneFrequency(onDone?: () => void): void {
    this.isLoadingZoneFrequency = true;
    const { seed } = this.getPeriodConfig(this.statisticsPeriod());
    this.mockDataService.getZoneFrequencyRecords$(seed).subscribe({
      next: (records) => {
        this.zoneFrequencyRecords = records;
        this.zoneFrequencyZoneOptions = Array.from(new Set(records.map((r) => r.zoneName))).sort();
        this.zoneFrequencyWasteTypeOptions = this.mockDataService.getWasteTypeLabels();
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

  getFrequencyLabel(frequency: CollectionFrequency): string {
    const labels: Record<CollectionFrequency, string> = {
      daily: "Quotidienne",
      weekly: "Hebdomadaire",
      monthly: "Mensuelle",
    };
    return labels[frequency];
  }

  /**
   * Mock-backed for now (see MunicipalityMockDataService) — no endpoint
   * exists yet for actual-vs-target volume. Loads the FULL shared waste
   * record set once (same one behind loadWasteStatistics()/loadMonthlyTrend()
   * — see generateWasteRecords()'s own comment), derives filter option
   * lists, then applies filters.
   */
  loadVolumeGlobal(onDone?: () => void): void {
    this.isLoadingVolumeGlobal = true;
    this.mockDataService.getWasteRecords$().subscribe({
      next: (records) => {
        this.volumeAllRecords = records;
        this.volumeZoneOptions = Array.from(new Set(records.map((r) => r.zoneName))).sort();
        this.volumeWasteTypeOptions = this.mockDataService.getWasteTypeLabels();
        const collectorNameById = new Map(this.mockDataService.getCollectors().map((c) => [c.id!, `${c.firstName} ${c.lastName}`]));
        const seenCollectorIds = new Set<string>();
        this.volumeCollectorOptions = records
          .filter((r) => {
            if (seenCollectorIds.has(r.collectorId)) return false;
            seenCollectorIds.add(r.collectorId);
            return true;
          })
          .map((r) => ({ id: r.collectorId, name: collectorNameById.get(r.collectorId) ?? r.collectorId }));
        this.applyVolumeFilters(onDone);
      },
      error: (err) => {
        console.error("Erreur lors du chargement du volume global collecté:", err);
        this.volumeAllRecords = [];
        this.volumeAggregate = null;
        this.isLoadingVolumeGlobal = false;
        onDone?.();
      },
    });
  }

  /**
   * Purely client-side (already-loaded volumeAllRecords, no new fetch) —
   * same simulated-delay UX pattern as the other two new panels. The period
   * here is a REAL date-range filter (MockWasteRecord carries scheduledDate),
   * driven by the shared statisticsPeriod signal like every other section.
   */
  applyVolumeFilters(onDone?: () => void): void {
    this.isLoadingVolumeGlobal = true;
    setTimeout(() => {
      const { days } = this.getPeriodConfig(this.statisticsPeriod());
      const cutoff = Date.now() - days * 86_400_000;
      const filtered = this.volumeAllRecords.filter(
        (record) =>
          record.scheduledDate.getTime() >= cutoff &&
          record.status === CollectionStatus.COLLECTED &&
          (this.volumeZoneFilter === "all" || record.zoneName === this.volumeZoneFilter) &&
          (this.volumeWasteTypeFilter === "all" || record.wasteTypeLabel === this.volumeWasteTypeFilter) &&
          (this.volumeCollectorFilter === "all" || record.collectorId === this.volumeCollectorFilter)
      );

      this.volumeAggregate = aggregateVolume(filtered);
      this.isLoadingVolumeGlobal = false;
      onDone?.();
    }, MOCK_NETWORK_DELAY_MS);
  }

  hasVolumeData(): boolean {
    return !!this.volumeAggregate && (this.volumeAggregate.actualKg > 0 || this.volumeAggregate.targetKg > 0);
  }

  // Récupérer les différents pays et les villes
  loadZoneStatistics(): void {
    const stats = this.agencyService.getAgenceStats();
    const grouped: { [key: string]: any[] } = {};

    MOCK_CITIES.forEach((city, index) => {
      const country = city.country.name;
      if (!grouped[country]) {
        grouped[country] = [];
      }
      grouped[country].push({
        name: city.name,
        agencies: stats[index]?.agencies || 0,
        clients: stats[index]?.clients || 0,
        collections: stats[index]?.collections || 0,
        coverage: stats[index]?.coverage || 0,
        incidents: stats[index]?.incidents || 0,
      });
    });
    this.zoneStatistics = Object.keys(grouped).map((country) => ({
      country,
      cities: grouped[country],
    }));
  }

  // Récupérer les différentes statistiques des villes
  loadZoneStat(): void {
    this.adminService.getAllStatisticCity().subscribe({
      next: (response: any) => {
        const stats = Array.isArray(response.statistics)
          ? response.statistics
          : [];
        const grouped: { [key: string]: ZoneStatistic[] } = {};

        MOCK_CITIES.forEach((city) => {
          const country = city.country.name || "Burkina Faso";
          if (!grouped[country]) {
            grouped[country] = [];
          }
          const cityStats = stats.find((s: any) => s.city === city.name);

          grouped[country].push({
            country,
            name: city.name,
            agencies: cityStats?.agencies || 0,
            clients: cityStats?.clients || 0,
            collections: cityStats?.todayCollections || 0,
            coverage: cityStats?.complianceRate || 0,
            incidents: cityStats?.pendingReports || 0,
            cities: [],
          });
        });

        this.zoneStatistics = Object.keys(grouped).map((country) => ({
          country,
          cities: grouped[country],
        }));
        this.coverageMapZones = this.buildCoverageMapZones();
      },
      error: (err) => {
        console.error("Erreur lors de la récupération des villes:", err);
        this.zoneStatistics = [];
        this.coverageMapZones = [];
      },
    });
  }

  /**
   * Reshapes the already-loaded zoneStatistics (same data as the tabular
   * Couverture Territoriale view) into what <app-coverage-map> needs, adding
   * only a coordinate lookup (mock — see MunicipalityMockDataService.
   * getZoneCoordinates()). Not a second dataset: same agencies/clients/
   * collections/incidents/coverage numbers the table already shows.
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
  loadAllSignalements() {
    this.isLoadingIncidents = true;
    this.adminService.getAllReports().subscribe({
      next: (response: any) => {
        this.incidents = response.collectes;
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
    return Math.round(
      (this.statistics.completeCollections /
        this.statistics.todayCollections) *
        100
    );
  }

  getComplianceText(): string {
    if (this.statistics.complianceRate >= 95) return "Excellent";
    if (this.statistics.complianceRate >= 85) return "Bon";
    return "À améliorer";
  }

  getIncidentSeverity(): string {
    const pending = this.statisticsAdmin?.reportsFromClients?.pending ?? 0;
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
    };
    return types[type as keyof typeof types] || type;
  }

  getIncidentStatusText(status: string): string {
    const statuses = {
      open: "Ouvert",
      pending: "En cours",
      resolved: "Résolu",
    };
    return statuses[status as keyof typeof statuses] || status;
  }

  getComplianceClass(score: number): string {
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

    const complianceNotifications: BellNotification[] = this.agencyAudits
      .filter((agency) => agency.issues.length > 0 || agency.complianceScore < 85 || agency.status !== "active")
      .map((agency) => {
        const id = `agency-${agency.id}`;
        const reason = agency.issues.length > 0 ? agency.issues[0] : `Score de conformité : ${agency.complianceScore}%`;
        return {
          id,
          icon: "business",
          title: `Conformité — ${agency.name}`,
          message: reason,
          date: new Date(agency.lastAudit),
          read: this.readNotificationIds.has(id),
          severity: (agency.complianceScore < 70 || agency.status === "suspended" ? "high" : "medium") as BellNotification["severity"],
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
      next: (statistics: any) => {
        this.statisticsAdmin = statistics.stats;
        console.log(this.statisticsAdmin);
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
  onAssignReport(incident: Incident): void {
    const target = this.incidents.find((i) => i._id === incident._id);
    if (!target) {
      return;
    }
    target.status = "pending";
    target.assignedTo = target.assignedTo || "Agent municipal";
    this.filterIncidents();
    this.incidentBreakdown = this.getIncidentBreakdown();
    this.buildNotifications();
    this.notificationService.showSuccess("Incident assigné", "L'incident a été pris en charge.");
  }

  onResolvedIncident(incidentId: string): void {
    const target = this.incidents.find((i) => i._id === incidentId);
    if (!target) {
      return;
    }
    target.status = "resolved";
    this.filterIncidents();
    this.incidentBreakdown = this.getIncidentBreakdown();
    this.buildNotifications();
    this.notificationService.showSuccess("Incident résolu", "L'incident a été marqué comme résolu.");
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
            `${this.statisticsAdmin?.completeCollections ?? "—"} / ${this.statisticsAdmin?.totalCollections ?? "—"} (${this.getCollectionRate()}%)`,
          ],
          ["Incidents non résolus", `${this.statisticsAdmin?.reportsFromClients?.pending ?? 0}`],
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
            `${a.complianceScore}%`,
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
          head: [["Type de déchet", "Quantité (t)", "Part", "Tendance"]],
          body: this.wasteStatistics.map((w) => [w.type, `${w.quantity}`, `${w.percentage}%`, w.trend]),
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

      // Section 7 — Volume global (Prompt 11 — already reflects its own filters + statisticsPeriod)
      if (this.volumeAggregate) {
        y = ensureSpace(y);
        y = sectionTitle("Volume global collecté", y);
        autoTable(doc, {
          startY: y,
          head: [["Réel (t)", "Objectif (t)", "% de l'objectif", "Statut"]],
          body: [
            [
              `${(this.volumeAggregate.actualKg / 1000).toFixed(1)}`,
              `${(this.volumeAggregate.targetKg / 1000).toFixed(1)}`,
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
    let remaining = 5;
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
    this.loadVolumeGlobal(onSectionDone);
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
        headers: ["Type de déchet", "Quantité (t)", "Part (%)", "Tendance"],
        rows: this.wasteStatistics.map((w) => [w.type, w.quantity, w.percentage, w.trend]),
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
        headers: ["Réel (t)", "Objectif (t)", "% de l'objectif", "Statut"],
        rows: [
          [
            Number((this.volumeAggregate.actualKg / 1000).toFixed(1)),
            Number((this.volumeAggregate.targetKg / 1000).toFixed(1)),
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
