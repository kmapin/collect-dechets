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
import { Admin } from "../../../services/admin";
import { FilterParams } from "../../../models/filterParams.model";
import { Signalement } from "../../shared_pages/signalement/signalement";
import { MiniChart } from "../../shared_pages/mini-chart/mini-chart";
import { CoverageMap, type CoverageMapZone } from "../../shared_pages/coverage-map/coverage-map";
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

const WASTE_TYPE_DISPLAY: Record<string, { label: string; color: string }> = {
  menagers: { label: 'Ménagers', color: '#4caf50' },
  recyclables: { label: 'Recyclables', color: '#2196f3' },
  verts: { label: 'Déchets verts', color: '#8bc34a' },
  encombrants: { label: 'Encombrants', color: '#ff9800' },
  speciaux: { label: 'Spéciaux', color: '#9c27b0' },
};

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
  status: "open" | "in_progress" | "resolved" | "pending" | 'Collected' | 'Reported' | 'Scheduled';
  resolutionStatus?: "pending" | "in_progress" | "resolved";
  resolutionTeamId?: { _id: string; name?: string } | null;
  createdAt: Date;
}

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
  dailyCollectionCollected: number;
  totalCollectionReported: number;
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
  rating: number | null;
  revenue: number | null;
  lastAudit: Date;
  complianceScore: number | null;
  issues: string[];
}

export interface WasteStatistic {
  type: string;
  label: string;
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
  imports: [CommonModule, RouterModule, FormsModule, Signalement, MiniChart, CoverageMap],
  templateUrl: './municipality-dashboard.html',
  styleUrl: './municipality-dashboard.scss'
})
export class MunicipalityDashboard  implements OnInit {
  currentUser: RegisterUserData | null = null;
  activeTab = "overview";

  isLoadingIncidents = false;

  performanceOverview: PerformanceOverview | null = null;
  isLoadingPerformanceOverview = false;

  get performanceOverviewSatisfaction(): number | null {
    return this.performanceOverview?.averageSatisfaction ?? null;
  }
  isLoadingWasteStatistics = false;
  wasteChartConfig: ChartConfiguration | null = null;
  monthlyTrend: MonthlyTrendPoint[] = [];
  isLoadingMonthlyTrend = false;
  collectionEvolutionConfig: ChartConfiguration | null = null;

  
  performanceRecords: PerformanceRecord[] = [];
  isLoadingPerformanceIndicators = false;
  performanceGroupBy: PerformanceGroupType = 'zone';
  performanceZoneFilter = 'all';
  performanceWasteTypeFilter = 'all';
  performanceTeamFilter = 'all';
  performanceChartConfig: ChartConfiguration | null = null;
  underperformingIndicators: PerformanceIndicator[] = [];
  performanceZoneOptions: string[] = [];
  performanceWasteTypeOptions: string[] = [];
  performanceTeamOptions: { id: string; name: string }[] = [];

  zoneFrequencyRecords: ZoneFrequencyRecord[] = [];
  isLoadingZoneFrequency = false;
  zoneFrequencyZoneFilter = 'all';
  zoneFrequencyWasteTypeFilter = 'all';
  zoneFrequencySortAscending = false;
  zoneFrequencyIndicators: ZoneFrequencyIndicator[] = [];
  zoneFrequencyZoneOptions: string[] = [];
  zoneFrequencyWasteTypeOptions: string[] = [];

  volumeAggregate: VolumeAggregate | null = null;

  isGeneratingReport = false;

  agencyAudits: AgencyAudit[] = [];
  filteredAgencies: AgencyAudit[] = [];
  topPerformingAgencies: { name: string; completionRate: number }[] = [];
  wasteStatistics: WasteStatistic[] = [];
  zoneStatistics: GroupedZoneStatistics[] = [];
  coverageView: "table" | "map" = "table";
  coverageMapZones: CoverageMapZone[] = [];
  incidents: Incident[] = [];
  filteredIncidents: Incident[] = [];
  incidentBreakdown: { type: string; count: number; percentage: number }[] = [];

  

