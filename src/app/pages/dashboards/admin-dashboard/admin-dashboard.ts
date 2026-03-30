import { ChangeDetectorRef, Component, OnInit, signal } from "@angular/core";
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
import { forkJoin, map, of, timeout, catchError } from "rxjs";
import {
  MOCK_CITIES,
  MOCK_ARRONDISSEMENTS,
} from "../../../data/countries-org.mock";
import { FilterParams } from "../../../models/filterParams.model";
import { DrawerModule } from "primeng/drawer";
import { Signalement } from "../../shared_pages/signalement/signalement";
import { OUAGA_DATA, QuartierData } from "../../../data/mock-data";
import { Arrondissement, City, Quartier, Sector } from "../../../models/countries-org.model";
import { CountriesOrgMockService } from "../../../services/countries-org-mock.service";
interface AdminStatistics {
  totalAgencies: number;
  totalActiveAgencies: number;
  monthlyClientPercentage: number;
  totalCollectionsCollected: number;
  totalCollectionsReported: number;
  dailyCollections: number;
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
}

interface AgencyAudit {
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
  userId: string;
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
  photo?: [];
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
  status:
    | "open"
    | "pending"
    | "resolved"
    | "Collected"
    | "Reported"
    | "Scheduled";
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
    Signalement,
  ],
  templateUrl: "./admin-dashboard.html",
  styleUrl: "./admin-dashboard.scss",
})
export class AdminDashboard implements OnInit {
  currentUser: RegisterUserData | null = null;
  Math: any = Math;
  activeTab = "overview";
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
  clientsAudits: any[] = [];
  collectorsAudits: any[] = [];
  usersAudits: any[] = [];
  filteredAgencies: AgencyAudit[] = [];
  filteredClients: any[] = [];
  filteredUsers: any[] = [];
  filteredCollectors: any[] = [];
  wasteStatistics: WasteStatistic[] = [];
  zoneStatistics: GroupedZoneStatistics[] = [];
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
  incidentsFilter: "all" | "open" | "pending" | "resolved" = "all";
  severityFilter: "all" | "Low" | "Medium" | "High" | "Critical" = "all";

  usersFilterParams: FilterParams = {
    role: this.roleFilter,
    neighborhood: this.neighborhoodFilter,
    term: this.searchTerm,
  };

  agenciesFilterParams: FilterParams = {
    status: this.agenciesFilter,
    search: this.searchTerm,
    getAll: true
  };
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

