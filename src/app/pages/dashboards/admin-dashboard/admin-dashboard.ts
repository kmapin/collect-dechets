import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterModule } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { AuthService } from "../../../services/auth.service";
import { AgencyService } from "../../../services/agency.service";
import { CollectionService } from "../../../services/collection.service";
import { NotificationService } from "../../../services/notification.service";
import { User } from "../../../models/user.model";
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

interface AdminStatistics {
  totalAgencies: number;
  activeAgencies: number;
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
  completedCollections: number;
  totalRevenue: number;
  averageRating: number;
  pendingReports: number;
  complianceRate: number;
}

interface AgencyAudit {
  id: string;
  name: string;
  status: "active" | "inactive" | "suspended";
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
  id: string;
  agency?: {
    id: string;
    agencyName?: string;
  };
  agencyId: string;
  agencyName: string;
  type:
    | "missed_collection"
    | "compliance_issue"
    | "complaint"
    | "technical_issue";
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  date: Date;
  status: "open" | "pending" | "resolved";
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

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule, RouterModule, FormsModule, MatCardModule, LoadingSpinnerComponent],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard implements OnInit {
  currentUser: User | null = null;
  Math: any = Math;
  activeTab = "overview";
  longText = `The Shiba Inu is the smallest of the six original and distinct spitz breeds of dog
    from Japan. A small, agile dog that copes very well with mountainous terrain, the Shiba Inu was
    originally bred for hunting.`;
  // Data
  statistics: AdminStatistics = {
    totalAgencies: 15,
    activeAgencies: 14,
    totalClients: 12500,
    activeClients: 12000,
    totalCollectors: 85,
    todayCollections: 450,
    completedCollections: 425,
    completeCollections: 425,
    totalMunicipalities: 25,
    totalCollections: 425,
    totalRevenue: 485000,
    averageRating: 4.2,
    pendingReports: 8,
    complianceRate: 92,
  };

  agencyAudits: AgencyAudit[] = [];
  clientsAudits: any[] = [];
  collectorsAudits: any[] = [];
  filteredAgencies: AgencyAudit[] = [];
  filteredClients: any[] = [];
  filteredCollectors: any[] = [];
  wasteStatistics: WasteStatistic[] = [];
  zoneStatistics: GroupedZoneStatistics[] = [];
  incidents: Incident[] = [];
  filteredIncidents: Incident[] = [];
  communications: Communication[] = [];
  //  zoneStatistics: ZoneStatistic[] = [];

  // Filters
  agenciesFilter = "all";
  clientsFilter = "all";
  collectorsFilter = "all";
  complianceFilter = "all";
  statisticsPeriod = "month";
  incidentsFilter: "all" | "open" | "pending" | "resolved" = "all";
  severityFilter: "all" | "low" | "medium" | "high" | "critical" = "all";

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

  tabs = [
    { id: "overview", label: "Vue d'ensemble", icon: "dashboard", badge: null },
    {
      id: "municipalities",
      label: "Municipalités",
      icon: "business",
      badge: null,
    },
    { id: "agencies", label: "Agences", icon: "business", badge: null },
    { id: "collectors", label: "Collecteurs", icon: "business", badge: null },
    { id: "clients", label: "Clients", icon: "business", badge: null },
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
  constructor(
    private authService: AuthService,
    private agencyService: AgencyService,
    private collectionService: CollectionService,
    private adminService: Admin,
    private clientService: ClientService,
    private notificationService: NotificationService,
    private sharedService: SharedService,
    private router: Router,
    private cd: ChangeDetectorRef
  ) {}

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
  }

  loadAdminData(): void {
    this.loadAgencyAudits();
    this.loadWasteStatistics();
    this.loadZoneStatistics();
    this.loadZoneStat();
    this.loadCommunications();
    this.showAdminClients();
    this.loadAllSignalements();
    // this.loadIncidents();
  }

  loadAgencyAudits(): void {
    this.isLoadingAgencies = true;
    this.agencyService.getAllAgenciesFromApi().subscribe({
      next: (agencies) => {
        this.agencyAudits = agencies.data.map((agency) => ({
          id: agency?._id,
          name: agency?.agencyName,
          status: agency?.isActive ? "active" : "inactive",
          clients: agency?.clients?.length || 0,
          collectors: agency?.employees?.length || 0,
          zones: 0,
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
        console.error('Erreur lors du chargement des agences:', error);
        this.isLoadingAgencies = false;
      }
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

  loadIncidents1(): void {
    this.incidents = [
      {
        id: "1",
        agencyId: "2",
        agencyName: "GreenWaste Solutions",
        type: "missed_collection",
        description: "Collecte manquée dans le secteur Nord",
        severity: "medium",
        date: new Date(),
        status: "open",
      },
      {
        id: "2",
        agencyId: "3",
        agencyName: "WasteManager Pro",
        type: "compliance_issue",
        description: "Non-respect des horaires réglementaires",
        severity: "high",
        date: new Date(Date.now() - 86400000),
        status: "pending",
        assignedTo: "Inspecteur Martin",
      },
    ];
    this.filteredIncidents = [...this.incidents];
  }

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
      return `${this.statisticsAdmin?.activeAgencies} actives`;
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
      return `${this.statisticsAdmin?.totalMunicipalities} actives`;
    }
    const statusTexts = {
      active: "Active",
      inactive: "Inactive",
      suspended: "Suspendue",
    };
    return statusTexts[status as keyof typeof statusTexts] || status;
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
    };
    return types[type as keyof typeof types] || type;
  }

  getIncidentStatusText(status: string): string {
    const statuses = {
      // open: "Ouvert",
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
    this.filteredAgencies = this.agencyAudits.filter((agency) => {
      const statusMatch =
        this.agenciesFilter === "all" || agency.status === this.agenciesFilter;
      let complianceMatch = true;

      if (this.complianceFilter === "excellent") {
        complianceMatch = agency.complianceScore >= 95;
      } else if (this.complianceFilter === "good") {
        complianceMatch =
          agency.complianceScore >= 85 && agency.complianceScore < 95;
      } else if (this.complianceFilter === "poor") {
        complianceMatch = agency.complianceScore < 85;
      }

      return statusMatch && complianceMatch;
    });
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
      "Génération du rapport global en cours..."
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
      "Ouverture des détails de la mairie"
    );
    this.router.navigate(["/municipality", municipalityId]);
  }
  viewAgencyDetails(agencyId: string): void {
    this.notificationService.showInfo(
      "Détails",
      "Ouverture des détails de l'agence"
    );
    this.router.navigate(["/agencies", agencyId]);
  }
  selectedClient: any = null; 
showClientDetailsModal: boolean = false;
viewClientDetails(clientId: string): void {
  this.notificationService.showInfo("Détails", "Récupération des détails du client...");
  
  this.adminService.getClientById(clientId).subscribe({
    next: (client: any) => {
      this.selectedClient = client.data; 
      console.log('voici les details du client:',client)
      this.showClientDetailsModal = true; 
    },
    error: (err: any) => {
      console.error("Erreur lors de la récupération des détails du client :", err);
      this.notificationService.showError("Erreur", "Impossible de récupérer les détails du client.");
    }
  });
}
  viewCollectorDetails(clientId: string): void {
    this.notificationService.showInfo(
      "Détails",
      "Ouverture des détails du collecteur"
    );
  }
  auditMunicipality(municipalityId: string): void {
    this.notificationService.showInfo(
      "Audit",
      "Lancement de l'audit de l'agence"
    );
  }
  auditAgency(agencyId: string): void {
    this.notificationService.showInfo(
      "Audit",
      "Lancement de l'audit de l'agence"
    );
  }

  contactMunicipality(municipalityId: string): void {
    this.notificationService.showInfo(
      "Contact",
      "Ouverture des informations de contact"
    );
  }
  contactAgency(agencyId?: string): void {
    this.router.navigate(["/agencies", agencyId]);
    this.notificationService.showInfo(
      "Contact",
      "Ouverture des informations de contact"
    );
  }

  updateStatistics(): void {
    this.notificationService.showInfo(
      "Mise à jour",
      "Actualisation des statistiques"
    );
  }

  exportStatistics(): void {
    this.notificationService.showInfo(
      "Export",
      "Génération du fichier d'export..."
    );
  }

  assignIncident(incidentId: string): void {
    this.notificationService.showInfo(
      "Attribution",
      "Ouverture du formulaire d'attribution"
    );
  }

  investigateIncident(incidentId: string): void {
    const incident = this.incidents.find((i) => i.id === incidentId);
    if (incident) {
      incident.status = "pending";
      incident.assignedTo = "Inspecteur Municipal";
      this.filterIncidents();
      this.notificationService.showSuccess(
        "Enquête",
        "Incident pris en charge pour enquête"
      );
    }
  }

  resolveIncident(incidentId: string): void {
    const incident = this.incidents.find((i) => i.id === incidentId);
    if (incident) {
      incident.status = "resolved";
      this.filterIncidents();
      this.statistics.pendingReports--;
      this.notificationService.showSuccess(
        "Résolu",
        "Incident marqué comme résolu"
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
          (id: string) => id !== agencyId
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
        "Communication envoyée avec succès"
      );
    }
  }

  // Statistics
  showAdminStatistics(): void {
    this.isLoadingStatistics = true;
    this.adminService.getAllStatistics().subscribe({
      next: (statistics: any) => {
        this.statisticsAdmin = statistics;
        this.isLoadingStatistics = false;
        console.log(this.statisticsAdmin);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des statistiques:', error);
        this.isLoadingStatistics = false;
      }
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
        console.error('Erreur lors du chargement des clients:', error);
        this.isLoadingClients = false;
      }
    });
  }

  agencies: any[] = [];
  getAllAgenciesIDs(): void {
    this.agencyService.getAllAgenciesFromApi().subscribe({
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
    this.adminService.getAllEmployees()
      .pipe(
        timeout(30000), // 30 secondes
        catchError(error => {
          console.error('Erreur lors du chargement des collecteurs:', error);
          this.isLoadingCollectors = false;
          this.collectorsAudits = [];
          this.filteredCollectors = [];
          return of({ data: [] }); // Retourner un observable vide
        })
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

          const collectorsWithAgencies$ = collectors.map((employee: any) => {
            const agency$ = this.agencies.includes(employee.agencyId)
              ? this.agencyService.getAgencyById1(employee.agencyId)
              : of({ data: { agencyName: "" } });

            return agency$.pipe(
              timeout(10000), // 10 secondes par agence
              catchError(() => of({ data: { agencyName: "" } })), // En cas d'erreur, retourner des données vides
              map((agencyResponse: any) => {
                return {
                  agency: {
                    agencyName: agencyResponse?.data?.agencyName || "",
                    agencyId: agencyResponse?.data?._id || "",
                    address: {
                      city: agencyResponse?.data?.address?.city || "",
                      quartier: agencyResponse?.data?.address?.neighborhood || "",
                      postalCode: agencyResponse?.data?.address?.postalCode || "",
                      sector: agencyResponse?.data?.address?.sector || "",
                      street: agencyResponse?.data?.address?.street || "",
                    },
                  },
                  createdAt: employee?.createdAt || "",
                  email: employee?.email || "",
                  firstName: employee?.firstName || "",
                  hiredAt: employee?.hiredAt || "",
                  isActive: employee?.isActive ? "active" : "inactive",
                  lastName: employee?.lastName || "",
                  phone: employee?.phone || "",
                  role: employee?.role || "",
                  updatedAt: employee?.updatedAt || "",
                  userId: employee?.userId || "",
                  zones: employee?.zones || [],
                };
              })
            );
          });

          forkJoin(collectorsWithAgencies$)
            .pipe(
              timeout(60000), // 1 minute pour toutes les requêtes
              catchError(error => {
                console.error('Erreur lors du chargement des agences des collecteurs:', error);
                this.isLoadingCollectors = false;
                this.collectorsAudits = [];
                this.filteredCollectors = [];
                return of([]);
              })
            )
            .subscribe((result: any) => {
              this.collectorsAudits = result || [];
              this.filteredCollectors = [...this.collectorsAudits];
              this.isLoadingCollectors = false;
              console.log("collectors in dashboard", this.filteredCollectors);
            });
        },
        error: (error) => {
          console.error('Erreur lors du chargement des collecteurs:', error);
          this.isLoadingCollectors = false;
          this.collectorsAudits = [];
          this.filteredCollectors = [];
        }
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
    this.agencyService.activateAgency(id).subscribe({
      next: (response: any) => {
        console.log("agency activated  in dashboard", response);
        if (response.message) {
          this.notificationService.showSuccess(
            "Activation",
            "Agence activée avec succès"
          );
          this.loadAgencyAudits();
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
  loadAllSignalements() {
    this.isLoadingIncidents = true;
    this.adminService.getAllReports().subscribe({
      next: (response: any) => {
        this.incidents = response.map((signalement: any) => {
          return {
            agencyId: signalement.agency._id,
            ...signalement,
          };
        });
        this.filteredIncidents = [...this.incidents];
        this.isLoadingIncidents = false;
        console.log("signalements in response", response);
        console.log("signalements in dashboard", this.filteredIncidents);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des incidents:', error);
        this.isLoadingIncidents = false;
      }
    });
  }
  //naviguate to add Municipality
  navigateToAddMunicipality() {
    this.router.navigate(["/register"]);
    this.adminService.setData("municipality");
  }
  closeClientDetailsModal(): void {
  this.showClientDetailsModal = false;
  this.selectedClient = null; 
}
getTabBadge(tabId: string): number {
  switch (tabId) {
    case 'overview':
      return this.filteredAgencies.length + this.filteredMunicipalities.length + this.filteredClients.length + this.filteredCollectors.length + this.filteredIncidents.length;
    case 'municipalities':
      return this.filteredMunicipalities.length;
    case 'agencies':
      return this.filteredAgencies.length;
    case 'clients':
      return this.filteredClients.length;
    case 'collectors':
      return this.filteredCollectors.length;
    case 'incidents':
      return this.filteredIncidents.length;
    default:
      return 0;
  }
}
}