  // Filters
  agenciesFilter = "";
  complianceFilter = "all";
  statisticsPeriod = signal<StatisticsPeriod>("month");
  isRefreshingStatistics = false;
  statisticsExportFormat: "csv" | "excel" | "pdf" = "csv";
  isExportingStatistics = false;
  incidentsFilter: "all" | "open" | "in_progress" | "resolved" = "all";
  severityFilter: "all" | "Low" | "Medium" | "High" | "Critical" = "all";
  searchTerm="";
  neighborhoodFilter="";
  agenciesFilterParams: FilterParams = {
      status: this.agenciesFilter,
      search:this.searchTerm,
      getAll: true,
  }
  tabs = [
    { id: "overview", label: "Vue d'ensemble", icon: "dashboard", badge: null },
    { id: "agencies", label: "Audit Agences", icon: "business", badge: 0 },
    { id: "statistics", label: "Statistiques", icon: "analytics", badge: null },
    { id: "incidents", label: "Incidents", icon: "report_problem", badge: 0 },
  ];
  statisticsAdmin: MunicipalityStatistics | null = null;

  constructor(
    private authService: AuthService,
    private agencyService: AgencyService,
    private adminService: Admin,
    private collectionService: CollectionService,
    private notificationService: NotificationService,
    private router: Router,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadMunicipalityData();
    this.filterIncidents();
  }

  loadMunicipalityData(): void {
    this.loadAgencyAudits(this.agenciesFilterParams);
    this.loadWasteStatistics();
    this.loadMonthlyTrend();
    this.loadPerformanceIndicators();
    this.loadZoneFrequency();
    this.loadAllSignalements();
    this.showAdminStatistics();
    this.loadPerformanceOverview();
    // this.loadIncidents();
  }

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

