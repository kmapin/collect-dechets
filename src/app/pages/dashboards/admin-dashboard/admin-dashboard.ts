import { AfterViewChecked, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, signal, ViewChild } from "@angular/core";
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import * as L from 'leaflet';
Chart.register(...registerables);
import { CommonModule } from "@angular/common";
import { Router, RouterModule } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { AuthService } from "../../../services/auth.service";
import { AgencyService } from "../../../services/agency.service";
import { CollectionService } from "../../../services/collection.service";
import { NotificationService } from "../../../services/notification.service";
import { RegisterUserData } from "../../../models/user.model";
import { Agency } from "../../../models/agency.model";
import { Collection, CollectionStatus } from "../../../models/collection.model";
import { Admin } from "../../../services/admin";
import { MatCardModule } from "@angular/material/card";
import { ClientService } from "../../../services/client.service";
import { SharedService } from "../../../services/shared-service";
import { LoadingSpinnerComponent } from "../../../components/loading-spinner/loading-spinner.component";
import { forkJoin, map, of, timeout, catchError, switchMap } from "rxjs";
import { FilterParams } from "../../../models/filterParams.model";
import { DrawerModule } from "primeng/drawer";
import { Signalement } from "../../shared_pages/signalement/signalement";
import { Arrondissement, City, Quartier, Sector } from "../../../models/countries-org.model";
import { TerritoryHttpService } from "../../../services/territory-http.service";
import { WithdrawalRequestsHttpService } from "../../../services/withdrawal-requests-http.service";
import {
  AdminWithdrawalRequest,
  PaymentMethod,
  WithdrawalRequestFilter,
  WithdrawalStatus,
} from "../../../models/withdrawal-request.model";
import { ExportClientService } from "../financial-dashboard/data-access/export/export-client.service";
interface AdminStatistics {
  totalAgencies: number;
  totalActiveAgencies: number;
  monthlyClientPercentage: number;
  totalCollectionsCollected: number;
  totalCollectionsReported: number;
  // Champs réellement renvoyés par GET /api/statistics (services/globalState.js) — voir
  // BACKEND_ARCHITECTURE.md §3.7. `totalCollectionsReported`/`reportsFromClients`
  // ci-dessus ne correspondent à aucun champ du backend (fautes de frappe / champ jamais
  // implémenté) : conservés uniquement car `statistics` (mock, non branché sur l'API) les
  // déclare encore. Les vrais compteurs d'incidents utilisent les deux champs suivants.
  totalCollectionReported?: number;
  pendingReportsCount?: number;
  dailyCollections: number;
  // Réellement renvoyé par GET /api/statistics (services/globalState.js) — jamais déclaré
  // ici jusqu'ici, alors que getCollectionRate() en a besoin (item 3, voir plus bas).
  dailyCollectionCollected?: number;
  totalClients: number;
  totalCollectors: number;
  activeClients: number;
  totalCollections: number;
  todayCollections: number;
  reportsFromClients?: {
    total: number;
    resolved: number;
    pending: number;
  };
  completeCollections: number;
  totalMunicipalities: number;
  totalMunicipalityAgents: number;
  completedCollections: number;
  totalManagers: number;
  totalRevenue: number;
  averageRating: number;
  pendingReports: number;
  complianceRate: number;
  // Réellement renvoyés par GET /api/statistics (services/globalState.js) — jamais
  // déclarés ici jusqu'ici alors que déjà consommés côté municipality-dashboard.ts
  // (buildZoneStatisticsFromAdminStats()) depuis la même réponse.
  agenciesByCity?: { city: string; numberOfAgencies: number }[];
  clientsByCity?: { city: string; numberOfClients: number }[];
  collectionsByCity?: { city: string; numberOfCollections: number }[];
}

interface AgencyAudit {
  id: string;
  name: string;
  status: string;
  clients: number;
  collectors: number;
  gestionnaires: number;
  zones: number;
  collectionsToday: number;
  completionRate: number;
  rating: number;
  revenue: number;
  lastAudit: Date;
  complianceScore: number;
  issues: string[];
  userId: string;
  statsLoaded: boolean;
  // Chantier Finance/Paiements, item 8 — chargé séparément (loadAgenciesFinanceStats()),
  // undefined tant que non résolu (pas 0, pour distinguer "pas encore chargé" de "0%").
  tauxRecouvrement?: number;
  // Chantier Frais plateforme (Prompt F8/9) — chargé séparément (loadAgenciesPlatformFees()),
  // undefined tant que non résolu (colonne "Frais plateforme" de l'onglet Agences).
  platformFees?: number;
}

interface WasteStatistic {
  type: string;
  quantity: number;
  percentage: number;
  trend: "up" | "down" | "stable";
  color: string;
}

interface ZoneStatistic {
  name: string;
  agencies: number;
  clients: number;
  collections: number;
  coverage: number;
  incidents: number;
  country: string;
  cities?: ZoneStatistic[];
}

interface GroupedZoneStatistics {
  country: string;
  cities: ZoneStatistic[];
}

// Aligné sur le modèle Signalement unifié réel (backend models/Signalement.js) — même
// forme que shared_pages/signalement/signalement.ts::Incident et agency-dashboard.ts, qui
// lisent déjà GET /api/signalements tel quel sans transformation. `status` est directement
// 'open'|'in_progress'|'resolved' pour tout signalement créé depuis cette migration (plus
// aucun signalement ne mute Collecte.status, voir models/Signalement.js) ; les valeurs
// 'Collected'/'Reported'/'Scheduled' ne subsistent que pour d'éventuelles données historiques
// jamais migrées par scripts/backfill-signalements-from-collecte.js.
interface Incident {
  _id: string;
  agency?: {
    _id: string;
    name?: string;
  };
  agencyId?: {
    _id: string;
    name?: string;
  };
  clientId?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  collectorId?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  reportedBy?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
  };
  resolutionTeamId?: { _id: string; name?: string } | null;
  collecteId?: string | null;
  planningId?: { _id: string; reference?: string; libelle?: string; date?: Date } | null;
  origine?: "collecte" | "independant";
  photo?: [];
  photos?: string[];
  agencyName?: string;
  type:
    | "missed_collection"
    | "compliance_issue"
    | "complaint"
    | "technical_issue"
    | "other";
  comment: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical" | "other" | "Low" | "Medium" | "High" | "Critical";
  date: Date;
  createdAt?: Date;
  status:
    | "open"
    | "in_progress"
    | "resolved"
    | "Collected"
    | "Reported"
    | "Scheduled";
  // Renseigné par PATCH /signalements/:id/resolve (models/Signalement.js) — le commentaire
  // laissé au moment de la résolution, à afficher dans le détail une fois status='resolved'.
  resolutionComment?: string;
  assignedTo?: string;
}

interface Communication {
  id: string;
  type: "notification" | "directive" | "alert";
  title: string;
  message: string;
  recipients: string[];
  priority: "low" | "medium" | "high" | "urgent";
  sentAt: Date;
  readBy: string[];
}
interface ActivityEvent {
  type:   string;
  label:  string;
  detail: string;
  date:   string;
  icon:   string;
  color:  string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  department: string;
  avatarUrl: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  mobile: string;
  office: string;
  linkedin: string;
}
@Component({
  selector: "app-admin-dashboard",
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    LoadingSpinnerComponent,
    DrawerModule,
  ],
  providers: [ExportClientService],
  templateUrl: "./admin-dashboard.html",
  styleUrl: "./admin-dashboard.scss",
})
export class AdminDashboard implements OnInit, OnDestroy {

  // ── Chart.js references ───────────────────────────────────
  @ViewChild('incidentsChart') incidentsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('agenciesChart')  agenciesChartRef!:  ElementRef<HTMLCanvasElement>;
  @ViewChild('wasteChart')     wasteChartRef!:     ElementRef<HTMLCanvasElement>;

  private incidentsChart: Chart | null = null;
  private agenciesChart:  Chart | null = null;
  private wasteChart:     Chart | null = null;
  chartsInitialized = false;

  // ── Leaflet map ───────────────────────────────────────────
  @ViewChild('territorialMap') mapElRef!: ElementRef<HTMLDivElement>;
  private map: L.Map | null = null;
  agenciesGeoData: any[] = [];
  isLoadingMap = false;
  // Comptes clients réels par agence (sidebar "Couverture Territoriale") — indexé
  // par agenceId, chargé pour la liste COMPLÈTE (agenciesGeoData), pas seulement les
  // agences de la page courante de `agencyAudits` (voir loadAgencyMapClientCounts()).
  private agencyMapClientCounts: Record<string, number> = {};
  selectedAgency: any = null;
  selectedAgencyIndex: number | null = null;
  private agencyZoneLayers    = new Map<number, L.Circle[]>();
  private agencyPinLayers     = new Map<number, L.Marker>();
  private agencyDotLayers     = new Map<number, L.CircleMarker>();
  private agencyZoneCircleMap = new Map<number, Map<string, L.Circle>>();
  private agencyZoneDetails   = new Map<number, any[]>();
  selectedAgencyStats: any = null;
  isLoadingAgencyDetail    = false;
  topAgenciesByCollections: { id: string; name: string; collections: number }[] = [];

  readonly AGENCY_PALETTE = [
    '#6366f1', '#f97316', '#22c55e', '#ef4444',
    '#3b82f6', '#a855f7', '#eab308', '#ec4899',
    '#14b8a6', '#f43f5e', '#84cc16', '#06b6d4',
  ];

  private readonly OUAGA_COORDS: Record<string, [number, number]> = {
    // Arrondissement 1 — centre historique
    'Bilbalogo':             [12.3742, -1.5218],
    'Saint Léon':            [12.3700, -1.5260],
    'Oscar Yaar':            [12.3730, -1.5240],
    'Dapoya':                [12.3630, -1.5190],
    'Dapoya II':             [12.3620, -1.5220],
    'Koulouba':              [12.3670, -1.5230],
    'Kamsonghin':            [12.3620, -1.5150],
    'Samadin':               [12.3580, -1.5120],
    'Kouritenga':            [12.3650, -1.5180],
    'Zone ZACA':             [12.3660, -1.5200],
    'Zone Commerciale':      [12.3680, -1.5240],
    // Arrondissement 2 — nord-ouest
    'Goughin':               [12.3700, -1.5440],
    'Hamdalaye':             [12.3730, -1.5410],
    'Baskuy Yaar':           [12.3680, -1.5470],
    'Cité An III':           [12.3750, -1.5480],
    'Cité An II':            [12.3720, -1.5460],
    'Zone du Bois':          [12.3620, -1.5450],
    // Arrondissement 3 — est
    'Camp militaire':        [12.3580, -1.5280],
    'Yaoghin':               [12.3550, -1.5150],
    'Noncin':                [12.3500, -1.5200],
    'Toécin':                [12.3450, -1.5150],
    // Arrondissement 4 — nord
    'Tampouy':               [12.3950, -1.5480],
    'Koulweoghin':           [12.3920, -1.5410],
    'Somgandé':              [12.4000, -1.5320],
    'Zone industrielle Kossodo': [12.4080, -1.5050],
    // Arrondissement 5 — nord-est
    'Sogdin':                [12.3850, -1.5200],
    'ENAREF':                [12.3820, -1.5150],
    'Cogeb':                 [12.3810, -1.5130],
    '1200 Logement':         [12.3780, -1.5100],
    'Wemtenga':              [12.3780, -1.5040],
    'Naab Pougo':            [12.3800, -1.5080],
    // Arrondissement 6 — sud-ouest
    'Pissy':                 [12.3500, -1.5550],
    'Cissin':                [12.3480, -1.5480],
    'Pagalayiri':            [12.3520, -1.5580],
    'Bongnaam':              [12.3560, -1.5620],
    'Ronsin':                [12.3530, -1.5500],
    'Song-Naaba':            [12.3580, -1.5580],
    // Arrondissement 7 — sud
    'Nagrin':                [12.3450, -1.5350],
    'Sandogo':               [12.3400, -1.5300],
    'Zagtouli sud':          [12.3350, -1.5250],
    // Arrondissement 8 — sud-est
    'Zagtouli nord':         [12.3400, -1.5150],
    'Nonghin':               [12.3400, -1.5080],
    'Bissighin':             [12.3380, -1.5000],
    // Arrondissement 9 — est lointain
    'Marcoussis':            [12.3600, -1.4950],
    'Ouapassi':              [12.3550, -1.4900],
    'Bangpooré':             [12.3650, -1.4900],
    'Kamboissin':            [12.3600, -1.4830],
    // Arrondissement 10 — nord-est lointain
    'Kossodo':               [12.4130, -1.4990],
    'Bendogo':               [12.4050, -1.4950],
    'Dassasgho':             [12.3900, -1.4980],
    'Djikof':                [12.3960, -1.4920],
    // Arrondissement 11 — sud-ouest lointain
    'Karpala':               [12.3400, -1.5450],
    'Lanoayiri':             [12.3380, -1.5520],
    'Balkuy':                [12.3420, -1.5580],
    'Rayongo':               [12.3300, -1.5400],
    'Kaparla non loti':      [12.3350, -1.5480],
    // Arrondissement 12 — sud
    'Patte d\'Oie':          [12.3430, -1.5330],
    'Trame d\'Accueil':      [12.3380, -1.5380],
    'Ouaga 2000':            [12.3320, -1.5280],
    'Kossyam':               [12.3280, -1.5220],
    'Zone une':              [12.3450, -1.5400],
    // Extras courants
    'Tanghin':               [12.3850, -1.5600],
    'Pissy Extension':       [12.3450, -1.5600],
    'Dagnoen':               [12.3700, -1.4980],
    'Zangouettin':           [12.3660, -1.5260],
  };

  currentUser: RegisterUserData | null = null;
  Math: any = Math;
  activeTab = 'overview';

  switchTab(tabId: string): void {
    if (this.activeTab === tabId) return;
    // Cleanup statistics resources before leaving
    if (this.activeTab === 'statistics') {
      this.incidentsChart?.destroy(); this.incidentsChart = null;
      this.agenciesChart?.destroy();  this.agenciesChart  = null;
      this.wasteChart?.destroy();     this.wasteChart     = null;
      this.chartsInitialized = false;
      if (this.map) { this.map.remove(); this.map = null; }
      this.selectedAgency = null; this.selectedAgencyIndex = null;
      this.selectedAgencyStats = null; this.isLoadingAgencyDetail = false;
      this.agencyZoneLayers.clear(); this.agencyPinLayers.clear();
      this.agencyDotLayers.clear(); this.agencyZoneCircleMap.clear(); this.agencyZoneDetails.clear();
    }
    this.activeTab = tabId;
    this.loadTabData(tabId);
  }
  longText = `The Shiba Inu is the smallest of the six original and distinct spitz breeds of dog
    from Japan. A small, agile dog that copes very well with mountainous terrain, the Shiba Inu was
    originally bred for hunting.`;
  // Data
  statistics: AdminStatistics = {
    totalAgencies: 15,
    dailyCollections: 10,
    totalActiveAgencies: 14,
    monthlyClientPercentage: 5,
    totalCollectionsCollected: 0,
    totalCollectionsReported: 0,
    totalClients: 12500,
    activeClients: 12000,
    totalCollectors: 85,
    todayCollections: 450,
    completedCollections: 425,
    completeCollections: 425,
    totalMunicipalities: 25,
    totalMunicipalityAgents: 25,
    totalManagers: 25,
    totalCollections: 425,
    totalRevenue: 485000,
    averageRating: 4.2,
    pendingReports: 8,
    complianceRate: 92,
  };

  agencyAudits: AgencyAudit[] = [];
  /** Liste complète (non paginée) des agences — alimente uniquement le picker de destinataires de "Nouvelle Communication" (voir loadCommunications()). */
  communicationRecipientAgencies: { id: string; name: string }[] = [];
  clientsAudits: any[] = [];
  collectorsAudits: any[] = [];
  usersAudits: any[] = [];
  filteredAgencies: AgencyAudit[] = [];
  filteredClients: any[] = [];
  filteredUsers: any[] = [];
  filteredCollectors: any[] = [];
  wasteStatistics: WasteStatistic[] = [];
  zoneStatistics: GroupedZoneStatistics[] = [];

  // ── Onglet "Collectes" (vue admin-wide, toutes agences confondues) ────────
  // Réutilise GET /municipality/waste-records (Prompt 12, déjà utilisé par le
  // dashboard municipal) — aucun nouvel endpoint, `authMiddleware()` de cette
  // route n'impose déjà aucun rôle particulier donc accessible à super_admin
  // sans changement backend.
  wasteRecords: any[] = [];
  isLoadingWasteRecords = false;
  wasteRecordsPage = 1;
  wasteRecordsLimit = 20;
  wasteRecordsTotal = 0;
  wasteRecordsTotalPages = 0;
  wasteRecordsDays = 30;
  wasteRecordsWasteTypeFilter = '';
  wasteRecordsZoneFilter = '';
  // Filtre "Collecteur" (chantier Rapports/Statistiques, item 5) — port du filtre déjà
  // fonctionnel côté municipalité (performanceCollectorFilter) : `collectorId` était déjà
  // supporté par ce même service (getWasteRecords$/getWasteRecords côté backend) mais
  // jamais exposé ici. Options réutilisées depuis l'onglet Collecteurs (collectorsAudits),
  // pas un deuxième fetch dédié.
  wasteRecordsCollectorId = '';
  readonly wasteRecordsWasteTypes = ['menagers', 'recyclables', 'verts', 'encombrants', 'speciaux'];

  loadWasteRecords(page: number = 1): void {
    this.isLoadingWasteRecords = true;
    this.wasteRecordsPage = page;
    this.adminService
      .getWasteRecords$({
        days: this.wasteRecordsDays,
        wasteType: this.wasteRecordsWasteTypeFilter || undefined,
        zoneId: this.wasteRecordsZoneFilter || undefined,
        collectorId: this.wasteRecordsCollectorId || undefined,
        page,
        limit: this.wasteRecordsLimit,
      })
      .subscribe({
        next: (res: any) => {
          this.wasteRecords = res?.data || [];
          this.wasteRecordsTotal = res?.pagination?.total || 0;
          this.wasteRecordsTotalPages = res?.pagination?.totalPages || 0;
          this.isLoadingWasteRecords = false;
        },
        error: (error: any) => {
          console.error('Erreur lors du chargement des collectes (admin-wide) :', error);
          this.notificationService.showError('Erreur', 'Impossible de charger les collectes.');
          this.isLoadingWasteRecords = false;
        },
      });
  }

  filterWasteRecords(): void {
    this.loadWasteRecords(1);
  }

  /**
   * `record.collectorId` (GET /municipality/waste-records) est un ObjectId brut, jamais
   * peuplé par le pipeline (voir son propre commentaire backend : "toujours vide sur les
   * enregistrements V2 réels" — l'assignation V2 se fait par équipe, pas par collecteur
   * individuel). Résolu ici en nom via collectorsAudits (déjà chargé) quand disponible,
   * honnête ("—") sinon plutôt que d'afficher un id brut.
   */
  getWasteRecordCollectorName(collectorId: string | null): string {
    if (!collectorId) return '—';
    const collector = this.collectorsAudits.find((c: any) => c._id === collectorId);
    return collector ? `${collector.firstName} ${collector.lastName}` : '—';
  }