  //Statistics for admin
  statisticsAdmin: AdminStatistics | null = null;
  //List all clients for admin dashboard
  clients: any;

  
  // Listes pour les filtres déroulants
  availableCities: string[] = [];
  availableNeighborhoods: string[] = [];
  filteredNeighborhoods: string[] = [];

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
    {
      id: "incidents",
      label: "Incidents",
      icon: "report_problem",
      badge: null,
    },
    // {
    //   id: "communications",
    //   label: "Communications",
    //   icon: "campaign",
    //   badge: null,
    // },
  ];
  municipalitiesAudits: any;
  filteredMunicipalities: any[] = [];
  clientGrowth: number = 0;
  signalementsAudits: any;
  filteredSignalements: any[] = [];
  isDisabled = true;
  visible1: boolean = false;
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
    private countriesOrgMockService: CountriesOrgMockService,
  ) {
    this.drawerWidth;
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.getAllAgenciesIDs();
    // if(this.agencies.length > 0){
    //   this.loadAllCollectors();
    // }
    this.loadAdminData();
    this.showAdminStatistics();
    this.loadAllMunipalities();
    this.getClientGrowth();
    this.loadZoneStat();

    
    // Initialiser les listes de villes et quartiers
    this.initializeCitiesAndNeighborhoods();
    this.initializeFiltersData();
  }

  loadAdminData(): void {
    this.loadAgencyAudits(this.agenciesFilterParams);
    this.loadWasteStatistics();
    this.loadZoneStatistics();
    this.loadZoneStat();
    this.loadCommunications();
    this.showAdminClients();
    this.loadAllSignalements();
    this.showAdminUsers(this.usersFilterParams);
    // this.loadIncidents();
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
        this.agencyAudits = agencies.data.map((agency) => ({
          id: agency?._id,
          name: agency?.name,
          status: agency?.status || "inactive",
          clients: agency?.clients?.length || 0,
          collectors: agency?.employees?.length || 0,
          zones: agency?.zoneActivite?.length || 0,
          userId: agency?.userId,
          collectionsToday: 0,
          completionRate: 0,
          rating: 0,
          revenue: 0,
          lastAudit: new Date(),
          complianceScore: 0,
          issues: [],
        }));
        this.filteredAgencies = [...this.agencyAudits];
        this.isLoadingAgencies = false;
        console.log(" this.agencyAudits", this.agencyAudits);
        console.log(" this.agencies", agencies);
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

  loadWasteStatistics(): void {
    this.wasteStatistics = [
      {
        type: "Déchets ménagers",
        quantity: 1250,
        percentage: 45,
        trend: "stable",
        color: "#4caf50",
      },
      {
        type: "Recyclables",
        quantity: 850,
        percentage: 30,
        trend: "up",
        color: "#2196f3",
      },
      {
        type: "Organiques",
        quantity: 425,
        percentage: 15,
        trend: "up",
        color: "#8bc34a",
      },
      {
        type: "Verre",
        quantity: 280,
        percentage: 10,
        trend: "stable",
        color: "#00bcd4",
      },
    ];
  }
  get drawerWidth(): string {
    return window.innerWidth <= 768 ? "100%" : "33%";
  }

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
    console.log("this.zoneStatistics", this.zoneStatistics);
  }

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
      },
      error: (err) => {
        console.error("Erreur lors de la récupération des villes:", err);
        this.zoneStatistics = [];
      },
    });
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

  loadCommunications(): void {
    this.communications = [
      {
        id: "1",
        type: "directive",
        title: "Nouvelle réglementation tri sélectif",
        message:
          "Application des nouvelles consignes de tri à partir du 1er février",
        recipients: ["1", "2"],
        priority: "high",
        sentAt: new Date(Date.now() - 3600000),
        readBy: ["1"],
      },
    ];
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

  getCollectionRate(): number {
    return Math.round(
      (this.statistics.completedCollections /
        this.statistics.todayCollections) *
        100,
    );
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
  getComplianceText(): string {
    if (this.statistics.complianceRate >= 95) return "Excellent";
    if (this.statistics.complianceRate >= 85) return "Bon";
    return "À améliorer";
  }

  getIncidentSeverity(): string {
    const pending = this.statisticsAdmin?.totalCollectionsReported ?? 0;
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
    return this.incidents?.slice(0, 5) || [];
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

  getIncidentStatusText(status: string): string {
    const statuses = {
      // open: "Ouvert",
      pending: "En cours",
      resolved: "Résolue",
      reported: "En cours",
      scheduled: "Programmée",
      collected: "Collecté",
    };
    return statuses[status as keyof typeof statuses] || status;
  }

  getComplianceClass(score: number): string {
    if (score >= 95) return "excellent";
    if (score >= 85) return "good";
    return "poor";
  }

  getTopPerformingAgencies(): any[] {
    return this.agencyAudits
      .sort((a, b) => b.completionRate - a.completionRate)
      .slice(0, 5)
      .map((agency) => ({
        name: agency.name,
        completionRate: agency.completionRate,
      }));
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
    const agency = this.agencyAudits.find((a) => a.id === agencyId);
    return agency ? agency.name : "Agence inconnue";
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
      search: this.searchTerm,
    };
    console.log(this.agenciesFilterParams);
    this.loadAgencyAudits(this.agenciesFilterParams);
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
    };
    console.log(this.usersFilterParams);
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
  viewUserDetails(clientId: string): void {
    this.notificationService.showInfo(
      "Détails",
      "Récupération des détails du client...",
    );

    this.adminService.getUserById(clientId).subscribe({
      next: (client: any) => {
        if (client.success) {
          this.selectedUser = client?.user;
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
  viewCollectorDetails(clientId: string): void {
    this.notificationService.showInfo(
      "Détails",
      "Ouverture des détails du collecteur",
    );
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

  exportStatistics(): void {
    this.notificationService.showInfo(
      "Export",
      "Génération du fichier d'export...",
    );
  }

  assignIncident(incidentId: string): void {
    this.notificationService.showInfo(
      "Attribution",
      "Ouverture du formulaire d'attribution",
    );
  }

  investigateIncident(incidentId: string): void {
    const incident = this.incidents.find((i) => i._id === incidentId);
    if (incident) {
      incident.status = "pending";
      incident.assignedTo = "Inspecteur Municipal";
      this.filterIncidents();
      this.notificationService.showSuccess(
        "Enquête",
        "Incident pris en charge pour enquête",
      );
    }
  }

  resolveIncident(incidentId: string): void {
    const incident = this.incidents.find((i) => i._id === incidentId);
    if (incident) {
      incident.status = "resolved";
      this.filterIncidents();
      this.statistics.pendingReports--;
      this.notificationService.showSuccess(
        "Résolu",
        "Incident marqué comme résolu",
      );
    }
  }

  contactAgencyForIncident(agencyId?: string): void {
    this.contactAgency(agencyId);
  }

  // Communication methods
  toggleAllAgencies(event: any): void {
    if (event.target.checked) {
      this.newCommunication.recipients = this.agencyAudits.map((a) => a.id);
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
      this.newCommunication.type &&
      this.newCommunication.title &&
      this.newCommunication.message &&
      this.newCommunication.recipients.length > 0
    ) {
      const communication: Communication = {
        id: Math.random().toString(36).substr(2, 9),
        type: this.newCommunication.type,
        title: this.newCommunication.title,
        message: this.newCommunication.message,
        recipients: [...this.newCommunication.recipients],
        priority: this.newCommunication.priority,
        sentAt: new Date(),
        readBy: [],
      };

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
    }
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
        this.clientsAudits = response?.data.map((client: any) => {
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
    console.log("usersFilterParams", usersFilterParams);
    this.adminService.getAllUsers(usersFilterParams).subscribe({
      next: (response: any) => {
        this.usersAudits = response?.data.map((user: any) => {
          return {
            _id: user._id,
            data: user,
            // active_subscription: client?.subscriptionHistory.filter(
            //   (s: any) => s.status === "active"
            // ),
          };
        });
        this.filteredUsers = [...this.usersAudits];
        this.isLoadingClients = false;
        console.log("clients in dashboard", this.filteredUsers);
      },
      error: (error) => {
        console.error("Erreur lors du chargement des utilisateurs:", error);
        this.isLoadingClients = false;
      },
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
  loadAllSignalements() {
    this.isLoadingIncidents = true;
    this.adminService.getAllReports().subscribe({
      next: (response: any) => {
        this.totalIncidents.set(response?.total);
        this.incidents = response.collectes;
        // .map((signalement: any) => {
        //   return {
        //     agencyId: signalement.agency?._id,
        //     ...signalement,
        //   };
        // });
        this.filteredIncidents = [...this.incidents];
        this.isLoadingIncidents = false;
        console.log("signalements in response", response);
        console.log("signalements in dashboard", this.filteredIncidents);
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

  getTabBadge(tabId: string): number {
    switch (tabId) {
      case "overview":
        return (
          this.filteredAgencies.length +
          this.filteredMunicipalities.length +
          this.filteredClients.length +
          this.filteredCollectors.length +
          this.filteredIncidents.length
        );
      case "municipalities":
        return this.filteredMunicipalities.length;
      case "agencies":
        return this.filteredAgencies.length;
      case "clients":
        return this.filteredClients.length;
      case "collectors":
        return this.filteredCollectors.length;
      case "incidents":
        return this.filteredIncidents.length;
      case "all_users":
        return this.filteredUsers.length;
      default:
        return 0;
    }
  }

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
     * Initialise les listes de villes et quartiers à partir des données mock
     */
    initializeCitiesAndNeighborhoods(): void {
      try {
        // S'assurer que OUAGA_DATA existe et est un tableau
        if (!OUAGA_DATA || !Array.isArray(OUAGA_DATA)) {
          console.warn("OUAGA_DATA non disponible ou incorrect");
          this.availableCities = [];
          this.availableNeighborhoods = [];
          this.filteredNeighborhoods = [];
          return;
        }
  
        // Extraire les arrondissements comme "villes"
        this.availableCities = OUAGA_DATA.map((data) => data.arrondissement);
  
        // Extraire tous les quartiers
        this.availableNeighborhoods = [];
        OUAGA_DATA.forEach((arrond) => {
          if (arrond.secteurs && Array.isArray(arrond.secteurs)) {
            arrond.secteurs.forEach((secteur) => {
              if (secteur.quartiers && Array.isArray(secteur.quartiers)) {
                this.availableNeighborhoods.push(...secteur.quartiers);
              }
            });
          }
        });
  
        // Supprimer les doublons et trier
        this.availableNeighborhoods = [
          ...new Set(this.availableNeighborhoods),
        ].sort();
        this.filteredNeighborhoods = [...this.availableNeighborhoods];
      } catch (error) {
        console.error(
          "Erreur lors de l'initialisation des villes et quartiers:",
          error,
        );
        this.availableCities = [];
        this.availableNeighborhoods = [];
        this.filteredNeighborhoods = [];
      }
    }



  /**
   * Obtenir la liste des quartiers uniques des employés
   */
  getUniqueEmployeeNeighborhoods(): string[] {
    return this.availableEmployeeNeighborhoods.map((q) => q.name).sort();
  }

/**
   * Initialise les données pour les filtres (même système que l'enregistrement)
   */
  initializeFiltersData(): void {
    // Charger les villes du Burkina Faso (country id = '1')
    this.availableEmployeeCities =
      this.countriesOrgMockService.getCitiesByCountry("1");

    // Par défaut, charger les arrondissements de Ouagadougou (city id = '1')
    this.availableEmployeeArrondissements =
      this.countriesOrgMockService.getArrondissementsByCity("1");

    // Charger tous les quartiers de Ouagadougou par défaut
    this.loadAllNeighborhoodsForCity("1");
  }

  /**
   * Charge tous les quartiers d'une ville donnée
   */
  loadAllNeighborhoodsForCity(cityId: string): void {
    const arrondissements =
      this.countriesOrgMockService.getArrondissementsByCity(cityId);
    this.availableEmployeeNeighborhoods = [];

    arrondissements.forEach((arr) => {
      const sectors = this.countriesOrgMockService.getSectorsByArrondissement(
        arr.id,
      );
      sectors.forEach((sector) => {
        const neighborhoods =
          this.countriesOrgMockService.getNeighborhoodsBySector(sector.id);
        this.availableEmployeeNeighborhoods.push(...neighborhoods);
      });
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

    if (this.employeesCityFilter) {
      // Charger les arrondissements de la ville sélectionnée
      this.availableEmployeeArrondissements =
        this.countriesOrgMockService.getArrondissementsByCity(
          this.employeesCityFilter,
        );
      this.loadAllNeighborhoodsForCity(this.employeesCityFilter);
    } else {
      this.availableEmployeeArrondissements = [];
      this.availableEmployeeSectors = [];
      this.availableEmployeeNeighborhoods = [];
    }


  }
/**
   * Gère le changement d'arrondissement pour les filtres employés
   */
  onEmployeeArrondissementFilterChange(): void {
    // Réinitialiser les filtres dépendants
    this.employeesSectorFilter = null;
    this.employeesNeighborhoodFilter = "";

    if (this.employeesArrondissementFilter) {
      // Charger les secteurs de l'arrondissement sélectionné
      this.availableEmployeeSectors =
        this.countriesOrgMockService.getSectorsByArrondissement(
          this.employeesArrondissementFilter,
        );

      // Charger les quartiers de cet arrondissement
      this.availableEmployeeNeighborhoods = [];
      this.availableEmployeeSectors.forEach((sector) => {
        const neighborhoods =
          this.countriesOrgMockService.getNeighborhoodsBySector(sector.id);
        this.availableEmployeeNeighborhoods.push(...neighborhoods);
      });
    } else {
      this.availableEmployeeSectors = [];
      this.availableEmployeeNeighborhoods = [];
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
      this.availableEmployeeNeighborhoods =
        this.countriesOrgMockService.getNeighborhoodsBySector(sectorId);
    } else {
      // Si aucun secteur sélectionné, charger tous les quartiers de l'arrondissement
      if (this.employeesArrondissementFilter) {
        this.availableEmployeeNeighborhoods = [];
        this.availableEmployeeSectors.forEach((sector) => {
          const neighborhoods =
            this.countriesOrgMockService.getNeighborhoodsBySector(sector.id);
          this.availableEmployeeNeighborhoods.push(...neighborhoods);
        });
      }
    }
  }
}