  loadAgencyAudits(agenciesFilterParams?: FilterParams ): void {
    this.agencyService.getAllAgenciesFromApi(agenciesFilterParams).subscribe({
      next: (agencies) => {
        const list = agencies?.data ?? [];
        if (!list.length) {
          this.agencyAudits = [];
          this.filteredAgencies = [];
          this.topPerformingAgencies = [];
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

  loadPerformanceIndicators(onDone?: () => void): void {
    this.isLoadingPerformanceIndicators = true;
    const { days } = this.getPeriodConfig(this.statisticsPeriod());
    this.adminService.getPerformanceIndicators$(days).subscribe({
      next: (response: any) => {
        const records: PerformanceRecord[] = response?.data ?? [];
        this.performanceRecords = records;
        this.performanceZoneOptions = Array.from(new Set(records.map((r) => r.zoneName))).sort();
        this.performanceWasteTypeOptions = Object.keys(WASTE_TYPE_DISPLAY);
        this.performanceTeamOptions = Array.from(
          new Map(records.map((r) => [r.teamId, { id: r.teamId, name: r.teamName }])).values()
        );
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

  private getPeriodConfig(period: StatisticsPeriod): { days: number; months: number } {
    const configs: Record<StatisticsPeriod, { days: number; months: number }> = {
      today: { days: 1, months: 3 },
      week: { days: 7, months: 3 },
      month: { days: 30, months: 6 },
      quarter: { days: 90, months: 9 },
      year: { days: 365, months: 12 },
    };
    return configs[period];
  }

  setPerformanceGroupBy(groupBy: PerformanceGroupType): void {
    this.performanceGroupBy = groupBy;
    this.applyPerformanceFilters();
  }

  applyPerformanceFilters(onDone?: () => void): void {
    this.isLoadingPerformanceIndicators = true;
    setTimeout(() => {
      const filtered = this.performanceRecords.filter(
        (record) =>
          (this.performanceZoneFilter === "all" || record.zoneName === this.performanceZoneFilter) &&
          (this.performanceWasteTypeFilter === "all" || record.wasteType === this.performanceWasteTypeFilter) &&
          (this.performanceTeamFilter === "all" || record.teamId === this.performanceTeamFilter)
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
      unique: "Ponctuelle",
      quotidien: "Quotidienne",
      hebdomadaire: "Hebdomadaire",
      bimensuel: "Bimensuelle",
      mensuel: "Mensuelle",
      none: "Aucune",
    };
    return labels[frequency];
  }

  
  getWasteTypeLabel(type: string): string {
    return WASTE_TYPE_DISPLAY[type]?.label ?? type;
  }

  hasVolumeData(): boolean {
    return !!this.volumeAggregate && this.volumeAggregate.targetCollections > 0;
  }

  loadTerritorialCoverage(): void {
    this.adminService.getZoneCoverage$().subscribe({
      next: (res: any) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        const cities: ZoneStatistic[] = rows.map((r: any) => ({
          country: 'Burkina Faso',
          name: r.quartierNom,
          agencies: r.agenciesCount ?? 0,
          clients: 0,
          collections: r.planningsCount ?? 0,
          coverage: r.completionRate ?? 0,
          incidents: 0,
          cities: [],
        }));
        this.zoneStatistics = [{ country: 'Burkina Faso', cities }];
        this.coverageMapZones = rows
          .filter((r: any) => r.lat != null && r.lng != null)
          .map((r: any) => ({
            id: r.quartierId,
            name: r.quartierNom,
            coordinates: [r.lat, r.lng] as [number, number],
            agencies: r.agenciesCount ?? 0,
            clients: 0,
            collections: r.planningsCount ?? 0,
            incidents: 0,
            coverage: r.completionRate ?? 0,
          }));
      },
      error: (err) => {
        console.error("Erreur lors du chargement de la couverture territoriale:", err);
        this.zoneStatistics = [];
        this.coverageMapZones = [];
      },
    });
  }

  loadAllSignalements() {
    this.isLoadingIncidents = true;
    this.adminService.getAllSignalements({}).subscribe({
      next: (signalements: any[]) => {
        this.incidents = signalements ?? [];
        this.isLoadingIncidents = false;
        this.filterIncidents();
        this.incidentBreakdown = this.getIncidentBreakdown();
        console.log("signalements in dashboard", this.filteredIncidents);
        const incidentsTab = this.tabs.find((tab) => tab.id === "incidents");
        if (incidentsTab) {
          incidentsTab.badge = this.getUnresolvedReportsCount();
          this.cd.detectChanges();
        }
      },
      error: (error) => {
        console.error("Erreur lors du chargement des incidents:", error);
        this.isLoadingIncidents = false;
      },
    });
  }

  getTotalReportsCount(): number {
    return this.incidents.length;
  }

  getUnresolvedReportsCount(): number {
    return this.incidents.filter(i => (i.status ?? 'open') !== 'resolved').length;
  }

  getResolvedReportsCount(): number {
    return this.incidents.filter(i => i.status === 'resolved').length;
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

  getCollectionRate(): number {
    const collected = this.statisticsAdmin?.dailyCollectionCollected ?? 0;
    const total = this.statisticsAdmin?.dailyCollections ?? 0;
    if (total === 0) return 0;
    return Math.round((collected / total) * 100);
  }

  getComplianceText(): string {
    return "Non disponible";
  }

  getIncidentSeverity(): string {
    const pending = this.getUnresolvedReportsCount();
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
    return [...this.agencyAudits]
      .sort((a, b) => b.completionRate - a.completionRate)
      .slice(0, 5)
      .map((agency) => ({
        name: agency.name,
        completionRate: agency.completionRate,
      }));
  }

  getIncidentBreakdown(incidents: Incident[] = this.incidents): { type: string; count: number; percentage: number }[] {
    const total = incidents.length;
    if (total === 0) {
      return [];
    }

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

  // Statistics
  showAdminStatistics(): void {
    this.adminService.getAllStatistics().subscribe({
      next: (statistics: { stats: MunicipalityStatistics }) => {
        this.statisticsAdmin = statistics.stats;
        this.loadTerritorialCoverage();
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
      search:this.searchTerm,
      getAll: true,
    }
    console.log('agenciesFilterParams', this.agenciesFilterParams);
    this.loadAgencyAudits(this.agenciesFilterParams);
  }

  filterIncidents(): void {
    this.filteredIncidents = this.incidents.filter((incident) => {
      const statusMatch =
        this.incidentsFilter === "all" ||
        (incident.status ?? "open") === this.incidentsFilter;
      const severityMatch =
        this.severityFilter === "all" ||
        (incident.severity || "").toLowerCase() === this.severityFilter.toLowerCase();
      return statusMatch && severityMatch;
    });
  }

  readonly reportAssignmentEnCours = new Set<string>();
  onAssignReport(payload: { incidentId: string; teamId: string }): void {
    if (this.reportAssignmentEnCours.has(payload.incidentId)) return;
    this.reportAssignmentEnCours.add(payload.incidentId);
    this.adminService.assignSignalementToTeam(payload.incidentId, payload.teamId).subscribe({
      next: (response: any) => {
        this.reportAssignmentEnCours.delete(payload.incidentId);
        const updated = response?.data;
        const target = this.incidents.find((i) => i._id === payload.incidentId);
        if (target) {
          target.resolutionTeamId = updated?.resolutionTeamId ?? target.resolutionTeamId;
          target.status = updated?.status ?? 'in_progress';
        }
        this.filterIncidents();
        this.incidentBreakdown = this.getIncidentBreakdown();
        this.notificationService.showSuccess("Signalement affecté", "Le signalement a été affecté à l'équipe.");
      },
      error: (err) => {
        this.reportAssignmentEnCours.delete(payload.incidentId);
        console.error("Erreur lors de l'affectation du signalement:", err);
        this.notificationService.showError("Erreur", "Impossible d'affecter ce signalement pour le moment.");
      },
    });
  }

  readonly resolvingIncidentEnCours = new Set<string>();
  onResolvedIncident(incidentId: string): void {
    if (this.resolvingIncidentEnCours.has(incidentId)) return;
    this.resolvingIncidentEnCours.add(incidentId);
    this.adminService.resolveSignalement(incidentId, 'Résolu depuis le tableau de bord municipal').subscribe({
      next: () => {
        this.resolvingIncidentEnCours.delete(incidentId);
        const target = this.incidents.find((i) => i._id === incidentId);
        if (target) target.status = 'resolved';
        this.filterIncidents();
        this.incidentBreakdown = this.getIncidentBreakdown();
        const incidentsTab = this.tabs.find((tab) => tab.id === "incidents");
        if (incidentsTab) incidentsTab.badge = this.getUnresolvedReportsCount();
        this.notificationService.showSuccess("Incident résolu", "L'incident a été marqué comme résolu.");
      },
      error: (err) => {
        this.resolvingIncidentEnCours.delete(incidentId);
        console.error("Erreur lors de la résolution de l'incident:", err);
        this.notificationService.showError("Erreur", "Impossible de résoudre cet incident pour le moment.");
      },
    });
  }

  // Action methods

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
          ["Incidents non résolus", `${this.getUnresolvedReportsCount()}`],
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

      // Section 5 — Performance indicators (respects its zone/waste-type/team filters + groupBy)
      const filteredPerformanceRecords = this.performanceRecords.filter(
        (record) =>
          (this.performanceZoneFilter === "all" || record.zoneName === this.performanceZoneFilter) &&
          (this.performanceWasteTypeFilter === "all" || record.wasteType === this.performanceWasteTypeFilter) &&
          (this.performanceTeamFilter === "all" || record.teamId === this.performanceTeamFilter)
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
      this.notificationService.showInfo("Info", "Impossible de générer le rapport global.");
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
    this.router.navigate(["/agencies", agencyId], { state: { fromDashboard: true } });
  }

  auditAgency(agencyId: string): void {
    this.notificationService.showInfo(
      "Audit",
      "Lancement de l'audit de l'agence"
    );
  }

  contactAgency(agencyId?: string): void {
    this.router.navigate(["/agencies", agencyId], { state: { fromDashboard: true } });
    this.notificationService.showInfo(
      "Contact",
      "Ouverture des informations de contact"
    );
  }

  
  onStatisticsPeriodChange(period: StatisticsPeriod): void {
    this.statisticsPeriod.set(period);
    this.updateStatistics();
  }

  private statisticsRefreshToken = 0;

 
  updateStatistics(): void {
    const token = ++this.statisticsRefreshToken;
    this.isRefreshingStatistics = true;

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

  hasStatisticsExportData(): boolean {
    return (
      this.hasWasteData() ||
      this.hasMonthlyTrendData() ||
      this.hasPerformanceIndicatorsData() ||
      this.hasZoneFrequencyData() ||
      this.hasVolumeData()
    );
  }

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
      this.notificationService.showInfo("Info", "Impossible de générer le fichier d'export.");
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
          (this.performanceTeamFilter === "all" || record.teamId === this.performanceTeamFilter)
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

  
  private async exportStatisticsExcel(
    sections: { title: string; headers: string[]; rows: (string | number)[][] }[],
    filenameBase: string
  ): Promise<void> {
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    sections.forEach((section, index) => {
      const worksheet = XLSX.utils.aoa_to_sheet([section.headers, ...section.rows]);
      const sheetName = `${index + 1}. ${section.title}`.slice(0, 31);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });
    XLSX.writeFile(workbook, `${filenameBase}.xlsx`);
  }

  
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