  goToWasteRecordsPage(page: number): void {
    if (page < 1 || page > this.wasteRecordsTotalPages) return;
    this.loadWasteRecords(page);
  }
  zoneCoverageData: { quartierId: string; quartierNom: string; planningsCount: number; equipesAssigned: number; completionRate: number; status: string }[] = [];
  planningStats: { totalPlannings: number; todayPlannings: number; inProgress: number; completedToday: number; executionRate: number } | null = null;
  isLoadingCoverage = false;
  coverageAgencyId = '';
  allAgenciesForSelect: { id: string; name: string }[] = [];
  coverageAgencyDropdownOpen    = false;
  coverageAgencyDropdownSearch  = '';
  coverageAgencyDropdownList:   { id: string; name: string }[] = [];
  coverageAgencyDropdownPage    = 1;
  coverageAgencyDropdownTotal   = 0;
  coverageAgencyDropdownLoading = false;
  selectedCoverageAgency:       { id: string; name: string } | null = null;
  incidents: Incident[] = [];
  filteredIncidents: Incident[] = [];
  communications: Communication[] = [];
  //  zoneStatistics: ZoneStatistic[] = [];

  // Filters
  agenciesFilter = "";
  clientsFilter = "all";
  roleFilter = "";
  searchTerm = "";
  neighborhoodFilter = "";
  collectorsFilter = "all";
  complianceFilter = "all";
  statisticsPeriod = "month";
  // Valeurs alignées sur Signalement.status (models/Signalement.js) — filtrable côté
  // serveur par GET /api/signalements?status=... (contrairement à l'ancien
  // Collecte.status, qui restait bloqué sur 'Reported' pour toujours).
  incidentsFilter: 'all' | 'open' | 'in_progress' | 'resolved' = 'all';
  severityFilter:  'all' | 'critical' | 'high' | 'medium' | 'low' = 'all';
  // Chantier Signalements, item 1 : `origine` existe déjà côté modèle/API
  // (models/Signalement.js), jamais exposé côté filtre admin jusqu'ici.
  origineFilter: 'all' | 'collecte' | 'independant' = 'all';
  incidentsSearchTerm   = '';
  incidentsCurrentPage  = 1;
  incidentsTotalPages   = 1;
  incidentsItemsPerPage = 10;
  incidentsTotalItems   = 0;

  // ── Onglet Retraits (validation admin des demandes de retrait d'agence) ──
  withdrawalRequests:        AdminWithdrawalRequest[] = [];
  isLoadingWithdrawals       = false;
  withdrawalsErrorMessage:   string | null = null;
  withdrawalSearchTerm       = '';
  withdrawalStatusFilter:    WithdrawalStatus | 'all' = 'all';
  withdrawalAgencyFilter     = 'all';
  withdrawalDateFrom         = '';
  withdrawalDateTo           = '';
  withdrawalAgencyOptions:   { id: string; name: string }[] = [];
  readonly WithdrawalStatus  = WithdrawalStatus; // exposé au template pour les comparaisons de statut

  // Pagination Retraits
  withdrawalsCurrentPage  = 1;
  withdrawalsTotalPages   = 1;
  withdrawalsItemsPerPage = 10;
  withdrawalsTotalItems   = 0;

  // Détail (drawer) + actions
  visibleWithdrawalDetailDrawer = false;
  selectedWithdrawal: AdminWithdrawalRequest | null = null;

  showApproveWithdrawalDialog = false;
  withdrawalToApprove: AdminWithdrawalRequest | null = null;
  isApprovingWithdrawal = false;

  showRejectWithdrawalDialog = false;
  withdrawalToReject: AdminWithdrawalRequest | null = null;
  withdrawalRejectionReason = '';
  isRejectingWithdrawal = false;

  // Résolution manuelle d'un retrait A_VERIFIER_MANUELLEMENT (timeout opérateur sans
  // réponse HTTP claire à l'acceptation — voir services/transaction.js). Un seul dialog
  // pour les deux issues (mode 'effectue'/'non_effectue'), même schéma que approve/reject.
  showConfirmVirementDialog = false;
  withdrawalToConfirmVirement: AdminWithdrawalRequest | null = null;
  virementConfirmMode: 'effectue' | 'non_effectue' | null = null;
  isConfirmingVirement = false;

  // Select agence custom avec scroll infini
  agencyIdFilter       = '';
  agencyDropdownOpen   = false;
  agencyDropdownSearch = '';
  agencyDropdownList:  { id: string; name: string }[] = [];
  agencyDropdownPage   = 1;
  agencyDropdownTotal  = 0;
  agencyDropdownLoading = false;
  selectedAgencyForFilter: { id: string; name: string } | null = null;

  usersFilterParams: FilterParams = {
    role: this.roleFilter,
    neighborhood: this.neighborhoodFilter,
    term: this.searchTerm,
    page: 1,
    limit: 10,
  };

  // ── Pagination Utilisateurs ──────────────────────────────
  usersCurrentPage = 1;
  usersTotalPages  = 1;
  usersTotalItems  = 0;
  usersItemsPerPage = 10;

  agenciesFilterParams: FilterParams = {
    status: this.agenciesFilter,
    search: this.searchTerm,
    page: 1,
    limit: 10,
  };

  // ── Vue Agences / Utilisateurs / Incidents ──────────────
  agenciesViewMode:  'card' | 'table' = 'card';
  usersViewMode:     'card' | 'table' = 'card';
  incidentsViewMode: 'card' | 'table' = 'card';

  // ── Pagination Agences ───────────────────────────────────
  agenciesCurrentPage  = 1;
  agenciesTotalPages   = 1;
  agenciesTotalItems   = 0;
  agenciesItemsPerPage = 10;
  // Loading states
  isLoadingStatistics = false;
  isLoadingAgencies = false;
  isLoadingClients = false;
  isLoadingCollectors = false;
  isLoadingIncidents = false;
  isLoadingCommunications = false;
  isLoadingWasteStats = false;
  isLoadingZoneStats = false;

  // Modals
  showCommunicationModal = false;

  // Forms
  newCommunication: any = {
    type: "",
    priority: "medium",
    title: "",
    message: "",
    recipients: [],
  };

  // ── Badges onglets ───────────────────────────────────────
  tabBadges: Record<string, number> = {};

  //Statistics for admin
  statisticsAdmin: AdminStatistics | null = null;

  // Extrait dans un getter (plutôt que le calcul inline avec ?./??/! dans le template) :
  // le vérificateur de templates Angular ne propage pas toujours le narrowing d'un chaînage
  // optionnel multi-niveaux (statisticsAdmin?.x ? statisticsAdmin.y : ...) de la même façon
  // que le TypeScript standard — ngc/esbuild rejette alors ce que le langage-service accepte.
  // Un getter isole le null-check dans du TS classique, où le narrowing est fiable.
  get agencyActivityRatio(): number {
    const stats = this.statisticsAdmin;
    if (!stats || !stats.totalAgencies) return 0;
    return (stats.totalActiveAgencies * 100) / stats.totalAgencies;
  }

  // Même raison que agencyActivityRatio ci-dessus : selectedUser.agency?.slogan réutilisé
  // dans un *ngIf puis l'interpolation qu'il garde n'est pas narrowé de façon fiable par le
  // vérificateur de templates Angular.
  get selectedUserAgencySlogan(): string | undefined {
    return this.selectedUser.agency?.slogan;
  }
  //List all clients for admin dashboard
  clients: any;

  // Nouveaux filtres basés sur l'API backend
  employeesCityFilter: string = "";
  employeesNeighborhoodFilter: string = "";
  employeesArrondissementFilter: string = "";
  employeesSectorFilter: number | null = null;

  // Données pour les filtres (utilisant le même système que l'enregistrement)
  availableEmployeeCities: City[] = [];
  availableEmployeeArrondissements: Arrondissement[] = [];
  availableEmployeeSectors: Sector[] = [];
  availableEmployeeNeighborhoods: Quartier[] = [];
  tabs = [
    { id: "overview", label: "Vue d'ensemble", icon: "dashboard", badge: null },
    // {
    //   id: "municipalities",
    //   label: "Municipalités",
    //   icon: "business",
    //   badge: null,
    // },
    { id: "agencies", label: "Agences", icon: "business", badge: null },
    // { id: "collectors", label: "Collecteurs", icon: "business", badge: null },
    // { id: "clients", label: "Clients", icon: "business", badge: null },
    { id: "all_users", label: "Utilisateurs", icon: "person", badge: null },
    { id: "statistics", label: "Statistiques", icon: "analytics", badge: null },
    { id: "collectes", label: "Collectes", icon: "local_shipping", badge: null },
    {
      id: "incidents",
      label: "Incidents",
      icon: "report_problem",
      badge: null,
    },
    {
      id: "withdrawals",
      label: "Retraits",
      icon: "account_balance_wallet",
      badge: null,
    },
    {
      id: "communications",
      label: "Communications",
      icon: "campaign",
      badge: null,
    },
  ];
  municipalitiesAudits: any;
  filteredMunicipalities: any[] = [];
  clientGrowth: number = 0;
  signalementsAudits: any;
  filteredSignalements: any[] = [];
  isDisabled = true;
  visible1: boolean = false;
  visibleEditUserDrawer = false;
  visibleIncidentDrawer = false;
  selectedIncident: Incident | null = null;

  // ── Drawer Ajout Agent de Mairie ──
  visibleAddAgentDrawer = false;
  isSubmittingAgent     = false;
  newAgentData = {
    firstName: '', lastName: '', email: '', phone: '',
    password: '', confirmPassword: '',
    acceptTerms: true,
    address: { city: '', arrondissement: '', sector: '', neighborhood: '', street: '', doorNumber: '' },
  };
  agentCities:          any[] = [];
  agentArrondissements: any[] = [];
  agentSectors:         any[] = [];
  agentNeighborhoods:   any[] = [];
  resolutionComment = '';
  resolveDialogVisible = false;
  resolveDialogIncidentId = '';
  isEditingUser = false;
  isSavingUser = false;
  isLargeScreen = false;
  constructor(
    private authService: AuthService,
    private agencyService: AgencyService,
    private collectionService: CollectionService,
    private adminService: Admin,
    private clientService: ClientService,
    private notificationService: NotificationService,
    private sharedService: SharedService,
    private router: Router,
    private cd: ChangeDetectorRef,
    private territoryService: TerritoryHttpService,
    private withdrawalRequestsService: WithdrawalRequestsHttpService,
    private exportClientService: ExportClientService,
  ) {
    this.drawerWidth;
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.getClientGrowth();
    this.initializeFiltersData();
    this.loadTabBadges();
    this.loadTabData(this.activeTab);
  }

  loadTabData(tabId: string): void {
    switch (tabId) {
      case 'overview':
        this.showAdminStatistics();
        this.loadAllSignalements();
        this.loadWasteStatistics();
        this.loadZoneStat();
        break;
      case 'agencies':
        this.loadAgencyAudits(this.agenciesFilterParams);
        this.getAllAgenciesIDs();
        break;
      case 'all_users':
        this.showAdminUsers(this.usersFilterParams);
        break;
      case 'statistics':
        this.chartsInitialized = false;
        this.isLoadingMap = true;
        // `loadZoneStatistics()` lit désormais `statisticsAdmin` (item 2c) — jusqu'ici
        // seul l'onglet 'overview' le chargeait, ce qui laissait cet onglet dépendre d'un
        // passage préalable par 'overview' (déjà vrai avant ce correctif pour les KPI de
        // cet onglet, ex. getCollectionRate()/monthlyClientPercentage). Rendu explicite ici.
        this.showAdminStatistics();
        this.loadWasteStatistics();
        this.loadZoneStatistics();
        this.loadZoneStat();
        this.loadAllSignalements();
        if (!this.agencyAudits.length) {
          this.loadAgencyAuditsForStats();
        } else {
          this.loadTopAgenciesByCollections();
        }
        this.loadAgenciesForMap();
        setTimeout(() => this.initCharts(), 120);
        break;
      case 'incidents':
        this.loadAllSignalements();
        break;
      case 'withdrawals':
        this.loadWithdrawalRequests();
        break;
      case 'municipalities':
        this.loadAllMunipalities();
        break;
      case 'clients':
        this.showAdminClients();
        break;
      case 'communications':
        this.loadCommunications();
        break;
      case 'collectes':
        this.loadWasteRecords();
        // Filtre "Collecteur" (item 5) — réutilise collectorsAudits (onglet Collecteurs)
        // plutôt qu'un nouveau fetch dédié ; ne recharge que si jamais chargé.
        if (!this.collectorsAudits.length) {
          this.loadAllCollectors();
        }
        break;
    }
  }

  // ════════════════════════════════════════════════════════════
  // ── Onglet Retraits — validation admin des demandes de retrait ──
  // Branché (Prompt 6) sur WithdrawalRequestsHttpService → GET/PATCH
  // /api/admin/retraits (Prompt 5). Filtrage + pagination faits côté serveur
  // (query params search/statut/agenceId/dateDebut/dateFin/page/pageSize),
  // pas recalculés ici.
  // ════════════════════════════════════════════════════════════

  loadWithdrawalRequests(): void {
    this.isLoadingWithdrawals = true;
    this.withdrawalsErrorMessage = null;

    const filter: WithdrawalRequestFilter = {
      search:   this.withdrawalSearchTerm || undefined,
      status:   this.withdrawalStatusFilter,
      agencyId: this.withdrawalAgencyFilter,
      dateFrom: this.withdrawalDateFrom || undefined,
      dateTo:   this.withdrawalDateTo || undefined,
      page:     this.withdrawalsCurrentPage,
      pageSize: this.withdrawalsItemsPerPage,
    };

    this.withdrawalRequestsService.getWithdrawalRequests(filter).subscribe({
      next: (res) => {
        this.withdrawalRequests = res.data;
        this.withdrawalsTotalItems = res.total;
        this.withdrawalsTotalPages = res.totalPages;
        this.withdrawalsCurrentPage = res.page;
        this.isLoadingWithdrawals = false;

        if (!this.withdrawalAgencyOptions.length) {
          this.loadWithdrawalAgencyOptions();
        }
        this.updateWithdrawalsTabBadge();
      },
      error: (err) => {
        this.isLoadingWithdrawals = false;
        this.withdrawalsErrorMessage = err?.error?.message || 'Impossible de charger les demandes de retrait.';
        this.notificationService.showError('Erreur', this.withdrawalsErrorMessage!);
      },
    });
  }

  /** Compte les demandes en attente sur l'ENSEMBLE du jeu de données (pas juste la page
   *  courante) pour le badge de l'onglet — même logique que les autres badges d'onglets. */
  private updateWithdrawalsTabBadge(): void {
    this.withdrawalRequestsService.filterWithdrawals({ status: WithdrawalStatus.PENDING }).subscribe(pending => {
      this.tabBadges = { ...this.tabBadges, withdrawals: pending.length };
    });
  }

