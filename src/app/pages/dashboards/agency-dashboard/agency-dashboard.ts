import { Agency } from "./../../../models/agency.model";
import { catchError, forkJoin, map, of, Subscription } from "rxjs";
import {
  AfterViewChecked,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewEncapsulation,
} from "@angular/core";
import { Webstockets, SocketNotification } from "../../../core/services/webstockets";
import { ConversationService, RealtimeMessage } from "../../../services/conversation.service";
import { ContratService } from "../../../services/contrat.service";
import { Contrat } from "../../../models/contrat.model";
import { isSubscriptionCurrentlyActive } from "../../../services/eligibility.service";
import { RedevanceService } from "../../../services/redevance.service";
import { DemandeCollecteService, DemandeCollecte } from "../../../services/demande-collecte.service";
import { Redevance } from "../../../models/redevance.model";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import {
  trigger,
  state,
  style,
  transition,
  animate,
  query,
  stagger,
} from "@angular/animations";
import { AuthService } from "../../../services/auth.service";
import {
  AgencyService,
  ZoneStatistics,
  ZoneRecommendation as ServiceZoneRecommendation,
  ZoneAnalyticsResponse,
} from "../../../services/agency.service";
import { CollectionService } from "../../../services/collection.service";
import { NotificationService } from "../../../services/notification.service";
import {
  User,
  UserRole,
  AddEmployeeData,
  UserAddress,
  RegisterUserData,
} from "../../../models/user.model";
import {
  Employee,
  Employees,
  ServiceZone,
  ServiceZones,
  CollectionSchedule,
  EmployeeRole,
  WasteService,
  tarif,
  Tarif,
} from "../../../models/agency.model";
import { Collection, CollectionStatus } from "../../../models/collection.model";
import { ClientService, ClientApi } from "../../../services/client.service";
import { OUAGA_DATA, QuartierData } from "../../../data/mock-data";
import { Message } from "../../../models/message.model";
import { SharedService } from "../../../services/shared-service";
import { MatExpansionModule } from "@angular/material/expansion";
import {
  Arrondissement,
  City,
  Quartier,
  Sector,
} from "../../../models/countries-org.model";
import { MatIcon } from "@angular/material/icon";
import { LoadingSpinnerComponent } from "../../../components/loading-spinner/loading-spinner.component";
import { Admin } from "../../../services/admin";
import { CountriesOrgMockService } from "../../../services/countries-org-mock.service";
import { VehicleService } from "../../../services/vehicle.service";
//test
import { ButtonModule } from "primeng/button";
import { RatingModule } from "primeng/rating";
import { TableModule } from "primeng/table";
import { TagModule } from "primeng/tag";
import { ToastModule } from "primeng/toast";
import { RippleModule } from "primeng/ripple";
import { Signalement } from "../../shared_pages/signalement/signalement";
import { MultiSelectModule } from 'primeng/multiselect';
interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  subscriptionStatus: "active" | "suspended" | "cancelled";
  lastPayment: Date;
  totalPaid: number;
  joinDate: Date;
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
    email?: string
  };
  collectorId?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string
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
  status: "open" | "pending" | "resolved" | 'Collected' | 'Reported' | 'Scheduled';
  assignedTo?: string;
  /** Champ réel Collecte.resolutionTeamId (renommé depuis assignedTeamId, Phase 2 du
   * nettoyage Planning/Signalement/Assignation) — équipe affectée à la résolution. */
  resolutionTeamId?: { _id: string; name?: string } | null;
  resolutionStatus?: "pending" | "in_progress" | "resolved";
  // Champs du modèle Signalement unifié (Prompt 04 backend / Prompt 06 frontend) —
  // absents des anciens signalements Collecte-based, présents sur tout ce qui vient
  // désormais de `GET /api/signalements`.
  collecteId?: string | null;
  planningId?: { _id: string; reference?: string; libelle?: string; date?: Date } | null;
  origine?: "collecte" | "independant";
}
interface Report {
  _id: string;
  clientId: string;
  clientName: string;
  client?: {
    _id: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  severity: "critical" | "high" | "medium" | "low";
  type: "missed_collection" | "incomplete_collection" | "damage" | "complaint";
  description: string;
  comment: string;
  date: Date;
  createdAt: Date;
  status: "open" | "in_progress" | "resolved";
  assignedTo?: string;
  reportType?: string;
  photos?: string[];
}

interface ZoneAnalytics {
  id: string;
  name: string;
  totalClients: number;
  households: number;
  businesses: number;
  institutions: number;
  capacityUsage: number;
  estimatedTime: number;
  requiredTeam: number;
  requiredVehicles: number;
  growth: number;
}

interface LocalZoneRecommendation {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  icon: string;
  zoneId: string;
}

interface Statistics {
  totalClients: number;
  totalClientsActifs?: number;
  totalEmployees: number;
  totalZone: number;
  totalCollectors: number;
  totalCollecteurs?: number;
  totalGestionnaires?: number;
  totalReporting: number;
  resolvedSignalements?: number;
  activeCollectors: number;
  todayCollections: number;
  pendingSignalements: number;
  completedCollections: number;
  filteredCollectionsCount?: number;
  monthlyRevenue: number;
  averageRating: number;
  pendingReports: number;
}

interface DashboardTab {
  id: TabId;
  label: string;
  icon: string;
  badge: number | null;
}

type TabId =
  | "collections"
  | "employees"
  | "zones"
  | "schedules"
  | "reports"
  | "demandes"
  | "messages"
  | "vehicles"
  | "contrats"
  | "avis";
// | "clients"
interface Vehicle {
  _id?: string;
  plate: string;
  model: string;
  type: 'camion' | 'pickup' | 'moto' | 'tricycle';
  capacityTons: number;
  status: 'disponible' | 'en_service' | 'maintenance' | 'hors_service';
  fuelLevel?: number;
  mileage?: number;
  lastMaintenance?: string;
  agencyId?: string;
}
export enum CollectionStatus1 {
  SCHEDULED = 'Scheduled',
  IN_PROGRESS = 'In_progress',
  COMPLETED = 'Completed',
  MISSED = 'Missed',
  CANCELLED = 'Cancelled',
  REPORTED = 'Reported'
}
@Component({
  selector: "app-agency-dashboard",
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MatExpansionModule,
    MatIcon,
    LoadingSpinnerComponent,

    MultiSelectModule,
    TableModule,
    ButtonModule,
    RatingModule,
    TagModule,
    ToastModule,
    RippleModule,


    Signalement,
  ],
  templateUrl: "./agency-dashboard.html",
  styleUrl: "./agency-dashboard.scss",
  animations: [
    trigger("slideInOut", [
      transition(":enter", [
        style({ transform: "translateY(-100%)", opacity: 0 }),
        animate(
          "300ms ease-in",
          style({ transform: "translateY(0%)", opacity: 1 }),
        ),
      ]),
      transition(":leave", [
        animate(
          "300ms ease-out",
          style({ transform: "translateY(-100%)", opacity: 0 }),
        ),
      ]),
    ]),
    trigger("fadeInOut", [
      transition(":enter", [
        style({ opacity: 0 }),
        animate("200ms ease-in", style({ opacity: 1 })),
      ]),
      transition(":leave", [animate("200ms ease-out", style({ opacity: 0 }))]),
    ]),
    trigger("slideFromLeft", [
      transition(":enter", [
        style({ transform: "translateX(-100%)", opacity: 0 }),
        animate(
          "250ms ease-out",
          style({ transform: "translateX(0%)", opacity: 1 }),
        ),
      ]),
    ]),
  ],
  encapsulation: ViewEncapsulation.None
})
export class AgencyDashboard implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild("scrollMe") private myScrollContainer!: ElementRef;

  employeeForm!: FormGroup;
  tariffForm!: FormGroup;
  zoneForm!: FormGroup;
  messageForm!: FormGroup;

  currentUser: RegisterUserData | null = null;
  agencyReports: Incident[] = [];

  // Avis clients (note + commentaire) — onglet "Avis clients", GET /collectes/ratings.
  agencyRatings: any[] = [];
  isLoadingRatings = false;
  ratingsTotal = 0;
  ratingsPage = 1;
  readonly ratingsPageSize = 10;
  ouagaData: QuartierData[] = OUAGA_DATA;
  agency: Agency | null = null;
  activeTab: TabId = "employees"; // Changé pour debug - était "collections"

  // Méthode pour changer d'onglet
  setActiveTab(tabId: TabId): void {
    this.activeTab = tabId;
  }

  collectors: Employees[] = [];
  zonesAgency: ServiceZone[] = [];
  manager: Employees[] = [];
  // Data
  // statistics: Statistics = {
  //   totalClients: 1250,
  //   activeCollectors: 8,
  //   todayCollections: 45,
  //   completedCollections: 38,
  //   monthlyRevenue: 32450,
  //   averageRating: 4.3,
  //   pendingReports: 3
  // };
  incidentsFilter = "all";
  severityFilter = "all";
  // Filtre par origine (Prompt 06 point 3) — 'all' | 'collecte' | 'independant'.
  origineFilter = "all";
  filteredIncidents: any[] = [];
  statistics: Statistics = {
    totalClients: 0,
    totalEmployees: 0,
    totalZone: 0,
    totalCollectors: 0,
    totalClientsActifs: 0,
    totalReporting: 0,
    activeCollectors: 0,
    todayCollections: 0,
    resolvedSignalements: 0,
    completedCollections: 0,
    monthlyRevenue: 0,
    averageRating: 0,
    pendingReports: 0,
    pendingSignalements: 0,
  };

  // ── KPI "Nombre de collectes" (période/zone/type de déchet, chantier
  // Planning/Collectes terrain, Priorité Basse) — filtre `statistics.filteredCollectionsCount`,
  // recalculé côté serveur (services/stateForAgency.js::getAgencyStats), pas de logique
  // dupliquée côté client.
  collectesKpiPeriod: 'today' | 'week' | 'month' = 'today';
  collectesKpiZone = '';
  collectesKpiWasteType = '';
  readonly collectesKpiWasteTypes = ['menagers', 'recyclables', 'verts', 'encombrants', 'speciaux'];

  filterCollectesKpi(): void {
    this.loadAgencyStatistics(this.currentUser);
  }

  userData = {
    _id: "",
    role: UserRole.CLIENT as UserRole | null,
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    address: {
      arrondissement: "",
      sector: "",
      street: "",
      doorNumber: "",
      doorColor: "",
      neighborhood: [] as string[],
      city: "",
      postalCode: "",
      // latitude: '',
      // longitude: ''
    },
    agencyName: "",
    agencyDescription: "",
    termsAccepted: false,
    acceptTerms: true,
    receiveOffers: false,
    commune: {
      name: "",
      region: "",
      province: "",
    },
  };

  collections: Collection[] = [];
  filteredCollections: Collection[] = [];
  employees: Employee[] = [];
  tarif: tarif[] = [];
  editingEmployeeId: string | null = null;
  isEditing: boolean = false;
  allEmployees: Employees[] = [];
  filteredEmployees: Employees[] = [];
  // Propriétés pour la recherche et le filtrage des employés
  employeesSearch: string = "";
  employeesRoleFilter: string = "all";
  employeesStatusFilter: string = "all";
  showEmployeesSearch: boolean = false;

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

  // Propriétés de pagination employés
  currentPage: number = 1;
  itemsPerPage: number = 5;
  totalEmployees: number = 0;
  totalPages: number = 0;
  employeeViewMode: 'card' | 'table' = 'table';

  // Propriétés vue / pagination collectes
  collecteViewMode: 'card' | 'table' = 'table';
  collectesCurrentPage: number = 1;
  collectesItemsPerPage: number = 5;
  collectesTotalItems: number = 0;
  collectesTotalPages: number = 0;
  pagedCollectes: any[] = [];

  // Chargement des données
  isLoadingFilteredEmployees: boolean = false;

  // Listes pour les filtres déroulants
  availableCities: string[] = [];
  availableNeighborhoods: string[] = [];
  filteredNeighborhoods: string[] = [];

  // Propriétés pour la recherche et le filtrage des clients
  clientsSearch: string = "";
  clientsCityFilter: string = "all"; // Nouveau filtre par ville
  clientsNeighborhoodFilter: string = "all";
  clientsStatusFilter: string = "all";
  showClientsSearch: boolean = false;
  filteredActiveClients: any;

  // Variables pour la pagination des clients
  clientsCurrentPage: number = 1;
  clientsItemsPerPage: number = 10;
  clientsTotalItems: number = 0;
  clientsTotalPages: number = 0;

  // Variables pour le chargement des clients
  isLoadingFilteredClients: boolean = false;

  // Propriété pour l'affichage moderne des zones
  selectedZoneForDisplay: any = null;
  allTarif: Tarif[] = [];
  serviceZones: ServiceZone[] = [];
  serviceZoness: ServiceZones[] = []; //from API
  // schedules: CollectionSchedule[] = [];
  clients: Client[] = [];
  filteredClients: Client[] = [];
  reports: Report[] = [];
  filteredReports: Report[] = [];
  isDeleting: boolean = false;
  // Propriétés pour la confirmation de suppression
  showDeleteConfirmation: boolean = false;
  employeeToDelete: any = null;
  currentUserForDeletion: any = null;
  // Propriétés pour l'édition d'employé
  employeeToEdit: any = null;
  isEditingEmployee: boolean = false;
  // Filters
  collectionsFilter = "all";
  selectedZone = "";
  reportsFilter = "all";
  reportsTypeFilter = "all";
  analyticsPeriod = "monthly";
  analyticsFilter = "all";

  // Modals
  showAddEmployeeModal = false;
  showPassword = false;
  showConfirmPassword = false;
  employeeFormError: string | null = null;
  employeeFormDetailedErrors: any = {};
  Object = Object; // Pour utiliser Object.keys dans le template
  showZoneModal = false;
  showZoneModalcouverture = false;
  zoneFormError: string | null = null;
  zoneFormDetailedErrors: any = {};

  editingZone = false;

  // Forms - Supprimés les objets pour utiliser les reactive forms
  // newEmployee, newTariff, newZone, newSchedule seront gérés par les FormGroups

  // Propriétés temporaires pour compatibilité (à supprimer après migration du template)
  newEmployee: any = {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "",
    zones: [],
  };
  newTariff: any = {
    type: "",
    price: "",
    description: "",
    nbPassages: "",
  };
  newZone: any = {
    name: "",
    description: "",
    cities: [],
    neighborhoods: [],
    isActive: true,
  };

  // formErrors sera remplacé par une fonction d'erreur
  citiesInput = "";
  minDate: string;

  neighborhoodsInput = "";
  activeClients: ClientApi[] = [];
  activeClientNbrs!: number;
  pendingClients: ClientApi[] = [];
  // Tous les clients de l'agence, sans filtre sur le statut d'abonnement —
  // `activeClients` ne contient que ceux ayant un abonnement actif, ce qui
  // exclut à tort les clients sans abonnement lors de la création d'un
  // Contrat (un client peut avoir un Contrat sans jamais avoir eu d'Abonnement).
  allAgencyClients: ClientApi[] = [];
  isLoading: boolean = false;

  // Variables de state de chargement pour chaque section
  isLoadingStatistics: boolean = false;
  isLoadingCollections: boolean = false;
  isLoadingEmployees: boolean = false;
  isLoadingZones: boolean = false;
  isLoadingClients: boolean = false;
  isLoadingReports: boolean = false;
  isLoadingMessages: boolean = false;
  isLoadingTariffs: boolean = false;
  isLoadingSchedules: boolean = false;

  // Cache pour les valeurs calculées afin d'éviter ExpressionChangedAfterItHasBeenCheckedError
  private _cachedWorkloadPercentage: number | null = null;
  private _cachedEstimatedCoverage: number | null = null;
  private _cachedTotalZoneClients: number | null = null;
  private _cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 1000; // 1 seconde

  // Propriétés pour l'analyse des zones
  selectedZoneForAnalytics: string = "";
  zoneAnalyticsData: ZoneAnalytics[] = [];
  zoneRecommendations: LocalZoneRecommendation[] = [];

  // get activeClientNbr(): number {
  //   return this.activeClients.length;
  // }

  tabs: DashboardTab[] = [
    {
      id: "collections",
      label: "Collectes",
      icon: "local_shipping",
      badge: 0,
    },
    { id: "employees", label: "Employés", icon: "people", badge: null },
    { id: "zones", label: "Zones", icon: "map", badge: null },
    { id: "schedules", label: "Plannings", icon: "schedule", badge: null },
    // { id: "clients", label: "Clients", icon: "person", badge: null },
    { id: "reports", label: "Signalements", icon: "report_problem", badge: 0 },
    { id: "avis", label: "Avis clients", icon: "star", badge: null },
    { id: "demandes", label: "Demandes express", icon: "local_shipping", badge: 0 },
    { id: "contrats", label: "Contrats", icon: "description", badge: null },
    { id: "vehicles", label: "Mobilité", icon: "directions_car", badge: null },
    { id: "messages", label: "Messages", icon: "message", badge: 0 },
    // { id: "analytics", label: "Rapports", icon: "analytics", badge: null },
  ];

  weekDays = [
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi",
    "Dimanche",
  ];
  currentWeek = new Date();
  unreadMessageCount: any;
  receivedMessages: any[] = [];

  showMessageModal: boolean = false;
  messageData: Message = {
    sender: "",
    receiver: "",
    content: "",
  };
  data: any;
  connectedUserMessages: any[] = [];
  receivedId: string = "";
  client: any;
  displayAgencyName: string = "";

  // ─── Mobilité / Véhicules ────────────────────────────────────
  vehicles: Vehicle[] = [];
  filteredVehicles: Vehicle[] = [];
  readonly vehicleStatuses = [
    { value: 'disponible' as const, label: 'Disponible', short: 'Dispo', icon: 'check_circle', color: '#16a34a' },
    { value: 'en_service' as const, label: 'En service', short: 'En svc', icon: 'local_shipping', color: '#3b82f6' },
    { value: 'maintenance' as const, label: 'Maintenance', short: 'Maint.', icon: 'build', color: '#f59e0b' },
    { value: 'hors_service' as const, label: 'Hors service', short: 'H. svc', icon: 'cancel', color: '#ef4444' },
  ];

  vehicleViewMode: 'card' | 'table' = 'table';
  showVehicleModal = false;
  isEditingVehicle = false;
  isSavingVehicle = false;
  isLoadingVehicles = false;
  selectedVehicle: Vehicle | null = null;
  vehiclesSearch = '';
  vehiclesTypeFilter = 'all';
  vehiclesStatusFilter = 'all';
  vehicleForm: {
    plate: string; model: string; type: string;
    capacityTons: number; status: string;
    fuelLevel: number; mileage: number; lastMaintenance: string;
  } = this.emptyVehicleForm();

  private emptyVehicleForm() {
    return { plate: '', model: '', type: '', capacityTons: 0, status: 'disponible', fuelLevel: 100, mileage: 0, lastMaintenance: '' };
  }

  loadVehicles(): void {
    const agencyId = this.currentUser?.agencyId;
    if (!agencyId) return;
    this.isLoadingVehicles = true;
    this.vehicleService.getByAgency(agencyId).subscribe({
      next: (data) => {
        this.vehicles = data ?? [];
        this.filterVehicles();
        const vehiclesTab = this.tabs.find(t => t.id === 'vehicles');
        if (vehiclesTab) vehiclesTab.badge = this.vehicles.length;
        this.isLoadingVehicles = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoadingVehicles = false;
        this.cdr.detectChanges();
      }
    });
  }

  openAddVehicleModal(): void {
    this.isEditingVehicle = false;
    this.selectedVehicle = null;
    this.vehicleForm = this.emptyVehicleForm();
    this.showVehicleModal = true;
  }

  openEditVehicleModal(vehicle: Vehicle): void {
    this.isEditingVehicle = true;
    this.selectedVehicle = vehicle;
    this.vehicleForm = {
      plate: vehicle.plate,
      model: vehicle.model,
      type: vehicle.type,
      capacityTons: vehicle.capacityTons ?? 0,
      status: vehicle.status,
      fuelLevel: vehicle.fuelLevel ?? 100,
      mileage: vehicle.mileage ?? 0,
      lastMaintenance: vehicle.lastMaintenance ?? '',
    };
    this.showVehicleModal = true;
  }

  closeVehicleModal(): void {
    this.showVehicleModal = false;
    this.selectedVehicle = null;
  }

  saveVehicle(): void {
    if (!this.vehicleForm.plate || !this.vehicleForm.model || !this.vehicleForm.type) {
      this.notificationService.showError('Erreur', 'Veuillez remplir les champs obligatoires.');
      return;
    }
    const agencyId = this.currentUser?.agencyId;
    if (!agencyId) { this.notificationService.showError('Erreur', 'Agence introuvable.'); return; }

    const body = {
      agencyId,
      plate: this.vehicleForm.plate,
      model: this.vehicleForm.model,
      type: this.vehicleForm.type as Vehicle['type'],
      capacityTons: this.vehicleForm.capacityTons,
      status: this.vehicleForm.status as Vehicle['status'],
      fuelLevel: this.vehicleForm.fuelLevel,
      mileage: this.vehicleForm.mileage,
      ...(this.vehicleForm.lastMaintenance ? { lastMaintenance: this.vehicleForm.lastMaintenance } : {}),
    };

    this.isSavingVehicle = true;
    if (this.isEditingVehicle && this.selectedVehicle?._id) {
      this.vehicleService.update(this.selectedVehicle._id, body).subscribe({
        next: (updated) => {
          const idx = this.vehicles.findIndex(v => v._id === this.selectedVehicle!._id);
          if (idx !== -1) this.vehicles[idx] = { ...this.vehicles[idx], ...updated };
          this.filterVehicles();
          this.closeVehicleModal();
          this.isSavingVehicle = false;
          this.notificationService.showSuccess('Succès', 'Engin modifié avec succès.');
          this.cdr.detectChanges();
        },
        error: () => {
          this.isSavingVehicle = false;
          this.notificationService.showError('Erreur', 'Impossible de modifier l\'engin.');
        }
      });
    } else {
      this.vehicleService.create(body).subscribe({
        next: (created) => {
          this.vehicles.push(created);
          const vehiclesTab = this.tabs.find(t => t.id === 'vehicles');
          if (vehiclesTab) vehiclesTab.badge = this.vehicles.length;
          this.filterVehicles();
          this.closeVehicleModal();
          this.isSavingVehicle = false;
          this.notificationService.showSuccess('Succès', 'Engin ajouté avec succès.');
          this.cdr.detectChanges();
        },
        error: () => {
          this.isSavingVehicle = false;
          this.notificationService.showError('Erreur', 'Impossible d\'ajouter l\'engin.');
        }
      });
    }
  }

  deleteVehicle(vehicle: Vehicle): void {
    if (!vehicle._id || !confirm(`Supprimer l'engin ${vehicle.plate} ?`)) return;
    this.vehicleService.remove(vehicle._id).subscribe({
      next: () => {
        this.vehicles = this.vehicles.filter(v => v._id !== vehicle._id);
        this.filterVehicles();
        const vehiclesTab = this.tabs.find(t => t.id === 'vehicles');
        if (vehiclesTab) vehiclesTab.badge = this.vehicles.length;
        this.notificationService.showSuccess('Succès', 'Engin supprimé.');
        this.cdr.detectChanges();
      },
      error: () => this.notificationService.showError('Erreur', 'Impossible de supprimer l\'engin.')
    });
  }

  setVehicleStatus(vehicle: Vehicle, status: Vehicle['status']): void {
    if (!vehicle._id || vehicle.status === status) return;
    this.vehicleService.update(vehicle._id, { status }).subscribe({
      next: (updated) => {
        vehicle.status = updated?.status ?? status;
        this.filterVehicles();
        this.cdr.detectChanges();
      },
      error: () => this.notificationService.showError('Erreur', 'Impossible de changer le statut.')
    });
  }

  toggleVehicleStatus(vehicle: Vehicle): void {
    const cycleOrder: Vehicle['status'][] = ['disponible', 'en_service', 'maintenance', 'hors_service'];
    this.setVehicleStatus(vehicle, cycleOrder[(cycleOrder.indexOf(vehicle.status) + 1) % cycleOrder.length]);
  }

  filterVehicles(): void {
    let result = [...this.vehicles];
    if (this.vehiclesSearch) {
      const q = this.vehiclesSearch.toLowerCase();
      result = result.filter(v =>
        v.plate.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q)
      );
    }
    if (this.vehiclesTypeFilter !== 'all') result = result.filter(v => v.type === this.vehiclesTypeFilter);
    if (this.vehiclesStatusFilter !== 'all') result = result.filter(v => v.status === this.vehiclesStatusFilter);
    this.filteredVehicles = result;
  }

  getVehicleTypeText(type: string): string {
    const map: Record<string, string> = { tricycle: 'Tricycle', camion: 'Camion', moto: 'Moto', pickup: 'Pickup' };
    return map[type] || type;
  }

  getVehicleStatusText(status: string): string {
    const map: Record<string, string> = { disponible: 'Disponible', en_service: 'En service', maintenance: 'Maintenance', hors_service: 'Hors service' };
    return map[status] || status;
  }

  getVehicleStatusClass(status: string): string {
    const map: Record<string, string> = { disponible: 'vstatus-disponible', en_service: 'vstatus-en-service', maintenance: 'vstatus-maintenance', hors_service: 'vstatus-hors-service' };
    return map[status] || '';
  }

  getVehicleTypeIcon(type: string): string {
    const map: Record<string, string> = { tricycle: 'electric_rickshaw', camion: 'local_shipping', moto: 'two_wheeler', pickup: 'airport_shuttle' };
    return map[type] || 'directions_car';
  }

  countVehiclesByStatus(status: string): number {
    return this.vehicles.filter(v => v.status === status).length;
  }

  // Error handling
  formErrors: { [key: string]: string } = {};

  constructor(
    private authService: AuthService,
    private agencyService: AgencyService,
    private collectionService: CollectionService,
    private notificationService: NotificationService,
    private clientService: ClientService,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,
    private sharedService: SharedService,
    private adminService: Admin,
    private route: ActivatedRoute,
    private router: Router,
    private countriesOrgMockService: CountriesOrgMockService,
    private vehicleService: VehicleService,
    private websocketService: Webstockets,
    private conversationService: ConversationService,
    private contratService: ContratService,
    private redevanceService: RedevanceService,
    private demandeCollecteService: DemandeCollecteService,
  ) {
    const today = new Date();
    this.minDate = today.toISOString().split("T")[0];

    this.initializeForms();
  }
  navigateToAgencyDetails() {
    this.router.navigate(["/agencies", this.currentUser?.agencyId]);
  }
  // Initialisation de tous les formulaires réactifs
  private initializeForms(): void {
    // Formulaire d'employé - selon le schéma Swagger requis
    this.employeeForm = this.fb.group(
      {
        firstName: ["", [Validators.required, Validators.minLength(2)]],
        lastName: ["", [Validators.required, Validators.minLength(2)]],
        // Optionnel côté backend (services/auth.js::registerUser accepte email
        // undefined, connexion possible par téléphone seul) — l'astérisque
        // required était une contrainte frontend uniquement, sans contrepartie.
        email: ["", [Validators.email]],
        password: ["", [Validators.required, Validators.minLength(6)]],
        confirmPassword: ["", [Validators.required]],
        phone: ["", [Validators.required, Validators.pattern(/^[0-9+\-\s]+$/)]],
        role: ["", Validators.required],
        // Address fields (requis selon le schéma)
        address: this.fb.group({
          street: [""],
          arrondissement: ["", Validators.required],
          sector: ["", Validators.required],
          doorNumber: [""],
          doorColor: [""],
          neighborhood: ["", Validators.required],
          city: ["", Validators.required],
          postalCode: [""],
          latitude: [null],
          longitude: [null],
        }),
        zones: [[]], // Validation dynamique selon le rôle
      },
      { validators: this.passwordMatchValidator },
    );

    // Formulaire de tarif
    this.tariffForm = this.fb.group({
      type: ["", Validators.required],
      price: ["", [Validators.required, Validators.min(0)]],
      description: ["", [Validators.required, Validators.minLength(10)]],
      nbPassages: ["", [Validators.required, Validators.min(1)]],
      // Chantier Frais plateforme (Prompt F4/F8) — qui supporte le frais
      // plateforme pour ce plan, par défaut 'AGENCE' (comportement historique
      // inchangé tant que non explicitement basculé).
      feePayer: ["AGENCE", Validators.required],
    });

    // Formulaire de zone
    this.zoneForm = this.fb.group({
      name: ["", [Validators.required, Validators.minLength(3)]],
      description: ["", [Validators.required, Validators.minLength(10)]],
      cities: [[], Validators.required],
      neighborhoods: [[], Validators.required],
      isActive: [true],
    });

    // Formulaire de message
    this.messageForm = this.fb.group({
      content: [
        this.messageData.content || "",
        [Validators.required, Validators.minLength(5)],
      ],
    });

    // Écouter les changements pour afficher les erreurs en temps réel
    this.setupFormErrorHandling();
  }

  // Configuration de la gestion des erreurs pour tous les formulaires
  private setupFormErrorHandling(): void {
    const forms = [
      { form: this.employeeForm, name: "employee" },
      { form: this.tariffForm, name: "tariff" },
      { form: this.zoneForm, name: "zone" },
      { form: this.messageForm, name: "message" },
    ];

    forms.forEach(({ form, name }) => {
      form.valueChanges.subscribe(() => {
        this.updateFormErrors(form, name);
      });
    });
  }

  // Mise à jour des erreurs pour un formulaire donné
  private updateFormErrors(form: FormGroup, formName: string): void {
    // Ne pas traiter les erreurs si le formulaire est dans son état initial
    if (this.isFormInInitialState(form)) {
      return;
    }

    Object.keys(form.controls).forEach((key) => {
      const control = form.get(key);
      const errorKey = `${formName}_${key}`;

      // Traiter aussi les FormGroups imbriqués (comme address)
      if (control instanceof FormGroup) {
        Object.keys(control.controls).forEach((nestedKey) => {
          const nestedControl = control.get(nestedKey);
          const nestedErrorKey = `${formName}_${nestedKey}`;

          if (
            nestedControl &&
            nestedControl.errors &&
            (nestedControl.dirty || nestedControl.touched)
          ) {
            this.formErrors[nestedErrorKey] = this.getErrorMessage(
              nestedKey,
              nestedControl.errors,
            );
          } else {
            delete this.formErrors[nestedErrorKey];
          }
        });
      } else if (
        control &&
        control.errors &&
        (control.dirty || control.touched)
      ) {
        this.formErrors[errorKey] = this.getErrorMessage(key, control.errors);
      } else {
        delete this.formErrors[errorKey];
      }
    });
  }

  // Génération des messages d'erreur personnalisés
  private getErrorMessage(fieldName: string, errors: any): string {
    const fieldDisplayNames: { [key: string]: string } = {
      firstName: "Prénom",
      lastName: "Nom",
      email: "Email",
      phone: "Téléphone",
      role: "Rôle",
      zones: "Zones",
      type: "Type",
      price: "Prix",
      description: "Description",
      nbPassages: "Nombre de passages",
      name: "Nom",
      cities: "Villes",
      neighborhoods: "Quartiers",
      content: "Contenu",
      zone: "Zone",
      date: "Date",
      startTime: "Heure de début",
      endTime: "Heure de fin",
      collectorId: "Collecteur",
    };

    const displayName = fieldDisplayNames[fieldName] || fieldName;

    if (errors["required"]) {
      return `${displayName} est requis`;
    }
    if (errors["email"]) {
      return "Format d'email invalide";
    }
    if (errors["minlength"]) {
      return `${displayName} doit contenir au moins ${errors["minlength"].requiredLength} caractères`;
    }
    if (errors["min"]) {
      return `${displayName} doit être supérieur ou égal à ${errors["min"].min}`;
    }
    if (errors["pattern"]) {
      return `${displayName} contient des caractères invalides`;
    }
    if (errors["invalidTimeOrder"]) {
      return "L'heure de fin doit être postérieure à l'heure de début";
    }

    return `${displayName} est invalide`;
  }

  // Méthode pour obtenir l'erreur d'un champ spécifique
  getFieldError(formName: string, fieldName: string): string {
    // Ne montrer l'erreur que si le champ a été touché ou modifié
    const form = this.getFormByName(formName);
    const control = form?.get(fieldName);

    if (!control || !(control.touched || control.dirty)) {
      return "";
    }

    // Vérifier que le formulaire n'est pas dans son état initial
    if (this.isFormInInitialState(form)) {
      return "";
    }

    return this.formErrors[`${formName}_${fieldName}`] || "";
  }

  // Méthode pour vérifier si un champ a une erreur
  hasFieldError(formName: string, fieldName: string): boolean {
    // Ne montrer l'erreur que si le champ a été touché ou modifié
    const form = this.getFormByName(formName);
    const control = form?.get(fieldName);

    if (!control || !(control.touched || control.dirty)) {
      return false;
    }

    // Vérifier aussi que le formulaire n'est pas dans un état initial
    if (this.isFormInInitialState(form)) {
      return false;
    }

    const hasError = !!this.formErrors[`${formName}_${fieldName}`];

    // Debug : Log pour voir quand les erreurs sont détectées
    if (hasError && formName === "employee") {
      console.log(`Erreur détectée pour ${fieldName}:`, {
        touched: control.touched,
        dirty: control.dirty,
        errors: control.errors,
        formError: this.formErrors[`${formName}_${fieldName}`],
        isInitialState: this.isFormInInitialState(form),
      });
    }

    return hasError;
  }

  // Méthode spéciale pour vérifier les erreurs de validation croisée (comme passwordMismatch)
  hasValidationError(
    formName: string,
    fieldName: string,
    errorType: string,
  ): boolean {
    const form = this.getFormByName(formName);
    const control = form?.get(fieldName);

    if (!control || !(control.touched || control.dirty)) {
      return false;
    }

    // Vérifier que le formulaire n'est pas dans son état initial
    if (this.isFormInInitialState(form)) {
      return false;
    }

    return control.hasError(errorType);
  }

  // Méthode pour vérifier si le formulaire est dans son état initial
  private isFormInInitialState(form: FormGroup | null): boolean {
    if (!form) return true;

    // Si aucun contrôle n'a été touché, le formulaire est dans son état initial
    const allControls = this.getAllFormControls(form);
    const hasAnyInteraction = allControls.some(
      (control) => control.touched || control.dirty,
    );

    // Également vérifier si le modal vient d'être ouvert
    const isModalJustOpened = this.showAddEmployeeModal && !hasAnyInteraction;

    return !hasAnyInteraction || isModalJustOpened;
  }

  // Méthode récursive pour obtenir tous les contrôles d'un formulaire
  private getAllFormControls(form: FormGroup): any[] {
    const controls: any[] = [];

    Object.keys(form.controls).forEach((key) => {
      const control = form.get(key);
      if (control instanceof FormGroup) {
        controls.push(...this.getAllFormControls(control));
      } else {
        controls.push(control);
      }
    });

    return controls;
  }

  // Méthode utilitaire pour obtenir le FormGroup par nom
  private getFormByName(formName: string): FormGroup | null {
    switch (formName) {
      case "employee":
        return this.employeeForm;
      case "tariff":
        return this.tariffForm;
      case "zone":
        return this.zoneForm;
      case "message":
        return this.messageForm;
      default:
        return null;
    }
  }

  // Méthodes pour gérer les modals
  openAddEmployeeModal(): void {
    // S'assurer qu'on n'est pas en mode modification
    this.isEditingEmployee = false;
    this.employeeToEdit = null;

    // Ajuster les validateurs pour le mode ajout
    this.adjustValidatorsForEdit();

    // Réinitialiser complètement le formulaire
    this.employeeForm.reset();

    // Marquer tous les contrôles comme non touchés et propres (incluant les contrôles imbriqués)
    this.markFormGroupAsUntouchedAndPristine(this.employeeForm);

    // Réinitialiser les erreurs
    this.employeeFormError = null;
    this.employeeFormDetailedErrors = {};

    // Nettoyer TOUTES les erreurs du formulaire employé du cache
    Object.keys(this.formErrors).forEach((key) => {
      if (key.startsWith("employee_")) {
        delete this.formErrors[key];
      }
    });

    // Réinitialiser les états des mots de passe
    this.showPassword = false;
    this.showConfirmPassword = false;

    // Initialiser les données mock pour l'adresse
    this.initializeAddressDataForEmployee();

    // Ouvrir le modal
    this.showAddEmployeeModal = true;

    // Petite temporisation pour s'assurer que l'état est bien réinitialisé
    setTimeout(() => {
      this.markFormGroupAsUntouchedAndPristine(this.employeeForm);
      // Force la suppression des erreurs après l'ouverture
      Object.keys(this.formErrors).forEach((key) => {
        if (key.startsWith("employee_")) {
          delete this.formErrors[key];
        }
      });
    }, 50);
  }

  // Méthode pour ouvrir le drawer (utilisée par editEmployee)
  private openEmployeeDrawer(): void {
    this.showAddEmployeeModal = true;
  }

  // Méthode utilitaire pour marquer un FormGroup et tous ses contrôles comme non touchés et propres
  private markFormGroupAsUntouchedAndPristine(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      if (control) {
        if (control instanceof FormGroup) {
          // Si c'est un groupe imbriqué (comme address), traiter récursivement
          this.markFormGroupAsUntouchedAndPristine(control);
        } else {
          // Marquer le contrôle comme non touché et propre
          control.markAsUntouched();
          control.markAsPristine();
          control.updateValueAndValidity({ emitEvent: false });
        }
      }
    });

    // Marquer le formulaire lui-même
    formGroup.markAsUntouched();
    formGroup.markAsPristine();
  }

  closeAddEmployeeModal(): void {
    // Fermer le modal
    this.showAddEmployeeModal = false;

    // Réinitialiser le formulaire
    this.employeeForm.reset();
    this.markFormGroupAsUntouchedAndPristine(this.employeeForm);

    // Réinitialiser les états
    this.showPassword = false;
    this.showConfirmPassword = false;
    this.employeeFormError = null;
    this.employeeFormDetailedErrors = {};

    // Réinitialiser l'état d'édition
    this.isEditingEmployee = false;
    this.employeeToEdit = null;

    // Nettoyer les erreurs du cache
    Object.keys(this.formErrors).forEach((key) => {
      if (key.startsWith("employee_")) {
        delete this.formErrors[key];
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  // Validateur personnalisé pour la correspondance des mots de passe
  passwordMatchValidator(form: FormGroup) {
    const password = form.get("password");
    const confirmPassword = form.get("confirmPassword");

    if (
      password &&
      confirmPassword &&
      password.value !== confirmPassword.value
    ) {
      confirmPassword.setErrors({ passwordMismatch: true });
    } else if (confirmPassword?.hasError("passwordMismatch")) {
      confirmPassword.setErrors(null);
    }

    return null;
  }

  // Gérer la validation des zones en fonction du rôle
  onRoleChange(): void {
    const zonesControl = this.employeeForm.get("zones");

    if (zonesControl) {
      // Les zones sont toujours optionnelles, pour tous les rôles — un
      // manager peut désormais se voir assigner des zones au même titre
      // qu'un collecteur (auparavant vidées de force dès que le rôle
      // sélectionné était 'manager', empêchant toute assignation réelle).
      zonesControl.clearValidators();
      zonesControl.updateValueAndValidity();
    }
  }

  // Vérifier si le formulaire employé est valide
  isEmployeeFormValid(): boolean {
    // Vérifier les champs de base
    const baseFieldsValid =
      this.employeeForm.get("firstName")?.valid &&
      this.employeeForm.get("lastName")?.valid &&
      this.employeeForm.get("email")?.valid &&
      this.employeeForm.get("phone")?.valid &&
      this.employeeForm.get("role")?.valid;

    if (!baseFieldsValid) {
      return false;
    }

    // En mode modification, les mots de passe sont optionnels
    if (this.isEditingEmployee) {
      // Si un mot de passe est saisi, il doit être valide
      const password = this.employeeForm.get("password")?.value;
      const confirmPassword = this.employeeForm.get("confirmPassword")?.value;

      if (password && password.length > 0) {
        // Si un mot de passe est saisi, vérifier qu'il est valide
        if (password.length < 6) {
          return false;
        }
        // Et que la confirmation correspond
        if (password !== confirmPassword) {
          return false;
        }
      }

      return true; // Valide en mode modification si champs de base OK
    } else {
      // En mode ajout, tout doit être valide y compris les mots de passe
      return this.employeeForm.valid;
    }
  }

  // Vérifier si un champ a une erreur spécifique du backend
  hasBackendFieldError(fieldName: string): boolean {
    return (
      this.employeeFormDetailedErrors &&
      this.employeeFormDetailedErrors[fieldName]
    );
  }

  // Obtenir l'erreur backend pour un champ spécifique
  getBackendFieldError(fieldName: string): string {
    return this.employeeFormDetailedErrors?.[fieldName] || "";
  }

  // Effacer les erreurs backend quand l'utilisateur modifie un champ
  clearBackendErrors(): void {
    this.employeeFormError = null;
    this.employeeFormDetailedErrors = {};
  }

  // Helper pour obtenir les clés des erreurs détaillées
  getDetailedErrorKeys(): string[] {
    return this.employeeFormDetailedErrors
      ? Object.keys(this.employeeFormDetailedErrors)
      : [];
  }

  // Vérifier s'il y a des erreurs détaillées
  hasDetailedErrors(): boolean {
    return this.getDetailedErrorKeys().length > 0;
  }

  openZoneModal(): void {
    this.zoneForm.reset();
    this.editingZone = false;

    // Réinitialiser aussi le mode édition des tarifs quand on ouvre le modal pour créer
    this.isEditingTariff = false;
    this.tariffToUpdate = null;
    this.tariffForm.reset();

    this.showZoneModal = true;
  }

  closeZoneModal(): void {
    this.showZoneModal = false;
    this.zoneForm.reset();
    this.editingZone = false;

    // Réinitialiser aussi le mode édition des tarifs
    this.isEditingTariff = false;
    this.tariffToUpdate = null;
    this.tariffForm.reset();

    // Effacer les erreurs des formulaires
    Object.keys(this.formErrors).forEach((key) => {
      if (key.startsWith("zone_") || key.startsWith("tariff_")) {
        delete this.formErrors[key];
      }
    });
  }

  // Méthode pour recharger les zones manuellement
  reloadZones(): void {
    this.zones = []; // Vider les zones pour forcer le rechargement
    this.loadZones(this.currentUser);
  }

  // Méthode pour gérer la sélection multiple des zones pour les employés
  toggleZoneSelection(zoneId: string, event: any): void {
    const zonesControl = this.employeeForm.get("zones");
    if (!zonesControl) return;

    let currentZones = zonesControl.value || [];

    if (event.target.checked) {
      if (!currentZones.includes(zoneId)) {
        currentZones.push(zoneId);
      }
    } else {
      currentZones = currentZones.filter((id: string) => id !== zoneId);
    }

    zonesControl.setValue(currentZones);
    zonesControl.markAsTouched();
  }

  // Méthode pour vérifier si une zone est sélectionnée
  isZoneSelected(zoneId: string): boolean {
    const zones = this.employeeForm.get("zones")?.value || [];
    return zones.includes(zoneId);
  }

  // Méthode utilitaire pour afficher les zones sélectionnées
  getSelectedZonesText(): string {
    const zones = this.employeeForm.get("zones")?.value || [];
    if (zones.length === 0) return "Aucune zone sélectionnée";
    if (zones.length === 1) return "1 zone sélectionnée";
    return `${zones.length} zones sélectionnées`;
  }

  private newSignalementSub?: Subscription;
  private incomingMessageSub?: Subscription;

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    console.log(" [DEBUG] ngOnInit - currentUser:", this.currentUser);

    // Prompt 06 point 4 : l'arrivée d'un signalement (lié à une collecte OU
    // indépendant) doit rafraîchir la liste en direct, sans recharger la page.
    // Le backend notifie déjà le manager via le même canal `newNotification`
    // que pour le planning (voir signalement.service.js::dispatchSignalementEvent
    // côté backend) — pas besoin d'un événement socket séparé, seulement de
    // réagir à `type === 'Signalement'` ici et de recharger `agencyReports`.
    this.newSignalementSub = this.websocketService.onNewNotification().subscribe((notification: SocketNotification) => {
      if (notification?.type === 'Signalement') {
        this.loadAgencyReports(this.currentUser);
        // Les statistiques (badge "en attente", compteurs du dashboard) doivent
        // se rafraîchir en même temps que la liste — sinon elles restent figées
        // sur leur dernière valeur chargée alors que la liste, elle, est à jour.
        this.loadAgencyStatistics(this.currentUser);
      }
      // Phase 5 : les notifications Abonnement passent désormais par
      // `notifyUsers` (Phase 3, backend) — donc par ce même canal socket, en
      // plus du chargement initial. Le tableau "Clients" affiche l'historique
      // d'abonnement par client (`filterClients()` ci-dessous) — un abonnement
      // créé OU expiré automatiquement (scheduler minuit) doit s'y refléter
      // sans re-chargement manuel de page. `filterClients()` s'auto-garde déjà
      // (`if (!this.agency?.agencyId) return;`), sûr à appeler ici sans condition.
      if (notification?.type === 'Subscribed') {
        this.filterClients();
      }
      // Phase 6, CONCEPTION_ABONNEMENT_CONTRAT.md §6.4 : même principe que
      // 'Signalement'/'Subscribed' ci-dessus — un contrat créé/résilié (par
      // l'agence elle-même ou automatiquement par le scheduler, Phase 4)
      // rafraîchit l'onglet "Contrats" en direct.
      if (notification?.type === 'Contrat') {
        this.loadContrats();
      }
      // Nouvelle demande de collecte express (services/demandeCollecte.js::
      // createDemandeCollecte, notifyUsers réutilisé — même canal que
      // Signalement/Subscribed/Contrat ci-dessus, pas de canal socket dédié).
      if (notification?.type === 'Planning' && this.activeTab === 'demandes') {
        this.loadDemandesCollecte();
      }
      // Auto-refresh du KPI "Nombre de collectes" (Priorité Basse) — le même
      // événement 'Planning' est aussi émis par services/qrValidation.js (scan
      // d'une collecte) et demandeCollecte.js (création/acceptation/refus) :
      // aucun nouveau canal socket, aucun polling — on recharge juste les
      // statistiques déjà affichées, avec les filtres période/zone/type en cours.
      if (notification?.type === 'Planning') {
        this.loadAgencyStatistics(this.currentUser);
      }
    });

    // Messagerie temps réel : le backend émet `messageSent` vers l'expéditeur
    // ET le destinataire (message.controller.js::sendMessage) — jusqu'ici ce
    // canal n'était jamais écouté ici, donc un message client entrant
    // n'apparaissait qu'après un rechargement manuel de page. On met à jour
    // la conversation ouverte directement (pas de re-fetch HTTP complet), et
    // on rafraîchit la liste des conversations/le badge non-lus dans tous les cas.
    this.incomingMessageSub = this.conversationService.onIncomingMessage$().subscribe((message: RealtimeMessage) => {
      this.appendIncomingMessage(message);
      this.userMessages();
      this.countUnreadMessages();
    });

    // Initialiser la liste filtrée des employés
    this.filteredEmployees = [...this.allEmployees];
    console.log(
      "🔍 [DEBUG] ngOnInit - filteredEmployees initialisés:",
      this.filteredEmployees.length,
    );

    // Initialiser les listes de villes et quartiers
    this.initializeCitiesAndNeighborhoods();
    this.initializeFiltersData();

    console.log("this.currentUser", this.currentUser);
    this.loadAgencyStatistics(this.currentUser);
    this.loadAgencyData();
    console.log(" APPEL EXPLICITE de loadEmployees depuis ngOnInit");
    if (this.currentUser?.agencyId) {
      this.loadEmployees(this.currentUser.agencyId);
    }
    console.log(" APPEL EXPLICITE de loadCollectors depuis ngOnInit");
    if (this.currentUser?.agencyId) {
      this.loadCollectors(this.currentUser.agencyId);
      this.loadCollectDay();
    }
    // this.loadZonesForAgency(this.currentUser);
    this.loadAgencyReports(this.currentUser);
    this.loadAgencyRatings();
    this.loadDemandesCollecte();
    this.loadVehicles();
    this.loadTariffs();
    this.loadContrats();
    this.loadPlannings();
    // this.loadCollectorPlannings();
    // this.cdr.detectChanges();
    this.loadZones(this.currentUser);
    // this.loadCollectDay();
    this.getAllCountries();

    // setInterval(() => {
    //   this.loadCollectDay();
    // }, 30000);
    this.loadCollectHistory();
    // this.filterIncidents();
    this.countUnreadMessages();
    this.userMessages();

    this.route.fragment.subscribe((fragment) => {
      if (fragment) {
        const element = document.getElementById(fragment);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }
    });

    // Écouter les queryParams
    this.route.queryParams.subscribe((params) => {
      if (params["tab"]) {
        const tabExists = this.tabs.some(t => t.id === params["tab"]);
        if (tabExists) this.setActiveTab(params["tab"] as TabId);
      }
      if (params["source"] === "notification") {
        this.handleNotificationParams(params);
      }
    });
  }
  private handleNotificationParams(params: any) {
    if (params["id"]) {
    }
  }

  ngOnDestroy(): void {
    this.newSignalementSub?.unsubscribe();
    this.incomingMessageSub?.unsubscribe();
  }
  /**Gestion des messages recus par le client connecté */
  countUnreadMessages() {
    this.conversationService
      .getUnreadCount$(this.currentUser?.agencyId || "")
      .subscribe({
        next: (count: number) => {
          this.unreadMessageCount = count;
        },
        error: (error: any) => {
          console.error("API > getUserUnreadMessagesCount:", error);
        },
      });
  }

  userMessages() {
    this.isLoadingMessages = true;
    this.conversationService
      .getConversationsList$(this.currentUser?.agencyId || "")
      .subscribe({
        next: (response: any) => {
          if (response) {
            this.connectedUserMessages = response || [];
          }
          this.isLoadingMessages = false;
        },
        error: (error: any) => {
          console.error("API > getMessagesForUser:", error);
          this.isLoadingMessages = false;
        },
      });
  }

  userAndAgencyConversation(client: any) {
    this.data = client;
    this.displayAgencyName = client.firstName + " " + client.lastName;
    const clientId = client?._id || "";
    this.conversationService
      .openConversation$(this.currentUser?.agencyId || "", clientId)
      .subscribe((messages: any) => {
        if (messages) {
          this.receivedMessages = messages;
          this.countUnreadMessages();
          this.scrollToBottom();

          if (!clientId) {
            this.receivedId = this.currentUser?.agencyId || "";
          } else {
            this.receivedId = clientId;
          }
          this.receivedMessages.forEach((message: any) => {
            if (message.receiver === this.currentUser?.agencyId) {
              this.readAndRespondMessage(message);
            }
            message.read = message.read.toString();
          });
        } else {
          this.receivedMessages = [];
          this.notificationService.showError(
            "Erreur",
            "Aucun message, veuillez contacter l'agence !",
          );
        }
      });
  }
  readAndRespondMessage(message: Message): void {
    this.conversationService.markAsRead$(message._id || "").subscribe({
      next: () => {
        this.receivedId = message.sender;
      },
      error: (error: any) => {
        console.error("Erreur lors de la lecture du message:", error);
      },
    });
  }

  /** Ajoute un message (envoyé ou reçu en temps réel) à la conversation actuellement affichée, sans re-fetch HTTP complet. */
  private appendIncomingMessage(message: any): void {
    const selfId = this.currentUser?.agencyId;
    const partnerId = this.data?._id;
    const concernsOpenConversation =
      !!partnerId &&
      ((message.sender === selfId && message.receiver === partnerId) ||
        (message.receiver === selfId && message.sender === partnerId));
    if (!concernsOpenConversation) return;
    // Évite un doublon si le message est déjà présent (ex: écho socket du
    // message qu'on vient nous-même d'envoyer et déjà ajouté localement).
    if ((this.receivedMessages || []).some((m: any) => m._id === message._id)) return;
    const normalized = { ...message, read: (message.read ?? false).toString() };
    this.receivedMessages = [...(this.receivedMessages || []), normalized];
    this.scrollToBottom();
    if (message.receiver === selfId) {
      this.readAndRespondMessage(message);
    }
  }

  submitMessage() {
    if (!this.messageData.content) {
      this.notificationService.showError(
        "Message invalide",
        "Veuillez saisir un message valide",
      );
      return;
    }

    if (!this.currentUser) {
      this.notificationService.showError(
        "Connexion requise",
        "Vous devez être connecté pour envoyer un message",
      );
      return;
    }
    if (!this.receivedId) {
      this.notificationService.showError("Erreur", "Agence non trouvée");
      return;
    }

    const messageData = {
      sender: this.currentUser?.agencyId || "",
      receiver: this.receivedId || "",
      content: this.messageData.content.trim(),
    };

    this.conversationService.sendMessage$(messageData).subscribe({
      next: (sent: any) => {
        // Ajout local du message envoyé (retourné par le POST) — remplace
        // l'ancien re-fetch complet de la conversation ; la vue du client,
        // elle, se met à jour via onIncomingMessage$ (temps réel).
        this.appendIncomingMessage(sent);
        this.notificationService.showSuccess(
          "Message envoyé",
          "Votre message a bien été envoyé",
        );
        this.messageData.content = "";
      },
      error: (error: any) => {
        console.error("API > sendMessage:", error);
        this.notificationService.showError(
          "Message non envoyé",
          "Une erreur s'est produite lors de l'envoi du message",
        );
      },
    });
  }

  /**Gestion des messages recus par le client connecté fin */

  /**
   * Remplace l'ancien flux "Assigner" par employé (Prompt 06) : `openAssignModal` +
   * `showAssignModal` + `selectedEmployee` ouvraient un modal local dont le bouton de
   * confirmation appelait `assignReport()` (plus bas) — celui-ci appelait
   * `assignReportToEmployee$()`, qui tapait `PUT /reports/:id/assign`, une route
   * confirmée inexistante dans tout le backend (grep exhaustif de routes/*.js). De plus
   * `selectedReportId` n'était jamais renseigné par `openAssignModal` (qui ne posait que
   * `selectedReport`), donc l'appel échouait systématiquement dès le contrôle "au moins
   * un employé sélectionné" — cette action n'a jamais fonctionné, même avant ce
   * correctif. Le vrai contrat backend est de toute façon team-based
   * (`Collecte.assignedTeamId`), pas employee-based : le picker d'équipe vit maintenant
   * dans le composant partagé <app-signalement> (signalement.ts), qui émet directement
   * `{ incidentId, teamId }` une fois l'équipe choisie.
   */
  onAssignReportToTeam(payload: { incidentId: string; teamId: string }): void {
    // Prompt 06 : `agencyReports` vient désormais de `/api/signalements` — chaque
    // `incidentId` est un vrai `Signalement._id`, jamais un `Collecte._id`. Un
    // signalement indépendant n'a pas de collecte à cibler ; l'ancienne route
    // `/collectes/:collecteId/assign-team` (assignReportToTeam$) ne peut donc
    // structurellement plus être utilisée ici.
    this.agencyService.assignSignalementToTeam$(payload.incidentId, payload.teamId).subscribe({
      next: () => {
        this.notificationService.showSuccess("Succès", "Signalement affecté à l'équipe avec succès.");
        this.loadAgencyReports(this.currentUser);
        this.loadAgencyStatistics(this.currentUser);
      },
      error: (err) => {
        console.error("Erreur assignation :", err);
        const message = err?.error?.message || "Échec de l'affectation.";
        this.notificationService.showError("Erreur", message);
      },
    });
  }

  loadAgencyData(): void {
    console.log("DÉBUT loadAgencyData - Chargement des données agence");
    // Charger les données de l'agence
    // Simule une agence si null pour debug
    if (this.currentUser) {
      // this.agency = { _id: 'agency1', agencyName: 'Agence Demo' } as any;
      this.agency = this.currentUser as any;
      console.log("[loadAgencyData] agency simulée:", this.agency);
      console.log(
        " Appel de loadEmployees avec agencyId:",
        this.currentUser.agencyId,
      );
      if (this.currentUser.agencyId) {
        this.loadEmployees(this.currentUser.agencyId);
      }
    }
    this.loadCollections();
    // this.loadServiceZones();
    // this.loadSchedules();
    console.log("[loadAgencyData] agency avant loadClients:", this.agency);
    this.loadClients();
    this.loadReports();
    //this.activeClientNbrs = this.activeClientNbr(); // Mettez à jour le nombre d'actifs
    //this.updateTabs(); // Mettez à jour les tabs après avoir récupéré les clients
    console.log(" FIN loadAgencyData");
  }
  loadCollectors(agencyId: string): void {
    console.log(" DÉBUT loadCollectors - Chargement des collecteurs");
    console.log(" AgencyId reçu:", agencyId);

    if (agencyId) {
      this.isLoadingEmployees = true;
      console.log(
        " Appel du service getCollectorsAgency$ avec agencyId:",
        agencyId,
      );

      this.agencyService.getCollectorsAgency$(agencyId).subscribe({
        next: (collectors) => {
          console.log("SUCCÈS - Réponse collecteurs reçue:", collectors);

          // Extraire les collecteurs depuis la nouvelle structure de l'API
          if ((collectors as any)?.data) {
            const data = (collectors as any).data;
            // Prendre seulement les collectors de la réponse
            this.collectors = (data || []).map((c: any) => ({
              ...c,
              name: c.firstName + ' ' + c.lastName
            }));
            console.log(" Collecteurs extraits:", this.collectors);
            console.log("   - Nombre de collecteurs:", this.collectors.length);
          } else if (Array.isArray(collectors)) {
            this.collectors = collectors.map((c: any) => ({
              ...c,
              name: c.firstName + ' ' + c.lastName
            }));
            console.log(" Collecteurs reçus directement:", this.collectors);
          } else {
            console.warn(
              "Format de réponse collecteurs inattendu:",
              collectors,
            );
            this.collectors = [];
          }

          console.log(
            "Collecteurs chargés via l'API service:",
            this.collectors,
          );

          // Mettre à jour le badge des collecteurs
          const collectorsTab = this.tabs.find((tab) => tab.id === "employees");
          if (collectorsTab) {
            collectorsTab.badge = this.collectors.length;

            this.cdr.detectChanges();
          }

          // Log chaque collecteur individuellement
          this.collectors.forEach((collector, index) => {
            console.log(` Collecteur ${index + 1}:`, {
              nom: `${collector.firstName} ${collector.lastName}`,
              role: collector.role,
              email: collector.email,
              données: collector,
            });
          });

          this.isLoadingEmployees = false;
          console.log(" FIN loadCollectors - Succès");
        },
        error: (error) => {
          console.error("Erreur lors du chargement des collecteurs:", error);
          this.isLoadingEmployees = false;
          console.log("FIN loadCollectors - Échec");
        },
      });
    } else {
      console.log(" agencyId reçu:", agencyId);
    }
  }

  deleteEmployee(currentUser: any, employeeId: any): void {
    this.isDeleting = true;

    // Logs pour debugger la structure des données
    console.log(
      "[DEBUG] Structure complète de l'employé à supprimer:",
      employeeId,
    );
    console.log("[DEBUG] Type de l'employé:", typeof employeeId);
    console.log("[DEBUG] Clés de l'objet employé:", Object.keys(employeeId));
    console.log("[DEBUG] CurrentUser:", currentUser);

    // Identifier l'ID de l'employé selon la structure des données
    let employeeIdToDelete = null;

    // Essayer différentes structures possibles
    if (employeeId?._id) {
      employeeIdToDelete = employeeId._id;
      console.log("[DEBUG] Utilisation de employeeId._id:", employeeIdToDelete);
    } else if (employeeId?.userId?._id) {
      employeeIdToDelete = employeeId.userId._id;
      console.log(
        "[DEBUG] Utilisation de employeeId.userId._id:",
        employeeIdToDelete,
      );
    } else if (employeeId?.id) {
      employeeIdToDelete = employeeId.id;
      console.log("[DEBUG] Utilisation de employeeId.id:", employeeIdToDelete);
    } else if (typeof employeeId === "string") {
      employeeIdToDelete = employeeId;
      console.log(
        "[DEBUG] employeeId est déjà une string:",
        employeeIdToDelete,
      );
    }

    // Vérification des IDs nécessaires
    if (!currentUser?._id || !employeeIdToDelete) {
      this.notificationService.showError(
        "Erreur",
        "Impossible d'identifier l'employé à supprimer",
      );
      console.error(
        "[DEBUG] Échec validation - currentUser._id:",
        currentUser?._id,
        "employeeIdToDelete:",
        employeeIdToDelete,
      );
      this.isDeleting = false;
      return;
    }

    // Demander confirmation avec votre système de notification personnalisé
    this.showDeleteConfirmationDialog(
      employeeIdToDelete,
      currentUser,
      employeeId,
    );
  }

  /**
   * Affiche la confirmation de suppression
   */
  showDeleteConfirmationDialog(
    employeeIdToDelete: string,
    currentUser: any,
    employeeData: any,
  ): void {
    const employeeName =
      `${employeeData.firstName || employeeData.firstname || ""} ${employeeData.lastName || employeeData.lastname || ""}`.trim();
    const displayName = employeeName || "cet employé";

    // Stocker les données pour la suppression
    this.employeeToDelete = {
      id: employeeIdToDelete,
      data: employeeData,
      displayName: displayName,
    };
    this.currentUserForDeletion = currentUser;
    this.showDeleteConfirmation = true;
    this.isDeleting = false; // Reset l'état de suppression

    // Afficher un message d'information
    this.notificationService.showInfo(
      "Confirmation requise",
      `Confirmez la suppression de ${displayName}`,
    );
  }

  /**
   * Confirme et procède à la suppression
   */
  confirmDeleteEmployee(): void {
    if (!this.employeeToDelete || !this.currentUserForDeletion) {
      this.notificationService.showError(
        "Erreur",
        "Données de suppression manquantes",
      );
      return;
    }

    this.showDeleteConfirmation = false;
    this.isDeleting = true;
    this.proceedWithDeletion(
      this.employeeToDelete.id,
      this.currentUserForDeletion,
    );
  }

  /**
   * Annule la suppression
   */
  cancelDeleteEmployee(): void {
    this.showDeleteConfirmation = false;
    this.employeeToDelete = null;
    this.currentUserForDeletion = null;
    this.isDeleting = false;

    this.notificationService.showInfo("Annulé", "La suppression a été annulée");
  }

  /**
   * Procède à la suppression de l'employé
   */
  proceedWithDeletion(employeeIdToDelete: string, currentUser: any): void {
    console.log(
      "[DEBUG] Suppression de l'employé avec ID:",
      employeeIdToDelete,
    );

    this.agencyService.deleteEmployee(employeeIdToDelete).subscribe({
      next: (response) => {
        console.log("[DEBUG] Réponse suppression:", response);
        this.isDeleting = false;

        if (response.success) {
          this.notificationService.showSuccess(
            "Succès",
            response.message || "L'employé a été supprimé avec succès.",
          );

          // Recharger la liste des employés pour refléter la suppression
          if (currentUser?.agencyId) {
            this.loadEmployees(currentUser.agencyId);
            // Recharger les collecteurs car un collecteur peut avoir été supprimé
            this.loadCollectors(currentUser.agencyId);
          }
        } else {
          // Gérer les erreurs de response
          const errorMessage =
            typeof response.error === "string"
              ? response.error
              : "Erreur lors de la suppression de l'employé";

          this.notificationService.showError("Erreur", errorMessage);
        }
      },
      error: (error) => {
        this.isDeleting = false;
        console.error("[ERROR] Erreur lors de la suppression:", error);
        this.notificationService.showError(
          "Erreur",
          "Une erreur s'est produite lors de la suppression de l'employé.",
        );
      },
    });
  }

  assignIncident(reportId: string): void {
    this.notificationService.showInfo(
      "Attribution",
      "Ouverture du formulaire d'attribution",
    );
    return;
  }

  loadCollections(): void {
    // Simuler les collectes
    this.collections = [
      {
        id: "1",
        clientId: "client1",
        agencyId: "agency1",
        collectorId: "collector1",
        scheduledDate: new Date(),
        status: CollectionStatus.IN_PROGRESS,
        address: {
          street: "Rue des Roses",
          doorNumber: "15",
          doorColor: "blue",
          neighborhood: "Centre-ville",
          city: "Oouagadougou",
          postalCode: "75001",
        },
        wasteTypes: [
          {
            id: "1",
            name: "Déchets ménagers",
            description: "",
            icon: "delete",
            color: "#4caf50",
            instructions: [],
            acceptedItems: [],
            rejectedItems: [],
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    this.filteredCollections = [...this.collections];
  }

  employeesNbrs!: number;
  activesEmployeesNbrs!: number;
  zoneLength!: number;
  getZoneLengthByEmployeeId(employeeId: string): number {
    const employee = this.allEmployees.find((emp) => emp._id === employeeId);
    this.zoneLength = employee ? employee.zones.length : 0;
    console.log("Employee found for zone length:", this.zoneLength);
    return this.zoneLength;
  }

  loadEmployees(agencyId: string): void {
    console.log(" DÉBUT loadEmployees - Chargement des employés");
    console.log(" AgencyId reçu:", agencyId);

    if (agencyId) {
      this.isLoadingEmployees = true;
      console.log(
        " Appel du service getEmployeeAgency$ avec agencyId:",
        agencyId,
      );

      this.agencyService.getEmployeeAgency$(agencyId).subscribe({
        next: (employees) => {
          console.log(" SUCCÈS - Réponse employés reçue:", employees);

          // Extraire les employés depuis la nouvelle structure de l'API
          if ((employees as any)?.data) {
            const data = (employees as any).data;
            // Combiner managers, gestionnaires et collectors
            this.allEmployees = [
              ...(data.managers || []),
              ...(data.gestionnaires || []),
              ...(data.collectors || []),
            ];
            console.log(" Employés extraits et combinés:", this.allEmployees);
            console.log("   - Managers:", data.managers?.length || 0);
            console.log("   - Gestionnaires:", data.gestionnaires?.length || 0);
            console.log("   - Collecteurs:", data.collectors?.length || 0);
          } else if (Array.isArray(employees)) {
            this.allEmployees = employees;
            console.log(" Employés reçus directement:", this.allEmployees);
          } else {
            console.warn("Format de réponse inattendu:", employees);
            this.allEmployees = [];
          }

          console.log("loadEmployees > Total final:", this.allEmployees);

          // Pagination côté client – afficher seulement la première page
          this.totalEmployees = this.allEmployees.length;
          this.currentPage = 1;
          this.totalPages = Math.ceil(this.totalEmployees / this.itemsPerPage);
          this.filteredEmployees = this.allEmployees.slice(0, this.itemsPerPage);
          console.log(
            `Employés initialisés : page 1/${this.totalPages}, ${this.filteredEmployees.length} affichés sur ${this.totalEmployees}`,
          );

          // COMMENTÉ : Utilisation immédiate de l'API backend au chargement
          // this.filterEmployees();

          const employeesTab = this.tabs.find((tab) => tab.id === "employees");
          if (employeesTab) {
            employeesTab.badge = this.allEmployees.length;
            console.log("Badge employés mis à jour:", this.allEmployees.length);
            this.cdr.detectChanges();
          }
          this.isLoadingEmployees = false;

          console.log("🔍 [DEBUG] FIN loadEmployees - État final:");
          console.log("  - allEmployees:", this.allEmployees.length);
          console.log("  - filteredEmployees:", this.filteredEmployees.length);
          console.log("  - isLoadingEmployees:", this.isLoadingEmployees);
          console.log("FIN loadEmployees - Succès");
        },
        error: (error) => {
          console.log(" ERREUR lors du chargement des employés:");
          console.error(" Détails de l'erreur:", error);
          console.error(
            " URL utilisée: /api/agencies/" + agencyId + "/employees",
          );
          console.error("Erreur lors du chargement des employés :", error);
          this.notificationService.showError(
            "Erreur",
            "Impossible de charger les employés. Veuillez réessayer.",
          );
          this.isLoadingEmployees = false;
          console.log(" FIN loadEmployees - Échec");
        },
      });
    } else {
      console.warn(" Aucun ID d'agence disponible.");
      console.log(" agencyId reçu:", agencyId);
    }
  }

  /**
   * Filtre les employés - utilise l'API backend seulement si des filtres sont appliqués
   */
  filterEmployees(): void {
    // Détecter si des filtres sont réellement appliqués
    const hasRealFilters =
      (this.employeesSearch && this.employeesSearch.trim()) ||
      (this.employeesCityFilter &&
        this.employeesCityFilter !== "all" &&
        this.employeesCityFilter.trim()) ||
      (this.employeesNeighborhoodFilter &&
        this.employeesNeighborhoodFilter !== "all" &&
        this.employeesNeighborhoodFilter.trim()) ||
      (this.employeesArrondissementFilter &&
        this.employeesArrondissementFilter !== "all" &&
        this.employeesArrondissementFilter.trim()) ||
      (this.employeesSectorFilter !== null &&
        this.employeesSectorFilter !== undefined) ||
      (this.employeesRoleFilter && this.employeesRoleFilter !== "all");

    const agencyId = this.authService.getCurrentUser()?.agencyId;
    if (!agencyId) {
      console.warn("Aucun ID d'agence disponible pour le filtrage");
      this.filterEmployeesLocally();
      return;
    }

    // Si aucun filtre backend n'est appliqué, utiliser le filtrage local
    if (!hasRealFilters) {
      this.filterEmployeesLocally();
      return;
    }

    this.isLoadingFilteredEmployees = true;

    // Paramètres selon le Swagger exact
    const filters: any = {
      limit: this.itemsPerPage,
    };

    // Paramètres de filtrage selon le Swagger
    if (this.employeesSearch?.trim()) {
      filters.term = this.employeesSearch.trim();
    }
    if (this.employeesCityFilter?.trim()) {
      filters.city = this.employeesCityFilter.trim();
    }
    if (this.employeesNeighborhoodFilter?.trim()) {
      filters.neighborhood = this.employeesNeighborhoodFilter.trim();
    }
    if (this.employeesArrondissementFilter?.trim()) {
      filters.arrondissement = this.employeesArrondissementFilter.trim();
    }
    if (
      this.employeesSectorFilter !== null &&
      this.employeesSectorFilter !== undefined
    ) {
      filters.sector = this.employeesSectorFilter;
    }
    if (this.employeesRoleFilter && this.employeesRoleFilter !== "all") {
      filters.role = this.employeesRoleFilter;
    }

    this.agencyService.getFilteredEmployees(agencyId, filters).subscribe({
      next: (response) => {
        console.log("🔍 [DEBUG] Réponse complète de l'API:", response);

        if (response.success) {
          // La réponse API groupe les employés par rôle
          let employees: any[] = [];

          if (response.data) {
            console.log(
              "🔍 [DEBUG] Structure de response.data:",
              response.data,
            );

            // Extraire tous les employés des différents groupes de rôles
            if (
              response.data.managers &&
              Array.isArray(response.data.managers)
            ) {
              console.log(
                `🔍 [DEBUG] Managers trouvés: ${response.data.managers.length}`,
              );
              employees.push(...response.data.managers);
            }
            if (
              response.data.collectors &&
              Array.isArray(response.data.collectors)
            ) {
              console.log(
                `🔍 [DEBUG] Collectors trouvés: ${response.data.collectors.length}`,
              );
              employees.push(...response.data.collectors);
            }
            if (
              response.data.gestionnaires &&
              Array.isArray(response.data.gestionnaires)
            ) {
              console.log(
                `🔍 [DEBUG] Gestionnaires trouvés: ${response.data.gestionnaires.length}`,
              );
              employees.push(...response.data.gestionnaires);
            }
            // Ajouter d'autres rôles si nécessaire
            if (
              response.data.employees &&
              Array.isArray(response.data.employees)
            ) {
              console.log(
                `🔍 [DEBUG] Employees génériques trouvés: ${response.data.employees.length}`,
              );
              employees.push(...response.data.employees);
            }
          } else {
            console.warn("🔍 [DEBUG] Aucune donnée dans response.data");
          }

          console.log(
            `🔍 [DEBUG] Total employés extraits: ${employees.length}`,
          );

          // Appliquer le filtre de statut côté client
          if (
            this.employeesStatusFilter &&
            this.employeesStatusFilter !== "all"
          ) {
            const isActive = this.employeesStatusFilter === "active";
            const beforeStatus = employees.length;
            employees = employees.filter(
              (employee) => employee.isActive === isActive,
            );
            console.log(
              `🔍 [DEBUG] Après filtre statut (${this.employeesStatusFilter}): ${beforeStatus} -> ${employees.length}`,
            );
          }

          this.filteredEmployees = employees;
          this.totalEmployees = employees.length;
          this.totalPages = Math.ceil(this.totalEmployees / this.itemsPerPage);
          console.log(
            `🔍 [DEBUG] Employés finalement affichés: ${this.filteredEmployees.length}`,
          );
          console.log(
            "🔍 [DEBUG] Employés dans filteredEmployees:",
            this.filteredEmployees,
          );
        } else {
          console.error(
            "🔍 [ERROR] Erreur dans la réponse de l'API:",
            response,
          );
          this.notificationService.showError(
            "Erreur",
            "Erreur lors du filtrage des employés",
          );
        }
        this.isLoadingFilteredEmployees = false;
      },
      error: (error) => {
        console.error(
          "🔍 [ERROR] Erreur lors du filtrage des employés:",
          error,
        );
        this.notificationService.showError(
          "Erreur",
          "Erreur lors du filtrage des employés",
        );
        this.isLoadingFilteredEmployees = false;
        // En cas d'erreur, utiliser le filtrage local comme fallback
        this.filterEmployeesLocally();
      },
    });
  }

  /**
   * Méthode de filtrage local - gère les filtres de rôle et statut + pagination locale
   */
  private filterEmployeesLocally(): void {
    console.log("Début du filtrage local avec:", {
      search: this.employeesSearch,
      roleFilter: this.employeesRoleFilter,
      statusFilter: this.employeesStatusFilter,
      totalEmployees: this.allEmployees.length,
    });

    let filtered = [...this.allEmployees];

    // Filtrage par texte de recherche
    if (this.employeesSearch && this.employeesSearch.trim()) {
      const searchTerm = this.employeesSearch.toLowerCase().trim();
      filtered = filtered.filter(
        (employee) =>
          employee.firstName?.toLowerCase().includes(searchTerm) ||
          employee.lastName?.toLowerCase().includes(searchTerm) ||
          employee.email?.toLowerCase().includes(searchTerm) ||
          this.getRoleText(employee.role)?.toLowerCase().includes(searchTerm) ||
          `${employee.firstName} ${employee.lastName}`
            .toLowerCase()
            .includes(searchTerm),
      );
    }

    // Filtrage par rôle
    if (this.employeesRoleFilter && this.employeesRoleFilter !== "all") {
      filtered = filtered.filter(
        (employee) => employee.role === this.employeesRoleFilter,
      );
    }

    // Filtrage par statut
    if (this.employeesStatusFilter && this.employeesStatusFilter !== "all") {
      const isActive = this.employeesStatusFilter === "active";
      filtered = filtered.filter((employee) => employee.isActive === isActive);
    }

    // Calcul de la pagination
    this.totalEmployees = filtered.length;
    this.totalPages = Math.ceil(this.totalEmployees / this.itemsPerPage);

    // S'assurer que currentPage est valide
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }

    // Appliquer la pagination
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.filteredEmployees = filtered.slice(startIndex, endIndex);

    console.log(
      "Employés filtrés localement:",
      this.filteredEmployees.length,
      "sur",
      this.totalEmployees,
      "total (page",
      this.currentPage,
      "sur",
      this.totalPages,
      ")",
    );
  }

  /**
   * Efface la recherche des employés
   */
  clearEmployeeSearch(): void {
    this.employeesSearch = "";
    this.filterEmployees();
  }

  /**
   * Remet à zéro tous les filtres des employés
   */
  resetEmployeeFilters(): void {
    this.employeesSearch = "";
    this.employeesRoleFilter = "all";
    this.employeesStatusFilter = "all";
    this.employeesCityFilter = "";
    this.employeesNeighborhoodFilter = "";
    this.employeesArrondissementFilter = "";
    this.employeesSectorFilter = null;
    this.currentPage = 1;
    this.filterEmployees();
  }

  /**
   * Bascule l'affichage de la section de recherche des employés
   */
  toggleEmployeesSearch(): void {
    this.showEmployeesSearch = !this.showEmployeesSearch;

    // Si on ferme la section, on remet à zéro les filtres
    if (!this.showEmployeesSearch) {
      this.resetEmployeeFilters();
    }
  }

  /**
   * Navigue vers la page précédente
   */
  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.filterEmployees();
    }
  }

  /**
   * Navigue vers la page suivante
   */
  goToNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.filterEmployees();
    }
  }

  /**
   * Navigue vers une page spécifique
   */
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.filterEmployees();
    }
  }

  /**
   * Change le nombre d'éléments par page
   */
  changeItemsPerPage(newSize: number): void {
    this.itemsPerPage = newSize;
    this.currentPage = 1; // Reset à la première page
    this.filterEmployees();
  }

  /**
   * Change le nombre d'éléments par page pour les clients
   */
  changeClientItemsPerPage(newSize: number): void {
    this.clientsItemsPerPage = newSize;
    this.clientsCurrentPage = 1; // Reset à la première page
    this.filterClients();
  }

  /**
   * Génère la liste des numéros de pages pour la pagination
   */
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(
      1,
      this.currentPage - Math.floor(maxVisiblePages / 2),
    );
    let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);

    // Ajuster le début si on est proche de la fin
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  /**
   * Calcule le numéro du dernier élément affiché sur la page actuelle
   */
  getEndItemNumber(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalEmployees);
  }

  /**
   * Calcule le numéro du dernier élément client affiché sur la page actuelle
   */
  getClientEndItemNumber(): number {
    return Math.min(
      this.clientsCurrentPage * this.clientsItemsPerPage,
      this.clientsTotalItems,
    );
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
   * Filtre les quartiers en fonction de la ville sélectionnée pour les employés
   */
  onEmployeeFilterCityChange(): void {
    if (this.employeesCityFilter) {
      const selectedArrond = OUAGA_DATA.find(
        (data) => data.arrondissement === this.employeesCityFilter,
      );
      if (selectedArrond) {
        this.filteredNeighborhoods = [];
        selectedArrond.secteurs.forEach((secteur) => {
          this.filteredNeighborhoods.push(...secteur.quartiers);
        });
        this.filteredNeighborhoods.sort();

        // Réinitialiser le quartier si il n'est plus dans la liste
        if (
          this.employeesNeighborhoodFilter &&
          !this.filteredNeighborhoods.includes(this.employeesNeighborhoodFilter)
        ) {
          this.employeesNeighborhoodFilter = "";
        }
      }
    } else {
      // Si aucune ville sélectionnée, montrer tous les quartiers
      this.filteredNeighborhoods = [...this.availableNeighborhoods];
      this.employeesNeighborhoodFilter = "";
    }

    // Appliquer les filtres
    this.filterEmployees();
  }

  // === MÉTHODES DE FILTRAGE ET RECHERCHE DES CLIENTS ===

  /**
   * Filtre les clients via l'API backend
   */
  filterClients(): void {
    if (!this.agency?.agencyId) return;

    this.isLoadingFilteredClients = true;

    const filters = {
      term: this.clientsSearch,
      city: this.clientsCityFilter,
      neighborhood: this.clientsNeighborhoodFilter,
      page: this.clientsCurrentPage,
      limit: this.clientsItemsPerPage,
    };

    this.clientService
      .getFilteredClients(this.agency.agencyId, filters)
      .subscribe({
        next: (response: any) => {
          if (!response?.data || !Array.isArray(response.data)) {
            this.filteredActiveClients = [];
            this.isLoadingFilteredClients = false;
            return;
          }

          const clients = response.data;

          // 🔥 Requêtes abonnements par client
          const subscriptionsRequests = clients.map((client: any) =>
            this.agencyService.getUserSubscription(client._id).pipe(
              map((subs: any[]) => ({
                ...client,
                historyAbonnement:
                  subs
                    .filter(
                      (abonnement) =>
                        abonnement.agencyId._id === client.agencyId,
                    )
                    .sort((a, b) => {
                      const dateA = new Date(a.startDate).getTime();
                      const dateB = new Date(b.startDate).getTime();
                      return dateB - dateA;
                    }) || [],
              })),
              catchError(() =>
                of({
                  ...client,
                  historyAbonnement: [],
                }),
              ),
            ),
          );

          forkJoin(subscriptionsRequests).subscribe({
            next: (clientsWithSubscriptions: any) => {
              this.filteredActiveClients = clientsWithSubscriptions;
              this.clientsTotalItems =
                response.totalItems || clientsWithSubscriptions.length;
              this.clientsTotalPages = response.totalPages || 1;
              this.isLoadingFilteredClients = false;

              console.log("agency clients ", this.filteredActiveClients);
            },
            error: () => {
              this.isLoadingFilteredClients = false;
            },
          });
        },
        error: () => {
          this.filterClientsLocally();
          this.isLoadingFilteredClients = false;
        },
      });
  }

  /**
   * Gère la pagination côté client quand l'API ne la supporte pas
   */
  private handleClientSidePagination(allClients: any[], filters: any): void {
    let filteredClients = [...allClients];

    // Filtrage par terme de recherche
    if (filters.term && filters.term.trim()) {
      const searchTerm = filters.term.toLowerCase().trim();
      filteredClients = filteredClients.filter(
        (client) =>
          client.firstName?.toLowerCase().includes(searchTerm) ||
          client.lastName?.toLowerCase().includes(searchTerm) ||
          client.email?.toLowerCase().includes(searchTerm) ||
          client.phone?.toLowerCase().includes(searchTerm) ||
          client.address?.street?.toLowerCase().includes(searchTerm) ||
          client.address?.neighborhood?.toLowerCase().includes(searchTerm) ||
          `${client.firstName} ${client.lastName}`
            .toLowerCase()
            .includes(searchTerm),
      );
    }

    // Filtrage par ville
    if (filters.city && filters.city !== "all") {
      filteredClients = filteredClients.filter(
        (client) => client.address?.city === filters.city,
      );
    }

    // Filtrage par quartier
    if (filters.neighborhood && filters.neighborhood !== "all") {
      filteredClients = filteredClients.filter(
        (client) => client.address?.neighborhood === filters.neighborhood,
      );
    }

    // Calcul de la pagination
    this.clientsTotalItems = filteredClients.length;
    this.clientsTotalPages = Math.ceil(
      this.clientsTotalItems / this.clientsItemsPerPage,
    );

    // S'assurer que la page courante est valide
    if (
      this.clientsCurrentPage > this.clientsTotalPages &&
      this.clientsTotalPages > 0
    ) {
      this.clientsCurrentPage = this.clientsTotalPages;
    }

    // Découper les résultats pour la page courante
    const startIndex = (this.clientsCurrentPage - 1) * this.clientsItemsPerPage;
    const endIndex = startIndex + this.clientsItemsPerPage;
    this.filteredActiveClients = filteredClients.slice(startIndex, endIndex);

    console.log(
      `Pagination côté client: page ${this.clientsCurrentPage}/${this.clientsTotalPages}, ${this.filteredActiveClients.length} sur ${this.clientsTotalItems} clients`,
    );
  }

  /**
   * Vérifie s'il y a des filtres actifs
   */
  private hasClientFilters(): boolean {
    return (
      (!!this.clientsSearch && this.clientsSearch.trim() !== "") ||
      (!!this.clientsCityFilter && this.clientsCityFilter !== "all") ||
      (!!this.clientsNeighborhoodFilter &&
        this.clientsNeighborhoodFilter !== "all")
    );
  }

  /**
   * Filtrage local des clients (fallback)
   */
  private filterClientsLocally(): void {
    let filtered = [...this.activeClients];

    // Filtrage par texte de recherche
    if (this.clientsSearch && this.clientsSearch.trim()) {
      const searchTerm = this.clientsSearch.toLowerCase().trim();
      filtered = filtered.filter(
        (client) =>
          client.firstName?.toLowerCase().includes(searchTerm) ||
          client.lastName?.toLowerCase().includes(searchTerm) ||
          client.email?.toLowerCase().includes(searchTerm) ||
          client.phone?.toLowerCase().includes(searchTerm) ||
          client.address?.street?.toLowerCase().includes(searchTerm) ||
          client.address?.neighborhood?.toLowerCase().includes(searchTerm) ||
          client.address?.city?.toLowerCase().includes(searchTerm) ||
          `${client.firstName} ${client.lastName}`
            .toLowerCase()
            .includes(searchTerm),
      );
    }

    // Filtrage par ville
    if (this.clientsCityFilter && this.clientsCityFilter !== "all") {
      filtered = filtered.filter(
        (client) => client.address?.city === this.clientsCityFilter,
      );
    }

    // Filtrage par quartier
    if (
      this.clientsNeighborhoodFilter &&
      this.clientsNeighborhoodFilter !== "all"
    ) {
      filtered = filtered.filter(
        (client) =>
          client.address?.neighborhood === this.clientsNeighborhoodFilter,
      );
    }

    this.filteredActiveClients = filtered;
    console.log(
      "Filtrage local - Clients filtrés:",
      this.filteredActiveClients.length,
      "sur",
      this.activeClients.length,
    );
  }

  /**
   * Efface la recherche des clients
   */
  clearClientSearch(): void {
    this.clientsSearch = "";
    this.clientsCurrentPage = 1;
    this.filterClients();
  }

  /**
   * Remet à zéro tous les filtres des clients
   */
  resetClientFilters(): void {
    this.clientsSearch = "";
    this.clientsCityFilter = "all"; // Reset du nouveau filtre ville
    this.clientsNeighborhoodFilter = "all";
    this.clientsStatusFilter = "all";
    this.clientsCurrentPage = 1;
    this.filterClients();
  }

  /**
   * Gestion de la pagination des clients
   */
  goToClientPage(page: number): void {
    if (page >= 1 && page <= this.clientsTotalPages) {
      this.clientsCurrentPage = page;
      this.filterClients();
    }
  }

  nextClientPage(): void {
    if (this.clientsCurrentPage < this.clientsTotalPages) {
      this.clientsCurrentPage++;
      this.filterClients();
    }
  }

  previousClientPage(): void {
    if (this.clientsCurrentPage > 1) {
      this.clientsCurrentPage--;
      this.filterClients();
    }
  }

  /**
   * Méthodes pour obtenir les pages de pagination
   */
  getClientPaginationPages(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    const half = Math.floor(maxPagesToShow / 2);

    let start = Math.max(1, this.clientsCurrentPage - half);
    let end = Math.min(this.clientsTotalPages, start + maxPagesToShow - 1);

    if (end - start + 1 < maxPagesToShow) {
      start = Math.max(1, end - maxPagesToShow + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  /**
   * Obtenir la liste des quartiers uniques des clients
   */
  getUniqueClientNeighborhoods(): string[] {
    // Essayer d'abord depuis les clients actifs
    let clientNeighborhoods: string[] = [];
    if (this.activeClients && this.activeClients.length > 0) {
      const clientsArray = Array.isArray(this.activeClients)
        ? this.activeClients
        : [];
      clientNeighborhoods = clientsArray
        .map((client) => client.address?.neighborhood)
        .filter(
          (neighborhood, index, self) =>
            neighborhood &&
            neighborhood.trim() !== "" &&
            self.indexOf(neighborhood) === index,
        )
        .sort();
    }

    // Si aucun quartier trouvé dans les clients, utiliser le mock comme fallback
    if (clientNeighborhoods.length === 0) {
      const allQuartiers: string[] = [];
      OUAGA_DATA.forEach((arrond) => {
        arrond.secteurs.forEach((secteur) => {
          allQuartiers.push(...secteur.quartiers);
        });
      });
      clientNeighborhoods = [...new Set(allQuartiers)].sort();
    }

    return clientNeighborhoods;
  }

  /**
   * Obtenir la liste des villes uniques des clients
   */
  getUniqueClientCities(): string[] {
    // Essayer d'abord depuis les clients actifs
    let clientCities: string[] = [];
    if (this.activeClients && this.activeClients.length > 0) {
      const clientsArray = Array.isArray(this.activeClients)
        ? this.activeClients
        : [];
      clientCities = clientsArray
        .map((client) => client.address?.city)
        .filter(
          (city, index, self) =>
            city && city.trim() !== "" && self.indexOf(city) === index,
        )
        .sort();
    }

    // Si aucune ville trouvée dans les clients, utiliser "Ouagadougou" par défaut
    if (clientCities.length === 0) {
      clientCities = ["Ouagadougou"];
    }

    return clientCities;
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

    this.filterEmployees();
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

    this.filterEmployees();
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

    this.filterEmployees();
  }

  /**
   * Méthodes sécurisées pour les ngFor - supprimer les doublons
   */

  /**
   * S'assurer que tabs est toujours un tableau
   */
  getTabs(): any[] {
    return Array.isArray(this.tabs) ? this.tabs : [];
  }

  /**
   * S'assurer que dayCollectes est toujours un tableau
   */
  getDayCollectes(): any[] {
    return Array.isArray(this.dayCollectes) ? this.dayCollectes : [];
  }

  /**
   * S'assurer que agencyReports est toujours un tableau
   */
  getAgencyReports(): any[] {
    return Array.isArray(this.agencyReports) ? this.agencyReports : [];
  }

  /**
   * S'assurer que connectedUserMessages est toujours un tableau
   */
  getConnectedUserMessages(): any[] {
    return Array.isArray(this.connectedUserMessages)
      ? this.connectedUserMessages
      : [];
  }

  /**
   * S'assurer que receivedMessages est toujours un tableau
   */
  getReceivedMessages(): any[] {
    return Array.isArray(this.receivedMessages) ? this.receivedMessages : [];
  }

  /**
   * Bascule l'affichage de la section de recherche des clients
   */
  toggleClientsSearch(): void {
    this.showClientsSearch = !this.showClientsSearch;

    if (!this.showClientsSearch) {
      this.resetClientFilters();
    }
  }

  //chargement des signalements — Prompt 06 : lit désormais le modèle Signalement
  // unifié (les deux origines, filtrable par origine/statut côté serveur) au
  // lieu de l'ancienne route Collecte-only (`getAgencyReports$`, conservée mais
  // plus appelée ici).
  loadAgencyReports(currentUser: any): void {
    if (currentUser && currentUser.agencyId) {
      this.isLoadingReports = true;
      this.agencyService
        .getAgencySignalements$({
          origine: this.origineFilter !== "all" ? this.origineFilter : undefined,
          status: this.incidentsFilter !== "all" ? this.incidentsFilter : undefined,
        })
        .subscribe({
        next: (reports: any) => {
          // La sévérité n'est pas un filtre serveur sur cet endpoint — appliqué
          // ici, côté client, sur le résultat déjà filtré par origine/statut.
          this.agencyReports = this.severityFilter === "all"
            ? reports
            : reports.filter((r: Incident) => (r.severity || "").toLowerCase() === this.severityFilter);
          console.log("Signalements chargés >>>>>> :", this.agencyReports);
          // Mise à jour du badge des Signalements
          const SignalementsTab = this.tabs.find((tab) => tab.id === "reports");
          if (SignalementsTab) {
            SignalementsTab.badge = this.statistics.pendingSignalements;
            this.cdr.detectChanges();
          }
          const repportTab = this.tabs.find((tab) => tab.id === "reports");
          if (repportTab) {
            repportTab.badge = this.statistics.pendingSignalements;
            this.cdr.detectChanges();
          }
          this.isLoadingReports = false;
        },
        error: (error) => {
          console.error("Erreur lors du chargement des signalements :", error);
          this.notificationService.showError(
            "Erreur",
            "Impossible de charger les signalements. Veuillez réessayer.",
          );
          this.isLoadingReports = false;
        },
      });
    } else {
      console.warn("Aucun ID d'utilisateur courant disponible.");
    }
  }

  // Chargement des avis clients — agence dérivée du profil authentifié côté
  // serveur (jamais passée en paramètre ici), même principe que loadAgencyReports.
  loadAgencyRatings(page: number = 1): void {
    this.isLoadingRatings = true;
    this.agencyService.getAgencyRatings$({ page, pageSize: this.ratingsPageSize }).subscribe({
      next: (result) => {
        this.agencyRatings = result.items;
        this.ratingsTotal = result.total;
        this.ratingsPage = result.page;
        this.isLoadingRatings = false;
      },
      error: (error) => {
        console.error("Erreur lors du chargement des avis clients :", error);
        this.isLoadingRatings = false;
      },
    });
  }

  get ratingsTotalPages(): number {
    return Math.max(1, Math.ceil(this.ratingsTotal / this.ratingsPageSize));
  }

  changerPageRatings(page: number): void {
    if (page < 1 || page > this.ratingsTotalPages) return;
    this.loadAgencyRatings(page);
  }

  // ─── Demandes de collecte express (passage spontané, DemandeCollecte) ──
  // Modèle/service dédié, distinct des Signalements ci-dessus.
  demandesCollecte: DemandeCollecte[] = [];
  isLoadingDemandes = false;
  demandesFilter: 'pending' | 'accepted' | 'rejected' | 'all' = 'pending';
  processingDemandeId: string | null = null;

  loadDemandesCollecte(): void {
    const agencyId = this.currentUser?.agencyId;
    if (!agencyId) return;
    this.isLoadingDemandes = true;
    this.demandeCollecteService
      .listForAgency(agencyId, this.demandesFilter !== 'all' ? this.demandesFilter : undefined)
      .subscribe({
        next: (response) => {
          this.demandesCollecte = response?.data || [];
          const demandesTab = this.tabs.find((tab) => tab.id === 'demandes');
          if (demandesTab) {
            demandesTab.badge = this.demandesCollecte.filter((d) => d.status === 'pending').length;
            this.cdr.detectChanges();
          }
          this.isLoadingDemandes = false;
        },
        error: (error) => {
          console.error("Erreur lors du chargement des demandes de collecte express :", error);
          this.notificationService.showError(
            "Erreur",
            "Impossible de charger les demandes de collecte express. Veuillez réessayer.",
          );
          this.isLoadingDemandes = false;
        },
      });
  }

  filterDemandesCollecte(): void {
    this.loadDemandesCollecte();
  }

  setDemandesFilter(filter: 'pending' | 'accepted' | 'rejected' | 'all'): void {
    if (this.demandesFilter === filter) return;
    this.demandesFilter = filter;
    this.filterDemandesCollecte();
  }

  acceptDemandeCollecte(demande: DemandeCollecte): void {
    if (this.processingDemandeId) return;
    this.processingDemandeId = demande._id;
    this.demandeCollecteService.accept(demande._id).subscribe({
      next: () => {
        this.notificationService.showSuccess("Demande acceptée", "La collecte a été planifiée pour le client");
        this.processingDemandeId = null;
        this.loadDemandesCollecte();
      },
      error: (error) => {
        console.error("Erreur lors de l'acceptation de la demande :", error);
        this.notificationService.showError(
          "Erreur",
          error?.error?.error?.message || "Impossible d'accepter cette demande",
        );
        this.processingDemandeId = null;
      },
    });
  }

  rejectDemandeCollecte(demande: DemandeCollecte): void {
    if (this.processingDemandeId) return;
    const rejectionReason = window.prompt("Motif du refus (optionnel) :") || '';
    this.processingDemandeId = demande._id;
    this.demandeCollecteService.reject(demande._id, rejectionReason).subscribe({
      next: () => {
        this.notificationService.showSuccess("Demande refusée", "Le client a été notifié");
        this.processingDemandeId = null;
        this.loadDemandesCollecte();
      },
      error: (error) => {
        console.error("Erreur lors du refus de la demande :", error);
        this.notificationService.showError(
          "Erreur",
          error?.error?.error?.message || "Impossible de refuser cette demande",
        );
        this.processingDemandeId = null;
      },
    });
  }

  // ─── Demande express acceptée : assigner une équipe, puis créer le planning
  // de suivi — deux actions séparées (voir services/demandeCollecte.js pour le
  // détail : la Collecte existe déjà depuis l'acceptation, jamais de doublon).
  showDemandeTeamPicker = false;
  demandeTeamPickerTarget: DemandeCollecte | null = null;
  demandeTeams: any[] = [];
  selectedDemandeTeamId = '';
  isLoadingDemandeTeams = false;

  openDemandeTeamPicker(demande: DemandeCollecte): void {
    this.demandeTeamPickerTarget = demande;
    this.selectedDemandeTeamId = demande.collecteId?.executedByTeamId?._id ?? '';
    this.showDemandeTeamPicker = true;
    this.demandeTeams = [];
    const agencyId = this.currentUser?.agencyId;
    if (!agencyId) return;
    this.isLoadingDemandeTeams = true;
    this.agencyService.getTeamsV2$(agencyId).subscribe({
      next: (teams) => {
        this.demandeTeams = teams || [];
        this.isLoadingDemandeTeams = false;
      },
      error: () => {
        this.demandeTeams = [];
        this.isLoadingDemandeTeams = false;
      },
    });
  }

  closeDemandeTeamPicker(): void {
    this.showDemandeTeamPicker = false;
    this.demandeTeamPickerTarget = null;
    this.selectedDemandeTeamId = '';
  }

  isDemandeTeamAvailable(team: any): boolean {
    return !team?.status || team.status === 'active';
  }

  getDemandeTeamStatusLabel(team: any): string {
    const labels: Record<string, string> = {
      inactive: 'Inactive',
      on_mission: 'En mission',
      maintenance: 'En maintenance',
    };
    return labels[team?.status] || 'Indisponible';
  }

  confirmAssignDemandeTeam(): void {
    if (!this.demandeTeamPickerTarget || !this.selectedDemandeTeamId) return;
    const demandeId = this.demandeTeamPickerTarget._id;
    this.processingDemandeId = demandeId;
    this.demandeCollecteService.assignTeam(demandeId, this.selectedDemandeTeamId).subscribe({
      next: () => {
        this.notificationService.showSuccess("Équipe assignée", "L'équipe a été notifiée");
        this.processingDemandeId = null;
        this.closeDemandeTeamPicker();
        this.loadDemandesCollecte();
      },
      error: (error) => {
        console.error("Erreur lors de l'assignation de l'équipe :", error);
        this.notificationService.showError(
          "Erreur",
          error?.error?.error?.message || "Impossible d'assigner cette équipe",
        );
        this.processingDemandeId = null;
      },
    });
  }

  createFollowUpPlanning(demande: DemandeCollecte): void {
    if (this.processingDemandeId) return;
    this.processingDemandeId = demande._id;
    this.demandeCollecteService.createPlanning(demande._id).subscribe({
      next: () => {
        this.notificationService.showSuccess("Planning créé", "Le planning de suivi a été créé et le client notifié");
        this.processingDemandeId = null;
        this.loadDemandesCollecte();
      },
      error: (error) => {
        console.error("Erreur lors de la création du planning de suivi :", error);
        this.notificationService.showError(
          "Erreur",
          error?.error?.error?.message || "Impossible de créer le planning de suivi",
        );
        this.processingDemandeId = null;
      },
    });
  }

  //recuperations des statistiques de l'agence
  loadAgencyStatistics(currentUser: any): void {
    if (currentUser && currentUser.agencyId) {
      this.isLoadingStatistics = true;
      const agencyId = currentUser.agencyId;
      this.agencyService.getAgencyStats$(agencyId, {
        period: this.collectesKpiPeriod,
        zone: this.collectesKpiZone || undefined,
        wasteType: this.collectesKpiWasteType || undefined,
      }).subscribe({
        next: (statistics) => {
          if (!statistics.success) return;
          this.statistics = statistics.data;
          console.log("Statistiques de l'agence chargées :", this.statistics);
          this.isLoadingStatistics = false;
          this.cdr.detectChanges();
          console.log(" FIN loadAgencyStatistics - Succès");
        },
        error: (error) => {
          console.error(
            "Erreur lors du chargement des statistiques de l'agence :",
            error,
          );
          this.notificationService.showError(
            "Erreur",
            "Impossible de charger les statistiques de l'agence. Veuillez réessayer.",
          );
          this.isLoadingStatistics = false;
          console.log("🏁 FIN loadAgencyStatistics - Échec");
        },
      });
    } else {
      console.warn(" ID d'agence non disponible dans l'utilisateur courant.");
    }
  }

  // Helper pour récupérer le statut d'abonnement
  getClientSubscriptionStatus(c: any): string | undefined {
    return c.subscriptionHistory && c.subscriptionHistory.length
      ? c.subscriptionHistory[
        c.subscriptionHistory.length - 1
      ].status?.toLowerCase()
      : undefined;
  }

  clientNbrs!: number;

  loadClients(): void {
    console.log("[loadClients] called, agency:", this.agency);
    if (!this.agency || !this.agency?.agencyId) return;

    this.isLoadingClients = true;
    this.clientService.getClientsByAgency(this.agency.agencyId).subscribe({
      next: (clients: any) => {
        console.log(
          "[loadClients] clients number:",
          this.activeClientNbrs,
          clients?.data?.length || 0,
        );
        console.log("ALL Agency_clients", clients);

        const clientsData = Array.isArray(clients?.data) ? clients.data : [];
        this.allAgencyClients = clientsData;

        this.activeClients = clientsData.filter(
          (c: any) => this.getClientSubscriptionStatus(c) === "active",
        );
        this.filteredActiveClients = [...this.activeClients];
        this.pendingClients = clientsData.filter(
          (c: any) => this.getClientSubscriptionStatus(c) === "pending",
        );
        console.log(
          "[loadClients] active:",
          this.activeClients,
          "pending:",
          this.pendingClients,
        );

        if (clients && clientsData.length > 0) {
          this.clientNbrs = clientsData.length;

          if (this.activeClients) {
            this.activeClientNbrs = this.activeClients.length;

            const clientsTab = this.tabs.find((tab) => tab.label === "Clients");
            if (clientsTab) {
              clientsTab.badge = this.clientNbrs;
              console.log("badge >>", clientsTab.badge);
              console.log("activeClientNbrs >>", this.activeClientNbrs);
            } else {
              console.warn("L'onglet 'Clients' n'a pas été trouvé.");
            }
          }
        } else {
          // Aucun client trouvé
          this.clientNbrs = 0;
          this.activeClientNbrs = 0;
          this.activeClients = [];
          this.filteredActiveClients = [];
          this.pendingClients = [];
        }
        this.isLoadingClients = false;

        // Initialiser le filtrage avec les nouveaux clients chargés
        this.filterClients();
      },
      error: (err) => {
        console.error("[loadClients] error:", err);
        this.activeClients = [];
        this.filteredActiveClients = [];
        this.pendingClients = [];
        this.allAgencyClients = [];
        this.isLoadingClients = false;
      },
    });
  }

  loadReports(): void {
    this.reports = [
      {
        _id: "1",
        clientId: "client1",
        clientName: "Marie Dupont",
        type: "missed_collection",
        description: "La collecte n'a pas eu lieu à l'heure prévue",
        comment: "La collecte n'a pas eu lieu à l'heure prévue",
        date: new Date(),
        status: "open",
        severity: "medium",
        createdAt: new Date(),
        assignedTo: undefined,
      },
    ];
    this.filteredReports = [...this.reports];
  }

  // Utility methods
  getActiveCollectorsToday(): number {
    return this.employees.filter((e) => e.role === "collector" && e.isActive)
      .length;
  }

  getCollectionRate(): number {
    return Math.round(
      (this.statistics.completedCollections /
        this.statistics.todayCollections) *
      100,
    );
  }

  getStars(rating: number): number[] {
    if (!rating || rating < 0) {
      return [];
    }
    return new Array(Math.floor(rating)).fill(0);
  }

  getEmployeeStatusText(status: string): string {
    const statusTexts: Record<string, string> = {
      active: "Actif",
      inactive: "Inactif",
      deleted: "Supprimé"
    };
    return statusTexts[status] || status;
  }

  getStatusText(status: CollectionStatus): string {
    const statusTexts = {
      [CollectionStatus.SCHEDULED]: "Programmée",
      [CollectionStatus.IN_PROGRESS]: "En cours",
      [CollectionStatus.COMPLETED]: "Terminée",
      [CollectionStatus.MISSED]: "Manquée",
      [CollectionStatus.CANCELLED]: "Annulée",
      [CollectionStatus.REPORTED]: "Signalée",
      [CollectionStatus.COLLECTED]: "Collectée",
    };
    return statusTexts[status] || status;
  }

  // Une Collecte V1 a un collectorId individuel ; une Collecte issue d'un Planning V2
  // n'en a jamais (assignation par équipe) — l'équipe exécutante se trouve alors sur
  // le Planning d'origine (collecte.code, malgré le nom — voir BACKEND_ARCHITECTURE.md
  // §3.4), peuplée par services/collecte.service.js::AgencyCollectes jusqu'à equipeIds.name.
  getCollecteAssigneeText(collecte: any): string {
    if (collecte?.collectorId?.firstName) {
      return `${collecte.collectorId.firstName} ${collecte.collectorId.lastName ?? ''}`.trim();
    }
    const equipes = collecte?.code?.equipeIds;
    if (Array.isArray(equipes) && equipes.length) {
      return equipes.map((e: any) => e?.name).filter(Boolean).join(', ') || '—';
    }
    return '—';
  }

  getClientName(clientId: string): string {
    const client = this.clients.find((c) => c.id === clientId);
    return client ? client.name : "Client inconnu";
  }

  getWasteTypeName(wasteType: any): string {
    return wasteType?.name || "Type inconnu";
  }
  getCollectorName(id: string): string {
    const collector = this.collectors.find((c) => c._id === id);
    return collector
      ? `${collector.firstName} ${collector.lastName}`
      : "Inconnu";
  }

  getCollectionProgress(collection: Collection): number {
    // Simuler le progrès de collecte avec une valeur stable
    const seed = collection.id
      .split("")
      .reduce((a, b) => a + b.charCodeAt(0), 0);
    return seed % 100;
  }

  getRoleText(role: string): string {
    const roleTexts = {
      admin: "Administrateur",
      manager: "Manager",
      collector: "Collecteur",
    };
    return roleTexts[role as keyof typeof roleTexts] || role;
  }

  // Droits financiers (dashboard financier) — distinct du rôle opérationnel ci-dessus.
  get estAdministrateurFinance(): boolean {
    return this.currentUser?.financialRole === 'administrateur';
  }

  getFinancialRoleText(financialRole: string | null | undefined): string {
    const labels = {
      comptable: 'Comptable',
      manager_terrain: 'Manager terrain',
      administrateur: 'Administrateur',
    };
    return financialRole ? (labels[financialRole as keyof typeof labels] || financialRole) : 'Aucun';
  }

  // Assigne/retire le rôle financier d'un employé (select "Aucun" => financialRole=null,
  // ce qui révoque aussi droitsFinance côté backend). Réservé aux administrateurs finance
  // (estAdministrateurFinance ci-dessus), contrôle rejoué côté serveur de toute façon.
  assignFinancialRole(employee: any, value: string): void {
    const financialRole = value || null;
    this.agencyService.setEmployeeFinancialRole$(employee._id, financialRole as any).subscribe({
      next: () => {
        employee.financialRole = financialRole;
        this.notificationService.showSuccess(
          'Succès',
          financialRole
            ? `Rôle financier "${this.getFinancialRoleText(financialRole)}" assigné à ${employee.firstName} ${employee.lastName}.`
            : `Rôle financier retiré à ${employee.firstName} ${employee.lastName}.`,
        );
      },
      error: (error) => {
        console.error("Erreur lors de l'assignation du rôle financier :", error);
        this.notificationService.showError('Erreur', "Impossible d'assigner le rôle financier.");
      },
    });
  }

  getZoneName(schedule: any): string {
    if (!schedule) return 'Zone inconnue';
    return schedule.zone || schedule.quartier || schedule.secteur || schedule.ville
      || schedule.libelle || 'Zone inconnue';
  }

  getZoneClients(zoneId: string): number {
    // Simuler le nombre de clients par zone
    return Math.floor(Math.random() * 200) + 50;
  }

  getEmployeeCollections(employeeId: string): number {
    return Math.floor(Math.random() * 20) + 5;
  }

  getEmployeeRating(employeeId: string): number {
    return Math.round((Math.random() * 2 + 3) * 10) / 10;
  }

  getEmployeeName(employeeId: string): string {
    const employee = this.employees.find((e) => e.id === employeeId);
    return employee
      ? `${employee.firstName} ${employee.lastName}`
      : "Employé inconnu";
  }

  getSubscriptionStatusText(status: string): string {
    const statusTexts = {
      active: "Actif",
      suspended: "Suspendu",
      cancelled: "Résilié",
    };
    return statusTexts[status as keyof typeof statusTexts] || status;
  }

  getReportTypeText(type: string): string {
    const typeTexts = {
      missed_collection: "Collecte manquée",
      incomplete_collection: "Collecte incomplète",
      damage: "Dommage",
      complaint: "Réclamation",
    };
    return typeTexts[type as keyof typeof typeTexts] || type;
  }

  getReportStatusText(status: string): string {
    const statusTexts = {
      open: "Ouvert",
      in_progress: "enregistré",
      resolved: "Résolu",
    };
    return statusTexts[status as keyof typeof statusTexts] || status;
  }

  getCurrentWeekText(): string {
    const startOfWeek = new Date(this.currentWeek);
    startOfWeek.setDate(
      this.currentWeek.getDate() - this.currentWeek.getDay() + 1,
    );
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return `${startOfWeek.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    })} - ${endOfWeek.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    })}`;
  }

  // getSchedulesForDay(dayIndex: number): any[] {
  //   return this.schedules.filter(s => s.dayOfWeek === dayIndex + 1);
  // }
  // getSchedulesForDay(dayIndex: number): any[] {
  //   const startOfWeek = new Date(this.currentWeek);
  //   startOfWeek.setDate(
  //     this.currentWeek.getDate() - this.currentWeek.getDay() + 1
  //   ); // Lundi
  //   const targetDate = new Date(startOfWeek);
  //   targetDate.setDate(startOfWeek.getDate() + dayIndex);

  //   return this.plannings.filter((schedule) => {
  //     const scheduleDate = new Date(schedule.date);
  //     return (
  //       scheduleDate.toDateString() === targetDate.toDateString() &&
  //       schedule.dayOfWeek === dayIndex + 1
  //     );
  //   });
  // }

  getSchedulesForDay(dayIndex: number): any[] {
    if (!Array.isArray(this.schedules)) {
      console.log(
        "getSchedulesForDay: schedules n'est pas un tableau",
        this.schedules,
      );
      return [];
    }

    const startOfWeek = new Date(this.currentWeek);
    const day = this.currentWeek.getDay();
    const diff = this.currentWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const targetDate = new Date(startOfWeek);
    targetDate.setDate(startOfWeek.getDate() + dayIndex);

    // console.log(
    //   `Recherche plannings pour le jour ${dayIndex} (${targetDate.toLocaleDateString()})`,
    // );
    // console.log("Nombre total de plannings:", this.schedules.length);

    const filteredSchedules = this.schedules.filter((schedule) => {
      if (!schedule.date) return false;
      // Extraire YYYY-MM-DD depuis une date ISO ou une date simple
      const rawDate: string = schedule.date;
      const datePart = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;
      const scheduleDate = new Date(datePart + 'T00:00:00');
      scheduleDate.setHours(0, 0, 0, 0);
      return scheduleDate.getTime() === targetDate.getTime();
    });

    // console.log(
    //   `Plannings trouvés pour le jour ${dayIndex}:`,
    //   filteredSchedules,
    // );
    return filteredSchedules;
  }

  /**
   * Vérifie si un planning est nouveau (créé dans les dernières 24h)
   */
  isNewSchedule(schedule: any): boolean {
    if (!schedule.createdAt) return false;
    const now = new Date();
    const createdAt = new Date(schedule.createdAt);
    const diffInHours =
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return diffInHours <= 24;
  }

  /**
   * Vérifie si un planning est en cours de chargement
   */
  isScheduleLoading(schedule: any): boolean {
    // Vous pouvez implémenter votre logique de chargement ici
    // Par exemple, si vous avez un tableau d'IDs en cours de traitement
    return this.loadingScheduleIds?.includes(schedule._id) || false;
  }

  // Propriété pour tracker les plannings en cours de chargement
  loadingScheduleIds: string[] = [];

  /**
   * Crée un nouveau planning pour un jour spécifique
   */
  createNewScheduleForDay(dayIndex: number): void {
    const targetDate = this.getDateForDay(dayIndex);
    const dateStr = this.formatDateForInput(targetDate);
    this.router.navigate(['/planning/create'], { queryParams: { date: dateStr } });
  }

  /**
   * Calcule la date pour un index de jour donné
   */
  getDateForDay(dayIndex: number): Date {
    const startOfWeek = new Date(this.currentWeek);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const targetDate = new Date(startOfWeek);
    targetDate.setDate(startOfWeek.getDate() + dayIndex);
    return targetDate;
  }

  /**
   * Vérifie si le jour à l'index donné correspond à aujourd'hui
   */
  isToday(dayIndex: number): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayDate = this.getDateForDay(dayIndex);
    dayDate.setHours(0, 0, 0, 0);
    return today.getTime() === dayDate.getTime();
  }

  /**
   * Obtient le nom du jour en français
   */
  getDayName(dayIndex: number): string {
    const dayNames = [
      "Lundi",
      "Mardi",
      "Mercredi",
      "Jeudi",
      "Vendredi",
      "Samedi",
      "Dimanche",
    ];
    return dayNames[dayIndex] || "";
  }

  /**
   * Formate la date pour affichage (ex: "14 Nov")
   */
  getFormattedDate(dayIndex: number): string {
    const targetDate = this.getDateForDay(dayIndex);
    const options: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "short",
    };
    return targetDate.toLocaleDateString("fr-FR", options);
  }

  /**
   * Formate la date pour l'input HTML (YYYY-MM-DD)
   */
  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  getCollectorPerformance(): any[] {
    return this.employees
      .filter((e) => e.role === "collector")
      .map((e) => ({
        name: `${e.firstName} ${e.lastName}`,
        collectionsCount: this.getEmployeeCollections(e.id),
        score: Math.floor(Math.random() * 30) + 70,
      }));
  }

  getZoneStatistics(): any[] {
    return this.serviceZones.map((zone) => ({
      name: zone.name,
      clients: this.getZoneClients(zone.id),
      collections: Math.floor(Math.random() * 100) + 50,
      revenue: Math.floor(Math.random() * 5000) + 2000,
    }));
  }

  // Filter methods
  filterCollections(): void {
    this.filteredCollections = this.collections.filter((collection) => {
      const statusMatch =
        this.collectionsFilter === "all" ||
        collection.status === this.collectionsFilter;
      const zoneMatch =
        !this.selectedZone ||
        collection.address.neighborhood === this.selectedZone;
      return statusMatch && zoneMatch;
    });
    // Re-paginer les collectes journalières selon le filtre actif
    this.collectesCurrentPage = 1;
    this.applyCollectesPagination();
  }

  filterReports(): void {
    this.filteredReports = this.reports.filter((report) => {
      const statusMatch =
        this.reportsFilter === "all" || report.status === this.reportsFilter;
      const typeMatch =
        this.reportsTypeFilter === "all" ||
        report.type === this.reportsTypeFilter;
      return statusMatch && typeMatch;
    });
  }

  // Action methods
  trackCollection(collectionId: string): void {
    // No need to call notificationService.showInfo here, as it's already handled in the template
  }

  contactClient(clientId: string): void {
    // No need to call notificationService.showInfo here, as it's already handled in the template
  }

  // deleteEmployee(employeeId: string): void {
  //   if (confirm('Êtes-vous sûr de vouloir supprimer cet employé ?')) {
  //     this.employees = this.employees.filter(e => e.id !== employeeId);

  //   }
  // }

  // Zone Side
  editZone(zoneId: string): void {
    const zone = this.serviceZones.find((z) => z.id === zoneId);
    if (zone) {
      // Charger les données dans le reactive form
      this.zoneForm.patchValue({
        id: zone.id,
        name: zone.name,
        description: zone.description,
        cities: zone.cities,
        neighborhoods: zone.neighborhoods,
        isActive: zone.isActive,
      });
      this.citiesInput = zone.cities.join(", ");
      this.neighborhoodsInput = zone.neighborhoods.join(", ");
      this.editingZone = true;
      this.showZoneModal = true;
    }
  }

  deleteZone(zoneId: string): void {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette zone ?")) {
      this.serviceZones = this.serviceZones.filter((z) => z.id !== zoneId);
      // No need to call notificationService.showSuccess here, as it's already handled in the template
    }
  }

  deleteSchedule(scheduleId: string): void {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce planning ?")) {
      // this.schedules = this.schedules.filter(s => s.id !== scheduleId);
      // No need to call notificationService.showSuccess here, as it's already handled in the template
    }
  }
  selectedClient: any = null;
  showClientDetailsModal: boolean = false;
  viewClientDetails(clientId: string): void {
    this.notificationService.showInfo(
      "Détails",
      "Récupération des détails du client...",
    );

    this.adminService.getUserById(clientId).subscribe({
      next: (client: any) => {
        this.selectedClient = client?.user;
        console.log("voici les details du client:", client);
        this.showClientDetailsModal = true;
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
  suspendClient(clientId: string): void {
    const client = this.clients.find((c) => c.id === clientId);
    if (client) {
      client.subscriptionStatus = "suspended";
      // No need to call notificationService.showSuccess here, as it's already handled in the template
      this.notificationService.showSuccess(
        "Client suspendu",
        "Le client a bien été suspendu.",
      );
    }
  }

  deleteClient(): void {
    // Ajoute la logique de suppression ici (API ou local)
    // ...
    this.notificationService.showSuccess("Désole", "Suppression non autorisée");
  }

  resolveReport(reportId: string): void {
    const report = this.reports.find((r) => r._id === reportId);
    if (report) {
      report.status = "resolved";
      this.filterReports();
      // No need to call notificationService.showSuccess here, as it's already handled in the template
    }
  }

  contactReportClient(clientId: string): void {
    this.contactClient(clientId);
  }

  previousWeek(): void {
    this.currentWeek.setDate(this.currentWeek.getDate() - 7);
  }

  nextWeek(): void {
    this.currentWeek.setDate(this.currentWeek.getDate() + 7);
  }

  updateAnalytics(): void {
    // No need to call notificationService.showInfo here, as it's already handled in the template
  }

  // Form methods - DEPRECATED: Utiliser toggleZoneSelection à la place
  toggleZoneAssignment(zoneId: string, event: any): void {
    // Rediriger vers la nouvelle méthode reactive form
    this.toggleZoneSelection(zoneId, event);
  }

  /**
   * Convertit les messages techniques du backend en messages conviviaux pour l'utilisateur
   */
  private getFriendlyMessage(raw: string, isSuccess: boolean = false): string {
    if (!raw) {
      return isSuccess
        ? "Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter."
        : "Une erreur est survenue. Veuillez réessayer.";
    }
    const map: { [key: string]: string } = {
      "Email already exists": "Cette adresse email est déjà utilisée.",
      "Invalid email or password": "Email ou mot de passe invalide.",
      "User created successfully":
        "Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.",
      "Missing required fields":
        "Veuillez remplir tous les champs obligatoires.",
      "Password too short": "Le mot de passe est trop court.",
      "Invalid phone number": "Le numéro de téléphone est invalide.",
      // Ajoute d'autres correspondances ici si besoin
    };
    if (map[raw]) return map[raw];
    for (const key in map) {
      if (raw.toLowerCase().includes(key.toLowerCase())) return map[key];
    }
    return isSuccess
      ? "Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter."
      : raw;
  }

  addEmployee(): void {
    // console.log('Tentative d\'ajout d\'employé...');
    // console.log('Formulaire valide ?', this.employeeForm.valid);
    // console.log('isEmployeeFormValid ?', this.isEmployeeFormValid());
    // console.log('currentUser.agencyId ?', this.currentUser?.agencyId);

    if (this.isEmployeeFormValid() && this.currentUser?.agencyId) {
      const formValue = this.employeeForm.value;

      // Vérifier si on est en mode modification ou création
      if (
        this.isEditingEmployee &&
        this.employeeToEdit &&
        this.employeeToEdit._id
      ) {
        // Mode modification - utiliser updateEmployee
        this.updateEmployeeData(this.employeeToEdit._id);
        return;
      }

      // Mode création - continuer avec la logique normale
      const employeeData: AddEmployeeData = {
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        email: formValue.email,
        password: formValue.password,
        phone: formValue.phone,
        role: formValue.role as UserRole,
        address: formValue.address as UserAddress,
        agencyId: this.currentUser.agencyId,
      };

      this.agencyService.addEmployeeToAgency(employeeData).subscribe({
        next: (response: any) => {
          this.isLoading = false;
          console.log("[DEBUG] Réponse inscription employee:", response);

          if (response.success) {
            // Succès - réinitialiser les erreurs
            this.employeeFormError = null;
            this.employeeFormDetailedErrors = {};

            this.notificationService.showSuccess(
              "Employé ajouté avec succès",
              response.message || "L'employé a été créé avec succès !",
            );

            //  Recharger la liste après ajout
            if (this.currentUser?.agencyId) {
              this.loadEmployees(this.currentUser.agencyId);
              // Recharger les collecteurs car le rôle peut avoir changé
              this.loadCollectors(this.currentUser.agencyId);
            }
            this.employeeForm.reset();
            this.showAddEmployeeModal = false;
          } else {
            // Erreur - afficher les erreurs exactes du backend

            this.employeeFormError =
              response.error || "Erreur lors de l'ajout de l'employé";
            this.employeeFormDetailedErrors = response.detailedErrors || {};

            console.error(
              "Message affiché à l'utilisateur:",
              this.employeeFormError,
            );
            console.error(
              "Erreurs détaillées affichées:",
              this.employeeFormDetailedErrors,
            );

            // Afficher aussi une notification
            this.notificationService.showError(
              "Erreur lors de l'ajout",
              this.employeeFormError || "Erreur inconnue",
            );
          }
        },
        error: (errorResponse) => {
          this.isLoading = false;
          console.log("=== ERREUR HTTP ===");
          console.log("Erreur complète:", errorResponse);

          if (errorResponse.error) {
            this.employeeFormError = errorResponse.error;
            this.employeeFormDetailedErrors =
              errorResponse.detailedErrors || {};
          } else {
            this.employeeFormError = "Erreur de communication avec le serveur";
            this.employeeFormDetailedErrors = {};
          }

          console.log(
            "Message d'erreur final (dashboard):",
            this.employeeFormError,
          );

          this.notificationService.showError(
            "Erreur lors de l'ajout",
            this.employeeFormError || "Erreur inconnue",
          );
        },
      });
    } else {
      // Formulaire invalide, marquer tous les champs comme touchés pour afficher les erreurs
      this.employeeForm.markAllAsTouched();
      this.updateFormErrors(this.employeeForm, "employee");
      this.notificationService.showError(
        "Formulaire invalide",
        "Veuillez corriger les erreurs dans le formulaire",
      );
    }
  }

  // Nouvelle méthode pour la modification d'employé
  updateEmployeeData(employeeId: string): void {
    console.log("Tentative de modification d'employé:", employeeId);

    const formValue = this.employeeForm.value;
    const employeeData: Partial<AddEmployeeData> = {
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      email: formValue.email,
      phone: formValue.phone,
      role: formValue.role as UserRole,
      address: formValue.address as UserAddress,
      agencyId: this.currentUser?.agencyId,
    };

    // Inclure le mot de passe seulement s'il est fourni
    if (formValue.password && formValue.password.trim() !== "") {
      employeeData.password = formValue.password;
    }

    this.agencyService.updateEmployee(employeeId, employeeData).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        console.log("[DEBUG] Réponse modification employee:", response);

        if (response.success) {
          // Succès - réinitialiser les erreurs
          this.employeeFormError = null;
          this.employeeFormDetailedErrors = {};

          this.notificationService.showSuccess(
            "Employé modifié avec succès",
            response.message || "L'employé a été modifié avec succès !",
          );

          //  Recharger la liste après modification
          if (this.currentUser?.agencyId) {
            this.loadEmployees(this.currentUser.agencyId);
            // Recharger les collecteurs car le rôle peut avoir changé
            this.loadCollectors(this.currentUser.agencyId);
          }

          // Fermer le drawer et réinitialiser
          this.closeAddEmployeeModal();
        } else {
          // Erreur - afficher les erreurs exactes du backend
          this.employeeFormError =
            response.error || "Erreur lors de la modification de l'employé";
          this.employeeFormDetailedErrors = response.detailedErrors || {};

          console.error(
            "Message affiché à l'utilisateur:",
            this.employeeFormError,
          );
          console.error(
            "Erreurs détaillées affichées:",
            this.employeeFormDetailedErrors,
          );

          // Afficher aussi une notification
          this.notificationService.showError(
            "Erreur lors de la modification",
            this.employeeFormError || "Erreur inconnue",
          );
        }
      },
      error: (errorResponse) => {
        this.isLoading = false;
        console.log("=== ERREUR HTTP MODIFICATION ===");
        console.log("Erreur complète:", errorResponse);

        if (errorResponse.error) {
          this.employeeFormError = errorResponse.error;
          this.employeeFormDetailedErrors = errorResponse.detailedErrors || {};
        } else {
          this.employeeFormError = "Erreur de communication avec le serveur";
          this.employeeFormDetailedErrors = {};
        }

        console.log(
          "Message d'erreur final (dashboard):",
          this.employeeFormError,
        );

        this.notificationService.showError(
          "Erreur lors de la modification",
          this.employeeFormError || "Erreur inconnue",
        );
      },
    });
  }

  //creation ou modification d un tarif
  addTariff(): void {
    if (this.tariffForm.valid) {
      // Vérifier si on est en mode modification ou création
      if (
        this.isEditingTariff &&
        this.tariffToUpdate &&
        this.tariffToUpdate._id
      ) {
        // Mode modification - utiliser updateTariff
        this.updateTariff(this.tariffToUpdate._id);
        return;
      }

      // Mode création - continuer avec la logique normale
      const formValue = this.tariffForm.value;
      const agencyId = this.currentUser?.agencyId;
      const tarif: Tarif = {
        agencyId: agencyId || "",
        planType: formValue.type,
        price: formValue.price,
        description: formValue.description,
        numberOfPasses: formValue.nbPassages,
        createdAt: new Date(),
        updatedAt: new Date(),
        feePayer: formValue.feePayer || "AGENCE",
      };
      console.log("[DEBUG] Tarif:", tarif);
      this.agencyService.addTariff(tarif).subscribe({
        next: (response: any) => {
          this.isLoading = false;
          console.log("[DEBUG] Réponse ajout tarif:", response);

          const isSuccess =
            response?.success ||
            response?.status === "success" ||
            (typeof response?.message === "string" &&
              (response.message.toLowerCase().includes("succès") ||
                response.message.toLowerCase().includes("réussi"))) ||
            !!response;

          if (isSuccess) {
            if (response) {
              this.notificationService.showSuccess(
                "Le tarif a été ajouté avec succès !",
                "vous pouvez désormais le consulter dans la liste des tarifs, disponible dans la section Zones",
              );

              // Fermer le modal et nettoyer l'état
              this.closeZoneModal();
              this.loadTariffs();
            } else {
              const errorMsg = this.getFriendlyMessage(
                response?.message || response?.error || "",
                false,
              );
              this.notificationService.showError(
                "Erreur lors de l’ajout du tarif",
                errorMsg,
              );
            }
          }
        },
        error: (error) => {
          this.isLoading = false;
          const errorMsg = this.getFriendlyMessage(
            error?.error?.message || error?.error || "",
            false,
          );
          this.notificationService.showError(
            "Erreur lors de l’ajout du tarif",
            errorMsg,
          );
        },
      });
    }
  }
  // recuperations des tarifs liee a une agences
  tariffs: Tarif[] = [];
  loadTariffs(): void {
    this.isLoadingTariffs = true;
    const agencyId = this.currentUser?.agencyId;

    console.log("[DEBUG] LoadTariffs - currentUser:", this.currentUser);
    console.log("[DEBUG] LoadTariffs - agencyId utilisé:", agencyId);

    if (!agencyId) {
      console.error("[DEBUG] Aucun agencyId trouvé pour charger les tarifs");
      this.isLoadingTariffs = false;
      return;
    }

    this.agencyService.getAgencyAllTarifs$(agencyId).subscribe({
      next: (response: any) => {
        this.tariffs = response.data;
        console.log("Tarifs récupérés dans dashboard :", this.tariffs);

        // Debug: afficher la structure de chaque tarif pour vérifier les IDs
        if (this.tariffs && this.tariffs.length > 0) {
          console.log("Structure du premier tarif:", this.tariffs[0]);
          console.log("Clés disponibles:", Object.keys(this.tariffs[0]));
          console.log("agencyId du premier tarif:", this.tariffs[0].agencyId);
          console.log("_id du premier tarif:", this.tariffs[0]._id);
        }

        // Mettre à jour le badge des tarifs
        // const tariffsTab = this.tabs.find((tab) => tab.id === "schedules"); // Tariffs tab doesn't exist, using schedules instead
        // if (tariffsTab) {
        //   tariffsTab.badge = this.tariffs.length;
        // }

        this.isLoadingTariffs = false;
      },
      error: (error) => {
        console.error("[DEBUG] Erreur lors du chargement des tarifs :", error);
        this.isLoadingTariffs = false;
      },
    });
  }

  // === Contrats (Phase 6, CONCEPTION_ABONNEMENT_CONTRAT.md §6.3) ===
  contrats: Contrat[] = [];
  isLoadingContrats = false;
  showCreateContratModal = false;
  newContrat: { clientId: string; pricingId: string; frequenceCollecte: string; endDate: string } = {
    clientId: '',
    pricingId: '',
    frequenceCollecte: 'monthly',
    endDate: '',
  };
  contratClientSearch = '';
  contratClientDropdownOpen = false;

  /** Filtre la liste de clients du sélecteur "Nouveau contrat" par nom/prénom (recherche insensible à la casse). */
  get filteredContratClients(): ClientApi[] {
    const term = this.contratClientSearch.trim().toLowerCase();
    if (!term) return this.allAgencyClients;
    return this.allAgencyClients.filter((c: any) =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(term),
    );
  }

  openContratClientDropdown(): void {
    this.contratClientDropdownOpen = true;
  }

  selectContratClient(client: ClientApi): void {
    this.newContrat.clientId = (client as any)._id;
    this.contratClientDropdownOpen = false;
    this.contratClientSearch = '';
  }

  /** Libellé affiché dans le déclencheur du combobox "Client" (nom du client sélectionné, sinon vide). */
  selectedContratClientLabel(): string {
    const client = this.allAgencyClients.find((c: any) => c._id === this.newContrat.clientId) as any;
    return client ? `${client.firstName} ${client.lastName}` : '';
  }

  loadContrats(): void {
    const agencyId = this.currentUser?.agencyId;
    if (!agencyId) return;
    this.isLoadingContrats = true;
    this.contratService.getContratsByAgence$(agencyId).subscribe({
      next: (contrats) => {
        this.contrats = contrats;
        this.isLoadingContrats = false;
      },
      error: () => {
        this.isLoadingContrats = false;
      },
    });
  }

  openCreateContratModal(): void {
    this.newContrat = { clientId: '', pricingId: '', frequenceCollecte: 'monthly', endDate: '' };
    this.contratClientSearch = '';
    this.contratClientDropdownOpen = false;
    this.showCreateContratModal = true;
  }

  closeCreateContratModal(): void {
    this.showCreateContratModal = false;
  }

  onCreerContrat(): void {
    const agencyId = this.currentUser?.agencyId;
    if (!agencyId || !this.newContrat.clientId || !this.newContrat.pricingId || !this.newContrat.frequenceCollecte) {
      this.notificationService.showError('Erreur', 'Merci de renseigner le client, le plan tarifaire et la fréquence.');
      return;
    }
    this.contratService
      .creerContrat$({
        clientId: this.newContrat.clientId,
        agencyId,
        pricingId: this.newContrat.pricingId,
        frequenceCollecte: this.newContrat.frequenceCollecte as any,
        endDate: this.newContrat.endDate || undefined,
      })
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Succès', 'Contrat créé avec succès.');
          this.closeCreateContratModal();
          this.loadContrats();
        },
        error: (error) => {
          this.notificationService.showError('Erreur', error?.error?.message || 'Impossible de créer le contrat.');
        },
      });
  }

  onResilierContrat(contratId: string): void {
    if (!confirm('Êtes-vous sûr de vouloir résilier ce contrat ?')) return;
    const raisonResiliation = prompt('Motif de résiliation (optionnel) :') || undefined;
    this.contratService.resilierContrat$(contratId, raisonResiliation).subscribe({
      next: () => {
        this.notificationService.showSuccess('Succès', 'Contrat résilié avec succès.');
        this.loadContrats();
      },
      error: (error) => {
        this.notificationService.showError('Erreur', error?.error?.message || 'Impossible de résilier le contrat.');
      },
    });
  }

  onSuspendreContrat(contratId: string): void {
    if (!confirm('Êtes-vous sûr de vouloir suspendre ce contrat ?')) return;
    this.contratService.suspendreContrat$(contratId).subscribe({
      next: () => {
        this.notificationService.showSuccess('Succès', 'Contrat suspendu avec succès.');
        this.loadContrats();
      },
      error: (error) => {
        this.notificationService.showError('Erreur', error?.error?.message || 'Impossible de suspendre le contrat.');
      },
    });
  }

  onReactiverContrat(contratId: string): void {
    if (!confirm('Êtes-vous sûr de vouloir réactiver ce contrat ?')) return;
    this.contratService.reactiverContrat$(contratId).subscribe({
      next: () => {
        this.notificationService.showSuccess('Succès', 'Contrat réactivé avec succès.');
        this.loadContrats();
      },
      error: (error) => {
        this.notificationService.showError('Erreur', error?.error?.message || 'Impossible de réactiver le contrat.');
      },
    });
  }

  onGenererDocument(contratId: string): void {
    this.contratService.genererDocument$(contratId).subscribe({
      next: (response: any) => {
        this.notificationService.showSuccess('Succès', 'Document généré avec succès.');
        if (response?.documentUrl) window.open(response.documentUrl, '_blank');
        this.loadContrats();
      },
      error: (error) => {
        this.notificationService.showError('Erreur', error?.error?.message || 'Impossible de générer le document.');
      },
    });
  }

  // === Redevances d'un contrat (drawer, accessible depuis l'onglet Contrats) ===
  showRedevancesDrawer = false;
  redevancesDrawerContrat: Contrat | null = null;
  redevancesDrawerList: Redevance[] = [];
  isLoadingRedevancesDrawer = false;

  openRedevancesDrawer(contrat: Contrat): void {
    this.redevancesDrawerContrat = contrat;
    this.showRedevancesDrawer = true;
    this.isLoadingRedevancesDrawer = true;
    this.redevanceService.getRedevancesByContrat$(contrat._id).subscribe({
      next: (redevances) => {
        this.redevancesDrawerList = redevances;
        this.isLoadingRedevancesDrawer = false;
      },
      error: () => {
        this.isLoadingRedevancesDrawer = false;
      },
    });
  }

  closeRedevancesDrawer(): void {
    this.showRedevancesDrawer = false;
    this.redevancesDrawerContrat = null;
    this.redevancesDrawerList = [];
  }

  redevanceStatusLabel(status: string): string {
    const map: { [key: string]: string } = { en_attente: 'En attente', retard: 'En retard', paye: 'Payée', annule: 'Annulée' };
    return map[status] || status;
  }

  /**
   * Marque une redevance payée manuellement (espèces, etc.) — sans
   * `transactionId`, pour un paiement constaté par l'agence hors mobile
   * money (voir `RedevanceService.payerRedevance$`, Phase 8).
   */
  onMarquerRedevancePayee(redevance: Redevance): void {
    if (!confirm(`Confirmer que la redevance "${redevance.periodLabel}" (${redevance.montant} FCFA) a été payée ?`)) return;
    this.redevanceService.payerRedevance$(redevance._id).subscribe({
      next: () => {
        this.notificationService.showSuccess('Succès', 'Redevance marquée comme payée.');
        if (this.redevancesDrawerContrat) this.openRedevancesDrawer(this.redevancesDrawerContrat);
      },
      error: (error) => {
        this.notificationService.showError('Erreur', error?.error?.message || 'Impossible de marquer cette redevance comme payée.');
      },
    });
  }

  contratClientName(contrat: Contrat): string {
    const client = contrat.clientId as any;
    return client?.firstName ? `${client.firstName} ${client.lastName}` : '';
  }

  contratFrequenceLabel(frequence: string): string {
    const map: { [key: string]: string } = { daily: 'Quotidienne', weekly: 'Hebdomadaire', monthly: 'Mensuelle' };
    return map[frequence] || frequence;
  }

  contratStatusLabel(status: string): string {
    const map: { [key: string]: string } = { actif: 'Actif', suspendu: 'Suspendu', resilie: 'Résilié' };
    return map[status] || status;
  }

  //recupere les planning d une agence
  schedules: any[] = [];
  schedulesTeams: any[] = []; // équipes V2 pour résolution des noms

  loadPlannings(): void {
    this.isLoadingSchedules = true;
    const agencyId = this.currentUser?.agencyId;

    if (!agencyId) {
      this.isLoadingSchedules = false;
      return;
    }

    // Chargement en parallèle : plannings V2 + équipes V2
    forkJoin([
      this.agencyService.getAllPlanningsV2$(agencyId),
      this.schedulesTeams.length
        ? of(this.schedulesTeams)
        : this.agencyService.getTeamsV2$(agencyId),
    ]).subscribe({
      next: ([plannings, teams]) => {
        if (teams.length) this.schedulesTeams = teams;

        this.schedules = plannings.map((p: any) => ({
          _id: p._id,
          libelle: p.libelle || "",
          reference: p.reference || "",
          date: p.date || "",
          startTime: p.startTime || "08:00",
          endTime: p.endTime || "",
          status: p.planningStatus || p.status || "brouillon",
          type: p.type || "",
          zone: p.zone || p.quartier || p.secteur || p.ville || "",
          teamId: p.teamId || null,
          teamIds: Array.isArray(p.equipeIds) ? p.equipeIds : [],
          teamName: this._resolveTeamName(p, teams),
          collectors: [],
          createdAt: p.createdAt,
        }));

        const schedulesTab = this.tabs.find(t => t.id === "schedules");
        if (schedulesTab) schedulesTab.badge = this.schedules.length;
        this.isLoadingSchedules = false;
        this.cdr.detectChanges();
      },
      error: () => { this.isLoadingSchedules = false; },
    });
  }

  private _resolveTeamName(p: any, teams: any[]): string {
    // Plannings de type zone/secteur/groupe : équipes dans equipeIds (peuplé par le backend)
    if (Array.isArray(p.equipeIds) && p.equipeIds.length) {
      return p.equipeIds
        .map((e: any) => (typeof e === "string" ? teams.find((t: any) => t._id === e)?.name : e?.name))
        .filter(Boolean)
        .join(", ");
    }
    // Champ legacy : teamId (ObjectId string ou objet peuplé)
    if (p.teamId) {
      if (typeof p.teamId === "object") return p.teamId?.name ?? "";
      const team = teams.find((t: any) => t._id === p.teamId);
      return team?.name ?? "";
    }
    return "";
  }


  // supprimer un planning
  deletePlanning(schedulesId: string): void {
    if (!schedulesId) {
      console.warn("Aucun ID de planning fourni.");
      this.notificationService.showWarning(
        "Attention",
        "ID de planning manquant",
      );
      return;
    }

    // Demander confirmation
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce planning ?")) {
      return;
    }

    this.isDeleting = true;
    console.log("Suppression du planning:", schedulesId);

    this.agencyService.deletePlanning$(schedulesId).subscribe({
      next: () => {
        this.notificationService.showSuccess(
          "Succès",
          "Le planning a été supprimé avec succès.",
        );
        this.loadPlannings(); // Recharger la liste
        this.isDeleting = false;
      },
      error: (error) => {
        console.error(
          "Erreur complète lors de la suppression du planning:",
          error,
        );
        let errorMessage = "Impossible de supprimer le planning";

        // Gestion détaillée des erreurs du backend — `error.error.error.message`
        // en premier : forme renvoyée par deletePlanningV2 (ex. BUSINESS_RULE_
        // VIOLATION quand le planning n'est plus au statut 'brouillon'), migré
        // depuis l'ancien endpoint V1 qui renvoyait un `message` à plat.
        if (error.error?.error?.message) {
          errorMessage = error.error.error.message;
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (typeof error.error?.error === 'string') {
          errorMessage = error.error.error;
        } else if (error.message) {
          errorMessage = error.message;
        }

        this.notificationService.showError(
          "Erreur de suppression",
          errorMessage,
        );
        this.isDeleting = false;
      },
    });
  }

  tariffToUpdate: Tarif | null = null;
  isEditingTariff: boolean = false; // Nouvelle propriété pour le mode édition
  //update un tarif via l api
  updateTariff(tariffId: string): void {
    // Vérifier que nous avons bien un tarif à modifier
    if (!this.tariffToUpdate || !this.tariffToUpdate._id) {
      this.notificationService.showError(
        "Erreur",
        "Aucun tarif sélectionné pour la modification",
      );
      return;
    }

    this.isLoading = true;

    // Récupérer les données du formulaire
    const formValue = this.tariffForm.value;

    // Utiliser directement l'ID du tarif stocké
    const actualTariffId = this.tariffToUpdate._id;

    const originalAgencyId = this.tariffToUpdate.agencyId;
    const fallbackAgencyId = this.currentUser?._id || "";
    const finalAgencyId = originalAgencyId || fallbackAgencyId;

    const payload = {
      id: actualTariffId,
      agencyId: finalAgencyId,
      planType: formValue.type,
      price: formValue.price,
      description: formValue.description || "",
      numberOfPasses: formValue.nbPassages || 0,
      feePayer: formValue.feePayer || "AGENCE",
    };

    this.agencyService.updateTariff$(actualTariffId, payload).subscribe({
      next: (response: any) => {
        this.isLoading = false;

        if (response && response.success) {
          this.notificationService.showSuccess(
            "Modification réussie",
            response.message || "Le tarif a été modifié avec succès !",
          );

          // Recharger la liste des tarifs
          this.loadTariffs();

          // Fermer le modal de formulaire et réinitialiser l'état
          this.closeZoneModal();
        } else {
          const errorMsg =
            response?.message || "Erreur lors de la modification du tarif";
          this.notificationService.showError(
            "Erreur de modification",
            errorMsg,
          );
        }
      },
      error: (error) => {
        this.isLoading = false;

        let errorMessage = "Erreur lors de la modification du tarif";
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }

        this.notificationService.showError(
          "Erreur de modification",
          errorMessage,
        );
      },
    });
  }

  // supprimer un tarif
  deleteTariff(tariff: any): void {
    this.isDeleting = true;
    const tariffId = tariff._id;

    // IMPORTANT: Utiliser l'agencyId du tarif lui-même si disponible
    const originalAgencyId = tariff.agencyId;
    const fallbackAgencyId = this.currentUser?._id || "";
    const finalAgencyId = originalAgencyId || fallbackAgencyId;

    console.log("[DEBUG] DeleteTariff - tariffId:", tariffId);
    console.log("[DEBUG] DeleteTariff - originalAgencyId:", originalAgencyId);
    console.log("[DEBUG] DeleteTariff - fallbackAgencyId:", fallbackAgencyId);
    console.log("[DEBUG] DeleteTariff - finalAgencyId:", finalAgencyId);
    console.log("[DEBUG] DeleteTariff - tariff object:", tariff);

    if (tariffId && finalAgencyId) {
      this.agencyService.deleteTarif$(tariffId, finalAgencyId).subscribe(
        () => {
          this.notificationService.showSuccess(
            "Succès",
            "Le tarif a été supprimé avec succès.",
          );
          this.isDeleting = false;
          this.loadTariffs();
        },
        (error) => {
          this.notificationService.showError(
            "Erreur",
            "Impossible de supprimer le tarif. Veuillez réessayer.",
          );
          console.error("Erreur lors de la suppression du tarif :", error);
          this.isDeleting = false;
        },
      );
    } else {
      console.warn("ID du tarif ou ID de l'agence manquant.");
      this.isDeleting = false;
    }
  }

  // Méthodes utilitaires pour les tarifs
  formatTariffDate(date: string | Date | undefined): string {
    if (!date) return "Non défini";

    try {
      const dateObject = typeof date === "string" ? new Date(date) : date;
      return dateObject.toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return "Date invalide";
    }
  }

  editTariff(tariff: any): void {
    console.log("Édition du tarif:", tariff);

    if (!tariff || !tariff._id) {
      this.notificationService.showError(
        "Erreur",
        "Tarif invalide pour la modification",
      );
      return;
    }

    // Passer en mode édition
    this.isEditingTariff = true;
    this.tariffToUpdate = tariff;

    // Pré-remplir le formulaire avec les données du tarif existant
    console.log("Données à pré-remplir:", {
      type: tariff.planType,
      price: tariff.price,
      description: tariff.description,
      nbPassages: tariff.numberOfPasses,
    });

    this.tariffForm.patchValue({
      type: tariff.planType || "",
      price: tariff.price || "",
      description: tariff.description || "",
      nbPassages: tariff.numberOfPasses || "",
      feePayer: tariff.feePayer || "AGENCE",
    });

    // Marquer le formulaire comme non touché et propre pour éviter les erreurs de validation
    this.tariffForm.markAsUntouched();
    this.tariffForm.markAsPristine();

    // Effacer les erreurs précédentes
    Object.keys(this.formErrors).forEach((key) => {
      if (key.startsWith("tariff_")) {
        delete this.formErrors[key];
      }
    });

    // Fermer le drawer des tarifs et ouvrir le modal de formulaire
    this.showTariffsModal = false;
    this.showZoneModal = true;

    // Debug: vérifier que le formulaire est bien pré-rempli
    setTimeout(() => {
      console.log(
        "Valeurs du formulaire tarif après pré-remplissage:",
        this.tariffForm.value,
      );
    }, 100);

    this.notificationService.showInfo(
      "Modification",
      "Formulaire ouvert pour modification du tarif",
    );
  }

  saveZone(): void {
    if (this.zoneForm.valid) {
      const formValue = this.zoneForm.value;
      const zoneData = {
        name: formValue.name,
        description: formValue.description,
        cities: formValue.cities,
        neighborhoods: formValue.neighborhoods,
        isActive: formValue.isActive,
      };

      if (this.editingZone) {
        const index = this.serviceZones.findIndex((z) => z.id === formValue.id);
        if (index !== -1) {
          this.serviceZones[index] = { ...formValue };
        }
        this.notificationService.showSuccess(
          "Zone modifiée",
          "La zone a été modifiée avec succès",
        );
      } else {
        const zone: ServiceZones = {
          name: zoneData.name,
          description: zoneData.description,
          boundaries: [],
          neighborhoods: zoneData.neighborhoods,
          cities: zoneData.cities,
          assignedCollectors: [],
          isActive: zoneData.isActive,
        };
        this.serviceZoness.push(zone);
        this.notificationService.showSuccess(
          "Zone ajoutée",
          "La zone a été créée avec succès",
        );
      }

      this.showZoneModal = false;
      this.editingZone = false;
      this.zoneForm.reset(); // Reset du formulaire
      this.citiesInput = "";
      this.neighborhoodsInput = "";
    } else {
      // Formulaire invalide
      this.zoneForm.markAllAsTouched();
      this.updateFormErrors(this.zoneForm, "zone");
      this.notificationService.showError(
        "Formulaire invalide",
        "Veuillez corriger les erreurs dans le formulaire",
      );
    }
  }

  validateClient(clientId: string): void {
    console.log("[validateClient] called for", clientId);
    this.clientService.validateClientSubscription(clientId).subscribe({
      next: () => {
        console.log("[validateClient] success for", clientId);
        this.notificationService.showSuccess(
          "Validation",
          "Abonnement validé avec succès !",
        );
        this.loadClients();
      },
      error: (err) => {
        this.notificationService.showError(
          "Validation",
          "Validation a échoué  ! " + err?.error?.error,
        );
        console.error("[validateClient] error for", clientId, err);
      },
    });
  }

  investigateIncident(): void {
    // const incident = this.incidents.find(i => i.id === incidentId);
    // if (incident) {
    //   incident.status = 'investigating';
    //   incident.assignedTo = 'Inspecteur Municipal';
    //   this.filterIncidents();
    //   this.notificationService.showSuccess('Enquête', 'Incident pris en charge pour enquête');
    // }
  }
  /**
   * Corrigé (Prompt 06) : ce filtre ne faisait jusqu'ici RIEN (logique
   * entièrement commentée, `filteredIncidents` jamais réassigné) — les deux
   * `<select>` du template semblaient fonctionnels mais ne changeaient jamais
   * la liste affichée. `origine`/`status` sont désormais filtrés côté serveur
   * (l'endpoint `/api/signalements` le permet) ; `severity` reste un filtre
   * client (non supporté par cet endpoint) — voir `loadAgencyReports()`.
   */
  filterIncidents(): void {
    this.loadAgencyReports(this.currentUser);
  }
  contactAgencyForIncident(): void {
    this.contactAgency();
  }

  contactAgency(): void {
    this.notificationService.showInfo(
      "Contact",
      "Ouverture des informations de contact",
    );
  }

  getSeverityText(severity: string): string {
    const texts = {
      critical: "Critique",
      high: "Élevé",
      medium: "Moyen",
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

  getSeverityIcon(severity: string): string {
    const icons = {
      critical: "dangerous",
      high: "priority_high",
      medium: "warning",
      low: "info",
    };
    return icons[severity as keyof typeof icons] || "help";
  }

  getIncidentStatusText(status: string): string {
    const statuses = {
      open: "Ouvert",
      pending: "En cours",
      resolved: "Résolu",
    };
    return statuses[status as keyof typeof statuses] || status;
  }
  /**
   * Même correctif que `onAssignReportToTeam` ci-dessus : `id` est désormais un
   * `Signalement._id` (les deux origines confondues), plus jamais un
   * `Collecte._id` — appelle `resolveSignalement$` (`PATCH /api/signalements/:id/resolve`)
   * au lieu de l'ancien `resolveReport$` (`PATCH /collectes/:id/resolve`), qui
   * échouerait pour tout signalement indépendant (aucune Collecte à résoudre).
   */
  resolveIncident(id: string) {
    this.agencyService.resolveSignalement$(id).subscribe({
      next: () => {
        this.notificationService.showSuccess("Résolu", "Le signalement a été marqué comme résolu.");
        this.loadAgencyReports(this.currentUser);
        this.loadAgencyStatistics(this.currentUser);
      },
      error: (error: any) => {
        console.error("Erreur lors de la résolution du signalement:", error);
        const msg = error?.error?.message || "Impossible de résoudre ce signalement pour le moment.";
        this.notificationService.showError("Erreur", msg);
      },
    });
  }
  selectedSchedule: any = null;

  openScheduleDetails(schedule: any): void {
    console.log("L'equipe assigné >>>>>>>", schedule);
    this.selectedSchedule = schedule;
  }

  closeModal(): void {
    this.selectedSchedule = null;
  }

  getScheduleDateString(schedule: any): string {
    if (!schedule?.date) return "—";
    const raw: string = schedule.date;
    const datePart = raw.includes("T") ? raw.split("T")[0] : raw;
    const parts = datePart.split("-");
    if (parts.length !== 3) return raw;
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  }

  duplicateSchedule(schedule: any): void {
    if (!schedule?._id) return;
    this.closeModal();
    this.router.navigate(["/planning/create"], { queryParams: { duplicate: schedule._id } });
  }

  navigateEditSchedule(schedule: any): void {
    if (!schedule?._id) return;
    this.closeModal();
    this.router.navigate(["/planning/create"], { queryParams: { edit: schedule._id } });
  }

  viewScheduleDetail(schedule: any): void {
    if (!schedule?._id) return;
    this.closeModal();
    this.router.navigate(["/planning/detail", schedule._id]);
  }

  editSchedule(schedule: any): void {
    if (!schedule?._id) return;
    this.router.navigate(['/planning/create'], { queryParams: { edit: schedule._id } });
  }


  showTariffsModal = false;

  openTariffsModal() {
    // Réinitialiser le formulaire sauf si on est en mode édition
    if (!this.isEditingTariff && !this.tariffToUpdate) {
      this.tariffForm.reset();
    }
    this.showTariffsModal = true;
  }

  closeTariffsModal() {
    this.showTariffsModal = false;
    this.tariffForm.reset();
    this.tariffToUpdate = null; // Réinitialiser le mode édition
    this.isEditingTariff = false; // Sortir du mode édition

    // Effacer les erreurs du formulaire
    Object.keys(this.formErrors).forEach((key) => {
      if (key.startsWith("tariff_")) {
        delete this.formErrors[key];
      }
    });
  }
  zones: any[] = [];
  agencyZonesActivite: any[] = []; // Variable pour stocker les zones d'activité de l'agence

  //recuperation des zones
  loadZones(currentUser: any): void {
    // Éviter le rechargement si les zones sont déjà chargées
    // if (this.zones.length > 0 && !this.isLoadingZones) {
    //   console.log("Zones déjà chargées, pas besoin de recharger");
    //   return;
    // }

    this.isLoadingZones = true;
    if (currentUser && currentUser._id) {
      const agencyId = currentUser.agencyId;
      this.agencyService.getAllzones$(agencyId).subscribe({
        next: (zones: any) => {
          console.log("zones charger>>>>>> :", zones);
          // S'assurer que zones est toujours un tableau
          if (zones && zones.data && Array.isArray(zones.data)) {
            this.zones = zones.data;
          } else if (Array.isArray(zones)) {
            this.zones = zones;
          } else {
            console.warn("Format de zones inattendu:", zones);
            this.zones = [];
          }

          console.log("zones charger>>>>>> :", this.zones);
          if (this.zones.length > 0) {
            console.log("Structure d'une zone:", this.zones[0]);
          }

          // Invalider le cache car les zones ont changé
          this.invalidateCache();

          const ZonesTab = this.tabs.find((tab) => tab.id === "zones");
          if (ZonesTab) {
            ZonesTab.badge = this.zones.length;
            this.cdr.detectChanges();
          }
          this.isLoadingZones = false;
        },
        error: (error) => {
          console.error(
            "Erreur lors du chargement des Zones de l agence:",
            error,
          );
          this.notificationService.showError(
            "Erreur",
            "Erreur lors du chargement des Zones de l agence.",
          );
          this.isLoadingZones = false;
        },
      });
    } else {
      console.warn("Aucun ID d'utilisateur courant disponible.");
      this.isLoadingZones = false;
    }
  }

  /**
   * Invalide le cache des valeurs calculées
   */
  private invalidateCache(): void {
    this._cachedWorkloadPercentage = null;
    this._cachedEstimatedCoverage = null;
    this._cachedTotalZoneClients = null;
    this._cacheTimestamp = 0;
  }

  // Méthode pour retirer une zone
  removeZone(zone: any): void {
    if (!zone) {
      console.warn("Zone non définie");
      return;
    }

    // Afficher une confirmation avant suppression
    const zoneName = zone.neighborhood || zone.name || zone;
    const confirmed = confirm(
      `Êtes-vous sûr de vouloir retirer la zone "${zoneName}" ?`,
    );

    if (confirmed) {
      // Retirer la zone de la liste locale
      this.zones = this.zones.filter((z) => {
        // Comparaison robuste selon la structure de l'objet zone
        if (typeof z === "string" && typeof zone === "string") {
          return z !== zone;
        }
        if (z._id && zone._id) {
          return z._id !== zone._id;
        }
        if (z.id && zone.id) {
          return z.id !== zone.id;
        }
        return z !== zone;
      });

      // Invalider le cache des valeurs calculées
      this.invalidateCache();

      // Mettre à jour le badge du tab zones
      const zonesTab = this.tabs.find((tab) => tab.id === "zones");
      if (zonesTab) {
        zonesTab.badge = this.zones.length;
        this.cdr.detectChanges();
      }

      // Réinitialiser la zone sélectionnée si c'est celle qui vient d'être retirée
      if (this.selectedZoneForDisplay === zone) {
        this.selectedZoneForDisplay = null;
      }

      // Afficher une notification de succès
      this.notificationService.showSuccess(
        "Succès",
        `La zone "${zoneName}" a été retirée avec succès.`,
      );

      console.log(`Zone "${zoneName}" retirée. Zones restantes:`, this.zones);
    }
  }

  getInitials(fullName: string) {
    return this.sharedService.getInitials(fullName);
  }

  getRandomColor(item: any): string {
    return this.sharedService.getRandomColor(item);
  }
  closeClientDetailsModal(): void {
    this.showClientDetailsModal = false;
    this.selectedClient = null;
  }
  editEmployee(employee: any): void {
    console.log("Édition de l'employé :", employee);

    // Configurer le mode édition
    this.isEditingEmployee = true;
    this.employeeToEdit = { ...employee };

    // Pré-remplir le formulaire avec les données de l'employé (SANS les mots de passe)
    this.employeeForm.patchValue({
      firstName: employee.firstName || "",
      lastName: employee.lastName || "",
      email: employee.email || "",
      phone: employee.phone || "",
      role: employee.role || "",
      password: "", // Ne jamais pré-remplir le mot de passe
      confirmPassword: "", // Ne jamais pré-remplir la confirmation
      zones: employee.zones || [],
      address: {
        city: employee.address?.city || "",
        arrondissement: employee.address?.arrondissement || "",
        sector: employee.address?.sector || "",
        neighborhood: employee.address?.neighborhood || "",
        street: employee.address?.street || "",
        doorNumber: employee.address?.doorNumber || "",
        doorColor: employee.address?.doorColor || "",
        postalCode: employee.address?.postalCode || "",
      },
    });

    // Charger les dépendances de l'adresse si elles existent
    if (employee.address?.city) {
      this.loadEmployeeAddressDependencies(employee.address);
    }

    // Ajuster les validateurs pour le mode modification
    this.adjustValidatorsForEdit();

    // Ouvrir le drawer d'ajout/modification d'employé
    this.openEmployeeDrawer();

    this.notificationService.showInfo(
      "Modification",
      "Formulaire ouvert pour modification",
    );
  }

  // Méthode pour ajuster les validateurs selon le mode (ajout/modification)
  private adjustValidatorsForEdit(): void {
    const passwordControl = this.employeeForm.get("password");
    const confirmPasswordControl = this.employeeForm.get("confirmPassword");

    if (this.isEditingEmployee) {
      // En mode modification : les mots de passe deviennent optionnels
      passwordControl?.clearValidators(); // Complètement optionnel
      confirmPasswordControl?.clearValidators(); // Complètement optionnel

      // Si un mot de passe est saisi, il doit être valide (min 6 caractères)
      passwordControl?.setValidators((control) => {
        if (!control.value || control.value === "") {
          return null; // Valide si vide
        }
        return control.value.length >= 6
          ? null
          : {
            minlength: {
              requiredLength: 6,
              actualLength: control.value.length,
            },
          };
      });
    } else {
      // En mode ajout : les mots de passe sont obligatoires
      passwordControl?.setValidators([
        Validators.required,
        Validators.minLength(6),
      ]);
      confirmPasswordControl?.setValidators([Validators.required]);
    }

    // Mettre à jour la validité
    passwordControl?.updateValueAndValidity();
    confirmPasswordControl?.updateValueAndValidity();
  }

  // Méthode pour charger les dépendances de l'adresse lors de l'édition
  private loadEmployeeAddressDependencies(address: any): void {
    // Charger les arrondissements pour la ville sélectionnée
    if (address.city && address.city === "Ouagadougou") {
      // Utiliser OUAGA_DATA directement puisque nous avons seulement Ouagadougou pour l'instant
      this.arrondissements = OUAGA_DATA || [];

      // Charger les secteurs pour l'arrondissement sélectionné
      if (address.arrondissement && this.arrondissements.length > 0) {
        const selectedArrondissement = this.arrondissements.find(
          (arr) => arr.arrondissement === address.arrondissement,
        );
        if (selectedArrondissement) {
          this.secteurs = selectedArrondissement.secteurs || [];

          // Charger les quartiers pour le secteur sélectionné
          if (address.sector && this.secteurs.length > 0) {
            const selectedSecteur = this.secteurs.find(
              (sect) => sect.secteur === address.sector,
            );
            if (selectedSecteur) {
              this.quartiers = selectedSecteur.quartiers || [];
            }
          }
        }
      }
    }
  }

  // recuperations des collecte par jour d une agences
  dayCollectes: any;

  loadCollectDay(): void {
    this.isLoadingCollections = true;
    const agencyId = this.currentUser?.agencyId;

    if (!agencyId) {
      console.error(
        "[DEBUG] Aucune collecte trouvée pour cette agence en jour",
      );
      this.notificationService.showError(
        "Erreur",
        "Aucune agence sélectionnée.",
      );
      this.isLoadingCollections = false;
      return;
    }
    this.agencyService.getAgencyAllCollectes$(agencyId).subscribe({
      next: (response) => {
        this.dayCollectes = response || [];
        console.log("Collectes journalières récupérées :", this.dayCollectes);
        const CollectesTab = this.tabs.find((tab) => tab.id === "collections");
        if (CollectesTab) {
          CollectesTab.badge = this.dayCollectes.length;
        }
        // Initialiser la pagination côté client
        this.collectesCurrentPage = 1;
        this.applyCollectesPagination();
        this.isLoadingCollections = false;
      },
      error: (error) => {
        console.error("Erreur récupération collectes :", error);
        const message =
          error?.error?.message || "Impossible de récupérer les collectes.";
        this.notificationService.showError("Erreur", message);
        this.isLoadingCollections = false;
      },
    });
  }

  /** Applique le filtre de statut + la pagination locale sur dayCollectes */
  applyCollectesPagination(): void {
    const all = Array.isArray(this.dayCollectes) ? this.dayCollectes : [];
    const filtered =
      this.collectionsFilter === 'all'
        ? all
        : all.filter((c: any) => c.status?.toLowerCase() === this.collectionsFilter);
    this.collectesTotalItems = filtered.length;
    this.collectesTotalPages = Math.ceil(this.collectesTotalItems / this.collectesItemsPerPage);
    if (this.collectesCurrentPage > this.collectesTotalPages && this.collectesTotalPages > 0) {
      this.collectesCurrentPage = this.collectesTotalPages;
    }
    if (this.collectesCurrentPage < 1) { this.collectesCurrentPage = 1; }
    const start = (this.collectesCurrentPage - 1) * this.collectesItemsPerPage;
    this.pagedCollectes = filtered.slice(start, start + this.collectesItemsPerPage);
  }

  goToCollectesPage(page: number): void {
    if (page >= 1 && page <= this.collectesTotalPages) {
      this.collectesCurrentPage = page;
      this.applyCollectesPagination();
    }
  }

  getCollectesPageNumbers(): number[] {
    const max = 5;
    let start = Math.max(1, this.collectesCurrentPage - Math.floor(max / 2));
    const end = Math.min(this.collectesTotalPages, start + max - 1);
    if (end - start + 1 < max) { start = Math.max(1, end - max + 1); }
    const pages: number[] = [];
    for (let i = start; i <= end; i++) { pages.push(i); }
    return pages;
  }

  getCollectesEndItem(): number {
    return Math.min(this.collectesCurrentPage * this.collectesItemsPerPage, this.collectesTotalItems);
  }

  changeCollectesItemsPerPage(size: number): void {
    this.collectesItemsPerPage = size;
    this.collectesCurrentPage = 1;
    this.applyCollectesPagination();
  }

  // recuperations des tarifs liee a une agences
  historyCollecte: any[] = [];

  loadCollectHistory(): void {
    this.isLoading = true;
    const agencyId = this.currentUser?.agencyId;

    if (!agencyId) {
      console.error(
        "[DEBUG] Aucune collecte trouvée pour cette agence en jour",
      );
      this.notificationService.showError(
        "Erreur",
        "Aucune agence sélectionnée.",
      );
      this.isLoading = false;
      return;
    }

    this.agencyService.getAgencyCompletedCollectes$(agencyId).subscribe({
      next: (response) => {
        this.historyCollecte = response || [];
        console.log(
          "Historique des Collectes récupérées :",
          this.historyCollecte,
        );
        this.isLoading = false;
      },
      error: (error) => {
        console.error(
          "Erreur récupération de l historique des collectes :",
          error,
        );
        const message =
          error?.error?.message || "Impossible de récupérer les collectes.";
        this.notificationService.showError("Erreur", message);

        this.isLoading = false;
      },
    });
  }
  selectedImage: string | null = null;

  openImageModal(imageUrl: string): void {
    this.selectedImage = imageUrl;
  }

  closeImageModal(): void {
    this.selectedImage = null;
  }
  showHistoryModal: boolean = false;
  openHistoryModal(): void {
    this.showHistoryModal = true;
  }

  closeHistoryModal(): void {
    this.showHistoryModal = false;
  }
  //modification  du status de l employee
  toggleEmployeeStatus(employee: any): void {
    console.log("Toggle employee status:", employee);
    // const updatedStatus = !employee.isActive;
    this.agencyService
      .updateEmployeeStatus$(employee._id)
      .subscribe({
        next: (response: any) => {
          // employee.isActive = updatedStatus;

          // Recharger les collecteurs si c'est un collecteur dont le statut a changé
          if (employee.role === "collector" && this.currentUser?.agencyId) {
            this.loadCollectors(this.currentUser.agencyId);
          }
          console.log("employee status change: ", response)
          this.notificationService.showSuccess(
            "Succès",
            response.message
          );
          this.loadEmployees(this.currentUser?.agencyId!);
        },
        error: (error) => {
          console.error("Erreur lors de la mise à jour du statut :", error);
          this.notificationService.showError(
            "Erreur",
            "Impossible de mettre à jour le statut de l'employé.",
          );
        },
      });
  }

  //methode de verification de la disponibilite de l employee
  checkCollectorAvailability(
    collectorId: string,
    date: string,
    startTime: string,
    endTime: string,
  ): boolean {
    // Vérifier que schedules existe et est un tableau
    if (!this.schedules || !Array.isArray(this.schedules)) {
      console.warn("schedules is undefined or not an array, returning false");
      return false;
    }

    return this.schedules.some(
      (schedule) =>
        schedule.collectorId === collectorId &&
        schedule.date === date &&
        ((startTime >= schedule.startTime && startTime < schedule.endTime) ||
          (endTime > schedule.startTime && endTime <= schedule.endTime)),
    );
  }

  // Méthode de vérification de la disponibilité du collecteur pour la modification (exclut le planning en cours de modification)
  checkCollectorAvailabilityForUpdate(
    collectorId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeScheduleId: string,
  ): boolean {
    // Vérifier que schedules existe et est un tableau
    if (!this.schedules || !Array.isArray(this.schedules)) {
      console.warn("schedules is undefined or not an array, returning false");
      return false;
    }

    return this.schedules.some(
      (schedule) =>
        schedule._id !== excludeScheduleId && // Exclure le planning en cours de modification
        schedule.collectorId === collectorId &&
        schedule.date === date &&
        ((startTime >= schedule.startTime && startTime < schedule.endTime) ||
          (endTime > schedule.startTime && endTime <= schedule.endTime)),
    );
  }

  loadZonesMock(): void {
    this.serviceZones = OUAGA_DATA.map((arrondissement) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: arrondissement.arrondissement,
      description: arrondissement.secteurs
        .map((secteur) => `${secteur.secteur}: ${secteur.quartiers.join(", ")}`)
        .join("; "),
      boundaries: [],
      neighborhoods: arrondissement.secteurs.flatMap(
        (secteur) => secteur.quartiers,
      ),
      cities: ["Ouagadougou"],
      isActive: true,
    }));
  }
  arrondissements: QuartierData[] = OUAGA_DATA;
  cities: City[] = [];
  secteurs: { secteur: string; quartiers: string[] }[] = [];
  quartiers: string[] = [];
  onArrondissementChange(arrondissement?: string) {
    if (arrondissement) {
      // Utiliser OUAGA_DATA pour trouver les secteurs
      const arrondissementData = this.arrondissements.find(
        (a) => a.arrondissement === arrondissement,
      );
      if (arrondissementData && arrondissementData.secteurs) {
        this.secteurs = arrondissementData.secteurs;
      } else {
        this.secteurs = [];
      }

      console.log("Secteurs  ==> ", this.secteurs);
      this.quartiers = [];
      this.userData.address.sector = "";
      this.userData.address.neighborhood = [];
    }
  }

  onSecteurChange(secteur: string) {
    if (secteur) {
      // Trouver le secteur dans OUAGA_DATA et récupérer ses quartiers
      const secteurObj = this.secteurs.find((s) => s.secteur === secteur);
      if (secteurObj) {
        this.quartiers = secteurObj.quartiers || [];
        console.log("Quartiers disponibles :", this.quartiers);
      } else {
        this.quartiers = [];
      }
      this.userData.address.neighborhood = [];
    } else {
      this.quartiers = [];
      this.userData.address.neighborhood = [];
    }
  }

  onCityChange(city: string) {
    if (city && city === "Ouagadougou") {
      // Pour Ouagadougou, les arrondissements sont déjà chargés depuis OUAGA_DATA
    } else {
      // Pour les autres villes, réinitialiser
      this.secteurs = [];
      this.quartiers = [];
    }

    // Réinitialiser tous les champs dépendants
    this.secteurs = [];
    this.quartiers = [];
    this.userData.address.arrondissement = "";
    this.userData.address.sector = "";
    this.userData.address.neighborhood = [];
  }

  // Méthodes spécifiques pour le formulaire d'employé
  onEmployeeCityChange(event: Event) {
    const selectedCity = (event.target as HTMLSelectElement)?.value;

    if (selectedCity === "Ouagadougou") {
      // Activer le contrôle arrondissement
      this.employeeForm.get("address.arrondissement")?.enable();
    } else {
      // Pour les autres villes, réinitialiser et désactiver
      this.secteurs = [];
      this.quartiers = [];
      this.employeeForm.get("address.arrondissement")?.disable();
      this.employeeForm.get("address.sector")?.disable();
      this.employeeForm.get("address.neighborhood")?.disable();
    }

    // Réinitialiser tous les champs dépendants
    this.employeeForm.patchValue({
      address: {
        arrondissement: "",
        sector: "",
        neighborhood: "",
      },
    });
    this.secteurs = [];
    this.quartiers = [];
  }

  onEmployeeArrondissementChange(event: Event) {
    const arrondissement = (event.target as HTMLSelectElement)?.value;
    if (arrondissement) {
      const arrondissementObj = this.arrondissements.find(
        (arr) => arr.arrondissement === arrondissement,
      );

      if (arrondissementObj) {
        this.secteurs = arrondissementObj.secteurs || [];
        // Activer le contrôle secteur
        this.employeeForm.get("address.sector")?.enable();

        // Réinitialiser les champs dépendants dans le formulaire employé
        this.employeeForm.get("address.sector")?.setValue("");
        this.employeeForm.get("address.neighborhood")?.setValue("");
        this.quartiers = [];
        // Désactiver le quartier jusqu'à sélection du secteur
        this.employeeForm.get("address.neighborhood")?.disable();
      }
    } else {
      this.secteurs = [];
      this.quartiers = [];
      this.employeeForm.get("address.sector")?.disable();
      this.employeeForm.get("address.neighborhood")?.disable();
    }
  }

  onEmployeeSecteurChange(event: Event) {
    const secteur = (event.target as HTMLSelectElement)?.value;
    if (secteur) {
      const secteurObj = this.secteurs.find((s) => s.secteur === secteur);

      if (secteurObj) {
        this.quartiers = secteurObj.quartiers || [];
        // Activer le contrôle quartier
        this.employeeForm.get("address.neighborhood")?.enable();

        // Réinitialiser le quartier dans le formulaire employé
        this.employeeForm.get("address.neighborhood")?.setValue("");
      }
    } else {
      this.quartiers = [];
      this.employeeForm.get("address.neighborhood")?.disable();
    }
  }

  // Initialiser les données mock pour l'adresse d'employé
  private initializeAddressDataForEmployee(): void {
    // Utiliser directement les données OUAGA_DATA du fichier mock-data.ts
    // Ces données sont déjà chargées dans this.arrondissements

    // Réinitialiser les autres données
    this.secteurs = [];
    this.quartiers = [];

    // Créer une liste simple de villes (pour l'instant juste Ouagadougou)
    this.cities = [
      {
        id: "1",
        name: "Ouagadougou",
        code: "OUA",
        country: { id: "1", name: "Burkina Faso", code: "BF" },
      },
      {
        id: "2",
        name: "Bobo-Dioulasso",
        code: "BOB",
        country: { id: "1", name: "Burkina Faso", code: "BF" },
      },
    ];

    // Initialiser l'état disabled des contrôles d'adresse
    this.employeeForm.get("address.arrondissement")?.disable();
    this.employeeForm.get("address.sector")?.disable();
    this.employeeForm.get("address.neighborhood")?.disable();
  }

  // Initialiser les données mock pour la sélection des zones de couverture
  private initializeAddressDataForZones(): void {
    // Les arrondissements sont déjà chargés depuis OUAGA_DATA
    // Réinitialiser les autres données
    this.secteurs = [];
    this.quartiers = [];

    // Initialiser les villes si pas déjà fait
    if (this.cities.length === 0) {
      this.cities = [
        {
          id: "1",
          name: "Ouagadougou",
          code: "OUA",
          country: { id: "1", name: "Burkina Faso", code: "BF" },
        },
        {
          id: "2",
          name: "Bobo-Dioulasso",
          code: "BOB",
          country: { id: "1", name: "Burkina Faso", code: "BF" },
        },
      ];
    }
  }

  openZoneModalcouverture(): void {
    // Initialiser les données d'adresse pour la sélection des zones
    this.initializeAddressDataForZones();
    this.showZoneModalcouverture = true;
  }

  closeZoneModalcouverture(): void {
    this.showZoneModalcouverture = false;
    // Réinitialiser les erreurs lors de la fermeture du modal
    this.zoneFormError = null;
    this.zoneFormDetailedErrors = {};
  }

  /**
   * Méthode pour fermer les alertes d'erreur de zone
   */
  dismissZoneError(): void {
    this.zoneFormError = null;
    this.zoneFormDetailedErrors = {};
  }

  addZoneAgency(): void {
    // Réinitialiser les erreurs
    this.zoneFormError = null;
    this.zoneFormDetailedErrors = {};

    // Validation côté frontend
    if (!this.validateZoneData()) {
      return;
    }

    const zoneData = {
      zones: this.userData.address.neighborhood,
    };

    const agencyId = this.currentUser?.agencyId;

    if (!agencyId) {
      this.zoneFormError = "ID agence manquant.";
      this.notificationService.showError("Erreur", "ID agence manquant.");
      return;
    }

    console.log("Zone mise à jour :", zoneData);
    this.agencyService.updateAgencyZones$(agencyId, zoneData).subscribe({
      next: (response) => {
        console.log("Zone mise à jour :", response);

        // Utiliser directement les zones retournées par l'API de modification
        if (response.data && response.data.zoneActivite) {
          this.zones = response.data.zoneActivite;
          console.log("Zones récupérées depuis la réponse :", this.zones);

          // Mettre à jour le badge des zones
          const ZonesTab = this.tabs.find((tab) => tab.id === "zones");
          if (ZonesTab) {
            ZonesTab.badge = this.zones.length;
          }
        } else {
          // Fallback : charger les zones si la structure de réponse est différente
          this.loadZones(this.currentUser);
        }

        this.notificationService.showSuccess(
          "Succès",
          "La zone a été mise à jour avec succès.",
        );
        this.closeZoneModalcouverture();
      },
      error: (error) => {
        console.error("Erreur lors de la mise à jour de la zone :", error);

        // Utilisation de la méthode utilitaire pour obtenir un message convivial
        const friendlyMessage = this.getFriendlyZoneErrorMessage(error);
        this.zoneFormError = friendlyMessage;

        // Gestion des erreurs détaillées du backend
        if (error.error && typeof error.error === "object") {
          // Si l'erreur contient des détails de validation
          if (error.error.details) {
            this.zoneFormDetailedErrors = error.error.details;
          }
        }

        this.notificationService.showError("Erreur", friendlyMessage);
      },
    });
  }

  /**
   * Valide les données de zone avant l'envoi
   * @returns boolean - true si les données sont valides
   */
  private validateZoneData(): boolean {
    const { city, arrondissement, sector, neighborhood } =
      this.userData.address;

    if (!city) {
      this.zoneFormError = "Veuillez sélectionner une ville.";
      return false;
    }

    if (!arrondissement) {
      this.zoneFormError = "Veuillez sélectionner un arrondissement.";
      return false;
    }

    if (!sector) {
      this.zoneFormError = "Veuillez sélectionner un secteur.";
      return false;
    }

    if (
      !neighborhood ||
      !Array.isArray(neighborhood) ||
      neighborhood.length === 0
    ) {
      this.zoneFormError = "Veuillez sélectionner au moins un quartier.";
      return false;
    }

    // Validation supplémentaire : vérifier que neighborhood est bien un tableau itérable
    try {
      // Tenter de convertir en tableau si ce n'est pas le cas
      if (typeof neighborhood === "string") {
        this.userData.address.neighborhood = [neighborhood];
      } else if (!Array.isArray(neighborhood)) {
        this.zoneFormError =
          "Format de quartiers invalide. Veuillez reselectionner vos quartiers.";
        return false;
      }
    } catch (error) {
      this.zoneFormError =
        "Erreur de validation des quartiers. Veuillez reselectionner vos quartiers.";
      return false;
    }

    return true;
  }

  /**
   * Méthode utilitaire pour obtenir un message d'erreur convivial
   * @param error - L'erreur retournée par le backend
   * @returns string - Message d'erreur formaté
   */
  private getFriendlyZoneErrorMessage(error: any): string {
    if (error?.error) {
      const backendError = error.error;

      // Messages spécifiques selon le type d'erreur
      if (backendError.error === "newZones is not iterable") {
        return "Format des zones invalide. Veuillez vérifier la sélection des quartiers.";
      }

      if (backendError.message) {
        return backendError.message;
      }

      if (backendError.error) {
        return backendError.error;
      }
    }

    if (error?.message) {
      return error.message;
    }

    return "Une erreur inattendue s'est produite lors de la mise à jour des zones.";
  }

  getAllCountries() {
    // Utiliser les villes définies localement
    console.log("Villes disponibles :", this.cities);
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      this.myScrollContainer.nativeElement.scrollTop =
        this.myScrollContainer.nativeElement.scrollHeight;
    } catch (err) { }
  }

  // ================================
  // méthodes d analyse
  // ================================

  /**
   * Actualise les données d'analyse des zones
   */
  refreshZoneAnalytics(): void {
    this.generateZoneAnalyticsData();
    this.generateZoneRecommendations();
    this.notificationService.showSuccess(
      "Succès",
      "Données d'analyse actualisées",
    );
  }

  /**
   * Retourne le nombre total de clients par type
   */
  getTotalClientsByType(
    type: "household" | "business" | "institution",
  ): number {
    return this.activeClients.filter(
      (client) => this.getClientType(client) === type,
    ).length;
  }

  /**
   * Retourne le pourcentage de clients par type
   */
  getPercentageByType(type: "household" | "business" | "institution"): number {
    const total = this.activeClients.length;
    if (total === 0) return 0;
    const typeCount = this.getTotalClientsByType(type);
    return Math.round((typeCount / total) * 100);
  }

  /**
   * Calcule le pourcentage de charge de travail avec mise en cache
   */
  getWorkloadPercentage(): number {
    const now = Date.now();
    if (
      this._cachedWorkloadPercentage !== null &&
      now - this._cacheTimestamp < this.CACHE_DURATION
    ) {
      return this._cachedWorkloadPercentage;
    }

    const totalClients = this.activeClients.length;
    const maxCapacity =
      this.allEmployees.filter((emp) => emp.role === "collector").length * 50; // 50 clients par collecteur
    if (maxCapacity === 0) {
      this._cachedWorkloadPercentage = 0;
    } else {
      this._cachedWorkloadPercentage = Math.min(
        Math.round((totalClients / maxCapacity) * 100),
        100,
      );
    }

    this._cacheTimestamp = now;
    return this._cachedWorkloadPercentage;
  }

  /**
   * Retourne le statut de la charge de travail
   */
  getWorkloadStatus(): string {
    const percentage = this.getWorkloadPercentage();
    if (percentage <= 80) return "Optimal";
    if (percentage <= 95) return "Attention";
    return "Critique";
  }

  /**
   * Génère et retourne les données d'analyse par zone
   */
  getZoneAnalyticsData(): ZoneAnalytics[] {
    // S'assurer que zoneAnalyticsData est un tableau
    if (!this.zoneAnalyticsData || !Array.isArray(this.zoneAnalyticsData)) {
      return [];
    }

    if (this.zoneAnalyticsData.length === 0) {
      this.generateZoneAnalyticsData();
    }
    return this.zoneAnalyticsData;
  }

  /**
   * Génère les données d'analyse des zones en utilisant l'API
   */
  private generateZoneAnalyticsData(): void {
    if (!this.currentUser?._id) return;

    // this.agencyService.getZoneAnalytics$(this.currentUser._id).subscribe({
    //   next: (response) => {
    //     if (response.success && response.data) {
    //       this.zoneAnalyticsData = response.data.map(zone => ({
    //         id: zone.zoneId,
    //         name: zone.zoneName,
    //         totalClients: zone.clientStats.totalClients,
    //         households: zone.clientStats.households,
    //         businesses: zone.clientStats.businesses,
    //         institutions: zone.clientStats.institutions,
    //         capacityUsage: zone.workloadMetrics.capacityUsagePercentage,
    //         estimatedTime: zone.workloadMetrics.estimatedWorkHours,
    //         requiredTeam: zone.workloadMetrics.requiredTeamSize,
    //         requiredVehicles: zone.workloadMetrics.requiredVehicles,
    //         growth: zone.growthMetrics.monthlyGrowthRate
    //       }));
    //     } else {

    //       this.generateZoneAnalyticsDataFallback();
    //     }
    //   },
    //   error: (error) => {
    //     console.error('Erreur lors du chargement des analytics:', error);

    //     this.generateZoneAnalyticsDataFallback();
    //   }
    // });
  }

  /**
   * Méthode de fallback pour générer les données localement
   */
  private generateZoneAnalyticsDataFallback(): void {
    this.zoneAnalyticsData = this.zones.map((zone, index) => {
      const zoneName = zone.neighborhood || zone;
      const zoneClients = this.activeClients.filter(
        (client) => client.address?.neighborhood === zoneName,
      );

      const households = zoneClients.filter(
        (client) => this.getClientType(client) === "household",
      ).length;
      const businesses = zoneClients.filter(
        (client) => this.getClientType(client) === "business",
      ).length;
      const institutions = zoneClients.filter(
        (client) => this.getClientType(client) === "institution",
      ).length;

      const totalClients = zoneClients.length;
      const estimatedTime = Math.ceil(totalClients * 0.15); // 9 minutes par client
      const requiredTeam = Math.ceil(totalClients / 25);
      const requiredVehicles = Math.ceil(requiredTeam / 2);
      const capacityUsage = Math.min((totalClients / 50) * 100, 100);
      const growth = Math.floor(Math.random() * 21) - 10;

      return {
        id: `zone-${index}`,
        name: zoneName,
        totalClients,
        households,
        businesses,
        institutions,
        capacityUsage,
        estimatedTime,
        requiredTeam,
        requiredVehicles,
        growth,
      };
    });
  }

  /**
   * Détermine le type d'un client basé sur ses données
   */
  private getClientType(
    client: ClientApi,
  ): "household" | "business" | "institution" {
    if (
      client.firstName?.toLowerCase().includes("entreprise") ||
      client.lastName?.toLowerCase().includes("sarl") ||
      client.lastName?.toLowerCase().includes("sas")
    ) {
      return "business";
    }
    if (
      client.firstName?.toLowerCase().includes("mairie") ||
      client.firstName?.toLowerCase().includes("école") ||
      client.firstName?.toLowerCase().includes("hôpital")
    ) {
      return "institution";
    }
    return "household";
  }

  /**
   * Retourne le statut de capacité pour une zone
   */
  getCapacityStatus(capacityUsage: number): string {
    if (capacityUsage <= 70) return "good";
    if (capacityUsage <= 90) return "warning";
    return "critical";
  }

  /**
   * Retourne l'icône appropriée pour le niveau de capacité
   */
  getCapacityIcon(capacityUsage: number): string {
    if (capacityUsage <= 70) return "check_circle";
    if (capacityUsage <= 90) return "warning";
    return "error";
  }

  /**
   * Affiche les détails d'une zone spécifique
   */
  viewZoneDetails(zoneId: string): void {
    this.loadZoneDetails(zoneId);

    this.loadZoneWorkloadMetrics(zoneId);

    const zone = this.zoneAnalyticsData.find((z) => z.id === zoneId);
    if (zone) {
      this.notificationService.showInfo(
        "Information",
        `Chargement des détails de la zone: ${zone.name}`,
      );
    }
  }

  /**
   * Optimise la capacité d'une zone - Version améliorée avec API
   */
  optimizeZoneCapacity(zoneId: string): void {
    this.optimizeSpecificZone(zoneId, "all");
  }

  /**
   * Affiche une alerte de capacité pour une zone
   */
  showCapacityAlert(zone: ZoneAnalytics): void {
    const message =
      zone.capacityUsage > 95
        ? `Zone ${zone.name} surchargée (${zone.capacityUsage}%)`
        : `Zone ${zone.name} approche de la saturation (${zone.capacityUsage}%)`;

    this.notificationService.showWarning("Alerte Capacité", message);
  }

  /**
   * Retourne les recommandations pour les zones
   */
  getZoneRecommendations(): LocalZoneRecommendation[] {
    // S'assurer que zoneRecommendations est un tableau
    if (!this.zoneRecommendations || !Array.isArray(this.zoneRecommendations)) {
      return [];
    }

    if (this.zoneRecommendations.length === 0) {
      this.generateZoneRecommendations();
    }
    return this.zoneRecommendations;
  }

  /**
   * Génère les recommandations automatiques en utilisant l'API
   */
  private generateZoneRecommendations(): void {
    if (!this.currentUser?._id) return;

    // this.agencyService.getZoneRecommendations$(this.currentUser._id).subscribe({
    //   next: (response) => {
    //     if (response.success && response.data) {
    //       this.zoneRecommendations = response.data.map(rec => ({
    //         id: rec.id,
    //         title: rec.title,
    //         description: rec.description,
    //         priority: rec.priority,
    //         icon: this.getRecommendationIcon(rec.type, rec.priority),
    //         zoneId: rec.zoneId
    //       }));
    //     } else {

    //       this.generateZoneRecommendationsFallback();
    //     }
    //   },
    //   error: (error) => {
    //     console.error('Erreur lors du chargement des recommandations:', error);

    //     this.generateZoneRecommendationsFallback();
    //   }
    // });
  }

  /**
   * Méthode de fallback pour générer les recommandations localement
   */
  private generateZoneRecommendationsFallback(): void {
    this.zoneRecommendations = [];

    this.zoneAnalyticsData.forEach((zone) => {
      if (zone.capacityUsage > 95) {
        this.zoneRecommendations.push({
          id: `rec-${zone.id}-critical`,
          title: `Zone ${zone.name} surchargée`,
          description: `Cette zone dépasse sa capacité optimale. Considérez ajouter une équipe ou redistribuer les clients.`,
          priority: "high",
          icon: "error",
          zoneId: zone.id,
        });
      } else if (zone.capacityUsage > 80) {
        this.zoneRecommendations.push({
          id: `rec-${zone.id}-warning`,
          title: `Zone ${zone.name} approche de la saturation`,
          description: `Préparez-vous à augmenter les ressources pour cette zone.`,
          priority: "medium",
          icon: "warning",
          zoneId: zone.id,
        });
      }

      if (zone.growth > 15) {
        this.zoneRecommendations.push({
          id: `rec-${zone.id}-growth`,
          title: `Croissance rapide dans ${zone.name}`,
          description: `Cette zone connaît une croissance de ${zone.growth}%. Anticipez les besoins futurs.`,
          priority: "medium",
          icon: "trending_up",
          zoneId: zone.id,
        });
      }
    });
  }

  /**
   * Retourne l'icône appropriée pour une recommandation
   */
  private getRecommendationIcon(type: string, priority: string): string {
    switch (type) {
      case "capacity":
        return priority === "high" ? "error" : "warning";
      case "growth":
        return "trending_up";
      case "efficiency":
        return "tune";
      case "resource":
        return "build";
      default:
        return "info";
    }
  }

  /**
   * Applique une recommandation
   */
  applyRecommendation(recommendation: LocalZoneRecommendation): void {
    this.notificationService.showSuccess(
      "Succès",
      `Recommandation "${recommendation.title}" appliquée`,
    );
    this.dismissRecommendation(recommendation);
  }

  /**
   * Ignore une recommandation
   */
  dismissRecommendation(recommendation: LocalZoneRecommendation): void {
    this.zoneRecommendations = this.zoneRecommendations.filter(
      (r) => r.id !== recommendation.id,
    );
  }

  // ================================
  // méthode pour l analyse avance
  // ================================

  /**
   * Charge les détails d'une zone spécifique
   */
  loadZoneDetails(zoneId: string): void {
    if (!this.currentUser?._id) return;

    this.agencyService
      .getZoneStatistics$(this.currentUser._id, zoneId)
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            console.log("Détails de la zone:", response.data);

            const zoneIndex = this.zoneAnalyticsData.findIndex(
              (z) => z.id === zoneId,
            );
            if (zoneIndex !== -1) {
              const zoneStats = response.data;
              this.zoneAnalyticsData[zoneIndex] = {
                ...this.zoneAnalyticsData[zoneIndex],
                totalClients: zoneStats.clientStats.totalClients,
                households: zoneStats.clientStats.households,
                businesses: zoneStats.clientStats.businesses,
                institutions: zoneStats.clientStats.institutions,
                capacityUsage:
                  zoneStats.workloadMetrics.capacityUsagePercentage,
                estimatedTime: zoneStats.workloadMetrics.estimatedWorkHours,
                requiredTeam: zoneStats.workloadMetrics.requiredTeamSize,
                requiredVehicles: zoneStats.workloadMetrics.requiredVehicles,
                growth: zoneStats.growthMetrics.monthlyGrowthRate,
              };
            }
          }
        },
        error: (error) => {
          console.error(
            "Erreur lors du chargement des détails de la zone:",
            error,
          );
          this.notificationService.showError(
            "Erreur",
            "Impossible de charger les détails de la zone",
          );
        },
      });
  }

  /**
   * Charge les métriques de charge de travail pour une zone
   */
  loadZoneWorkloadMetrics(zoneId: string): void {
    if (!this.currentUser?._id) return;

    this.agencyService
      .getZoneWorkloadMetrics$(this.currentUser._id, zoneId)
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            console.log("Métriques de charge:", response.data);

            if (response.data.recommendations.length > 0) {
              const zone = this.zoneAnalyticsData.find((z) => z.id === zoneId);
              const message = `Recommandations pour ${zone?.name || "la zone"}:\n${response.data.recommendations.join("\n")}`;
              this.notificationService.showInfo(
                "Recommandations de charge",
                message,
              );
            }
          }
        },
        error: (error) => {
          console.error(
            "Erreur lors du chargement des métriques de charge:",
            error,
          );
        },
      });
  }

  /**
   * Charge l'évolution des abonnements
   */
  loadSubscriptionEvolution(period: string = "month"): void {
    if (!this.currentUser?._id) return;

    this.agencyService
      .getSubscriptionEvolution$(this.currentUser._id, undefined, period)
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            console.log("Évolution des abonnements:", response.data);

            this.processSubscriptionEvolution(response.data);
          }
        },
        error: (error) => {
          console.error(
            "Erreur lors du chargement de l'évolution des abonnements:",
            error,
          );
        },
      });
  }

  /**
   * Traite les données d'évolution des abonnements
   */
  private processSubscriptionEvolution(data: any[]): void {
    data.forEach((zoneEvolution) => {
      const zoneIndex = this.zoneAnalyticsData.findIndex(
        (z) => z.id === zoneEvolution.zoneId,
      );
      if (zoneIndex !== -1) {
        this.zoneAnalyticsData[zoneIndex].growth = zoneEvolution.growthRate;
      }
    });
  }

  /**
   * Compare les performances des zones
   */
  compareZonePerformance(): void {
    if (!this.currentUser?._id) return;

    this.agencyService.compareZonePerformance$(this.currentUser._id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          console.log("Comparaison des zones:", response);
          this.displayZoneComparison(response);
        }
      },
      error: (error) => {
        console.error("Erreur lors de la comparaison des zones:", error);
      },
    });
  }

  /**
   * Affiche les résultats de comparaison des zones
   */
  private displayZoneComparison(comparison: any): void {
    const bestZone = comparison.data.find((z: any) => z.rank === 1);
    const summary = comparison.summary;

    const message = `
       Résumé de performance:
      Meilleure zone: ${summary.bestPerformingZone}
       Plus efficace: ${summary.mostEfficient}
       Zones nécessitant attention: ${summary.needsAttention.join(", ")}
    `;

    this.notificationService.showInfo("Comparaison des zones", message);
  }

  /**
   * Optimise les ressources d'une zone spécifique
   */
  optimizeSpecificZone(
    zoneId: string,
    optimizationType: "team" | "vehicles" | "schedule" | "all" = "all",
  ): void {
    if (!this.currentUser?._id) return;

    this.agencyService
      .optimizeZoneResources$(this.currentUser._id, zoneId, optimizationType)
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            console.log("Optimisation de zone:", response.data);
            this.displayOptimizationResults(response.data);
          }
        },
        error: (error) => {
          console.error("Erreur lors de l'optimisation de la zone:", error);
          this.notificationService.showError(
            "Erreur",
            "Impossible d'optimiser la zone",
          );
        },
      });
  }

  /**
   * Affiche les résultats d'optimisation
   */
  private displayOptimizationResults(results: any): void {
    const improvements = results.expectedImprovements;
    const message = `
       Optimisation ${results.optimizationType} terminée!
      
      Améliorations attendues:
       Efficacité: +${improvements.efficiency}%
       Réduction des coûts: ${improvements.costReduction}%
       Gain de temps: ${improvements.timeReduction}%
      
      Étapes d'implémentation:
      ${results.implementationSteps.map((step: string, i: number) => `${i + 1}. ${step}`).join("\n")}
    `;

    this.notificationService.showSuccess("Optimisation réussie", message);
  }

  /**
   * Génère un rapport pour une zone
   */
  generateZoneReport(
    zoneId: string,
    reportType:
      | "performance"
      | "financial"
      | "operational"
      | "complete" = "complete",
  ): void {
    if (!this.currentUser?._id) return;

    this.agencyService
      .generateZoneReport$(this.currentUser._id, zoneId, reportType)
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            console.log("Rapport généré:", response.data);
            if (response.data.downloadUrl) {
              // Ouvrir le lien de téléchargement
              window.open(response.data.downloadUrl, "_blank");
            }
            this.notificationService.showSuccess(
              "Rapport généré",
              "Le rapport a été généré avec succès",
            );
          }
        },
        error: (error) => {
          console.error("Erreur lors de la génération du rapport:", error);
          this.notificationService.showError(
            "Erreur",
            "Impossible de générer le rapport",
          );
        },
      });
  }

  /**
   * Méthode pour actualiser toutes les données d'une zone
   */
  refreshZoneData(zoneId?: string): void {
    if (zoneId) {
      this.loadZoneDetails(zoneId);
      this.loadZoneWorkloadMetrics(zoneId);
    } else {
      this.refreshZoneAnalytics();
      this.loadSubscriptionEvolution();
    }
  }

  // === MÉTHODES POUR L'AFFICHAGE MODERNE DES ZONES ===

  /**
   * Obtenir la couverture estimée en pourcentage avec mise en cache
   */
  getEstimatedCoverage(): number {
    const now = Date.now();
    if (
      this._cachedEstimatedCoverage !== null &&
      now - this._cacheTimestamp < this.CACHE_DURATION
    ) {
      return this._cachedEstimatedCoverage;
    }

    // Calcul simple basé sur le nombre de zones définies
    const totalPossibleZones = 20; // Nombre estimé de zones possibles dans la ville
    this._cachedEstimatedCoverage = Math.min(
      100,
      Math.round((this.zones.length / totalPossibleZones) * 100),
    );
    this._cacheTimestamp = now;
    return this._cachedEstimatedCoverage;
  }

  /**
   * Obtenir le nombre total de clients dans toutes les zones avec mise en cache
   */
  getTotalZoneClients(): number {
    const now = Date.now();
    if (
      this._cachedTotalZoneClients !== null &&
      now - this._cacheTimestamp < this.CACHE_DURATION
    ) {
      return this._cachedTotalZoneClients;
    }

    this._cachedTotalZoneClients = this.activeClients
      ? this.activeClients.length
      : 0;
    this._cacheTimestamp = now;
    return this._cachedTotalZoneClients;
  }

  /**
   * Obtenir le nombre d'entreprises dans une zone
   */
  getZoneBusinessCount(zone: any): number {
    // Utilisation d'une valeur stable basée sur l'index/nom de la zone pour éviter ExpressionChangedAfterItHasBeenCheckedError
    const zoneIndex = this.zones.indexOf(zone);
    const zoneIdentifier =
      zone._id || zone.id || zone.neighborhood || zone || zoneIndex;
    const hash = this.getStableHash(zoneIdentifier.toString());
    return Math.floor(hash * 15) + 5; // Entre 5 et 20 entreprises
  }

  /**
   * Obtenir le nombre de ménages dans une zone
   */
  getZoneHouseholdCount(zone: any): number {
    // Utilisation d'une valeur stable basée sur l'index/nom de la zone pour éviter ExpressionChangedAfterItHasBeenCheckedError
    const zoneIndex = this.zones.indexOf(zone);
    const zoneIdentifier =
      zone._id || zone.id || zone.neighborhood || zone || zoneIndex;
    const hash = this.getStableHash(zoneIdentifier.toString() + "_households");
    return Math.floor(hash * 50) + 20; // Entre 20 et 70 ménages
  }

  /**
   * Génère un hash stable entre 0 et 1 pour une chaîne donnée
   */
  private getStableHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) / 2147483647; // Normaliser entre 0 et 1
  }

  /**
   * Sélectionner une zone pour afficher ses détails
   */
  selectZone(zone: any): void {
    this.selectedZoneForDisplay = zone;
    console.log("Zone sélectionnée:", zone);
  }

  /**
   * Obtenir la date de dernière collecte pour une zone
   */
  getLastCollectionDate(zone: any): Date {
    // Simulation d'une date de dernière collecte
    const today = new Date();
    const daysAgo = Math.floor(Math.random() * 7) + 1; // Entre 1 et 7 jours
    return new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  }

  //Données pour les tests

  expandedRows: any = {};
  orders = [
    {
      id: "O1001",
      customer: "John Doe",
      date: "2025-01-10",
      amount: 1200,
      status: "DELIVERED",
    },
    {
      id: "O1002",
      customer: "Jane Smith",
      date: "2025-01-15",
      amount: 1200,
      status: "PENDING",
    },
  ];

  products = [
    {
      id: "P001",
      name: "Laptop Pro",
      image: "laptop.png",
      price: 1200,
      category: "Electronics",
      rating: 4,
      inventoryStatus: "INSTOCK",
      orders: [
        {
          id: "O1001",
          customer: "John Doe",
          date: "2025-01-10",
          amount: 1200,
          status: "DELIVERED",
        },
        {
          id: "O1002",
          customer: "Jane Smith",
          date: "2025-01-15",
          amount: 1200,
          status: "PENDING",
        },
      ],
    },
    {
      id: "P002",
      name: "Smartphone X",
      image: "phone.png",
      price: 800,
      category: "Mobile",
      rating: 5,
      inventoryStatus: "LOWSTOCK",
      orders: [
        {
          id: "O2001",
          customer: "Alice Brown",
          date: "2025-01-12",
          amount: 800,
          status: "CANCELLED",
        },
      ],
    },
  ];

  expandAll() {
    this.expandedRows = {};
    this.filteredActiveClients.forEach((p: any) => {
      this.expandedRows[p._id!] = true;
    });
  }

  collapseAll() {
    this.expandedRows = {};
  }

  onRowExpand(event: any) {
    console.log("Row expanded", event.data);
  }

  onRowCollapse(event: any) {
    console.log("Row collapsed", event.data);
  }

  getSeverity(status: string): "success" | "info" | "danger" {
    switch (status) {
      case "true":
        return "success";
      case "false":
        return "danger";
      default:
        return "info";
    }
  }

  /**
   * Statut d'affichage réel d'un Abonnement — plus jamais `abonnement.isActive`
   * brut (chantier EligibilityService) : ferme la fenêtre de latence du cron
   * d'expiration (jusqu'à 24h) sans toucher au cron lui-même.
   */
  isSubscriptionActiveDisplay(abonnement: any): boolean {
    return isSubscriptionCurrentlyActive(abonnement);
  }

  getStatusSeverity(status: string) {
    switch (status) {
      case "DELIVERED":
        return "success";
      case "PENDING":
        return "warning";
      case "CANCELLED":
        return "danger";
      default:
        return "info";
    }
  }

  // Utiliser une API tierce pour générer le QR code
  generateQRCode(data: string): string {
    return data ? data : "Pas de code QR généré";
  }
}
