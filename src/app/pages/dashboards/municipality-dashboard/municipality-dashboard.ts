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
import { OUAGA_DATA } from "../../../data/mock-data";
import { Admin } from "../../../services/admin";
import {
  MOCK_CITIES,
  MOCK_ARRONDISSEMENTS,
} from "../../../data/countries-org.mock";

interface MunicipalityStatistics {
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
}

interface WasteStatistic {
  type: string;
  quantity: number;
  percentage: number;
  trend: "up" | "down" | "stable";
  color: string;
}

interface ZoneStatistic {
  cities: any;
  country: any;
  name: string;
  agencies: number;
  clients: number;
  collections: number;
  coverage: number;
  incidents: number;
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
  selector: 'app-municipality-dashboard',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './municipality-dashboard.html',
  styleUrl: './municipality-dashboard.css'
})
export class MunicipalityDashboard  implements OnInit {
  currentUser: User | null = null;
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

  agencyAudits: AgencyAudit[] = [];
  filteredAgencies: AgencyAudit[] = [];
  wasteStatistics: WasteStatistic[] = [];
  zoneStatistics: GroupedZoneStatistics[] = [];
  incidents: Incident[] = [];
  filteredIncidents: Incident[] = [];
  communications: Communication[] = [];
  // zoneStatistics: ZoneStatistic[] = [];

  // Filters
  agenciesFilter = "all";
  complianceFilter = "all";
  statisticsPeriod = "month";
  incidentsFilter: "all" | "open" | "pending" | "resolved" = "all";
  severityFilter: "all" | "low" | "medium" | "high" | "critical" = "all";
  // incidentsFilter = "all";

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
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadMunicipalityData();
    this.loadZoneStatistics();
    this.getClientGrowth();
    this.showAdminStatistics();
    this.filterIncidents();
    this.loadZoneStat();
  }

  loadMunicipalityData(): void {
    this.loadAgencyAudits();
    this.loadWasteStatistics();
    this.loadZoneStatistics();
    this.loadAllSignalements();
    this.showAdminStatistics();
    this.loadZoneStat();
    // this.loadIncidents();
    // this.loadCommunications();
  }

  loadAgencyAudits(): void {
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
        console.log(" this.agencyAudits", this.agencyAudits);
        console.log(" this.agencies", agencies);
        const auditTab = this.tabs.find((tab) => tab.id === "agencies");
        if (auditTab) {
          auditTab.badge = this.agencyAudits.length;
          this.cd.detectChanges();
        }
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
      },
      error: (err) => {
        console.error("Erreur lors de la récupération des villes:", err);
        this.zoneStatistics = [];
      },
    });
  }

  /**Listes des signalements des users */
  loadAllSignalements() {
    this.adminService.getAllReports().subscribe({
      next: (response: any) => {
        this.incidents = response.map((signalement: any) => {
          return {
            agencyId: signalement?.agency?._id,
            ...signalement,
          };
        });
        this.filteredIncidents = [...this.incidents];
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

  // loadCommunications(): void {
  //   this.communications = [
  //     {
  //       id: '1',
  //       type: 'directive',
  //       title: 'Nouvelle réglementation tri sélectif',
  //       message: 'Application des nouvelles consignes de tri à partir du 1er février',
  //       recipients: ['1', '2'],
  //       priority: 'high',
  //       sentAt: new Date(Date.now() - 3600000),
  //       readBy: ['1']
  //     }
  //   ];
  // }

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

  // Statistics
  showAdminStatistics(): void {
    this.adminService.getAllStatistics().subscribe({
      next: (statistics: any) => {
        this.statisticsAdmin = statistics;
        console.log(this.statisticsAdmin);
      },
    });
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
}