  /** Construit la liste déroulante "Agence" à partir des agences réellement présentes
   *  dans le jeu de retraits (pas de toutes les agences de la plateforme) — cohérent
   *  avec ce que renverrait un vrai endpoint de filtre facetté. */
  private loadWithdrawalAgencyOptions(): void {
    this.withdrawalRequestsService.filterWithdrawals({}).subscribe(all => {
      const seen = new Map<string, string>();
      for (const r of all) seen.set(r.agencyId, r.agencyName);
      this.withdrawalAgencyOptions = Array.from(seen, ([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  refreshWithdrawalRequests(): void {
    this.loadWithdrawalRequests();
  }

  isExportingWithdrawals = false;

  /**
   * Export réel (chantier Rapports/Statistiques, item 4 — écran à fort usage, retraits,
   * jusqu'ici sans aucun export). Réutilise `filterWithdrawals()` (déjà existant, sert par
   * ailleurs à peupler `withdrawalAgencyOptions` — `page:1, pageSize:1000`, la même
   * convention "jeu complet filtré, pas juste la page visible" que le reste de ce chantier)
   * avec les MÊMES filtres actuellement affichés à l'écran — pas juste `withdrawalRequests`
   * (paginé côté serveur), pour ne pas reproduire le bug de troncature de l'item 1.
   * Aucune écriture, aucun appel à accepterRetrait/rejeterRetrait — lecture seule sur des
   * données déjà réelles, le module Retraits protégé n'est pas touché.
   */
  exportWithdrawalRequests(): void {
    if (this.isExportingWithdrawals) return;
    this.isExportingWithdrawals = true;
    const filter: WithdrawalRequestFilter = {
      search:   this.withdrawalSearchTerm || undefined,
      status:   this.withdrawalStatusFilter,
      agencyId: this.withdrawalAgencyFilter,
      dateFrom: this.withdrawalDateFrom || undefined,
      dateTo:   this.withdrawalDateTo || undefined,
    };
    this.withdrawalRequestsService.filterWithdrawals(filter).subscribe({
      next: (rows) => {
        this.isExportingWithdrawals = false;
        if (!rows.length) {
          this.notificationService.showInfo("Export", "Aucune demande de retrait à exporter pour ces filtres.");
          return;
        }
        this.exportClientService.exportToCsv(
          rows.map((w) => ({
            agence: w.agencyName,
            gestionnaire: w.agencyManagerName,
            email: w.agencyManagerEmail,
            montant: w.amount,
            soldeDisponible: w.availableBalance,
            methode: this.getPaymentMethodText(w.paymentMethod),
            portefeuille: w.walletNumber,
            dateDemande: w.requestDate,
            statut: this.getWithdrawalStatusText(w.status),
            traitePar: w.processedBy || '',
            dateTraitement: w.processingDate || '',
          })),
          [
            { key: 'agence', label: 'Agence' },
            // { key: 'gestionnaire', label: 'Gestionnaire' },
            { key: 'email', label: 'Email' },
            { key: 'montant', label: 'Montant demandé' },
            { key: 'soldeDisponible', label: 'Solde disponible' },
            { key: 'methode', label: 'Méthode' },
            { key: 'portefeuille', label: 'Portefeuille / N° compte' },
            { key: 'dateDemande', label: 'Date demande' },
            { key: 'statut', label: 'Statut' },
            // { key: 'traitePar', label: 'Traité par' },
            { key: 'dateTraitement', label: 'Date traitement' },
          ],
          `retraits-${new Date().toISOString().slice(0, 10)}`,
        );
        this.notificationService.showSuccess("Export réussi", "Le fichier des demandes de retrait a été téléchargé.");
      },
      error: (err) => {
        this.isExportingWithdrawals = false;
        this.notificationService.showError("Erreur", err?.error?.message || "Impossible d'exporter les demandes de retrait.");
      },
    });
  }

  filterWithdrawalRequests(): void {
    this.withdrawalsCurrentPage = 1;
    this.loadWithdrawalRequests();
  }

  clearWithdrawalFilters(): void {
    this.withdrawalSearchTerm = '';
    this.withdrawalStatusFilter = 'all';
    this.withdrawalAgencyFilter = 'all';
    this.withdrawalDateFrom = '';
    this.withdrawalDateTo = '';
    this.filterWithdrawalRequests();
  }

  // ── Pagination Retraits (même pattern que goToAgenciesPage/goToIncidentsPage) ──

  goToWithdrawalsPage(page: number): void {
    if (page < 1 || page > this.withdrawalsTotalPages || page === this.withdrawalsCurrentPage) return;
    this.withdrawalsCurrentPage = page;
    this.loadWithdrawalRequests();
  }

  changeWithdrawalsItemsPerPage(size: number): void {
    this.withdrawalsItemsPerPage = size;
    this.withdrawalsCurrentPage = 1;
    this.loadWithdrawalRequests();
  }

  getWithdrawalsPageNumbers(): number[] {
    const total = this.withdrawalsTotalPages;
    const current = this.withdrawalsCurrentPage;
    const delta = 2;
    const start = Math.max(1, current - delta);
    const end = Math.min(total, current + delta);
    const pages: number[] = [];
    for (let p = start; p <= end; p++) pages.push(p);
    return pages;
  }

  getWithdrawalsEndItem(): number {
    return Math.min(this.withdrawalsCurrentPage * this.withdrawalsItemsPerPage, this.withdrawalsTotalItems);
  }

  // ── Détail ────────────────────────────────────────────────────

  viewWithdrawalDetails(id: string): void {
    this.selectedWithdrawal = null;
    this.visibleWithdrawalDetailDrawer = true;
    this.withdrawalRequestsService.getWithdrawalById(id).subscribe({
      next: (request) => { this.selectedWithdrawal = request; },
      error: (err) => {
        this.visibleWithdrawalDetailDrawer = false;
        this.notificationService.showError('Erreur', err?.error?.message || 'Demande de retrait introuvable.');
      },
    });
  }

  closeWithdrawalDetailDrawer(): void {
    this.visibleWithdrawalDetailDrawer = false;
    this.selectedWithdrawal = null;
  }

  // ── Approbation ───────────────────────────────────────────────

  openApproveWithdrawalDialog(request: AdminWithdrawalRequest): void {
    this.withdrawalToApprove = request;
    this.showApproveWithdrawalDialog = true;
  }

  closeApproveWithdrawalDialog(): void {
    this.showApproveWithdrawalDialog = false;
    this.withdrawalToApprove = null;
  }

  confirmApproveWithdrawal(): void {
    if (!this.withdrawalToApprove) return;
    this.isApprovingWithdrawal = true;
    const adminName = `${this.currentUser?.firstName ?? ''} ${this.currentUser?.lastName ?? ''}`.trim() || 'Administrateur';

    this.withdrawalRequestsService.approveWithdrawal(this.withdrawalToApprove.id, { adminName }).subscribe({
      next: () => {
        this.isApprovingWithdrawal = false;
        this.showApproveWithdrawalDialog = false;
        this.withdrawalToApprove = null;
        this.notificationService.showSuccess('Retrait approuvé', 'La demande de retrait a été approuvée avec succès.');
        this.loadWithdrawalRequests();
        if (this.visibleWithdrawalDetailDrawer) this.closeWithdrawalDetailDrawer();
      },
      error: (err) => {
        this.isApprovingWithdrawal = false;
        this.notificationService.showError('Erreur', err?.error?.message || "Impossible d'approuver cette demande.");
      },
    });
  }

  // ── Rejet ─────────────────────────────────────────────────────

  openRejectWithdrawalDialog(request: AdminWithdrawalRequest): void {
    this.withdrawalToReject = request;
    this.withdrawalRejectionReason = '';
    this.showRejectWithdrawalDialog = true;
  }

  closeRejectWithdrawalDialog(): void {
    this.showRejectWithdrawalDialog = false;
    this.withdrawalToReject = null;
    this.withdrawalRejectionReason = '';
  }

  confirmRejectWithdrawal(): void {
    if (!this.withdrawalToReject) return;
    if (!this.withdrawalRejectionReason.trim()) {
      this.notificationService.showWarning('Motif requis', 'Veuillez indiquer un motif de rejet.');
      return;
    }
    this.isRejectingWithdrawal = true;
    const adminName = `${this.currentUser?.firstName ?? ''} ${this.currentUser?.lastName ?? ''}`.trim() || 'Administrateur';

    this.withdrawalRequestsService.rejectWithdrawal(this.withdrawalToReject.id, {
      adminName,
      reason: this.withdrawalRejectionReason,
    }).subscribe({
      next: () => {
        this.isRejectingWithdrawal = false;
        this.showRejectWithdrawalDialog = false;
        this.withdrawalToReject = null;
        this.withdrawalRejectionReason = '';
        this.notificationService.showSuccess('Retrait rejeté', 'La demande de retrait a été rejetée.');
        this.loadWithdrawalRequests();
        if (this.visibleWithdrawalDetailDrawer) this.closeWithdrawalDetailDrawer();
      },
      error: (err) => {
        this.isRejectingWithdrawal = false;
        this.notificationService.showError('Erreur', err?.error?.message || 'Impossible de rejeter cette demande.');
      },
    });
  }

  // ── Résolution manuelle (virement ambigu) ───────────────────────

  openConfirmVirementDialog(request: AdminWithdrawalRequest, mode: 'effectue' | 'non_effectue'): void {
    this.withdrawalToConfirmVirement = request;
    this.virementConfirmMode = mode;
    this.showConfirmVirementDialog = true;
  }

  closeConfirmVirementDialog(): void {
    this.showConfirmVirementDialog = false;
    this.withdrawalToConfirmVirement = null;
    this.virementConfirmMode = null;
  }

  confirmVirement(): void {
    if (!this.withdrawalToConfirmVirement || !this.virementConfirmMode) return;
    this.isConfirmingVirement = true;
    const id = this.withdrawalToConfirmVirement.id;
    const appel = this.virementConfirmMode === 'effectue'
      ? this.withdrawalRequestsService.confirmerVirementEffectue(id)
      : this.withdrawalRequestsService.confirmerVirementNonEffectue(id);

    appel.subscribe({
      next: () => {
        this.isConfirmingVirement = false;
        this.showConfirmVirementDialog = false;
        this.withdrawalToConfirmVirement = null;
        this.virementConfirmMode = null;
        this.notificationService.showSuccess('Retrait résolu', 'La demande de retrait a été mise à jour avec succès.');
        this.loadWithdrawalRequests();
        if (this.visibleWithdrawalDetailDrawer) this.closeWithdrawalDetailDrawer();
      },
      error: (err) => {
        this.isConfirmingVirement = false;
        this.notificationService.showError('Erreur', err?.error?.message || 'Impossible de résoudre cette demande.');
      },
    });
  }

  // ── Présentation ──────────────────────────────────────────────

  // Table explicite (pas de dérivation `.toLowerCase()` sur la valeur de l'enum) :
  // les valeurs réelles du backend (EN_ATTENTE_VALIDATION, INITIATED, REJETE...)
  // ne correspondent plus aux classes CSS existantes (.status-pending, .status-approved...),
  // qui restent donc inchangées (Prompt 6 — visuel préservé).
  getWithdrawalStatusClass(status: WithdrawalStatus): string {
    const classes: Record<WithdrawalStatus, string> = {
      [WithdrawalStatus.PENDING]:   'status-pending',
      [WithdrawalStatus.APPROVED]:  'status-approved',
      [WithdrawalStatus.REJECTED]:  'status-rejected',
      [WithdrawalStatus.PROCESSED]: 'status-processed',
      [WithdrawalStatus.PAID]:      'status-paid',
      [WithdrawalStatus.FAILED]:    'status-failed',
      // Issue Moov réellement inconnue (pas juste un échec constaté) — nécessite
      // une action urgente du Super Admin, pas un statut de routine parmi
      // d'autres. Réutilise .status-open (rouge, déjà utilisé pour les
      // signalements ouverts nécessitant une action) plutôt qu'inventer une
      // nouvelle classe.
      [WithdrawalStatus.TO_VERIFY]: 'status-open',
    };
    return classes[status] ?? 'status-pending';
  }

  getWithdrawalStatusText(status: WithdrawalStatus): string {
    const labels: Record<WithdrawalStatus, string> = {
      [WithdrawalStatus.PENDING]:   'En attente',
      [WithdrawalStatus.APPROVED]:  'Approuvé',
      [WithdrawalStatus.REJECTED]:  'Rejeté',
      [WithdrawalStatus.PROCESSED]: 'Traité avec erreur',
      [WithdrawalStatus.PAID]:      'Payé',
      [WithdrawalStatus.FAILED]:    'Échoué',
      [WithdrawalStatus.TO_VERIFY]: '⚠ À vérifier manuellement',
    };
    return labels[status] ?? status;
  }

  getPaymentMethodText(method: PaymentMethod): string {
    const labels: Record<PaymentMethod, string> = {
      [PaymentMethod.ORANGE_MONEY]:  'Orange Money',
      [PaymentMethod.MOOV_MONEY]:    'Moov Money',
      [PaymentMethod.TELECEL_MONEY]: 'Telecel Money',
    };
    return labels[method] ?? method;
  }

  formatXof(amount: number | undefined | null): string {
    if (amount === undefined || amount === null) return '—';
    return new Intl.NumberFormat('fr-FR').format(amount) + ' XOF';
  }

  //User
  selectedUser: RegisterUserData = {
    _id: "",
    id: "",
    userId: "",
    subscribedAgencyId: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    role: "",
    address: {
      arrondissement: "",
      sector: "",
      street: "",
      doorNumber: "",
      doorColor: "",
      neighborhood: "",
      city: "",
      postalCode: "",
      latitude: 0,
      longitude: 0,
    },
    acceptTerms: true,
    receiveOffers: false,
    agencyId: "",
    status: "",
    nbGestionnaires: 0,
    isOwnerAgency: false,
    slogan: "",
    longitude: 0,
    latitude: 0,
    agencyName: "",
    agencyDescription: "",
    createdAt: "",
    updatedAt: "",
    isActive: true,
    avatar: "",
    commune: {
      name: "",
      region: "",
      province: "",
    },
    agency: {
      _id: "",
      name: "",
      agencyDescription: "",
      zoneActivite: [],
      client: "",
      collector: "",
      slogan: "",
      gestionnaires: [],
      owner: "",
      documents: [],
      status: "active",
      longitude: 0,
      latitude: 0,
    },
  };

  loadAgencyAudits(agenciesFilter: any): void {
    this.isLoadingAgencies = true;
    this.agencyService.getAllAgenciesFromApi(agenciesFilter).subscribe({
      next: (agencies) => {
        this.agencyAudits = (Array.isArray(agencies?.data) ? agencies.data : []).map((agency: any) => ({
          id: agency?._id,
          name: agency?.name,
          status: agency?.status || "inactive",
          clients: agency?.clients?.length || 0,
          collectors: agency?.employees?.length || 0,
          gestionnaires: 0,
          zones: agency?.zoneActivite?.length || 0,
          userId: agency?.userId,
          collectionsToday: 0,
          completionRate: 0,
          // Moyenne réelle des CollecteRating de l'agence (chantier "notation
          // agences") — était codé en dur à 0 alors que la valeur réelle est déjà
          // dans la réponse (`agency.rating`), jamais lue jusqu'ici.
          rating: agency?.rating || 0,
          revenue: 0,
          lastAudit: new Date(),
          complianceScore: 0,
          issues: [],
          statsLoaded: false,
        }));
        this.filteredAgencies = [...this.agencyAudits];

        // Pagination metadata
        this.agenciesTotalItems   = agencies?.total ?? agencies?.pagination?.total ?? agencies?.count ?? this.agencyAudits.length;
        this.agenciesItemsPerPage = agenciesFilter?.limit ?? 10;
        this.agenciesCurrentPage  = agenciesFilter?.page  ?? 1;
        this.agenciesTotalPages   = Math.max(1, Math.ceil(this.agenciesTotalItems / this.agenciesItemsPerPage));

        this.isLoadingAgencies = false;

        // Charger les stats détaillées pour chaque agence de la page courante
        this.loadAgenciesStats(this.agencyAudits.map(a => a.id));
        // Taux de recouvrement (item 8) — même source de données que le dashboard
        // financier agence, un appel par agence de la page courante.
        this.loadAgenciesFinanceStats(this.agencyAudits.map(a => a.id));
        // Frais plateforme (chantier Frais plateforme, Prompt F8/9) — colonne dédiée,
        // distincte du taux de recouvrement ci-dessus.
        this.loadAgenciesPlatformFees(this.agencyAudits.map(a => a.id));

        // Charger les collectes effectuées pour le top 5 si onglet statistiques actif
        if (this.activeTab === 'statistics') {
          this.loadTopAgenciesByCollections();
        }
      },
      error: (error) => {
        console.error("Erreur lors du chargement des agences:", error);
        this.isLoadingAgencies = false;
      },
    });
    // this.agencyAudits = [
    //   {
    //     id: '1',
    //     name: 'EcoClean Services',
    //     status: 'active',
    //     clients: 1250,
    //     collectors: 8,
    //     zones: 3,
    //     collectionsToday: 45,
    //     completionRate: 96,
    //     rating: 4.5,
    //     revenue: 32450,
    //     lastAudit: new Date('2024-01-10'),
    //     complianceScore: 95,
    //     issues: []
    //   },
    //   {
    //     id: '2',
    //     name: 'GreenWaste Solutions',
    //     status: 'active',
    //     clients: 850,
    //     collectors: 6,
    //     zones: 2,
    //     collectionsToday: 32,
    //     completionRate: 88,
    //     rating: 4.2,
    //     revenue: 22100,
    //     lastAudit: new Date('2024-01-08'),
    //     complianceScore: 82,
    //     issues: ['Retards fréquents', 'Signalements clients']
    //   },
    //   {
    //     id: '3',
    //     name: 'WasteManager Pro',
    //     status: 'suspended',
    //     clients: 450,
    //     collectors: 3,
    //     zones: 1,
    //     collectionsToday: 0,
    //     completionRate: 0,
    //     rating: 3.8,
    //     revenue: 0,
    //     lastAudit: new Date('2024-01-05'),
    //     complianceScore: 65,
    //     issues: ['Non-conformité réglementaire', 'Licence expirée']
    //   }
    // ];
  }

  // Même table d'affichage que municipality-dashboard.ts (WASTE_TYPE_DISPLAY) — le
  // backend (GET /municipality/waste-statistics) ne renvoie que la clé d'enum réelle
  // (menagers/recyclables/...), jamais un libellé français ni une couleur.
  private readonly WASTE_TYPE_DISPLAY: Record<string, { label: string; color: string }> = {
    menagers: { label: 'Ménagers', color: '#4caf50' },
    recyclables: { label: 'Recyclables', color: '#2196f3' },
    verts: { label: 'Déchets verts', color: '#8bc34a' },
    encombrants: { label: 'Encombrants', color: '#ff9800' },
    speciaux: { label: 'Spéciaux', color: '#9c27b0' },
  };

  /**
   * Branché (chantier Rapports/Statistiques, item 2b) sur le vrai endpoint
   * GET /municipality/waste-statistics — déjà réel et utilisé par municipality-dashboard.ts,
   * pas de deuxième implémentation. N'effectuait auparavant aucun appel HTTP (4 valeurs
   * codées en dur).
   */
  loadWasteStatistics(): void {
    this.adminService.getWasteStatistics$(30).subscribe({
      next: (response: any) => {
        const rows = response?.data ?? [];
        this.wasteStatistics = rows.map((row: any) => ({
          type: this.WASTE_TYPE_DISPLAY[row.type]?.label ?? row.type,
          quantity: row.quantity,
          percentage: row.percentage,
          trend: row.trend,
          color: this.WASTE_TYPE_DISPLAY[row.type]?.color ?? '#9ca3af',
        }));
        this.buildWasteChart();
      },
      error: (error) => {
        console.error("Erreur lors du chargement de la répartition des déchets:", error);
        this.wasteStatistics = [];
      },
    });
  }
  get drawerWidth(): string {
    return window.innerWidth <= 768 ? "100%" : "33%";
  }

  loadAgencyAuditsForStats(): void {
    this.loadAgencyAudits({ page: 1, limit: 10 });
  }

  loadAgenciesStats(agencyIds: string[]): void {
    if (!agencyIds.length) return;
    const requests = agencyIds.map(id =>
      this.agencyService.getAgencyStats$(id).pipe(catchError(() => of(null)))
    );
    forkJoin(requests).subscribe({
      next: (results) => {
        results.forEach((res, i) => {
          console.log(`[AgencyStats] id=${agencyIds[i]} raw=`, res);
          const data = res?.data ?? res;
          const audit = this.agencyAudits.find(a => a.id === agencyIds[i]);
          if (!audit || !data) return;
          // Priorité aux stats API ; si 0, on garde la valeur de la liste (fallback)
          const apiClients    = data.totalClientsActifs ?? data.totalClients;
          const apiCollectors = data.totalCollecteurs   ?? data.totalCollectors;
          audit.clients       = apiClients    > 0 ? apiClients    : audit.clients;
          audit.collectors    = apiCollectors > 0 ? apiCollectors : audit.collectors;
          audit.gestionnaires = data.totalGestionnaires ?? 0;
          audit.statsLoaded   = true;
        });
        this.filteredAgencies = [...this.agencyAudits];
      }
    });
  }

  /**
   * Taux de recouvrement par agence (chantier Finance/Paiements, item 8) — réutilise
   * GET /finance/dashboard/kpi?agencyId=... (Admin.getFinanceKpi$), le MÊME endpoint que
   * le dashboard financier agence (resolveAgency.js autorise déjà l'override agencyId
   * pour super_admin) : pas un second calcul du ratio côté admin.
   */
  loadAgenciesFinanceStats(agencyIds: string[]): void {
    if (!agencyIds.length) return;
    const requests = agencyIds.map(id =>
      this.adminService.getFinanceKpi$(id).pipe(catchError(() => of(null)))
    );
    forkJoin(requests).subscribe((results) => {
      results.forEach((kpi: any, i) => {
        const audit = this.agencyAudits.find(a => a.id === agencyIds[i]);
        if (audit && kpi) audit.tauxRecouvrement = kpi.tauxRecouvrement;
      });
      this.filteredAgencies = [...this.agencyAudits];
    });
  }

  /**
   * Frais plateforme perçus par agence (chantier Frais plateforme, Prompt F8/9) —
   * même convention que loadAgenciesFinanceStats ci-dessus (un appel par agence,
   * resolveAgency.js autorise déjà l'override agencyId pour super_admin) : pas de
   * second calcul, réutilise FeeService.getPlatformFeesSummary (Prompt F6/9).
   */
  loadAgenciesPlatformFees(agencyIds: string[]): void {
    if (!agencyIds.length) return;
    const requests = agencyIds.map(id =>
      this.adminService.getPlatformFees$(id).pipe(catchError(() => of(null)))
    );
    forkJoin(requests).subscribe((results) => {
      results.forEach((resume: any, i) => {
        const audit = this.agencyAudits.find(a => a.id === agencyIds[i]);
        if (audit && resume) audit.platformFees = resume.totalPlatformAmount;
      });
      this.filteredAgencies = [...this.agencyAudits];
    });
  }

  loadTopAgenciesByCollections(): void {
    // Liste COMPLÈTE des agences — pas `agencyAudits` (paginé à 10 par défaut
    // pour l'onglet Agences, en plus filtrable par recherche/statut), qui faisait
    // silencieusement disparaître du "Top 5" toute agence hors page courante /
    // filtre actif. Même correctif déjà appliqué à loadCommunications() ci-dessous
    // pour exactement le même bug (agences manquantes du picker destinataires).
    this.agencyService.getAllAgenciesFromApi({ getAll: true }).subscribe({
      next: (response: any) => {
        const list = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
        const agencies = list.map((a: any) => ({ id: a._id, name: a.name }));
        if (!agencies.length) return;
        this.loadTopAgenciesByCollectionsFor(agencies);
      },
      error: () => {},
    });
  }

  private loadTopAgenciesByCollectionsFor(agencies: { id: string; name: string }[]): void {
    const requests = agencies.map(a =>
      this.agencyService.getCompletedCollectes$(a.id).pipe(
        map((res: any) => {
          // AgencyCompletedCollectes (collecte.service.js) renvoie un tableau Mongoose brut,
          // pas une enveloppe { data, total } — ce cas doit être vérifié en premier : les anciennes
          // vérifications res.total/res.count/res.data passaient toutes à 0 avant d'atteindre
          // Array.isArray(res), forçant "collections" à 0 pour chaque agence (chart invisible).
          const count = Array.isArray(res) ? res.length
            : Array.isArray(res?.data) ? res.data.length
            : (res?.total ?? res?.count ?? 0);
          return { id: a.id, name: a.name, collections: count };
        }),
        catchError(() => of({ id: a.id, name: a.name, collections: 0 }))
      )
    );

    forkJoin(requests).subscribe({
      next: (results: any[]) => {
        this.topAgenciesByCollections = [...results]
          .sort((a, b) => b.collections - a.collections)
          .slice(0, 5);
        if (this.chartsInitialized && this.activeTab === 'statistics') {
          this.buildAgenciesChart();
        }
      }
    });
  }

  // ── Carte territoriale ────────────────────────────────────

  // Coordonnées RÉELLES par nom de quartier (models/neighbourhood.js::latitude/longitude),
  // chargées une fois — priorité sur OUAGA_COORDS (mock codé en dur, gardé en repli pour
  // les quartiers pas encore géolocalisés en base, voir scripts/addCoordinates.js).
  private quartierCoordsByName: Record<string, [number, number]> = {};

  private loadQuartierCoords(): void {
    this.territoryService.getAllNeighborhoods().subscribe({
      next: (quartiers) => {
        quartiers.forEach((q: any) => {
          if (q?.name && typeof q.latitude === 'number' && typeof q.longitude === 'number') {
            this.quartierCoordsByName[q.name] = [q.latitude, q.longitude];
          }
        });
        // Les pins/zones ont pu être dessinés avant la fin de cet appel (indépendant de
        // loadAgenciesForMap) — redessine avec les vraies coordonnées une fois reçues.
        if (this.map) this.initTerritorialMap();
      },
      error: () => {},
    });
  }

  /** Vraie géolocalisation du quartier si connue, sinon repli sur le mock OUAGA_COORDS. */
  private _zoneCoord(zone: string): [number, number] | undefined {
    return this.quartierCoordsByName[zone] ?? this.OUAGA_COORDS[zone];
  }

  loadAgenciesForMap(): void {
    this.loadQuartierCoords();
    this.agencyService.getAllAgenciesFromApi({ page: 1, limit: 100 }).subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res) ? res : (res?.data ?? res?.agencies ?? []);
        this.agenciesGeoData = raw;
        this.isLoadingMap = false;
        if (this.chartsInitialized && this.activeTab === 'statistics') {
          this.buildAgenciesChart();
        }
        this.loadAgencyMapClientCounts();
        setTimeout(() => this.initTerritorialMap(), 100);
      },
      error: () => {
        this.isLoadingMap = false;
        setTimeout(() => this.initTerritorialMap(), 100);
      },
    });
  }

  /**
   * Charge le nombre réel de clients actifs (state_agencies/:id/stats, même source
   * que le panneau de détail — loadSelectedAgencyStats()) pour TOUTES les agences de
   * la carte (agenciesGeoData). La liste sidebar affichait auparavant
   * `getAgencyAudit(ag.name)?.clients`, une recherche par nom dans `agencyAudits`
   * (paginé à 10 par défaut pour l'onglet Agences) : toute agence hors page courante
   * n'y était jamais trouvée et affichait "—", même avec de vrais clients en base.
   */
  private loadAgencyMapClientCounts(): void {
    const agencies = this.agenciesGeoData.filter((ag: any) => ag?._id);
    if (!agencies.length) return;
    const requests = agencies.map((ag: any) =>
      this.agencyService.getAgencyStats$(ag._id).pipe(catchError(() => of(null)))
    );
    forkJoin(requests).subscribe((results: any[]) => {
      results.forEach((res: any, i) => {
        const data = res?.data ?? res;
        const count = data?.totalClientsActifs ?? data?.totalClients ?? 0;
        this.agencyMapClientCounts[agencies[i]._id] = count;
      });
    });
  }

  getMapAgencyClientCount(ag: any): number | string {
    return this.agencyMapClientCounts[ag?._id] ?? '—';
  }

  initTerritorialMap(): void {
    const el = this.mapElRef?.nativeElement;
    if (!el) return;
    if (this.map) { this.map.remove(); this.map = null; }

    this.agencyZoneLayers.clear();
    this.agencyPinLayers.clear();
    this.agencyDotLayers.clear();
    this.agencyZoneCircleMap.clear();
    this.agencyZoneDetails.clear();
    this.selectedAgency      = null;
    this.selectedAgencyIndex = null;

    this.map = L.map(el, {
      center: [12.3647, -1.5337],
      zoom: 12,
      zoomControl: false,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(this.map);

    L.control.zoom({ position: 'topright' }).addTo(this.map);

    // ── Invalidate size after render (sidebar peut décaler la carte) ──
    requestAnimationFrame(() => this.map?.invalidateSize({ animate: false }));

    this.agenciesGeoData.forEach((agency: any, index: number) => {
      const color    = this.AGENCY_PALETTE[index % this.AGENCY_PALETTE.length];
      const zones: string[] = agency?.zoneActivite ?? [];
      const name: string    = agency?.name ?? `Agence ${index + 1}`;
      const hood: string    = agency?.address?.neighborhood ?? zones[0] ?? '';
      const initials: string = name.split(' ')
        .filter((w: string) => w.length > 2)
        .map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
        || name.slice(0, 2).toUpperCase();

      const circles: L.Circle[] = [];
      const zoneCircleMap = new Map<string, L.Circle>();

      // ── Zone circles (stocker par index) ──
      zones.forEach((zone: string) => {
        const coords = this._zoneCoord(zone) ?? this.fallbackCoord(zone, index);
        if (!coords) return;

        const circle = L.circle(coords, {
          radius: 450,
          color,
          fillColor: color,
          fillOpacity: 0.15,
          weight: 1.5,
          opacity: 0.55,
        });

        circle.bindTooltip(this.buildBasicZoneTooltip(zone, name, color), {
          sticky: true, direction: 'top', className: 'map-tt',
        });

        circle.on('mouseover', () => {
          if (this.selectedAgencyIndex !== null && this.selectedAgencyIndex !== index) return;
          circle.setStyle({ fillOpacity: 0.6, weight: 3 });
        });
        circle.on('mouseout', () => {
          const isSelected = this.selectedAgencyIndex === index;
          circle.setStyle({
            fillOpacity: isSelected ? 0.42 : 0.15,
            weight:      isSelected ? 2.5  : 1.5,
            opacity:     isSelected ? 0.88 : 0.55,
          });
        });
        circle.on('click', () => this.selectAgencyOnMap(agency, index));
        circle.addTo(this.map!);
        circles.push(circle);
        zoneCircleMap.set(zone, circle);
      });

      this.agencyZoneLayers.set(index, circles);
      this.agencyZoneCircleMap.set(index, zoneCircleMap);

      // ── Dot centre de zone ──
      const centroid = this.getZoneCentroid(zones, index);
      const dot = L.circleMarker(centroid, {
        radius: 5,
        fillColor: '#fff',
        color,
        weight: 3,
        fillOpacity: 1,
        interactive: false,
      }).addTo(this.map!);
      this.agencyDotLayers.set(index, dot);

      // ── Pin agence ──
      const pinCoords = this._zoneCoord(hood) ?? this.fallbackCoord(name, index);
      const audit     = this.agencyAudits.find(a => a.name === name);
      const clients   = audit?.clients ?? '—';

      const icon = L.divIcon({
        html: `<div class="agency-pin" style="background:${color}">
                 <span class="pin-label">${initials}</span>
               </div>
               <div class="pin-tail" style="border-top-color:${color}"></div>`,
        iconSize:    [36, 44],
        iconAnchor:  [18, 44],
        popupAnchor: [0, -46],
        className:   'agency-marker',
      });

      const marker = L.marker(pinCoords, { icon });

      marker.bindPopup(`
        <div class="map-popup">
          <div class="popup-header" style="border-left:4px solid ${color}">
            <span class="popup-initials" style="background:${color}">${initials}</span>
            <div>
              <div class="popup-name">${name}</div>
              <div class="popup-status ${agency?.status === 'active' ? 'ps-active' : 'ps-off'}">
                ${agency?.status === 'active' ? '● Actif' : '○ Inactif'}
              </div>
            </div>
          </div>
          <div class="popup-body">
            <div class="popup-row"><i class="material-icons">people</i>&nbsp;${clients} clients</div>
            <div class="popup-row"><i class="material-icons">location_on</i>&nbsp;${hood || agency?.address?.city || '—'}</div>
            ${agency?.slogan ? `<div class="popup-slogan">"${agency.slogan}"</div>` : ''}
            <div class="popup-zones">
              <div class="popup-zones-label">Zones d'intervention (${zones.length})</div>
              <div class="popup-zones-list">
                ${zones.map((z: string) => `<span class="zone-chip" style="border-color:${color};color:${color}">${z}</span>`).join('')}
              </div>
            </div>
          </div>
        </div>
      `, { maxWidth: 290 });

      marker.on('click', () => this.selectAgencyOnMap(agency, index));
      marker.addTo(this.map!);
      this.agencyPinLayers.set(index, marker);
    });

    if (!this.agenciesGeoData.length) {
      this.map.setView([12.3647, -1.5337], 11);
    }
  }

  // ── Sélection d'agence ───────────────────────────────────

  selectAgencyOnMap(agency: any, index: number): void {
    // Deselect si même agence
    if (this.selectedAgencyIndex === index) {
      this.deselectAgency();
      return;
    }

    const prev = this.selectedAgencyIndex;

    // Masquer complètement toutes les autres agences
    this.agencyZoneLayers.forEach((circles, agIdx) => {
      if (agIdx === index) return;
      circles.forEach(c => c.setStyle({ fillOpacity: 0, opacity: 0, weight: 0 }));
    });
    this.agencyPinLayers.forEach((marker, agIdx) => {
      if (agIdx === index) return;
      const el = marker.getElement();
      if (el) { el.style.opacity = '0'; el.style.pointerEvents = 'none'; }
    });
    this.agencyDotLayers.forEach((dot, agIdx) => {
      if (agIdx === index) return;
      const el = dot.getElement();
      if (el) (el as HTMLElement).style.opacity = '0';
    });

    // Mettre en valeur l'agence sélectionnée
    const color = this.AGENCY_PALETTE[index % this.AGENCY_PALETTE.length];
    this.agencyZoneLayers.get(index)?.forEach(c =>
      c.setStyle({ fillOpacity: 0.42, opacity: 0.88, weight: 2.5, color, fillColor: color })
    );
    const pin = this.agencyPinLayers.get(index)?.getElement();
    if (pin) pin.style.opacity = '1';

    this.selectedAgencyIndex     = index;
    this.selectedAgency          = agency;
    this.selectedAgencyStats     = null;
    this.isLoadingAgencyDetail   = true;
    if (agency?._id) {
      this.loadSelectedAgencyStats(agency._id);
      this.loadSelectedAgencyZones(agency._id, index, color);
    }

    // FlyTo centroïde des zones
    const centroid = this.getZoneCentroid(agency?.zoneActivite ?? [], index);
    this.map?.flyTo(centroid, 14, { duration: 1.1 });
  }

  deselectAgency(): void {
    this.selectedAgency        = null;
    this.selectedAgencyIndex   = null;
    this.selectedAgencyStats   = null;
    this.isLoadingAgencyDetail = false;

    // Restaurer toutes les zones
    this.agencyZoneLayers.forEach((circles, agIdx) => {
      const color = this.AGENCY_PALETTE[agIdx % this.AGENCY_PALETTE.length];
      circles.forEach(c => c.setStyle({ fillOpacity: 0.15, opacity: 0.55, weight: 1.5, color, fillColor: color }));
    });
    // Restaurer tous les pins
    this.agencyPinLayers.forEach(marker => {
      const el = marker.getElement();
      if (el) { el.style.opacity = '1'; el.style.pointerEvents = ''; }
    });
    // Restaurer les dots
    this.agencyDotLayers.forEach(dot => {
      const el = dot.getElement();
      if (el) (el as HTMLElement).style.opacity = '1';
    });

    this.map?.flyTo([12.3647, -1.5337], 12, { duration: 0.9 });
  }

  loadSelectedAgencyStats(agencyId: string): void {
    this.agencyService.getAgencyStats$(agencyId).subscribe({
      next: (res: any) => {
        this.selectedAgencyStats = res?.success !== false ? (res?.data ?? res) : null;
        this.isLoadingAgencyDetail = false;
      },
      error: () => { this.isLoadingAgencyDetail = false; }
    });
  }

  loadSelectedAgencyZones(agencyId: string, agencyIndex: number, color: string): void {
    // Utilise le cache si déjà chargé
    if (this.agencyZoneDetails.has(agencyIndex)) {
      this.rebindZoneTooltips(agencyIndex, color);
      return;
    }
    this.agencyService.getAgencyZones$(agencyId).subscribe({
      next: (res: any) => {
        const zones: any[] = Array.isArray(res) ? res : (res?.data ?? res?.zones ?? []);
        this.agencyZoneDetails.set(agencyIndex, zones);
        this.rebindZoneTooltips(agencyIndex, color);
      },
      error: () => {}
    });
  }

  private rebindZoneTooltips(agencyIndex: number, color: string): void {
    const zoneCircleMap = this.agencyZoneCircleMap.get(agencyIndex);
    const zones         = this.agencyZoneDetails.get(agencyIndex) ?? [];
    if (!zoneCircleMap) return;

    // Construire un lookup name → zoneObj
    const zoneByName = new Map<string, any>();
    zones.forEach((z: any) => {
      const key = (z.name || z.zoneName || '').trim();
      if (key) zoneByName.set(key, z);
    });

    zoneCircleMap.forEach((circle, zoneName) => {
      const zoneObj = zoneByName.get(zoneName);
      circle.unbindTooltip();
      circle.bindTooltip(
        zoneObj
          ? this.buildRichZoneTooltip(zoneName, zoneObj, color)
          : this.buildBasicZoneTooltip(zoneName, '', color),
        { sticky: true, direction: 'top', className: 'map-tt' }
      );
    });
  }

  private buildBasicZoneTooltip(zoneName: string, agencyName: string, color: string): string {
    return `
      <div class="map-tt-inner">
        <span class="tt-dot" style="background:${color}"></span>
        <span class="tt-zone">${zoneName}</span>
        ${agencyName ? `<div class="tt-agency">${agencyName}</div>` : ''}
      </div>`;
  }

  private buildRichZoneTooltip(zoneName: string, z: any, color: string): string {
    const collectors   = z.collectors?.length ?? z.assignedCollectors?.length ?? z.nbCollectors ?? '—';
    const completion   = z.completionRate !== undefined ? `${z.completionRate}%` : (z.stats?.completionRate !== undefined ? `${z.stats.completionRate}%` : '—');
    const days: string = z.schedule?.days?.join(', ')
                      ?? z.plannings?.[0]?.days?.join(', ')
                      ?? z.schedule?.frequency
                      ?? z.planning
                      ?? '—';
    return `
      <div class="map-tt-rich">
        <div class="tt-rich-header" style="border-left:3px solid ${color}">
          <span class="tt-dot" style="background:${color}"></span>
          <strong>${zoneName}</strong>
        </div>
        <div class="tt-rich-row">
          <i class="material-icons tt-icon">speed</i>
          <span>Taux d'exécution&nbsp;: <b>${completion}</b></span>
        </div>
        <div class="tt-rich-row">
          <i class="material-icons tt-icon">people</i>
          <span>Collecteurs&nbsp;: <b>${collectors}</b></span>
        </div>
        <div class="tt-rich-row">
          <i class="material-icons tt-icon">event</i>
          <span>Planning&nbsp;: <b>${days}</b></span>
        </div>
      </div>`;
  }

  getSelectedCompletionRate(): number {
    if (this.selectedAgencyStats) {
      const today = this.selectedAgencyStats.todayCollections ?? 0;
      const done  = this.selectedAgencyStats.completedCollections ?? 0;
      if (today > 0) return Math.round((done / today) * 100);
    }
    return this.getAgencyAudit(this.selectedAgency?.name)?.completionRate ?? 0;
  }

  // ── Helpers carte ────────────────────────────────────────

  getZoneCentroid(zones: string[], fallbackIndex: number): [number, number] {
    const coords = (zones ?? [])
      .map((z: string) => this._zoneCoord(z))
      .filter(Boolean) as [number, number][];
    if (!coords.length) return this.fallbackCoord('', fallbackIndex);
    const lat = coords.reduce((s, c) => s + c[0], 0) / coords.length;
    const lng = coords.reduce((s, c) => s + c[1], 0) / coords.length;
    return [lat, lng];
  }

  getAgencyAudit(name: string) {
    return this.agencyAudits.find(a => a.name === name) ?? null;
  }

  getAgencyInitials(name: string): string {
    return name.split(' ').filter((w: string) => w.length > 2)
      .map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
      || name.slice(0, 2).toUpperCase();
  }

  private fallbackCoord(seed: string, index: number): [number, number] {
    const spread = 0.04;
    const angle  = (index * 137.5 * Math.PI) / 180;
    return [
      12.3647 + Math.cos(angle) * spread * (0.3 + (index % 3) * 0.3),
      -1.5337 + Math.sin(angle) * spread * (0.3 + (index % 3) * 0.3),
    ];
  }

  initCharts(): void {
    if (this.chartsInitialized) return;
    this.chartsInitialized = true;
    this.buildIncidentsChart();
    this.buildAgenciesChart();
    this.buildWasteChart();
  }

  private buildIncidentsChart(): void {
    const el = this.incidentsChartRef?.nativeElement;
    if (!el) return;
    if (this.incidentsChart) { this.incidentsChart.destroy(); this.incidentsChart = null; }

    const resolved   = this.getIncidentCountByStatus('resolved');
    const inProgress = this.getIncidentCountByStatus('in_progress');
    const open       = this.getIncidentCountByStatus('open');

    const labels = ['Résolus', 'En cours', 'Ouverts'];
    const data   = [resolved, inProgress, open];
    const colors = ['#22c55e', '#f97316', '#ef4444'];

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderWidth: 0,
          hoverOffset: 6,
        }],
      },
      options: {
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 12 } } },
          tooltip: { enabled: true },
        },
      },
    };
    this.incidentsChart = new Chart(el, config);
  }

  private buildAgenciesChart(): void {
    const el = this.agenciesChartRef?.nativeElement;
    if (!el) return;
    if (this.agenciesChart) { this.agenciesChart.destroy(); this.agenciesChart = null; }

    const top = this.topAgenciesByCollections.length
      ? this.topAgenciesByCollections
      : this.getTopPerformingAgencies().map(a => ({ ...a, collections: a.clients }));
    const labels = top.map(a => a.name.length > 16 ? a.name.slice(0, 16) + '…' : a.name);
    const values = top.map((a: any) => a.collections ?? a.clients ?? 0);

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Collectes effectuées',
          data: values,
          backgroundColor: this.AGENCY_PALETTE.slice(0, top.length),
          borderRadius: 6,
          barThickness: 18,
        }],
      },
      options: {
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { min: 0, ticks: { callback: (v) => Number(v).toLocaleString('fr-FR') }, grid: { display: false } },
          y: { grid: { display: false } },
        },
      },
    };
    this.agenciesChart = new Chart(el, config);
  }

  private buildWasteChart(): void {
    const el = this.wasteChartRef?.nativeElement;
    if (!el) return;
    if (this.wasteChart) { this.wasteChart.destroy(); this.wasteChart = null; }

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: this.wasteStatistics.map(w => w.type),
        datasets: [{
          data: this.wasteStatistics.map(w => w.percentage),
          backgroundColor: this.wasteStatistics.map(w => w.color),
          borderWidth: 0,
          hoverOffset: 6,
        }],
      },
      options: {
        cutout: '60%',
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } },
        },
      },
    };
    this.wasteChart = new Chart(el, config);
  }

  ngOnDestroy(): void {
    this.incidentsChart?.destroy();
    this.agenciesChart?.destroy();
    this.wasteChart?.destroy();
    if (this.map) { this.map.remove(); this.map = null; }
  }

  /**
   * Corrigé (chantier Rapports/Statistiques, item 2c) : la version précédente associait
   * `agencyService.getAgenceStats()` (12 lignes codées en dur) à `MOCK_CITIES` (catalogue
   * multi-pays statique, non lié à l'app) par simple INDEX DE TABLEAU — une corrélation
   * fictive entre deux jeux de données sans rapport. Le commentaire d'origine suggérait un
   * vrai `GET /agences/stats` — vérifié (grep exhaustif de toutes les routes backend) :
   * cet endpoint n'existe nulle part, `/agences` n'étant même pas un préfixe déclaré dans
   * server.js. Impossible de "l'activer" tel quel.
   *
   * Réutilise à la place EXACTEMENT ce que municipality-dashboard.ts fait déjà
   * (`buildZoneStatisticsFromAdminStats()`, même commentaire dans admin.ts::getAllStatistics)
   * : `agenciesByCity`/`clientsByCity`/`collectionsByCity`, trois vraies agrégations Mongo
   * par ville (services/globalState.js), déjà chargées dans `statisticsAdmin`
   * (showAdminStatistics()) — aucun nouvel appel. Contrairement à la version municipalité,
   * la liste des villes vient ici directement de l'agrégation réelle (`agenciesByCity`),
   * pas de MOCK_CITIES : "retire le catalogue statique" appliqué au sens strict.
   * `coverage`/`incidents` n'ont pas de source réelle à cette maille (par ville) et
   * restent à 0, pas de nombre inventé — même choix que la version municipalité.
   */
  loadZoneStatistics(): void {
    const agenciesByCity = this.statisticsAdmin?.agenciesByCity ?? [];
    const clientsByCity = this.statisticsAdmin?.clientsByCity ?? [];
    const collectionsByCity = this.statisticsAdmin?.collectionsByCity ?? [];

    const cities = agenciesByCity.map((a) => ({
      name: a.city,
      country: 'Burkina Faso',
      agencies: a.numberOfAgencies,
      clients: clientsByCity.find((c) => c.city === a.city)?.numberOfClients ?? 0,
      collections: collectionsByCity.find((c) => c.city === a.city)?.numberOfCollections ?? 0,
      coverage: 0,
      incidents: 0,
    }));

    this.zoneStatistics = [{ country: 'Burkina Faso', cities }];
    console.log("this.zoneStatistics", this.zoneStatistics);
  }

  loadZoneStat(): void {
    this.isLoadingCoverage = true;
    const agencyId = this.coverageAgencyId || undefined;

    forkJoin({
      coverage: this.adminService.getZoneCoverage$(agencyId),
      stats:    this.adminService.getPlanningStats$(agencyId),
    }).subscribe({
      next: ({ coverage, stats }) => {
        // Garde de sécurité (bug corrigé item 2a, backend renvoyait un objet agrégé
        // unique au lieu du tableau par quartier attendu — TypeError systématique sur
        // les .filter() ci-dessous) : le contrat backend est désormais un tableau, mais
        // on ne fait plus jamais confiance à la forme sans vérifier.
        this.zoneCoverageData = Array.isArray(coverage?.data) ? coverage.data : [];
        this.planningStats    = stats?.data ?? null;
        this.isLoadingCoverage = false;
      },
      error: () => { this.isLoadingCoverage = false; },
    });
  }

  loadAgenciesForCoverageDropdown(reset = false): void {
    if (reset) {
      this.coverageAgencyDropdownPage  = 1;
      this.coverageAgencyDropdownList  = [];
    }
    if (!reset && this.coverageAgencyDropdownList.length >= this.coverageAgencyDropdownTotal && this.coverageAgencyDropdownTotal > 0) return;
    this.coverageAgencyDropdownLoading = true;
    this.agencyService.getAllAgenciesFromApi({
      page:  this.coverageAgencyDropdownPage,
      limit: 15,
      search: this.coverageAgencyDropdownSearch,
    }).subscribe({
      next: (res: any) => {
        const items = (res.data ?? res.agencies ?? []).map((a: any) => ({
          id:   a._id ?? a.id,
          name: a.name ?? a.ageny?.name ?? '—',
        }));
        this.coverageAgencyDropdownList  = [...this.coverageAgencyDropdownList, ...items];
        this.coverageAgencyDropdownTotal = res.total ?? res.pagination?.total ?? items.length;
        this.coverageAgencyDropdownPage++;
        this.coverageAgencyDropdownLoading = false;
      },
      error: () => { this.coverageAgencyDropdownLoading = false; },
    });
  }

  openCoverageAgencyDropdown(): void {
    this.coverageAgencyDropdownOpen   = true;
    this.coverageAgencyDropdownSearch = '';
    this.loadAgenciesForCoverageDropdown(true);
  }

  onCoverageAgencyDropdownSearch(): void {
    this.loadAgenciesForCoverageDropdown(true);
  }

  onCoverageAgencyDropdownScroll(event: Event): void {
    const el = event.target as HTMLElement;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 40) {
      this.loadAgenciesForCoverageDropdown();
    }
  }

  selectCoverageAgency(agency: { id: string; name: string } | null): void {
    this.selectedCoverageAgency   = agency;
    this.coverageAgencyId         = agency?.id ?? '';
    this.coverageAgencyDropdownOpen = false;
    this.loadZoneStat();
  }

  // Garde supplémentaire au niveau des getters (en plus de celle déjà posée à
  // l'affectation dans loadZoneStat()) : quelle que soit la cause d'une forme
  // inattendue de zoneCoverageData, ces getters ne doivent plus jamais planter.
  private get safeZoneCoverageData(): typeof this.zoneCoverageData {
    return Array.isArray(this.zoneCoverageData) ? this.zoneCoverageData : [];
  }

  get coveragePercent(): number {
    const data = this.safeZoneCoverageData;
    if (!data.length) return 0;
    const covered = data.filter(z => z.planningsCount > 0).length;
    return Math.round((covered / data.length) * 100);
  }

  get criticalZones(): typeof this.zoneCoverageData {
    return this.safeZoneCoverageData
      .filter(z => z.completionRate < 30 || z.equipesAssigned === 0)
      .sort((a, b) => a.completionRate - b.completionRate)
      .slice(0, 4);
  }

  get activeZonesCount(): number {
    return this.safeZoneCoverageData.filter(z => z.completionRate >= 50 || z.status === 'active').length;
  }

  get coveredZonesCount(): number {
    return this.safeZoneCoverageData.filter(z => z.planningsCount > 0).length;
  }

  // loadIncidents1(): void {
  //   this.incidents = [
  //     {
  //       id: "1",
  //       // agencyId: "2",
  //       agencyName: "GreenWaste Solutions",
  //       type: "missed_collection",
  //       description: "Collecte manquée dans le secteur Nord",
  //       severity: "medium",
  //       date: new Date(),
  //       status: "open",
  //     },
  //     {
  //       id: "2",
  //       // agencyId: "3",
  //       agencyName: "WasteManager Pro",
  //       type: "compliance_issue",
  //       description: "Non-respect des horaires réglementaires",
  //       severity: "high",
  //       date: new Date(Date.now() - 86400000),
  //       status: "pending",
  //       assignedTo: "Inspecteur Martin",
  //     },
  //   ];
  //   this.filteredIncidents = [...this.incidents];
  // }

  /**
   * Flux d'alertes système réel — remplace l'ancien tableau codé en dur.
   * Réutilise les mêmes sources déjà éprouvées côté Municipalité/Planning
   * (sévérité des Signalement, PlanningAlert type='danger'/'warning'), sans
   * créer de nouvelle entité/notion d'alerte : le modèle Notification reste
   * volontairement hors-sujet ici (voir DÉCISION PRODUIT en attente).
   * Les communications envoyées manuellement (sendCommunication()) restent
   * insérées dans ce même tableau, inchangé.
   */
  loadCommunications(): void {
    // Liste COMPLÈTE des agences pour le picker de destinataires — pas
    // `agencyAudits` (paginé à 10 par défaut pour l'onglet Agences, ce qui
    // faisait disparaître silencieusement les agences hors première page,
    // ex. "OUAGA PROPRE"). `getAll: true` court-circuite la pagination
    // côté backend (services/agency.js), déjà utilisé ailleurs (agencies.ts).
    this.agencyService.getAllAgenciesFromApi({ getAll: true }).subscribe({
      next: (response: any) => {
        const list = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
        this.communicationRecipientAgencies = list.map((a: any) => ({
          id: a._id,
          name: a.name,
        }));
      },
      error: () => {
        this.communicationRecipientAgencies = [];
      },
    });
    forkJoin({
      signalements: this.adminService.getAllSignalements({}),
      alerts: this.adminService.getPlanningAlerts$(),
    }).subscribe({
      next: ({ signalements, alerts }: { signalements: any[]; alerts: any }) => {
        const fromSignalements: Communication[] = (signalements || [])
          .filter((s: any) => s.status !== "resolved" && ["critical", "high"].includes(s.severity))
          .map((s: any) => ({
            id: `signalement-${s._id}`,
            type: "alert",
            title: s.severity === "critical" ? "Signalement critique" : "Signalement à forte sévérité",
            message: s.comment || s.description || "Aucun détail fourni.",
            recipients: s.agencyId ? [typeof s.agencyId === "object" ? s.agencyId._id : s.agencyId] : [],
            priority: s.severity === "critical" ? "urgent" : "high",
            sentAt: new Date(s.createdAt),
            readBy: [],
          } as Communication));

        const fromPlanningAlerts: Communication[] = (alerts?.data || [])
          .filter((a: any) => a.type === "danger" || a.type === "warning")
          .map((a: any) => ({
            id: `planning-alert-${a._id}`,
            type: "alert",
            title: a.title,
            message: a.message,
            recipients: a.agencyId ? [a.agencyId] : [],
            priority: a.type === "danger" ? "urgent" : "high",
            sentAt: new Date(a.createdAt),
            readBy: [],
          } as Communication));

        this.communications = [...fromSignalements, ...fromPlanningAlerts].sort(
          (a, b) => b.sentAt.getTime() - a.sentAt.getTime(),
        );
      },
      error: (error) => {
        console.error("Erreur lors du chargement des alertes système:", error);
        this.communications = [];
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
  getMunicipalityStatusText(status?: string): string {
    if (!status) {
      return `${this.statisticsAdmin?.totalMunicipalityAgents} actives`;
    }
    const statusTexts = {
      active: "Active",
      inactive: "Inactive",
      suspended: "Suspendue",
    };
    return statusTexts[status as keyof typeof statusTexts] || status;
  }

  isPositiveAgenciesActive(): boolean {
    const total = this.statisticsAdmin?.totalAgencies ?? 0;
    const active = this.statisticsAdmin?.totalActiveAgencies ?? 0;

    if (total === 0) return false;

    return active / total > 0;
  }

  getCollectorStatusText(status?: string): string {
    if (!status) {
      return `${this.statisticsAdmin?.totalCollectors} actives`;
    }
    const statusTexts = {
      active: "Active",
      inactive: "Inactive",
      suspended: "Suspendue",
    };
    return statusTexts[status as keyof typeof statusTexts] || status;
  }
  getClientSubscriptionText(status?: string): string {
    if (!status) {
      return `Inactif`;
    }
    return `Actif`;
    // const statusClientTexts = {
    //   active: "Actif",
    //   inactif: "Inactif",
    // };
    // return (
    //   statusClientTexts[status as keyof typeof statusClientTexts] || status
    // );
  }

  getCollectorSubscriptionText(status?: string): string {
    if (!status) {
      return `${this.filteredCollectors?.length} actives`;
    }
    const statusClientTexts = {
      active: "Active",
      inactive: "Inactive",
    };
    return (
      statusClientTexts[status as keyof typeof statusClientTexts] || status
    );
  }
  getClientStatusText(status?: string): string {
    if (!status) {
      return `${this.statisticsAdmin?.activeClients} actives`;
    }
    const statusTexts = {
      active: "Active",
      inactive: "Inactive",
      suspended: "Suspendue",
    };
    return statusTexts[status as keyof typeof statusTexts] || status;
  }
  getClientGrowth() {
    // return Math.floor(Math.random() * 10) + 5;
    this.clientGrowth = Math.floor(Math.random() * 10) + 5;
    this.cd.detectChanges();
    // return 5;
  }

  /**
   * Corrigé (chantier Rapports/Statistiques, item 3) : lisait `this.statistics`, l'objet
   * figé à des valeurs codées en dur (jamais réassigné depuis l'API — confirmé par grep
   * sur tout le fichier), au lieu de `this.statisticsAdmin`, déjà chargé depuis la vraie
   * réponse de GET /api/statistics (showAdminStatistics()). Même formule et mêmes champs
   * réels que municipality-dashboard.ts::getCollectionRate() (dailyCollectionCollected /
   * dailyCollections) — pas de deuxième calcul inventé.
   */
  getCollectionRate(): number {
    const collected = this.statisticsAdmin?.dailyCollectionCollected ?? 0;
    const total = this.statisticsAdmin?.dailyCollections ?? 0;
    if (total === 0) return 0;
    return Math.round((collected / total) * 100);
  }

  getUserRole(userRole: string): string {
    const roleTexts = {
      super_admin: "Administrateur",
      municipality: "Agent de Mairie",
      manager: "Gestionnaire",
      collector: "Collecteur",
      client: "Client",
    };
    return roleTexts[userRole as keyof typeof roleTexts] || userRole;
  }

  // Droits financiers (dashboard financier) — distinct du rôle opérationnel ci-dessus.
  // Écran plateforme entière (adminGuard) : contrairement à agency-dashboard, l'agence
  // ciblée n'est pas celle de l'appelant, donc l'agencyId de CHAQUE utilisateur (peuplé par
  // le backend, GET /users) est transmis en override à chaque appel — voir
  // agency.service.ts::setEmployeeFinancialRole$ et le backend (resolveAgency + _isAdministrateur
  // acceptant role==='super_admin' en plus de financialRole==='administrateur').
  getFinancialRoleText(financialRole: string | null | undefined): string {
    const labels = {
      comptable: 'Comptable',
      manager_terrain: 'Manager terrain',
      administrateur: 'Administrateur',
    };
    return financialRole ? (labels[financialRole as keyof typeof labels] || financialRole) : 'Aucun';
  }

  assignFinancialRole(user: any, value: string): void {
    const financialRole = value || null;
    const cibleAgencyId = user?.agencyId?._id || user?.agencyId;
    this.agencyService.setEmployeeFinancialRole$(user._id, financialRole as any, cibleAgencyId).subscribe({
      next: () => {
        user.financialRole = financialRole;
        this.notificationService.showSuccess(
          'Succès',
          financialRole
            ? `Rôle financier "${this.getFinancialRoleText(financialRole)}" assigné à ${user.firstName} ${user.lastName}.`
            : `Rôle financier retiré à ${user.firstName} ${user.lastName}.`,
        );
      },
      error: (error) => {
        console.error("Erreur lors de l'assignation du rôle financier :", error);
        this.notificationService.showError('Erreur', "Impossible d'assigner le rôle financier.");
      },
    });
  }
  getComplianceText(): string {
    if (this.statistics.complianceRate >= 95) return "Excellent";
    if (this.statistics.complianceRate >= 85) return "Bon";
    return "À améliorer";
  }

  // this.incidents (GET /api/signalements, non filtré par statut — voir loadAllSignalements)
  // est désormais la seule source fiable : services/globalState.js (statisticsAdmin) compte
  // encore l'ancien Collecte.status='Reported', qui ne reçoit plus aucune écriture depuis la
  // migration vers le modèle Signalement (voir models/Signalement.js) et resterait à 0 pour
  // toujours si on continuait à s'y fier ici.
  getIncidentSeverity(): string {
    const pending = this.getIncidentCountByStatus('open') + this.getIncidentCountByStatus('in_progress');
    if (pending <= 5) return "Faible";
    if (pending <= 10) return "Modéré";
    return "Élevé";
  }

  getTotalReportsCount(): number {
    return this.incidents.length;
  }

  getResolvedReportsCount(): number {
    return this.getIncidentCountByStatus('resolved');
  }

  getUnresolvedReportsCount(): number {
    return this.getIncidentCountByStatus('open') + this.getIncidentCountByStatus('in_progress');
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

  // Signalement.status (models/Signalement.js) est directement 'open'|'in_progress'|'resolved'
  // pour toute donnée créée depuis la migration — plus besoin d'un champ resolutionStatus
  // séparé comme pour l'ancien Collecte.status, qui restait bloqué sur 'Reported'.
  getIncidentCountByStatus(group: 'resolved' | 'in_progress' | 'open'): number {
    return this.incidents.filter(i => (i.status ?? 'open') === group).length;
  }

  getRecentIncidents(): Incident[] {
    if (!this.incidents?.length) return [];
    return [...this.incidents]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }

  getSeverityIcon(severity: string): string {
    const icons = {
      critical: "error",
      high: "warning",
      medium: "info",
      low: "help",
    };
    return icons[severity as keyof typeof icons] || "help";
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
      compliance_issue: "Non-conformité",
      complaint: "Réclamation",
      technical_issue: "Problème technique",
      problem: "Collecte manquée",
      regular: "Incident non précisé",
    };
    return types[type as keyof typeof types] || type;
  }

  // Chantier Signalements, item 1 : `origine` (models/Signalement.js) — déjà peuplé
  // côté API, jamais affiché côté admin jusqu'ici.
  getOrigineText(origine: string | undefined): string {
    if (origine === 'collecte') return 'Lié à une collecte';
    if (origine === 'independant') return 'Indépendant';
    return '—';
  }

  // Signalement.status réel (models/Signalement.js) : open|in_progress|resolved.
  getIncidentStatusText(status: string): string {
    const statuses = {
      open: "Ouvert",
      in_progress: "En cours",
      resolved: "Résolu",
    };
    return statuses[status as keyof typeof statuses] || status;
  }

  /**
   * Export réel (chantier Rapports/Statistiques, item 4 — écran à fort usage,
   * incidents/signalements, jusqu'ici sans aucun export). Réutilise getFilteredIncidents()
   * (même filtre status/severity/recherche que l'écran, non paginé) plutôt que
   * `filteredIncidents` (déjà tronqué à la page courante) — même précaution que
   * exportWithdrawalRequests().
   */
  exportIncidents(): void {
    const rows = this.getFilteredIncidents();
    if (!rows.length) {
      this.notificationService.showInfo("Export", "Aucun incident à exporter pour ces filtres.");
      return;
    }
    this.exportClientService.exportToCsv(
      rows.map((i) => ({
        agence: i.agencyId?.name || i.agency?.name || i.agencyName || '',
        client: [i.clientId?.firstName, i.clientId?.lastName].filter(Boolean).join(' '),
        type: this.getIncidentTypeText(i.type),
        gravite: this.getSeverityText(i.severity),
        statut: this.getIncidentStatusText(i.status),
        description: i.comment || i.description || '',
        date: i.createdAt ? new Date(i.createdAt).toLocaleString('fr-FR') : '',
      })),
      [
        { key: 'agence', label: 'Agence' },
        { key: 'client', label: 'Client' },
        { key: 'type', label: 'Type' },
        { key: 'gravite', label: 'Gravité' },
        { key: 'statut', label: 'Statut' },
        { key: 'description', label: 'Description' },
        { key: 'date', label: 'Date' },
      ],
      `incidents-${new Date().toISOString().slice(0, 10)}`,
    );
    this.notificationService.showSuccess("Export réussi", "Le fichier des incidents a été téléchargé.");
  }

  getComplianceClass(score: number): string {
    if (score >= 95) return "excellent";
    if (score >= 85) return "good";
    return "poor";
  }

  getTopPerformingAgencies(): any[] {
    const source = this.agenciesGeoData.length
      ? this.agenciesGeoData.map((ag: any) => ({
          name: ag.name ?? '',
          clients: Array.isArray(ag.clients) ? ag.clients.length : (ag.clients ?? 0),
        }))
      : this.agencyAudits.map(a => ({ name: a.name, clients: a.clients }));

    return [...source]
      .sort((a, b) => b.clients - a.clients)
      .slice(0, 5);
  }

  getIncidentBreakdown(): any[] {
    const breakdown = [
      { type: "Collectes manquées", count: 5, percentage: 62 },
      { type: "Non-conformité", count: 2, percentage: 25 },
      { type: "Réclamations", count: 1, percentage: 13 },
    ];
    return breakdown;
  }

  getCommunicationIcon(type: string): string {
    const icons = {
      notification: "notifications",
      directive: "assignment",
      alert: "warning",
    };
    return icons[type as keyof typeof icons] || "message";
  }

  getCommunicationTypeText(type: string): string {
    const types = {
      notification: "Notification",
      directive: "Directive",
      alert: "Alerte",
    };
    return types[type as keyof typeof types] || type;
  }

  getPriorityText(priority: string): string {
    const priorities = {
      low: "Faible",
      medium: "Moyenne",
      high: "Élevée",
      urgent: "Urgente",
    };
    return priorities[priority as keyof typeof priorities] || priority;
  }

  getAgencyName(agencyId: string): string {
    const agency =
      this.agencyAudits.find((a) => a.id === agencyId) ||
      this.communicationRecipientAgencies.find((a) => a.id === agencyId);
    return agency ? agency.name : "Agence inconnue";
  }

  // Filter methods
  filterAgencies(): void {
    this.agenciesFilterParams = {
      status: this.agenciesFilter,
      search: this.searchTerm,
      page: 1,
      limit: this.agenciesItemsPerPage,
    };
    this.loadAgencyAudits(this.agenciesFilterParams);
  }

  goToAgenciesPage(page: number): void {
    if (page < 1 || page > this.agenciesTotalPages) return;
    this.agenciesFilterParams = { ...this.agenciesFilterParams, page };
    this.loadAgencyAudits(this.agenciesFilterParams);
  }

  changeAgenciesItemsPerPage(limit: number): void {
    this.agenciesFilterParams = { ...this.agenciesFilterParams, limit, page: 1 };
    this.loadAgencyAudits(this.agenciesFilterParams);
  }

  getAgenciesPageNumbers(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.agenciesCurrentPage - 2);
    const end   = Math.min(this.agenciesTotalPages, start + 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  getAgenciesEndItem(): number {
    return Math.min(this.agenciesCurrentPage * this.agenciesItemsPerPage, this.agenciesTotalItems);
  }
  filterClients(): void {
    this.filteredClients = this.clientsAudits.filter((client) => {
      const statusMatch =
        this.clientsFilter === "all" ||
        client?.active_subscription
          .map((sub: any) => sub.status)
          .includes(this.clientsFilter);
      let complianceMatch = true;

      // if (this.complianceFilter === 'excellent') {
      //   complianceMatch = client.complianceScore >= 95;
      // } else if (this.complianceFilter === 'good') {
      //   complianceMatch = client.complianceScore >= 85 && client.complianceScore < 95;
      // } else if (this.complianceFilter === 'poor') {
      //   complianceMatch = client.complianceScore < 85;
      // }

      return statusMatch;
    });
  }

  filterUsers(): void {
    this.usersFilterParams = {
      role: this.roleFilter,
      neighborhood: this.neighborhoodFilter,
      term: this.searchTerm,
      page: 1,
      limit: this.usersItemsPerPage,
    };
    this.showAdminUsers(this.usersFilterParams);
  }
  filterCollectors(): void {
    this.filteredCollectors = this.collectorsAudits.filter((client) => {
      const statusMatch =
        this.collectorsFilter === "all" ||
        client.isActive == this.collectorsFilter;
      let complianceMatch = true;

      // if (this.complianceFilter === 'excellent') {
      //   complianceMatch = client.complianceScore >= 95;
      // } else if (this.complianceFilter === 'good') {
      //   complianceMatch = client.complianceScore >= 85 && client.complianceScore < 95;
      // } else if (this.complianceFilter === 'poor') {
      //   complianceMatch = client.complianceScore < 85;
      // }

      return statusMatch;
    });
  }
  filterIncidents(): void {
    // status/severity/recherche sont tous appliqués côté client sur l'ensemble déjà
    // chargé (this.incidents) — seul un changement d'agence (selectAgencyFilter)
    // justifie un vrai rechargement serveur.
    this.applyIncidentClientFilters(1);
  }

  // GET /api/signalements ne pagine pas et ne filtre ni sur severity ni sur un terme de
  // recherche libre (voir routes/signalement.route.js) — tout `this.incidents` est déjà en
  // mémoire après loadAllSignalements(), on affine et pagine donc entièrement ici.
  /** Prédicat de filtrage des incidents, factorisé (item 4) pour être réutilisé tel quel
   *  par l'export — sans ça, exporter reviendrait à ré-écrire ce filtre une deuxième fois
   *  ou (pire) à n'exporter que la page visible, exactement le bug de troncature de l'item 1. */
  private getFilteredIncidents(): Incident[] {
    const term     = this.incidentsSearchTerm.trim().toLowerCase();
    const severity = (this.severityFilter || 'all').toLowerCase();

    return this.incidents.filter(i => {
      const statusMatch = this.incidentsFilter === 'all' || i.status === this.incidentsFilter;
      if (!statusMatch) return false;
      const severityMatch = severity === 'all' || (i.severity || '').toLowerCase() === severity;
      if (!severityMatch) return false;
      const origineMatch = this.origineFilter === 'all' || i.origine === this.origineFilter;
      if (!origineMatch) return false;
      if (!term) return true;
      const haystack = [
        i.agencyId?.name, i.agency?.name,
        i.clientId?.firstName, i.clientId?.lastName, i.clientId?.email,
        i.comment, i.description, i.type,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }

  private applyIncidentClientFilters(page = 1): void {
    const filtered = this.getFilteredIncidents();

    this.incidentsTotalItems  = filtered.length;
    this.incidentsTotalPages  = Math.max(1, Math.ceil(filtered.length / this.incidentsItemsPerPage));
    this.incidentsCurrentPage = Math.min(Math.max(page, 1), this.incidentsTotalPages);
    this.totalIncidents.set(filtered.length);

    const start = (this.incidentsCurrentPage - 1) * this.incidentsItemsPerPage;
    this.filteredIncidents = filtered.slice(start, start + this.incidentsItemsPerPage);
  }

  getPaginatedIncidents(): Incident[] {
    // filteredIncidents est déjà la bonne page (applyIncidentClientFilters)
    return this.filteredIncidents;
  }

  goToIncidentsPage(page: number): void {
    if (page < 1 || page > this.incidentsTotalPages) return;
    // Toutes les données sont déjà en mémoire (this.incidents) — pas besoin de recharger
    // depuis le serveur pour changer de page, contrairement à l'ancienne pagination serveur.
    this.applyIncidentClientFilters(page);
  }

  getIncidentsPageNumbers(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.incidentsCurrentPage - 2);
    const end   = Math.min(this.incidentsTotalPages, start + 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  getIncidentsEndItem(): number {
    return Math.min(this.incidentsCurrentPage * this.incidentsItemsPerPage, this.incidentsTotalItems);
  }

  changeIncidentsItemsPerPage(limit: number): void {
    this.incidentsItemsPerPage = limit;
    this.applyIncidentClientFilters(1);
  }

  // Action methods
  generateGlobalReport(): void {
    this.notificationService.showInfo(
      "Rapport",
      "Génération du rapport global en cours...",
    );
  }
  //   handleDisabledClick(event: MouseEvent) {
  //   if (this.isDisabled) {
  //     event.stopPropagation();
  //     this.notificationService.showInfo(
  //       "Info",
  //       "Fonctionnalite viendra bientôt..."
  //     );
  //   }
  // }
  viewMunicipalityDetails(municipalityId: string): void {
    this.notificationService.showInfo(
      "Détails",
      "Ouverture des détails de la mairie",
    );
    this.router.navigate(["/municipality", municipalityId]);
  }
  viewAgencyDetails(agencyId: string): void {
    this.notificationService.showInfo(
      "Détails",
      "Ouverture des détails de l'agence",
    );
    this.router.navigate(["/agencies", agencyId]);
  }
  selectedClient: any = null;

  // ── Dialog Réinitialisation mot de passe ────────────────
  showPasswordResetDialog  = false;
  passwordResetMode: 'email' | 'manual' = 'email';
  newPassword        = '';
  confirmPassword    = '';
  showNewPwd         = false;
  showConfirmPwd     = false;
  isSendingReset     = false;
  passwordResetError = '';

  openPasswordResetDialog(): void {
    this.passwordResetMode  = 'email';
    this.newPassword        = '';
    this.confirmPassword    = '';
    this.passwordResetError = '';
    this.showNewPwd         = false;
    this.showConfirmPwd     = false;
    this.showPasswordResetDialog = true;
  }

  closePasswordResetDialog(): void {
    this.showPasswordResetDialog = false;
    this.passwordResetError      = '';
  }

  sendPasswordResetEmail(): void {
    const id = this.selectedUser?._id || this.selectedUser?.id;
    if (!id) return;
    this.isSendingReset = true;
    this.adminService.sendPasswordResetEmail(id).subscribe({
      next: () => {
        this.isSendingReset = false;
        this.notificationService.showSuccess('Email envoyé', `Un lien de réinitialisation a été envoyé à ${this.selectedUser.email}.`);
        this.closePasswordResetDialog();
      },
      error: (err) => {
        this.isSendingReset = false;
        this.passwordResetError = err?.error?.message || 'Impossible d\'envoyer l\'email. Vérifiez la connexion.';
      }
    });
  }

  setNewPasswordAdmin(): void {
    this.passwordResetError = '';
    if (!this.newPassword || this.newPassword.length < 6) {
      this.passwordResetError = 'Le mot de passe doit contenir au moins 6 caractères.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.passwordResetError = 'Les mots de passe ne correspondent pas.';
      return;
    }
    const id = this.selectedUser?._id || this.selectedUser?.id;
    if (!id) return;
    this.isSendingReset = true;
    this.adminService.setNewPasswordAdmin(id, this.newPassword).subscribe({
      next: () => {
        this.isSendingReset = false;
        this.notificationService.showSuccess('Mot de passe modifié', `Le mot de passe de ${this.selectedUser.firstName} a été mis à jour.`);
        this.closePasswordResetDialog();
      },
      error: (err) => {
        this.isSendingReset = false;
        this.passwordResetError = err?.error?.message || 'Erreur lors de la modification du mot de passe.';
      }
    });
  }

  getPasswordStrength(pwd: string): number {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 6)  score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return Math.min(score, 4);
  }

  getPasswordStrengthLabel(): string {
    const s = this.getPasswordStrength(this.newPassword);
    return ['', 'Faible', 'Moyen', 'Bon', 'Fort'][s] || '';
  }

  getPasswordStrengthClass(): string {
    const s = this.getPasswordStrength(this.newPassword);
    return ['', 'pwd-weak', 'pwd-medium', 'pwd-good', 'pwd-strong'][s] || '';
  }

  pwdHasUppercase(pwd: string): boolean { return /[A-Z]/.test(pwd); }
  pwdHasNumber(pwd: string): boolean    { return /[0-9]/.test(pwd); }
  pwdHasSpecial(pwd: string): boolean   { return /[^A-Za-z0-9]/.test(pwd); }

  // ── Historique activité utilisateur ─────────────────────
  userActivity: ActivityEvent[] = [];
  isLoadingActivity  = false;
  showActivitySection = false;

  loadUserActivity(): void {
    const id = this.selectedUser?._id || this.selectedUser?.id;
    if (!id) return;
    this.isLoadingActivity  = true;
    this.showActivitySection = true;
    // GET /user/:id/activity est désormais un vrai endpoint (LoginHistory +
    // ActivityLog) — un tableau vide est une réponse RÉELLE et légitime (cet
    // utilisateur ne s'est pas reconnecté / n'a subi aucune action tracée
    // depuis la mise en place), pas un signal d'échec. Le repli sur
    // getMockActivity() masquait ce cas très fréquent en cachant un vrai
    // "aucune activité" derrière de fausses données — retiré : le template a
    // déjà un état vide honnête ("Aucune activité enregistrée").
    this.adminService.getUserActivity(id).subscribe({
      next: (response: any) => {
        this.userActivity = response?.data ?? [];
        this.isLoadingActivity = false;
      },
      error: () => {
        this.userActivity = [];
        this.isLoadingActivity = false;
      }
    });
  }

  // ── Statistiques collecteur (chantier Rapports/Statistiques, item 3) ────
  // GET /statistics/collector/:id, endpoint réel jusqu'ici jamais appelé côté frontend
  // (viewCollectorDetails() n'était qu'un toast, sans aucun appel HTTP).
  collectorStats: { totalCollectes: number; totalScheduledCollectes: number; totalCollectedCollectes: number; totalReportedCollectes: number } | null = null;
  isLoadingCollectorStats = false;

  loadCollectorStats(): void {
    const id = this.selectedUser?._id || this.selectedUser?.id;
    if (!id || this.selectedUser?.role !== 'collector') {
      this.collectorStats = null;
      return;
    }
    this.isLoadingCollectorStats = true;
    this.adminService.getCollectorStatistics(id).subscribe({
      next: (response: any) => {
        this.collectorStats = response?.stats ?? null;
        this.isLoadingCollectorStats = false;
      },
      error: () => {
        this.collectorStats = null;
        this.isLoadingCollectorStats = false;
      },
    });
  }

  getActivityTimeAgo(dateStr: string): string {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 3600)   return `il y a ${Math.round(diff / 60)} min`;
    if (diff < 86400)  return `il y a ${Math.round(diff / 3600)} h`;
    if (diff < 604800) return `il y a ${Math.round(diff / 86400)} j`;
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }

  // ── Dialog de confirmation suppression ──────────────────
  showDeleteDialog    = false;
  userToDelete: { id: string; name: string; role: string; color: string; initials: string } | null = null;
  isDeletingUser      = false;

  openDeleteDialog(userId: string, displayName: string, role: string): void {
    this.userToDelete = {
      id: userId,
      name: displayName,
      role: this.getUserRole(role),
      color: this.getRandomColor({ firstName: displayName }),
      initials: this.getInitials(displayName),
    };
    this.showDeleteDialog = true;
  }

  confirmDeleteUser(): void {
    if (!this.userToDelete) return;
    this.isDeletingUser = true;
    this.adminService.deleteUser(this.userToDelete.id).subscribe({
      next: () => {
        this.notificationService.showSuccess('Supprimé', `Le compte de "${this.userToDelete!.name}" a été supprimé.`);
        this.showDeleteDialog = false;
        this.userToDelete = null;
        this.isDeletingUser = false;
        this.visible1 = false;
        this.showAdminUsers(this.usersFilterParams);
      },
      error: (err) => {
        this.notificationService.showError('Erreur', err.error?.message || 'Impossible de supprimer cet utilisateur.');
        this.isDeletingUser = false;
      }
    });
  }

  openEditUserDrawer(): void {
    const id = this.selectedUser?._id || this.selectedUser?.id;
    if (!id) return;
    this.isEditingUser = true;
    this.visible1 = false;
    this.visibleEditUserDrawer = true;
  }

  closeEditUserDrawer(): void {
    this.visibleEditUserDrawer = false;
    this.isEditingUser = false;
  }

  saveUserChanges(): void {
    if (!this.selectedUser?._id) return;

    this.isSavingUser = true;

    const updates = {
      firstName: this.selectedUser.firstName?.trim(),
      lastName: this.selectedUser.lastName?.trim(),
      phone: this.selectedUser.phone?.trim(),
      address: {
        ...(this.selectedUser.address ?? {}),
        street: this.selectedUser.address?.street?.trim() || "",
        city: this.selectedUser.address?.city?.trim() || "",
        neighborhood: this.selectedUser.address?.neighborhood?.trim() || "",
      },
    };

    this.adminService.updateUserProfile(this.selectedUser._id, updates).subscribe({
      next: (response: any) => {
        this.isSavingUser = false;
        const isSuccess = response?.success !== false;

        if (isSuccess) {
          this.visibleEditUserDrawer = false;
          this.isEditingUser = false;
          this.notificationService.showSuccess("Mise à jour", "Profil utilisateur mis à jour avec succès.");
          this.showAdminUsers(this.usersFilterParams);
        } else {
          this.notificationService.showError("Erreur", response?.message || response?.error || "Impossible de mettre à jour l'utilisateur.");
        }
      },
      error: (error: any) => {
        this.isSavingUser = false;
        this.notificationService.showError("Erreur", error?.error?.message || error?.message || "Impossible de mettre à jour l'utilisateur.");
      },
    });
  }

  // Ouvre le drawer en mode VIEW depuis la liste (sans appel API si on a déjà les données)
  quickViewUser(userData: any): void {
    this.selectedUser       = userData as any;
    this.isEditingUser      = false;
    this.showActivitySection = false;
    this.userActivity       = [];
    this.collectorStats     = null;
    this.visible1 = true;
    this.loadCollectorStats();
  }

  // Ouvre le drawer en mode EDIT directement depuis la liste
  quickEditUser(userData: any): void {
    this.selectedUser = userData as any;
    this.isEditingUser = true;
    this.visible1 = false;
    this.visibleEditUserDrawer = true;
  }

  // Suppression directe depuis la liste → ouvre le dialog
  quickDeleteUser(userId: string, displayName: string, role = ''): void {
    this.openDeleteDialog(userId, displayName.trim() || 'cet utilisateur', role);
  }

  // Toggle statut directement depuis la liste
  quickToggleUserStatus(userData: any): void {
    this.selectedUser = userData as any;
    this.toggleUserStatus();
  }

  viewUserDetails(clientId: string): void {
    this.notificationService.showInfo(
      "Détails",
      "Récupération des détails du client...",
    );

    this.adminService.getUserById(clientId).subscribe({
      next: (client: any) => {
        if (client.success) {
          this.selectedUser = client?.user;
          this.visibleEditUserDrawer = false;
          this.isEditingUser = false;
          console.log("voici les details du client:", this.selectedUser);
          this.visible1 = true;
        } else {
          this.notificationService.showInfo(
            "Erreur de recuperation",
            "Impossible de recuperer les details du client.",
          );
        }
      },
      error: (err: any) => {
        console.error(
          "Erreur lors de la récupération des détails du client :",
          err,
        );
        this.notificationService.showError(
          "Erreur",
          "Impossible de récupérer les détails du client.",
        );
      },
    });
  }
  /**
   * Corrigé (chantier Rapports/Statistiques, item 3) : ouvrait auparavant un simple toast
   * ("Ouverture des détails du collecteur"), sans aucune donnée réelle. Réutilise
   * désormais le drawer "Fiche Utilisateur" déjà existant (quickViewUser(), onglet
   * Utilisateurs) plutôt que de construire un second composant de détails — celui-ci
   * charge en plus les vraies statistiques du collecteur (loadCollectorStats(),
   * GET /statistics/collector/:id) quand le rôle est 'collector'.
   */
  viewCollectorDetails(collector: any): void {
    this.quickViewUser(collector);
  }

  auditMunicipality(municipalityId: string): void {
    this.notificationService.showInfo(
      "Audit",
      "Lancement de l'audit de l'agence",
    );
  }
  auditAgency(agencyId: string): void {
    this.notificationService.showInfo(
      "Audit",
      "Lancement de l'audit de l'agence",
    );
  }

  contactMunicipality(municipalityId: string): void {
    this.notificationService.showInfo(
      "Contact",
      "Ouverture des informations de contact",
    );
  }
  contactAgency(agencyId?: string): void {
    this.router.navigate(["/agencies", agencyId]);
    this.notificationService.showInfo(
      "Contact",
      "Ouverture des informations de contact",
    );
  }

  updateStatistics(): void {
    this.notificationService.showInfo(
      "Mise à jour",
      "Actualisation des statistiques",
    );
  }

  // Sélecteur de format (item 3 : "implémente réellement l'export PDF/Excel ici,
  // actuellement un stub non câblé à aucun bouton" — CSV seul avant ce correctif).
  statisticsExportFormat: 'csv' | 'pdf' | 'excel' = 'csv';

  private buildStatisticsExportRows(): { metric: string; value: string | number }[] {
    const rows: { metric: string; value: string | number }[] = [
      { metric: 'Taux de collecte (%)', value: this.getCollectionRate() },
      { metric: 'Croissance clients sur le mois (%)', value: this.statisticsAdmin?.monthlyClientPercentage ?? 0 },
      { metric: 'Incidents résolus', value: this.getResolvedReportsCount() },
      { metric: 'Incidents au total', value: this.getTotalReportsCount() },
      { metric: 'Agences actives', value: this.statisticsAdmin?.totalActiveAgencies ?? 0 },
      { metric: 'Agences au total', value: this.statisticsAdmin?.totalAgencies ?? 0 },
    ];

    const topAgencies = this.topAgenciesByCollections.length
      ? this.topAgenciesByCollections
      : this.getTopPerformingAgencies().map((a: any) => ({ ...a, collections: a.clients }));
    topAgencies.forEach((a: any) => rows.push({ metric: `Agence — ${a.name}`, value: a.collections ?? a.clients ?? 0 }));

    this.wasteStatistics.forEach((w) => rows.push({ metric: `Déchets — ${w.type} (%)`, value: w.percentage }));
    return rows;
  }

  /**
   * Export réel de l'onglet "Statistiques Consolidées" (chantier Rapports/Statistiques,
   * item 3 : "implémente réellement l'export PDF/Excel ici" — CSV seul avant ce
   * correctif). CSV/PDF réutilisent ExportClientService (financial-dashboard/data-access/
   * export), seule implémentation d'ExportService du projet — pas de logique parallèle.
   * Excel réutilise le même import dynamique `xlsx` que municipality-dashboard.ts
   * ::exportStatisticsExcel() (même dépendance déjà installée, même approche), faute
   * d'un `exportToExcel()` sur ExportClientService (CSV/PDF seulement).
   */
  async exportStatistics(): Promise<void> {
    const rows = this.buildStatisticsExportRows();
    if (!rows.length) {
      this.notificationService.showInfo("Export", "Aucune donnée à exporter pour le moment.");
      return;
    }
    const columns = [
      { key: 'metric' as const, label: 'Indicateur' },
      { key: 'value' as const, label: 'Valeur' },
    ];
    const filenameBase = `statistiques-admin-${new Date().toISOString().slice(0, 10)}`;

    if (this.statisticsExportFormat === 'csv') {
      this.exportClientService.exportToCsv(rows, columns, filenameBase);
    } else if (this.statisticsExportFormat === 'pdf') {
      this.exportClientService.exportToPdf(rows, columns, filenameBase, {
        titre: 'SAHELYS – Statistiques Consolidées',
        sousTitre: `Exporté le ${new Date().toLocaleDateString('fr-FR')}`,
      });
    } else {
      const XLSX = await import('xlsx');
      const worksheet = XLSX.utils.json_to_sheet(rows.map((r) => ({ Indicateur: r.metric, Valeur: r.value })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Statistiques');
      XLSX.writeFile(workbook, `${filenameBase}.xlsx`);
    }
    this.notificationService.showSuccess("Export réussi", "Le fichier des statistiques a été téléchargé.");
  }

  assignIncident(incidentId: string): void {
    this.notificationService.showInfo(
      "Attribution",
      "Ouverture du formulaire d'attribution",
    );
  }

  // Optimiste/local uniquement — n'appelle pas encore PATCH /signalements/:id/assign-team
  // super_admin/municipality ont un rôle de supervision, pas de traitement terrain : ils ne
  // peuvent qu'orienter le signalement vers l'agence concernée (Contacter Agence), jamais
  // l'enquêter ou le résoudre eux-mêmes — ça reste le travail de l'agence (manager/collector).
  canResolveIncidents(): boolean {
    const role = this.currentUser?.role;
    return role !== 'super_admin' && role !== 'municipality';
  }

  // (ce backend exige un teamId réel, pas encore de sélecteur d'équipe dans cet onglet ;
  // voir shared_pages/signalement/signalement.ts::openTeamPicker pour l'équivalent déjà
  // câblé côté agency-dashboard). Ne change donc rien côté serveur pour l'instant.
  investigateIncident(incidentId: string): void {
    const incident = this.filteredIncidents.find((i) => i._id === incidentId);
    if (incident) {
      incident.status = "in_progress";
      incident.assignedTo = "Inspecteur Municipal";
      this.filteredIncidents = [...this.filteredIncidents];
      if (this.selectedIncident?._id === incidentId) this.selectedIncident = { ...incident };
      this.notificationService.showSuccess("Enquête", "Incident pris en charge pour enquête");
    }
  }

  resolveIncident(incidentId: string): void {
    // incidentId est un Signalement._id (jamais un Collecte._id — un signalement
    // indépendant n'a pas de collecte à résoudre) : PATCH /signalements/:id/resolve,
    // pas l'ancienne route Collecte-based.
    const resolutionComment = this.resolutionComment;
    this.adminService.resolveSignalement(incidentId, resolutionComment).subscribe({
      next: () => {
        const incident = this.filteredIncidents.find((i) => i._id === incidentId);
        if (incident) {
          incident.status = "resolved";
          // Affiché immédiatement dans le détail sans attendre un rechargement complet.
          if (resolutionComment) incident.resolutionComment = resolutionComment;
          this.filteredIncidents = [...this.filteredIncidents];
          if (this.selectedIncident?._id === incidentId) this.selectedIncident = { ...incident };
        }
        this.resolutionComment = '';
        this.visibleIncidentDrawer = false;
        this.notificationService.showSuccess("Résolu", "Incident marqué comme résolu");
      },
      error: () => {
        this.notificationService.showError("Erreur", "Impossible de résoudre l'incident");
      },
    });
  }

  openIncidentDrawer(incident: Incident): void {
    this.selectedIncident = incident;
    this.resolutionComment = '';
    this.visibleIncidentDrawer = true;
  }

  openResolveDialog(incidentId: string): void {
    this.resolveDialogIncidentId = incidentId;
    this.resolutionComment = '';
    this.resolveDialogVisible = true;
  }

  confirmResolveFromDialog(): void {
    this.resolveIncident(this.resolveDialogIncidentId);
    this.resolveDialogVisible = false;
    this.resolveDialogIncidentId = '';
  }

  contactAgencyForIncident(agencyId?: string): void {
    this.contactAgency(agencyId);
  }

  // Communication methods
  toggleAllAgencies(event: any): void {
    if (event.target.checked) {
      this.newCommunication.recipients = this.communicationRecipientAgencies.map((a) => a.id);
    } else {
      this.newCommunication.recipients = [];
    }
  }

  toggleRecipient(agencyId: string, event: any): void {
    if (event.target.checked) {
      this.newCommunication.recipients.push(agencyId);
    } else {
      this.newCommunication.recipients =
        this.newCommunication.recipients.filter(
          (id: string) => id !== agencyId,
        );
    }
  }

  sendCommunication(): void {
    if (
      !this.newCommunication.type ||
      !this.newCommunication.title ||
      !this.newCommunication.message ||
      this.newCommunication.recipients.length === 0
    ) {
      return;
    }

    const recipients = [...this.newCommunication.recipients];
    const communication: Communication = {
      id: Math.random().toString(36).substr(2, 9),
      type: this.newCommunication.type,
      title: this.newCommunication.title,
      message: this.newCommunication.message,
      recipients,
      priority: this.newCommunication.priority,
      sentAt: new Date(),
      readBy: [],
    };

    // Envoi réel : persistance + notification temps réel (cloche générique)
    // au personnel des agences sélectionnées — services/communication.js,
    // réutilise notifyUsers() comme partout ailleurs dans l'app.
    this.adminService.sendCommunication$({
      title: this.newCommunication.title,
      message: this.newCommunication.message,
      recipients,
    }).subscribe({
      next: () => {
        this.communications.unshift(communication);
        this.showCommunicationModal = false;
        this.newCommunication = {
          type: "",
          priority: "medium",
          title: "",
          message: "",
          recipients: [],
        };
        this.notificationService.showSuccess(
          "Envoyé",
          "Communication envoyée avec succès",
        );
      },
      error: () => {
        this.notificationService.showError(
          "Erreur",
          "La communication n'a pas pu être envoyée.",
        );
      },
    });
  }

  // Statistics
  showAdminStatistics(): void {
    this.isLoadingStatistics = true;
    this.adminService.getAllStatistics().subscribe({
      next: (statistics: any) => {
        if (!statistics.stats) return;
        this.statisticsAdmin = statistics.stats;
        this.isLoadingStatistics = false;
        console.log(" statistics in dashboard", this.statisticsAdmin);
        // loadZoneStatistics() (item 2c) lit statisticsAdmin.agenciesByCity/... — recalculé
        // dès que la vraie réponse arrive, pas seulement à l'appel synchrone depuis
        // loadTabData() (qui peut s'exécuter avant que cette requête ait résolu).
        if (this.activeTab === 'statistics') {
          this.loadZoneStatistics();
        }
      },
      error: (error) => {
        console.error("Erreur lors du chargement des statistiques:", error);
        this.isLoadingStatistics = false;
      },
    });
  }

  //clients

  showAdminClients(): void {
    this.isLoadingClients = true;
    this.clientService.getAllClients().subscribe({
      next: (response: any) => {
        this.clientsAudits = (Array.isArray(response?.data) ? response.data : []).map((client: any) => {
          return {
            _id: client._id,
            data: client,
            // active_subscription: client?.subscriptionHistory.filter(
            //   (s: any) => s.status === "active"
            // ),
          };
        });
        this.filteredClients = [...this.clientsAudits];
        this.isLoadingClients = false;
        console.log("clients in dashboard", this.filteredClients);
      },
      error: (error) => {
        console.error("Erreur lors du chargement des clients:", error);
        this.isLoadingClients = false;
      },
    });
  }
  //users

  showAdminUsers(usersFilterParams: FilterParams): void {
    this.isLoadingClients = true;
    this.adminService.getAllUsers(usersFilterParams).subscribe({
      next: (response: any) => {
        this.usersAudits = (response?.data ?? []).map((user: any) => ({
          _id: user._id,
          data: user,
        }));
        this.filteredUsers = [...this.usersAudits];

        // Pagination metadata — s'adapte à total / pagination.total
        this.usersTotalItems   = response?.total ?? response?.pagination?.total ?? this.usersAudits.length;
        this.usersItemsPerPage = usersFilterParams.limit ?? 10;
        this.usersCurrentPage  = usersFilterParams.page  ?? 1;
        this.usersTotalPages   = Math.max(1, Math.ceil(this.usersTotalItems / this.usersItemsPerPage));

        this.isLoadingClients = false;
      },
      error: (error) => {
        console.error("Erreur lors du chargement des utilisateurs:", error);
        this.isLoadingClients = false;
      },
    });
  }

  goToUsersPage(page: number): void {
    if (page < 1 || page > this.usersTotalPages) return;
    this.usersFilterParams = { ...this.usersFilterParams, page };
    this.showAdminUsers(this.usersFilterParams);
  }

  changeUsersItemsPerPage(limit: number): void {
    this.usersFilterParams = { ...this.usersFilterParams, limit, page: 1 };
    this.showAdminUsers(this.usersFilterParams);
  }

  getUsersPageNumbers(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.usersCurrentPage - 2);
    const end   = Math.min(this.usersTotalPages, start + 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  getUsersEndItem(): number {
    return Math.min(this.usersCurrentPage * this.usersItemsPerPage, this.usersTotalItems);
  }

  isTogglingUserStatus = false;

  toggleUserStatus(): void {
    if (!this.selectedUser?._id) return;
    const newStatus: 'active' | 'inactive' = this.selectedUser.status === 'active' ? 'inactive' : 'active';
    this.isTogglingUserStatus = true;
    this.adminService.toggleUserStatus(this.selectedUser._id!, newStatus).subscribe({
      next: () => {
        this.selectedUser = { ...this.selectedUser, status: newStatus } as any;
        const label = newStatus === 'active' ? 'Activé' : 'Désactivé';
        this.notificationService.showSuccess(label, `Compte ${newStatus === 'active' ? 'activé' : 'désactivé'} avec succès.`);
        this.showAdminUsers(this.usersFilterParams);
        this.isTogglingUserStatus = false;
      },
      error: (err) => {
        this.notificationService.showError('Erreur', err.error?.message || 'Impossible de modifier le statut.');
        this.isTogglingUserStatus = false;
      }
    });
  }

  deleteUser(userId: string){
    this.adminService.deleteUser(userId).subscribe({
      next: (response: any) => {
        console.log("user deleted", response);
        this.notificationService.showSuccess(
          "Supprimé",
          "Utilisateur supprimé avec succès",
        );
        this.showAdminUsers(this.usersFilterParams);
      },
      error: (error) => {
        this.notificationService.showError(
          "Autorisation",
          error.error?.message || "Une erreur est survenue lors de la suppression de l'utilisateur",
        )
      },
    })
  }
  agencies: any[] = [];
  getAllAgenciesIDs(): void {
    this.agencyService
      .getAllAgenciesFromApi(this.agenciesFilterParams)
      .subscribe({
        next: (response: any) => {
          this.agencies = response?.data.map((a: any) => a._id);
          console.log("agencies in dashboard", response, this.agencies);
          this.loadAllCollectors();
        },
      });
  }
  loadAllCollectors(): void {
    this.isLoadingCollectors = true;

    // Ajouter un timeout de 30 secondes pour éviter le chargement infini
    this.adminService
      .getAllEmployees()
      .pipe(
        timeout(30000),
        catchError((error) => {
          console.error("Erreur lors du chargement des collecteurs:", error);
          this.isLoadingCollectors = false;
          this.collectorsAudits = [];
          this.filteredCollectors = [];
          return of({ data: [] });
        }),
      )
      .subscribe({
        next: (response: any) => {
          const collectors = response?.data || [];

          if (collectors.length === 0) {
            this.collectorsAudits = [];
            this.filteredCollectors = [];
            this.isLoadingCollectors = false;
            return;
          }
          this.collectorsAudits = collectors || [];
          this.filteredCollectors = [...this.collectorsAudits];
          this.isLoadingCollectors = false;
          console.log(
            "collectors in dashboard this.filteredCollectors",
            this.filteredCollectors,
          );
          console.log("users in dashboard ===>", collectors);
        },
        error: (error) => {
          console.error("Erreur lors du chargement des collecteurs:", error);
          this.isLoadingCollectors = false;
          this.collectorsAudits = [];
          this.filteredCollectors = [];
        },
      });
  }
  getInitials(fullName: string) {
    return this.sharedService.getInitials(fullName);
  }

  getRandomColor(item: any): string {
    return this.sharedService.getRandomColor(item);
  }

  //Agencies

  // getAgencyById(id: string) {
  //   return this.agencyService.getAgencyByIdFromApi(id).subscribe({
  //     next: (response: any) => {
  //       if (response.success) {
  //         console.log('agencies in dashboard', response?.data?.agencyName);
  //       }
  //     }
  //   });
  // }

  activateAgency(id: string) {
    const status = "activate";
    this.agencyService.activateAgency(id, status).subscribe({
      next: (response: any) => {
        console.log("agency activated  in dashboard", response);
        if (response.message) {
          this.notificationService.showSuccess(
            "Activation",
            "Agence activée avec succès",
          );
          this.loadAgencyAudits(this.agenciesFilterParams);
        }
      },
      error: (error: any) => {
        console.error("Error activating agency:", error);
        const msg = error?.error?.message || "Error activating agency";
        this.notificationService.showSuccess("Activation", msg);
      },
    });
  }

  deactivateAgency(id: string) {
    this.agencyService.deActivateAgency(id).subscribe({
      next: (response: any) => {
        console.log("agency deactivated in dashboard", response);
        this.notificationService.showSuccess("Désactivation", "Agence désactivée avec succès");
        this.loadAgencyAudits(this.agenciesFilterParams);
      },
      error: (error: any) => {
        console.error("Error deactivating agency:", error);
        const msg = error?.error?.message || "Erreur lors de la désactivation";
        this.notificationService.showError("Désactivation", msg);
      },
    });
  }

  deleteAgency(id: string) {
    if (!confirm("Confirmer la suppression de cette agence ?")) return;
    this.agencyService.deleteAgency(id).subscribe({
      next: (response: any) => {
        console.log("agency deleted in dashboard", response);
        this.notificationService.showSuccess("Suppression", "Agence supprimée avec succès");
        this.loadAgencyAudits(this.agenciesFilterParams);
      },
      error: (error: any) => {
        console.error("Error deleting agency:", error);
        const msg = error?.error?.message || "Erreur lors de la suppression";
        this.notificationService.showError("Suppression", msg);
      },
    });
  }

  loadAllMunipalities() {
    this.adminService.getAllMunicipalities().subscribe({
      next: (response: any) => {
        this.municipalitiesAudits = response.data.map((municipality: any) => {
          return {
            _id: municipality._id,
            data: municipality,
          };
        });
        this.filteredMunicipalities = [...this.municipalitiesAudits];
        console.log("municipalities in response", response);
        console.log("municipalities in dashboard", this.filteredMunicipalities);
      },
    });
  }
  /**Listes des signalements des users */
  totalIncidents = signal(0);

  loadAgenciesForDropdown(reset = false): void {
    if (this.agencyDropdownLoading) return;
    if (!reset && this.agencyDropdownList.length >= this.agencyDropdownTotal && this.agencyDropdownTotal > 0) return;
    if (reset) {
      this.agencyDropdownPage = 1;
      this.agencyDropdownList = [];
      this.agencyDropdownTotal = 0;
    }
    this.agencyDropdownLoading = true;
    this.agencyService.getAllAgenciesFromApi({
      page: this.agencyDropdownPage,
      limit: 15,
      search: this.agencyDropdownSearch,
    }).subscribe({
      next: (res: any) => {
        const items: { id: string; name: string }[] = (res.data ?? []).map((a: any) => ({ id: a._id, name: a.name }));
        this.agencyDropdownList  = reset ? items : [...this.agencyDropdownList, ...items];
        this.agencyDropdownTotal = res.total ?? res.pagination?.total ?? this.agencyDropdownList.length;
        this.agencyDropdownPage++;
        this.agencyDropdownLoading = false;
      },
      error: () => { this.agencyDropdownLoading = false; }
    });
  }

  openAgencyDropdown(): void {
    this.agencyDropdownOpen = true;
    if (!this.agencyDropdownList.length) this.loadAgenciesForDropdown(true);
  }

  onAgencyDropdownSearch(): void {
    this.loadAgenciesForDropdown(true);
  }

  onAgencyDropdownScroll(event: Event): void {
    const el = event.target as HTMLElement;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) {
      this.loadAgenciesForDropdown();
    }
  }

  selectAgencyFilter(agency: { id: string; name: string } | null): void {
    this.selectedAgencyForFilter = agency;
    this.agencyIdFilter          = agency?.id ?? '';
    this.agencyDropdownOpen      = false;
    this.agencyDropdownSearch    = '';
    this.incidentsCurrentPage    = 1;
    this.loadAllSignalements(1);
  }

  // Lit désormais le vrai modèle Signalement unifié (GET /api/signalements) — la mutation
  // Collecte.status='Reported' n'existe plus depuis cette migration (voir models/Signalement.js),
  // /api/collecte/all?status=Reported ne renverra donc plus jamais rien. Même pattern que
  // agency-dashboard.ts::loadAgencyReports() : origine/status filtrables côté serveur,
  // severity/recherche/pagination appliqués ici car l'endpoint ne les gère pas.
  loadAllSignalements(page = this.incidentsCurrentPage) {
    this.isLoadingIncidents = true;
    this.adminService.getAllSignalements({
      // Vide/'all' pour un super_admin = toutes agences confondues (backend, Prompt fix
      // super_admin) ; sinon restreint à l'agence sélectionnée dans le filtre du tableau.
      // status volontairement PAS envoyé ici : this.incidents doit rester l'ensemble
      // complet (toutes valeurs de status) pour que les KPI/graphique restent corrects
      // quel que soit le filtre de statut actif dans le tableau — voir
      // applyIncidentClientFilters(), qui applique ce filtre uniquement à filteredIncidents.
      agencyId: this.agencyIdFilter || undefined,
    }).subscribe({
      next: (signalements: any[]) => {
        this.incidents = signalements ?? [];
        this.applyIncidentClientFilters(page);
        this.isLoadingIncidents = false;
        console.log("signalements in response", signalements);
        // Corrige le badge d'onglet chargé par loadTabBadges() : celui-ci vient de
        // stateForAgency.js::getUserStatsForAdmin, qui compte encore l'ancien
        // Collecte.status='Reported' (toujours 0 depuis la migration Signalement) —
        // uniquement quand la vue n'est pas déjà restreinte à une seule agence, pour ne
        // pas remplacer un total plateforme par un sous-ensemble filtré.
        if (!this.agencyIdFilter) {
          this.tabBadges = { ...this.tabBadges, incidents: this.getUnresolvedReportsCount() };
        }
        if (this.chartsInitialized && this.activeTab === 'statistics') {
          this.buildIncidentsChart();
        }
      },
      error: (error) => {
        console.error("Erreur lors du chargement des incidents:", error);
        this.isLoadingIncidents = false;
      },
    });
  }
  //naviguate to add Municipality
  navigateToAddMunicipality() {
    this.router.navigate(["/register"]);
    this.adminService.setData("municipality");
  }

  openAddAgentDrawer(): void {
    this.newAgentData = {
      firstName: '', lastName: '', email: '', phone: '',
      password: '', confirmPassword: '',
      acceptTerms: true,
      address: { city: '', arrondissement: '', sector: '', neighborhood: '', street: '', doorNumber: '' },
    };
    this.agentArrondissements = [];
    this.agentSectors         = [];
    this.agentNeighborhoods   = [];
    this.visibleAddAgentDrawer = true;
    this.territoryService.getAllCities().subscribe({
      next: (cities) => { this.agentCities = cities; },
      error: () => { this.agentCities = []; },
    });
  }

  onAgentCityChange(): void {
    this.agentArrondissements = [];
    this.agentSectors         = [];
    this.agentNeighborhoods   = [];
    this.newAgentData.address.arrondissement = '';
    this.newAgentData.address.sector         = '';
    this.newAgentData.address.neighborhood   = '';
    const city = this.agentCities.find(c => c.name === this.newAgentData.address.city);
    if (!city) return;
    this.territoryService.getArrondissementsByCity(city.id).subscribe({
      next: (arr) => { this.agentArrondissements = arr; },
      error: () => { this.agentArrondissements = []; },
    });
  }

  onAgentArrondissementChange(): void {
    this.agentSectors       = [];
    this.agentNeighborhoods = [];
    this.newAgentData.address.sector       = '';
    this.newAgentData.address.neighborhood = '';
    const arr = this.agentArrondissements.find(a => a.name === this.newAgentData.address.arrondissement);
    if (!arr) return;
    this.territoryService.getSectorsByArrondissement(arr.id).subscribe({
      next: (sectors) => { this.agentSectors = sectors; },
      error: () => { this.agentSectors = []; },
    });
  }

  onAgentSectorChange(): void {
    this.agentNeighborhoods = [];
    this.newAgentData.address.neighborhood = '';
    const sec = this.agentSectors.find(s => s.name === this.newAgentData.address.sector);
    if (!sec) return;
    this.territoryService.getNeighborhoodsBySector(sec.id).subscribe({
      next: (quartiers) => { this.agentNeighborhoods = quartiers; },
      error: () => { this.agentNeighborhoods = []; },
    });
  }

  submitNewMunicipalityAgent(): void {
    const d = this.newAgentData;
    if (!d.firstName || !d.lastName || !d.email || !d.phone || !d.password) {
      this.notificationService.showError('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (d.password !== d.confirmPassword) {
      this.notificationService.showError('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }
    if (d.password.length < 8) {
      this.notificationService.showError('Erreur', 'Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    this.isSubmittingAgent = true;
    const body = {
      firstName:    d.firstName,
      lastName:     d.lastName,
      email:        d.email,
      phone:        d.phone,
      password:     d.password,
      role:         'municipality',
      acceptTerms:  d.acceptTerms,
      receiveOffers: false,
      address: {
        city:           d.address.city,
        arrondissement: d.address.arrondissement,
        sector:         d.address.sector,
        neighborhood:   d.address.neighborhood,
        street:         d.address.street,
        doorNumber:     d.address.doorNumber || 'N/A',
        longitude:      -1.5339,
        latitude:       12.3647,
      },
    };
    this.authService.register(body as any).subscribe({
      next: (res: any) => {
        this.isSubmittingAgent = false;
        if (res?.success || res?.status === 'success' || res?.message?.toLowerCase().includes('succès')) {
          this.notificationService.showSuccess('Agent créé', 'L\'agent de mairie a été créé avec succès');
          this.visibleAddAgentDrawer = false;
          this.loadTabData('all_users');
        } else {
          this.notificationService.showError('Erreur', res?.message || 'Erreur lors de la création');
        }
      },
      error: (err: any) => {
        this.isSubmittingAgent = false;
        this.notificationService.showError('Erreur', err?.error?.message || 'Erreur lors de la création');
      },
    });
  }

  loadTabBadges(): void {
    this.adminService.getGlobalUserStats().subscribe({
      next: (res: any) => {
        if (!res) return;
        const d = res?.data ?? res;
        // Fusionne au lieu de remplacer, et n'inclut jamais `incidents` ici : cette route
        // (state_agencies/stats/users → totalReportings = Collecte.status='Reported')
        // reste bloquée à 0 depuis la migration vers Signalement (voir loadAllSignalements()
        // ci-dessous, seule source fiable pour ce badge). Un remplacement complet écrasait
        // silencieusement la bonne valeur si cette requête répondait après celle des
        // signalements — d'où le badge correct seulement après un clic sur l'onglet
        // (qui relance loadAllSignalements en dernier), jamais au chargement initial.
        this.tabBadges = {
          ...this.tabBadges,
          agencies:   d.totalAgencies      ?? d.agencies      ?? 0,
          all_users:  d.totalUsers         ?? d.all_users         ?? 0,
          collectors: d.totalCollectors    ?? d.collectors    ?? 0,
          clients:    d.totalClients       ?? d.clients       ?? 0,
          overview:   d.totalAgencies      ?? 0,
        };
      },
    });
  }

  getTabBadge(tabId: string): number {
    return this.tabBadges[tabId] ?? 0;
  }

  // getTabBadge(tabId: string): number {
  //   switch (tabId) {
  //     case "overview":
  //       return (
  //         this.filteredAgencies.length +
  //         this.filteredMunicipalities.length +
  //         this.filteredClients.length +
  //         this.filteredCollectors.length +
  //         this.filteredIncidents.length
  //       );
  //     case "municipalities":
  //       return this.filteredMunicipalities.length;
  //     case "agencies":
  //       return this.filteredAgencies.length;
  //     case "clients":
  //       return this.filteredClients.length;
  //     case "collectors":
  //       return this.filteredCollectors.length;
  //     case "incidents":
  //       return this.filteredIncidents.length;
  //     case "all_users":
  //       return this.filteredUsers.length;
  //     default:
  //       return 0;
  //   }
  // }

  getRoleLabel(): string {
    const count = this.filteredUsers.length;
    const plural = count > 1;
    switch (this.roleFilter) {
      case "client":
        return plural ? "Clients" : "Client";
      case "manager":
        return plural ? "Manageurs" : "Manageur";
      case "collector":
        return plural ? "Collecteurs" : "Collecteur";
      case "municipality":
        return plural ? "AGENTS DE MAIRIE" : "Agent de Mairie";
      default:
        return "";
    }
  }

  // Recuperer l'agence d'un user
  agency: any;
  loadAgencyFromApi(id: string | null): void {
    this.agencyService.getAgencyByIdFromApi(id).subscribe((response: any) => {
      if (response.success && response.data) {
        console.log("[DEBUG] Agency response:", response.data);
        this.agency = response.data;
      } else {
        console.error("Erreur lors du chargement de l'agence");
      }
    });
  }





  /**
   * Obtenir la liste des quartiers uniques des employés
   */
  getUniqueEmployeeNeighborhoods(): string[] {
    return this.availableEmployeeNeighborhoods.map((q) => q.name).sort();
  }

/**
   * Chantier "migrer le frontend vers TerritoryHttpService" — agrège les quartiers de
   * plusieurs secteurs en un seul flux (remplace la boucle `forEach` + `push`
   * synchrone, qui supposait une réponse immédiate).
   */
  private _aggregateNeighborhoodsForSectors(sectors: Sector[]) {
    if (!sectors.length) return of([] as Quartier[]);
    return forkJoin(sectors.map((s) => this.territoryService.getNeighborhoodsBySector(s.id))).pipe(
      map((lists) => lists.flat()),
    );
  }

  /**
   * Initialise les données pour les filtres (même système que l'enregistrement)
   */
  initializeFiltersData(): void {
    // Chantier "migrer le frontend vers TerritoryHttpService" — l'id "1" (ville
    // "Ouagadougou" dans CountriesOrgMockService) était un id de mock, jamais un vrai
    // `_id` Mongo : recherché par nom une fois les vraies villes chargées, plutôt que
    // fabriqué. Si "Ouagadougou" n'est pas trouvée, les arrondissements/quartiers par
    // défaut restent simplement vides (l'utilisateur choisit une ville).
    this.territoryService.getAllCities().subscribe({
      next: (cities) => {
        this.availableEmployeeCities = cities;
        const ouaga = cities.find((c) => c.name === 'Ouagadougou');
        if (!ouaga) return;
        this.territoryService.getArrondissementsByCity(ouaga.id).subscribe({
          next: (arr) => { this.availableEmployeeArrondissements = arr; },
          error: () => { this.availableEmployeeArrondissements = []; },
        });
        this.loadAllNeighborhoodsForCity(ouaga.id);
      },
      error: () => { this.availableEmployeeCities = []; },
    });
  }

  /**
   * Charge tous les quartiers d'une ville donnée — enchaîne arrondissements -> secteurs
   * (un `forkJoin` par arrondissement) -> quartiers (un `forkJoin` par secteur), puis
   * aplatit le tout en un seul tableau, au lieu des boucles `forEach`+`push` synchrones
   * d'avant ce chantier (qui supposaient un retour immédiat du service mock).
   */
  loadAllNeighborhoodsForCity(cityId: string): void {
    this.availableEmployeeNeighborhoods = [];
    this.territoryService.getArrondissementsByCity(cityId).pipe(
      switchMap((arrondissements) => {
        if (!arrondissements.length) return of([] as Quartier[]);
        return forkJoin(
          arrondissements.map((arr) =>
            this.territoryService.getSectorsByArrondissement(arr.id).pipe(
              switchMap((sectors) => this._aggregateNeighborhoodsForSectors(sectors)),
            ),
          ),
        ).pipe(map((lists) => lists.flat()));
      }),
    ).subscribe({
      next: (neighborhoods) => { this.availableEmployeeNeighborhoods = neighborhoods; },
      error: () => { this.availableEmployeeNeighborhoods = []; },
    });
  }

  /**
   * Gère le changement de ville pour les filtres employés
   */
  onEmployeeCityFilterChange(): void {
    // Réinitialiser les filtres dépendants
    this.employeesArrondissementFilter = "";
    this.employeesSectorFilter = null;
    this.employeesNeighborhoodFilter = "";
    this.availableEmployeeArrondissements = [];
    this.availableEmployeeSectors = [];
    this.availableEmployeeNeighborhoods = [];

    if (this.employeesCityFilter) {
      // Charger les arrondissements de la ville sélectionnée
      this.territoryService.getArrondissementsByCity(this.employeesCityFilter).subscribe({
        next: (arr) => { this.availableEmployeeArrondissements = arr; },
        error: () => { this.availableEmployeeArrondissements = []; },
      });
      this.loadAllNeighborhoodsForCity(this.employeesCityFilter);
    }
  }
/**
   * Gère le changement d'arrondissement pour les filtres employés
   */
  onEmployeeArrondissementFilterChange(): void {
    // Réinitialiser les filtres dépendants
    this.employeesSectorFilter = null;
    this.employeesNeighborhoodFilter = "";
    this.availableEmployeeSectors = [];
    this.availableEmployeeNeighborhoods = [];

    if (this.employeesArrondissementFilter) {
      // Charger les secteurs de l'arrondissement sélectionné, puis leurs quartiers
      this.territoryService.getSectorsByArrondissement(this.employeesArrondissementFilter).pipe(
        switchMap((sectors) => {
          this.availableEmployeeSectors = sectors;
          return this._aggregateNeighborhoodsForSectors(sectors);
        }),
      ).subscribe({
        next: (neighborhoods) => { this.availableEmployeeNeighborhoods = neighborhoods; },
        error: () => { this.availableEmployeeSectors = []; this.availableEmployeeNeighborhoods = []; },
      });
    }
  }

  /**
   * Gère le changement de secteur pour les filtres employés
   */
  onEmployeeSectorFilterChange(): void {
    this.employeesNeighborhoodFilter = "";

    if (this.employeesSectorFilter) {
      // Charger les quartiers du secteur sélectionné
      const sectorId = this.employeesSectorFilter.toString();
      this.territoryService.getNeighborhoodsBySector(sectorId).subscribe({
        next: (quartiers) => { this.availableEmployeeNeighborhoods = quartiers; },
        error: () => { this.availableEmployeeNeighborhoods = []; },
      });
    } else if (this.employeesArrondissementFilter) {
      // Si aucun secteur sélectionné, charger tous les quartiers de l'arrondissement
      this._aggregateNeighborhoodsForSectors(this.availableEmployeeSectors).subscribe({
        next: (neighborhoods) => { this.availableEmployeeNeighborhoods = neighborhoods; },
        error: () => { this.availableEmployeeNeighborhoods = []; },
      });
    }
  }

}
