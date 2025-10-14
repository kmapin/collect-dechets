import { map } from "rxjs";
import {
  AfterViewChecked,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, RouterModule } from "@angular/router";
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { AuthService } from "../../../services/auth.service";
import { AgencyService } from "../../../services/agency.service";
import { CollectionService } from "../../../services/collection.service";
import { NotificationService } from "../../../services/notification.service";
import { User, UserRole } from "../../../models/user.model";
import {
  Agency,
  Employee,
  Employees,
  ServiceZone,
  ServiceZones,
  CollectionSchedule,
  EmployeeRole,
  WasteService,
  tarif,
  Tariff,
} from "../../../models/agency.model";
import { Collection, CollectionStatus } from "../../../models/collection.model";
import { ClientService, ClientApi } from "../../../services/client.service";
import { OUAGA_DATA, QuartierData } from "../../../data/mock-data";
import { Message } from "../../../models/message.model";
import { MessagesService } from "../../../services/messages.service";
import { SharedService } from "../../../services/shared-service";
import { MatExpansionModule } from "@angular/material/expansion";
import { CountriesOrgMockService } from "../../../services/countries-org-mock.service";
import {
  Arrondissement,
  City,
  Quartier,
  Sector,
} from "../../../models/countries-org.model";
import { MatIcon } from "@angular/material/icon";

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
  date: Date;
  createdAt: Date;
  status: "open" | "in_progress" | "resolved";
  assignedTo?: string;
  reportType?: string;
  photos?: string[];
}

interface Statistics {
  totalClients: number;
  totalEmployees: number;
  totalZones: number;
  totalCollectors: number;
  totalSignalements: number;
  resolvedSignalements?: number;
  activeCollectors: number;
  todayCollections: number;
  pendingSignalements: number;
  completedCollections: number;
  monthlyRevenue: number;
  averageRating: number;
  pendingReports: number;
}

@Component({
  selector: 'app-agency-dashboard',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MatExpansionModule,
    MatIcon
  ],
  templateUrl: './agency-dashboard.html',
  styleUrl: './agency-dashboard.css'
})
export class AgencyDashboard  implements OnInit,AfterViewChecked {
  @ViewChild("scrollMe") private myScrollContainer!: ElementRef;

  scheduleForm: FormGroup;

  currentUser: User | null = null;
  agencyReports: Report[] = [];
  ouagaData: QuartierData[] = OUAGA_DATA;
  agency: Agency | null = null;
  activeTab = "collections";
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
  filteredIncidents: any[] = [];
  statistics: Statistics = {
    totalClients: 0,
    totalEmployees: 0,
    totalZones: 0,
    totalCollectors: 0,
    totalSignalements: 0,
    activeCollectors: 0,
    todayCollections: 0,
    resolvedSignalements: 0,
    completedCollections: 0,
    monthlyRevenue: 0,
    averageRating: 0,
    pendingReports: 0,
    pendingSignalements: 0,
  };
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
  allTarif: Tariff[] = [];
  serviceZones: ServiceZone[] = [];
  serviceZoness: ServiceZones[] = []; //from API
  // schedules: CollectionSchedule[] = [];
  clients: Client[] = [];
  filteredClients: Client[] = [];
  reports: Report[] = [];
  filteredReports: Report[] = [];
  isDeleting: boolean = false;
  // assigner un planning à un collecteur
  showAssignModal: boolean = false;
  selectedReportId: string = "";

  selectedEmployee: string[] = [];
  // Filters
  collectionsFilter = "all";
  selectedZone = "";
  clientsSearch = "";
  clientsFilter = "all";
  reportsFilter = "all";
  reportsTypeFilter = "all";
  analyticsPeriod = "monthly";
  analyticsFilter = "all";

  // Modals
  showAddEmployeeModal = false;
  showUpdateEmployeeModal = false;
  showZoneModal = false;
  showZoneModalcouverture = false;

  showScheduleModal = false;
  editingZone = false;

  // Forms
  newEmployee: any = {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "",
    zones: [],
  };
  newTariff: any = {
    // agencyId: "",
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

  newSchedule: any = {
    zoneId: "",
    dayOfWeek: "",
    startTime: "",
    // endTime: "",
    collectorId: "",
    // endDate: "",
  };
  // formErrors = {
  //   zoneId: '',
  //   dayOfWeek: '',
  //   startTime: '',
  //   endTime: '',
  //   collectorId: ''
  // };
  formErrors = {
    zone: "",
    dayOfWeek: "",
    startTime: "",
    endTime: "",
    collectorId: "",
    // endDate: "",
  };
  citiesInput = "";
  minDate: string;

  neighborhoodsInput = "";
  activeClients: ClientApi[] = [];
  activeClientNbrs!: number;
  pendingClients: ClientApi[] = [];
  isLoading: boolean = false;
  // get activeClientNbr(): number {
  //   return this.activeClients.length;
  // }

  tabs = [
    {
      id: "collections",
      label: "Collectes",
      icon: "local_shipping",
      badge: 0,
    },
    { id: "employees", label: "Employés", icon: "people", badge: null },
    { id: "zones", label: "Zones", icon: "map", badge: null },
    { id: "schedules", label: "Plannings", icon: "schedule", badge: null },
    { id: "clients", label: "Clients", icon: "person", badge: null },
    { id: "reports", label: "Signalements", icon: "report_problem", badge: 0 },
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
  receivedMessages: any;

  showMessageModal: boolean = false;
  messageData: Message = {
    sender: "",
    receiver: "",
    content: "",
  };
  data: any;
  connectedUserMessages: any;
  receivedId: string = "";
  client: any;
  displayAgencyName: string = "";
  employeeForm: FormGroup;
  constructor(
    private authService: AuthService,
    private agencyService: AgencyService,
    private collectionService: CollectionService,
    private notificationService: NotificationService,
    private clientService: ClientService,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,
    private messageService: MessagesService,
    private sharedService: SharedService,
    private countriesOrgMockService: CountriesOrgMockService,
    private route: ActivatedRoute
  ) {
    const today = new Date();
    this.minDate = today.toISOString().split("T")[0];
    this.scheduleForm = this.fb.group(
      {
        zone: [""],
        date: ["", Validators.required],
        startTime: ["", Validators.required],
        endTime: ["", Validators.required],
        collectorId: ["", Validators.required],
      },
      {
        validators: [this.validateTimeOrder],
      }
    );
    this.employeeForm = this.fb.group({
      firstName: ["", Validators.required],
      lastName: ["", Validators.required],
      email: ["", [Validators.required, Validators.email]],
      phone: ["", Validators.required],
      role: ["", Validators.required],
    });
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    console.log("this.currentUser", this.currentUser);
    this.loadAgencyStatistics(this.currentUser);
    this.loadAgencyData();
    this.loadCollectors(this.currentUser);
    // this.loadZonesForAgency(this.currentUser);
    this.loadAgencyReports(this.currentUser);
    this.loadTariffs();
    this.loadPlannings();
    this.loadCollectorPlannings();
    this.cdr.detectChanges();
    this.loadZones(this.currentUser);
    this.loadCollectDay();
    this.getAllCountries();

    setInterval(() => {
      this.loadCollectDay();
    }, 30000);
    this.loadCollectHistory();
    this.filterIncidents();
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
      if (params["source"] === "notification") {
        this.handleNotificationParams(params);
      }
    });
  }
  private handleNotificationParams(params: any) {
    if (params["id"]) {
    }
  }
  /**Gestion des messages recus par le client connecté */
  countUnreadMessages() {
    this.messageService
      .getUserUnreadMessagesCount(this.currentUser?.userId || "")
      .subscribe({
        next: (response: any) => {
          if (response) {
            console.log("API > getUserUnreadMessagesCount:", response);
            this.unreadMessageCount = response.unreadCount || 0;
          }
        },
        error: (error: any) => {
          console.error("API > getUserUnreadMessagesCount:", error);
        },
      });
  }

  userMessages() {
    this.messageService
      .getMessagesForUser(this.currentUser?.userId || "")
      .subscribe({
        next: (response: any) => {
          if (response) {
            console.log("API > getMessagesForUser:", response);
            this.connectedUserMessages = response || [];
            console.log(
              "this.connectedUserMessages:",
              this.connectedUserMessages
            );
          }
        },
        error: (error: any) => {
          console.error("API > getMessagesForUser:", error);
        },
      });
  }

  userAndAgencyConversation(client: any) {
    this.data = client;
    this.displayAgencyName = client.firstName + " " + client.lastName;
    const clientId = client?.userId || "";
    this.clientService
      .userAndAgencyConversation(this.currentUser?.userId || "", clientId)
      .subscribe((response: any) => {
        console.log("API >userAndAgencyConversation:", response);
        if (response) {
          console.log("API >userAndAgencyConversation:", response);
          this.receivedMessages = (response.messages || []).sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          this.scrollToBottom();
          this.countUnreadMessages();
          if (!clientId) {
            this.receivedId = this.currentUser?.userId || "";
          } else {
            this.receivedId = clientId;
          }
          this.receivedMessages.forEach((message: any) => {
            if (message.receiver === this.currentUser?.userId) {
              this.readAndRespondMessage(message);
            }
            message.read = message.read.toString();
          });
        } else {
          this.receivedMessages = [];
          this.notificationService.showError(
            "Erreur",
            "Aucun message, veuillez contacter l'agence !"
          );
        }
      });
  }
  readAndRespondMessage(message: Message): void {
    this.messageService.markMessagesAsRead(message._id || "").subscribe({
      next: (response: any) => {
        this.receivedId = message.sender;
        console.log("Lire et répondre au message:", message._id);
      },
      error: (error: any) => {
        console.error("Erreur lors de la lecture du message:", error);
      },
    });
  }
  submitMessage() {
    if (!this.currentUser) {
      this.notificationService.showError(
        "Connexion requise",
        "Vous devez être connecté pour envoyer un message"
      );
      return;
    }
    if (!this.receivedId) {
      this.notificationService.showError("Erreur", "Agence non trouvée");
      return;
    }
    this.messageData.sender = this.currentUser?.userId || "";
    this.messageData.receiver = this.receivedId || "";
    this.messageData.content = this.messageData.content.trim();

    if (!this.messageData.content) {
      this.notificationService.showError(
        "Message vide",
        "Le contenu du message ne peut pas être vide"
      );
      return;
    }

    console.log("Envoi du message:", this.messageData);
    this.messageService.sendMessage(this.messageData).subscribe({
      next: (response: any) => {
        console.log("API > sendMessage:", response);
        console.log("API > data:", this.data);
        this.userAndAgencyConversation(this.data);
        this.notificationService.showSuccess(
          "Message envoyé",
          "Votre message a bien été envoyé"
        );
        this.messageData.content = "";
      },
      error: (error: any) => {
        console.error("API > sendMessage:", error);
        this.notificationService.showError(
          "Message non envoyé",
          "Une erreur s'est produite lors de l'envoi du message"
        );
      },
    });
  }

  /**Gestion des messages recus par le client connecté fin */

  openAssignModal(reportId: string): void {
    this.selectedReportId = reportId;
    this.selectedEmployee = [];
    this.showAssignModal = true;
  }
  closeAssignModal(): void {
    this.showAssignModal = false;
    this.selectedEmployee = [];
  }

  validateTimeOrder(group: FormGroup) {
    const start = group.get("startTime")?.value;
    const end = group.get("endTime")?.value;

    if (start && end && end <= start) {
      return { invalidTimeOrder: true };
    }
    return null;
  }

  assignEmployeesToReport(): void {
    // if (this.selectedReportId && this.selectedEmployees.length > 0) {
    //   const payload = {
    //     reportId: this.selectedReportId,
    //     assignedEmployees: this.selectedEmployees,
    //   };
    //   this.agencyService.assignEmployeesToReport$(payload).subscribe({
    //     next: () => {
    //       this.notificationService.showSuccess('Succès', 'Les employés ont été assignés au signalement.');
    //       this.showAssignModal = false;
    //       this.loadAgencyReports(this.currentUser); // Recharger les signalements
    //     },
    //     error: (err) => {
    //       console.error('Erreur lors de l\'assignation des employés :', err);
    //       this.notificationService.showError('Erreur', 'Impossible d\'assigner les employés.');
    //     },
    //   });
    // } else {
    //   this.notificationService.showError('Erreur', 'Veuillez sélectionner au moins un employé.');
    // }
  }
  toggleEmployeeSelection(employeeId: string, event: any): void {
    if (event.target.checked) {
      this.selectedEmployee.push(employeeId);
    } else {
      this.selectedEmployee = this.selectedEmployee.filter(
        (id) => id !== employeeId
      );
    }
  }
  // updateTabs(): void {
  //   this.tabs = [
  //     { id: 'collections', label: 'Collectes', icon: 'local_shipping', badge: null },
  //     { id: 'employees', label: 'Employés', icon: 'people', badge: null },
  //     { id: 'zones', label: 'Zones', icon: 'map', badge: null },
  //     { id: 'schedules', label: 'Plannings', icon: 'schedule', badge: null },
  //     { id: 'clients', label: 'Clients', icon: 'person', badge: this.activeClientNbrs },
  //     { id: 'reports', label: 'Signalements', icon: 'report_problem', badge: 3 },
  //     { id: 'analytics', label: 'Rapports', icon: 'analytics', badge: null }
  //   ];

  // }
  // activeClientNbr() {
  //   return this.activeClients.length;
  // }

  // loadTariffsForAgency(): void {
  //     const userString = localStorage.getItem('currentUser');
  //     if (userString) {
  //       const currentUser = JSON.parse(userString);
  //       const agencyId = currentUser._id;

  //       this.agencyService.getAgencyTariffs(agencyId).subscribe({
  //         next: (tariffs) => {
  //           this.agencyTariffs = tariffs;
  //           console.log('Tarifs récupérés :', tariffs);
  //         },
  //         error: (err) => {
  //           console.error("Erreur lors du chargement des tarifs de l'agence", err);
  //         }
  //       });
  //     } else {
  //       console.error("Aucun utilisateur trouvé dans le stockage local.");
  //     }
  //   }

  loadAgencyData(): void {
    // Charger les données de l'agence
    // Simule une agence si null pour debug
    if (this.currentUser) {
      // this.agency = { _id: 'agency1', agencyName: 'Agence Demo' } as any;
      this.agency = this.currentUser as any;
      console.log("[loadAgencyData] agency simulée:", this.agency);
      this.loadEmployees(this.currentUser);
    }
    this.loadCollections();
    // this.loadServiceZones();
    // this.loadSchedules();
    console.log("[loadAgencyData] agency avant loadClients:", this.agency);
    this.loadClients();
    this.loadReports();
    //this.activeClientNbrs = this.activeClientNbr(); // Mettez à jour le nombre d'actifs
    //this.updateTabs(); // Mettez à jour les tabs après avoir récupéré les clients
  }
  loadCollectors(currentUser: any): void {
    if (currentUser?._id) {
      this.agencyService
        .getAgencyEmployeesByRole$(currentUser._id, EmployeeRole.COLLECTOR)
        .subscribe(
          (employee) => {
            this.collectors = employee;
            console.log(
              "Collecteurs chargés via l api service  :",
              this.collectors
            );
          },
          (error) => {
            console.error("Erreur lors du chargement des collecteurs :", error);
          }
        );
    } else {
      this.agencyService
        .getAgencyEmployeesByRole$(currentUser._id, EmployeeRole.MANAGER)
        .subscribe(
          (manager) => {
            this.collectors = manager;
            console.log(
              "Collecteurs chargés via l api service  :",
              this.collectors
            );
          },
          (error) => {
            console.error("Erreur lors du chargement des collecteurs :", error);
          }
        );
    }
  }

  //suppression d un employé
  // deleteEmployee(currentUser: any, employeeId: any): void {
  //   this.isDeleting = true;

  //   if (currentUser?._id && employeeId?.userId?._id) {
  //     this.agencyService.deleteEmployee$( employeeId.userId._id).subscribe(
  //       () => {
  //         this.notificationService.showSuccess(
  //           'Succès',
  //           'L\'employé a été supprimé avec succès.'
  //         );
  //         this.loadEmployees(currentUser);
  //         this.isDeleting = false;
  //       },
  //       (error) => {
  //         this.notificationService.showError(
  //           'Erreur',
  //           'Impossible de supprimer l\'employé. Veuillez réessayer.'
  //         );
  //         console.error("Erreur lors de la suppression de l'employé :", error);
  //         this.isDeleting = false;
  //       }
  //     );
  //   } else {
  //     console.warn("Aucun ID d'agence trouvé dans l'utilisateur courant.");
  //     this.isDeleting = false;
  //   }
  // }
  deleteEmployee(currentUser: any, employeeId: any): void {
    this.isDeleting = true;

    // Vérification des IDs nécessaires
    if (!currentUser?._id || !employeeId?.userId?._id) {
      this.notificationService.showError(
        "Erreur",
        "Impossible d'identifier l'employé à supprimer"
      );
      this.isDeleting = false;
      return;
    }

    // Demander confirmation avant suppression
    if (confirm("Êtes-vous sûr de vouloir supprimer cet employé ?")) {
      this.agencyService.deleteEmployee$(employeeId.userId._id).subscribe({
        next: (response) => {
          // Vérifier si la réponse indique un succès
          if (response) {
            this.notificationService.showSuccess(
              "Succès",
              "L'employé a été supprimé avec succès."
            );
            // Recharger la liste des employés
            this.loadEmployees(currentUser);

            // Mettre à jour le badge du nombre d'employés
            const employeesTab = this.tabs.find(
              (tab) => tab.id === "employees"
            );
            if (employeesTab && this.allEmployees) {
              employeesTab.badge = this.allEmployees.length - 1;
            }
          } else {
            this.notificationService.showError(
              "Erreur",
              "La suppression a échoué. Veuillez réessayer."
            );
          }
          this.isDeleting = false;
        },
        error: (error) => {
          const message = error?.error?.message || "Veuillez réessayer.";
          this.notificationService.showError(
            "Erreur",
            `Impossible de supprimer l'employé. ${message}`
          );
          this.isDeleting = false;
        },

        complete: () => {
          this.isDeleting = false;
        },
      });
    } else {
      this.isDeleting = false;
    }
  }
  assignIncident(): void {
    this.notificationService.showInfo(
      "Attribution",
      "Ouverture du formulaire d'attribution"
    );
    return;
  }
  // onEditEmployee(emp: any) {
  //   this.editingEmployeeId = emp._id;
  //   this.editForm.patchValue({
  //     firstname: emp.firstname,
  //     lastname: emp.lastname,
  //     email: emp.email,
  //     phone: emp.phone,
  //     role: emp.role
  //   });
  //   this.isEditing = true;
  // }

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

  loadEmployees(currentUser: any): void {
    if (currentUser?._id) {
      this.agencyService.getAgencyAllEmployees(currentUser?._id).subscribe({
        next: (employees) => {
          this.allEmployees = employees;
          console.log("loadEmployees > :", this.allEmployees);
          const employeesTab = this.tabs.find((tab) => tab.id === "employees");
          if (employeesTab) {
            employeesTab.badge = employees.length;
            this.cdr.detectChanges();
          }
        },
        error: (error) => {
          console.error("Erreur lors du chargement des employés :", error);
          this.notificationService.showError(
            "Erreur",
            "Impossible de charger les employés. Veuillez réessayer."
          );
        },
      });
    } else {
      console.warn("Aucun ID d'utilisateur courant disponible.");
    }
  }

  // fonction to load zones for the current agency
  // loadZonesForAgency(currentUser: any): void {
  //   if (currentUser?._id) {
  //     this.agencyService.getAgencyZones$(currentUser?._id).subscribe({
  //       next: (zonesAgency) => {
  //         this.zonesAgency = zonesAgency;
  //       },
  //       error: (err) => {
  //         console.error('Erreur lors du chargement des zones de l agence', err);
  //       },
  //     });
  //   } else {
  //     console.error("Aucun agencyId trouvé dans le stockage local.");
  //   }
  // }
  //chargement des signalements
  loadAgencyReports(currentUser: any): void {
    if (currentUser && currentUser._id) {
      const agencyId = currentUser._id;
      this.agencyService.getAgencyReports$(agencyId).subscribe({
        next: (reports: any) => {
          this.agencyReports = reports?.reports;
          console.log("Signalements chargés >>>>>> :", this.agencyReports);
          // Mise à jour du badge des Signalements
          const SignalementsTab = this.tabs.find((tab) => tab.id === "reports");
          if (SignalementsTab) {
            SignalementsTab.badge = this.statistics.pendingSignalements;
            this.cdr.detectChanges(); // Force la détection des changements
          }
          const repportTab = this.tabs.find((tab) => tab.id === "reports");
          if (repportTab) {
            repportTab.badge = this.statistics.pendingSignalements;
            this.cdr.detectChanges();
          }
        },
        error: (error) => {
          console.error("Erreur lors du chargement des signalements :", error);
          this.notificationService.showError(
            "Erreur",
            "Impossible de charger les signalements. Veuillez réessayer."
          );
        },
      });
    } else {
      console.warn("Aucun ID d'utilisateur courant disponible.");
    }
  }

  //recuperations des statistiques de l'agence
  loadAgencyStatistics(currentUser: any): void {
    if (currentUser && currentUser._id) {
      const agencyId = currentUser._id;
      this.agencyService.getAgencyStats$(agencyId).subscribe({
        next: (statistics) => {
          this.statistics = statistics;
          console.log("Statistiques de l'agence chargées :", this.statistics);
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error(
            "Erreur lors du chargement des statistiques de l'agence :",
            error
          );
          this.notificationService.showError(
            "Erreur",
            "Impossible de charger les statistiques de l'agence. Veuillez réessayer."
          );
        },
      });
    } else {
      console.warn("Aucun ID d'utilisateur courant disponible.");
    }
  }
  // loadServiceZones(): void {
  //   this.serviceZones = [
  //     {
  //       id: "zone1",
  //       name: "Zone Centre",
  //       description: "Centre-ville et quartiers adjacents",
  //       boundaries: [],
  //       neighborhoods: ["Centre-ville", "Quartier Latin"],
  //       cities: ["Paris"],
  //       isActive: true,
  //     },
  //   ];
  // }

  // loadSchedules(): void {
  //   this.schedules = [
  //     {
  //       // id: '1',
  //       zoneId: 'zone1',
  //       dayOfWeek: 1,
  //       startTime: '08:00',
  //       endTime: '12:00',
  //       collectorId: '1',
  //       // isActive: true
  //     }
  //   ];
  // }

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
    if (!this.agency || !this.agency?._id) return;
    this.clientService.getClientsByAgency(this.agency._id).subscribe({
      next: (clients) => {
        console.log(
          "[loadClients] clients number:",
          this.activeClientNbrs,
          clients.length
        );
        console.log("ALL Agency_clients", clients);
        this.activeClients = clients.filter(
          (c) => this.getClientSubscriptionStatus(c) === "active"
        );
        this.pendingClients = clients.filter(
          (c) => this.getClientSubscriptionStatus(c) === "pending"
        );
        console.log(
          "[loadClients] active:",
          this.activeClients,
          "pending:",
          this.pendingClients
        );

        if (clients) {
          this.clientNbrs = clients.length;
          this.activeClients = clients;
          console.log("[loadClients] clients received:", this.clientNbrs);
          // Vérifiez si activeClients est défini et mettez à jour le nombre d'actifs
          if (this.activeClients) {
            this.activeClientNbrs = this.activeClients.length; // Directement obtenir le nombre d'actifs
            // Trouver l'onglet "Clients" et mettre à jour son badge
            const clientsTab = this.tabs.find((tab) => tab.label === "Clients");
            if (clientsTab) {
              clientsTab.badge = this.clientNbrs; // Mettre à jour le badge
              console.log("badge >>", clientsTab.badge);
              console.log("activeClientNbrs >>", this.activeClientNbrs);
            } else {
              console.warn("L'onglet 'Clients' n'a pas été trouvé.");
            }
          }
        }
      },
      error: (err) => {
        console.error("[loadClients] error:", err);
        this.activeClients = [];
        this.pendingClients = [];
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
        100
    );
  }

  // getStars(rating: number): number[] {
  //   return new Array(Math.floor(rating)).fill(0);
  // }
  getStars(rating: number): number[] {
    // console.log('Rating reçu dans getStars:', rating);
    if (!rating || rating < 0) {
      return [];
    }
    return new Array(Math.floor(rating)).fill(0);
  }

  getStatusText(status: CollectionStatus): string {
    const statusTexts = {
      [CollectionStatus.SCHEDULED]: "Programmé",
      [CollectionStatus.IN_PROGRESS]: "En cours",
      [CollectionStatus.COMPLETED]: "Terminé",
      [CollectionStatus.MISSED]: "Manqué",
      [CollectionStatus.CANCELLED]: "Annulé",
      [CollectionStatus.REPORTED]: "Signalé",
    };
    return statusTexts[status] || status;
  }

  getClientName(clientId: string): string {
    const client = this.clients.find((c) => c.id === clientId);
    return client ? client.name : "Client inconnu";
  }

  getWasteTypeName(wasteType: any): string {
    return wasteType?.name || "Type inconnu";
  }
  getCollectorName(ids: string[]): string {
    return ids
      .map((id) => {
        const collector = this.collectors.find((c) => c._id === id);
        return collector
          ? `${collector.firstName} ${collector.lastName} `
          : "Inconnu";
      })
      .join(", ");
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

  getZoneName(zone: string): string {
    // Exemple simple
    return zone || "Zone inconnue";
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
      this.currentWeek.getDate() - this.currentWeek.getDay() + 1
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
      return [];
    }

    const startOfWeek = new Date(this.currentWeek);
    const day = this.currentWeek.getDay();
    const diff = this.currentWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const targetDate = new Date(startOfWeek);
    targetDate.setDate(startOfWeek.getDate() + dayIndex);

    return this.schedules.filter((schedule) => {
      const scheduleDate = new Date(schedule.date);
      scheduleDate.setHours(0, 0, 0, 0);
      return scheduleDate.getTime() === targetDate.getTime();
    });
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
  }

  filterClients(): void {
    this.filteredClients = this.clients.filter((client) => {
      const searchMatch =
        !this.clientsSearch ||
        client.name.toLowerCase().includes(this.clientsSearch.toLowerCase()) ||
        client.email.toLowerCase().includes(this.clientsSearch.toLowerCase());
      const statusMatch =
        this.clientsFilter === "all" ||
        client.subscriptionStatus === this.clientsFilter;
      return searchMatch && statusMatch;
    });
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
      this.newZone = { ...zone };
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

  editSchedule(scheduleId: string): void {
    // No need to call notificationService.showInfo here, as it's already handled in the template
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
      "Récupération des détails du client..."
    );

    this.agencyService.getClientById(clientId).subscribe({
      next: (client: any) => {
        this.selectedClient = client.data;
        console.log("voici les details du client:", client);
        this.showClientDetailsModal = true;
      },
      error: (err: any) => {
        console.error(
          "Erreur lors de la récupération des détails du client :",
          err
        );
        this.notificationService.showError(
          "Erreur",
          "Impossible de récupérer les détails du client."
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
        "Le client a bien été suspendu."
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

  exportReport(): void {
    // No need to call notificationService.showInfo here, as it's already handled in the template
  }

  // Form methods
  toggleZoneAssignment(zoneId: string, event: any): void {
    if (event.target.checked) {
      this.newEmployee.zones.push(zoneId);
    } else {
      this.newEmployee.zones = this.newEmployee.zones.filter(
        (id: string) => id !== zoneId
      );
    }
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
    if (
      this.newEmployee.firstName &&
      this.newEmployee.lastName &&
      this.newEmployee.email &&
      this.newEmployee.role
    ) {
      const employee: Employees = {
        _id: Math.random().toString(36).substr(2, 9),
        // userId: Math.random().toString(36).substr(2, 9),
        firstName: this.newEmployee.firstName,
        lastName: this.newEmployee.lastName,
        email: this.newEmployee.email,
        phone: this.newEmployee.phone,
        role: this.newEmployee.role,
        zones: this.newEmployee.zones,

        isActive: true,
        hiredAt: new Date(),
      };

      this.agencyService.addEmployee(employee).subscribe({
        next: (response: any) => {
          this.isLoading = false;
          console.log("[DEBUG] Réponse inscription collector:", response);
          const isSuccess =
            response.success ||
            response.status === "success" ||
            (typeof response.message === "string" &&
              (response.message.toLowerCase().includes("succès") ||
                response.message.toLowerCase().includes("réussi"))) ||
            !!response;

          if (isSuccess) {
            this.notificationService.showSuccess(
              "Inscription réussie",
              "Le collaborateur a été créé avec succès ! Vous pouvez maintenant vous connecter."
            );
            // 🔄 Recharger la liste après ajout
            this.loadEmployees(this.currentUser);
            // setTimeout(() => {
            //   this.router.navigate(['/login']);
            // }, 2000);
          } else {
            const errorMsg = this.getFriendlyMessage(
              response?.message || response?.error || "",
              false
            );
            this.notificationService.showError(
              "Erreur lors de l'inscription",
              errorMsg
            );
          }
        },
        error: (error) => {
          this.isLoading = false;
          const errorMsg = this.getFriendlyMessage(
            error?.error?.message ||
              error?.error?.message ||
              error?.error ||
              "",
            false
          );
          this.notificationService.showError(
            "Erreur lors de l'inscription",
            errorMsg
          );
          this.loadEmployees(this.currentUser);
        },
      });
      this.showAddEmployeeModal = false;
      this.newEmployee = {
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        role: "",
        zones: [],
      };
    }
  }

  //creation d un tarif
  addTariff(): void {
    if (this.newTariff.type && this.newTariff.price !== undefined) {
      const agencyId = this.currentUser?._id;
      const tariff: Tariff = {
        agencyId: agencyId || "",
        type: this.newTariff.type,
        price: this.newTariff.price,
        description: this.newTariff.description,
        nbPassages: this.newTariff.nbPassages,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.agencyService.addTariff(tariff).subscribe({
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
                "vous pouvez désormais le consulter dans la liste des tarifs, disponible dans la section Zones"
              );
              this.showZoneModal = false;
              this.showZoneModal = false;
              this.loadTariffs(); //

              this.newTariff = {
                type: "",
                price: "",
                description: "",
                nbPassages: "",
              };
            } else {
              const errorMsg = this.getFriendlyMessage(
                response?.message || response?.error || "",
                false
              );
              this.notificationService.showError(
                "Erreur lors de l’ajout du tarif",
                errorMsg
              );
              this.newTariff = {
                agencyId: "",
                type: "",
                price: 0,
                description: "",
                nbPassages: 0,
                createdAt: new Date(),
              };
            }
          }
        },
        error: (error) => {
          this.isLoading = false;
          const errorMsg = this.getFriendlyMessage(
            error?.error?.message || error?.error || "",
            false
          );
          this.notificationService.showError(
            "Erreur lors de l’ajout du tarif",
            errorMsg
          );
        },
      });
    }
  }
  // recuperations des tarifs liee a une agences
  tariffs: Tariff[] = [];
  loadTariffs(): void {
    this.isLoading = true;
    const agencyId = this.currentUser?._id;
    if (!agencyId) {
      console.error("[DEBUG] Aucun tarif trouvé pour cette agence");
      this.isLoading = false;
      return;
    }

    this.agencyService.getAgencyAllTarifs$(agencyId).subscribe({
      next: (data: Tariff[]) => {
        this.tariffs = data;
        console.log("Tarifs récupérés :", this.tariffs);
        this.isLoading = false;
      },
      error: (error) => {
        // console.error("[DEBUG] Erreur lors du chargement des tarifs :", error);
        this.isLoading = false;
      },
    });
  }
  //recupere les planning d une agence
  schedules: CollectionSchedule[] = [];

  loadPlannings(): void {
    this.isLoading = true;
    const agencyId = this.currentUser?._id;

    if (!agencyId) {
      console.error("[DEBUG] Aucun agencyId trouvé pour l’utilisateur courant");
      this.isLoading = false;
      return;
    }

    this.agencyService.getAllPlaningAgency$(agencyId).subscribe({
      next: (response: { plannings: CollectionSchedule[] }) => {
        this.schedules = response.plannings;
        console.log("Plannings récupérés :", this.schedules);

        const schedulesTab = this.tabs.find((tab) => tab.id === "schedules");
        if (schedulesTab) {
          schedulesTab.badge = this.schedules.length;
        }

        this.isLoading = false;
      },
      error: (error) => {
        console.error(
          "[DEBUG] Erreur lors du chargement des plannings :",
          error
        );
        this.isLoading = false;
      },
    });
  }

  // recuperation des planning d un colector
  collectorplannings: any[] = [];
  loadCollectorPlannings(): void {
    this.isLoading = true;
    const collectorId = "68c3f853a00747732407d946";
    if (!collectorId) {
      console.error("[DEBUG] Aucun collectorId trouvé ");
      this.isLoading = false;
      return;
    }
    this.agencyService.getPlaningCollectory$(collectorId).subscribe({
      next: (data: any[]) => {
        this.collectorplannings = data;
        console.log(
          "Plannings récupérés pour le collecteur :",
          this.collectorplannings
        );
        this.isLoading = false;
      },
      error: (error) => {
        // console.error(
        //   "[DEBUG] Erreur lors du chargement des plannings du collecteur :",
        //   error
        // );
        this.isLoading = false;
      },
    });
  }

  // supprimer un tarif
  deletePlanning(schedulesId: string): void {
    this.isDeleting = true;

    if (schedulesId) {
      this.agencyService.deletePlanning$(schedulesId).subscribe(
        () => {
          this.notificationService.showSuccess(
            "Succès",
            "Planning a été supprimé avec succès."
          );
          this.loadPlannings();
          this.isDeleting = false;
        },
        (error) => {
          this.notificationService.showError(
            "Erreur",
            "Impossible de supprimer le planning. Veuillez réessayer."
          );
          console.error("Erreur lors de la suppression du planning :", error);
          this.isDeleting = false;
        }
      );
    } else {
      console.warn("Aucun ID de planning fourni.");
      this.isDeleting = false;
    }
  }

  tariffToUpdate: Tariff | null = null;
  //update un tarif via l api
  updateTariff(tariffId: string): void {
    if (
      this.tariffToUpdate &&
      this.tariffToUpdate.type &&
      this.tariffToUpdate.price !== undefined
    ) {
      this.isLoading = true;

      const payload = {
        type: this.tariffToUpdate.type,
        price: this.tariffToUpdate.price,
        description: this.tariffToUpdate.description,
        nbPassages: this.tariffToUpdate.nbPassages,
        updatedAt: new Date(),
      };

      this.agencyService.getUpdateTarifs$(tariffId, payload).subscribe({
        next: (response: any) => {
          this.isLoading = false;
          console.log("[DEBUG] Réponse modification tarif:", response);

          const isSuccess =
            response?.success ||
            response?.status === "success" ||
            (typeof response?.message === "string" &&
              (response.message.toLowerCase().includes("succès") ||
                response.message.toLowerCase().includes("réussi"))) ||
            !!response;

          if (isSuccess) {
            this.notificationService.showSuccess(
              "Modification réussie",
              "Le tarif a été modifié avec succès !"
            );
            // this.loadTariffs(this.currentUser?.id!); // recharger la liste après update
          } else {
            const errorMsg = this.getFriendlyMessage(
              response?.message || response?.error || "",
              false
            );
            this.notificationService.showError(
              "Erreur lors de la modification du tarif",
              errorMsg
            );
          }
        },
        error: (error) => {
          this.isLoading = false;
          const errorMsg = this.getFriendlyMessage(
            error?.error?.message || error?.error || "",
            false
          );
          this.notificationService.showError(
            "Erreur lors de la modification du tarif",
            errorMsg
          );
        },
      });
    }
  }

  // supprimer un tarif
  deleteTariff(tariff: any): void {
    this.isDeleting = true;
    const tariffId = tariff._id;

    if (tariffId) {
      this.agencyService.deleteTariff$(tariffId).subscribe(
        () => {
          this.notificationService.showSuccess(
            "Succès",
            "L'tarif été supprimé avec succès."
          );
          // this.loadEmployees(currentUser);
          this.isDeleting = false;
          this.loadTariffs();
        },
        (error) => {
          this.notificationService.showError(
            "Erreur",
            "Impossible de supprimer l'tarif. Veuillez réessayer."
          );
          console.error("Erreur lors de la suppression de l'tarif :", error);
          this.isDeleting = false;
        }
      );
    } else {
      console.warn("Aucun ID d'agence trouvé dans l'utilisateur courant.");
      this.isDeleting = false;
    }
  }

  saveZone(): void {
    if (this.newZone.name && this.citiesInput) {
      this.newZone.cities = this.citiesInput
        .split(",")
        .map((city) => city.trim());
      this.newZone.neighborhoods = this.neighborhoodsInput
        .split(",")
        .map((n) => n.trim())
        .filter((n) => n);

      if (this.editingZone) {
        const index = this.serviceZones.findIndex(
          (z) => z.id === this.newZone.id
        );
        if (index !== -1) {
          this.serviceZones[index] = { ...this.newZone };
        }
        // No need to call notificationService.showSuccess here, as it's already handled in the template
      } else {
        const zone: ServiceZones = {
          // id: Math.random().toString(36).substr(2, 9),
          name: this.newZone.name,
          description: this.newZone.description,
          boundaries: [],
          neighborhoods: this.newZone.neighborhoods,
          cities: this.newZone.cities,
          assignedCollectors: this.newZone.assignedCollectors,
          isActive: this.newZone.isActive,
        };
        // this.agencyService.
        this.serviceZoness.push(zone);
        // No need to call notificationService.showSuccess here, as it's already handled in the template
      }

      this.showZoneModal = false;
      this.editingZone = false;
      this.newZone = {
        name: "",
        description: "",
        cities: [],
        neighborhoods: [],
        isActive: true,
      };
      this.citiesInput = "";
      this.neighborhoodsInput = "";
    }
  }

  validateClient(clientId: string): void {
    console.log("[validateClient] called for", clientId);
    this.clientService.validateClientSubscription(clientId).subscribe({
      next: () => {
        console.log("[validateClient] success for", clientId);
        this.notificationService.showSuccess(
          "Validation",
          "Abonnement validé avec succès !"
        );
        this.loadClients();
      },
      error: (err) => {
        this.notificationService.showError(
          "Validation",
          "Validation a échoué  ! " + err?.error?.error
        );
        console.error("[validateClient] error for", clientId, err);
      },
    });
  }

  addSchedule(): void {
    const { collectorId, date, startTime, endTime } = this.scheduleForm.value;
    if (
      this.checkCollectorAvailability(collectorId, date, startTime, endTime)
    ) {
      this.notificationService.showWarning(
        "Attention",
        "Le collecteur est déjà programmé sur ce créneau."
      );
      return;
    }

    const formValues = this.scheduleForm.value;

    const schedule: CollectionSchedule = {
      zone: formValues.zone,
      date: formValues.date,
      startTime: formValues.startTime,
      endTime: formValues.endTime,
      collectorId: Array.isArray(formValues.collectorId)
        ? formValues.collectorId
        : [formValues.collectorId],
      agencyId: this.currentUser?._id || "",
    };

    this.agencyService.addSchedule$(schedule).subscribe({
      next: (schedule) => {
        if (schedule) {
          this.schedules.push(schedule);
          this.notificationService.showSuccess(
            "Succès",
            "Le planning a été créé avec succès."
          );
        }
        this.loadPlannings(), (this.showScheduleModal = false);
        this.scheduleForm.reset();
      },
      error: (error) => {
        let errorMessage =
          "Une erreur est survenue lors de la création du planning";
        if (error.error?.message) {
          switch (error.error.message) {
            case "COLLECTOR_NOT_AVAILABLE":
              errorMessage =
                "Le collecteur n'est pas disponible sur ce créneau";
              break;
            case "ZONE_NOT_FOUND":
              errorMessage = "La zone sélectionnée n'existe pas";
              break;
            case "TIME_CONFLICT":
              errorMessage =
                "Il existe déjà un planning sur ce créneau horaire";
              break;
            default:
              errorMessage = error.error.message;
          }
        }
        this.notificationService.showError("Erreur", errorMessage);
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
  filterIncidents(): void {
    // this.filteredIncidents = this.incidents.filter(incident => {
    //   const statusMatch = this.incidentsFilter === 'all' || incident.status === this.incidentsFilter;
    //   const severityMatch = this.severityFilter === 'all' || incident.severity === this.severityFilter;
    //   return statusMatch && severityMatch;
    // });
  }
  resolveIncident1(): void {
    // const incident = this.incidents.find(i => i.id === incidentId);
    // if (incident) {
    //   incident.status = 'resolved';
    this.filterIncidents();
    this.statistics.pendingReports--;
    this.notificationService.showSuccess(
      "Résolu",
      "Incident marqué comme résolu"
    );
    // }
  }
  contactAgencyForIncident(): void {
    this.contactAgency();
  }

  contactAgency(): void {
    this.notificationService.showInfo(
      "Contact",
      "Ouverture des informations de contact"
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
  resolveIncident(id: string) {
    const body = {
      status: "resolved",
      // status:"pending"
    };
    console.log("Status envoyé :", body);
    this.agencyService.resolveIncident$(id, body).subscribe({
      next: (response: any) => {
        console.log("[DEBUG] Réponse de resolution d'incidant:", response);
        if (response.message) {
          this.notificationService.showSuccess("Resolu", response.message);
          this.loadAgencyReports(this.currentUser);
          // this.notificationService.showSuccess('Résolu', 'Incident marqué comme résolu');
        } else {
          this.notificationService.showError(
            "Activation",
            "Erreur lors de l'activation de l'agence"
          );
        }
      },
      error: (error: any) => {
        console.error("Error activating agency:", error);
        const msg = error?.error?.message || "Error activating agency";
        this.notificationService.showSuccess("Activation", msg);
      },
    });
  }
  selectedSchedule: any = null;

  openScheduleDetails(schedule: any): void {
    this.selectedSchedule = schedule;
  }
  closeModal(): void {
    this.selectedSchedule = null;
  }
  onEmployeeToggle(event: any): void {
    const employeeId = event.target.value;
    if (event.target.checked) {
      this.selectedEmployee.push(employeeId);
    } else {
      this.selectedEmployee = this.selectedEmployee.filter(
        (id) => id !== employeeId
      );
    }
  }
  assignReport(): void {
    if (!this.selectedReportId || this.selectedEmployee.length === 0) {
      this.notificationService.showError(
        "Erreur",
        "Veuillez sélectionner au moins un employé."
      );
      return;
    }

    this.selectedEmployee.forEach((employeeId) => {
      //   const payload = {
      //   status: 'in_progress'
      // };
      this.agencyService
        .assignReportToEmployee$(this.selectedReportId, employeeId)
        .subscribe({
          next: () => {
            this.notificationService.showSuccess(
              "Succès",
              "Signalement assigné avec succès."
            );
            this.loadReports();
          },
          error: (err) => {
            console.error("Erreur assignation :", err);

            const message =
              err?.error?.error || err?.message || "Échec de l'assignation.";
            this.notificationService.showError("Erreur", message);
          },
        });
    });

    this.closeAssignModal();
  }

  showTariffsModal = false;

  openTariffsModal() {
    this.showTariffsModal = true;
  }

  closeTariffsModal() {
    this.showTariffsModal = false;
  }
  zones: any[] = [];
  //recuperation des zones
  loadZones(currentUser: any): void {
    this.isLoading = true;
    if (currentUser && currentUser._id) {
      const agencyId = currentUser._id;
      this.agencyService.getAllzones$(agencyId).subscribe({
        next: (zones: any) => {
          this.zones = zones.serviceZones;
          console.log("zones charger>>>>>> :", this.zones);
          const ZonesTab = this.tabs.find((tab) => tab.id === "zonesTab");
          if (ZonesTab) {
            ZonesTab.badge = this.zones.length;
          }
        },
        error: (error) => {
          console.error(
            "Erreur lors du chargement des Zones de l agence:",
            error
          );
          this.notificationService.showError(
            "Erreur",
            "Erreur lors du chargement des Zones de l agence."
          );
        },
      });
    } else {
      console.warn("Aucun ID d'utilisateur courant disponible.");
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
    this.notificationService.showInfo("Modification", "ouvert...");
    this.selectedEmployee = employee;
    this.employeeForm.patchValue(employee);
    this.showUpdateEmployeeModal = true;
  }

  closeUpdateEmployeeModal(): void {
    this.showUpdateEmployeeModal = false;
    this.selectedEmployee = [];
  }

  updateEmployee(): void {
    if (this.employeeForm.invalid) {
      this.notificationService.showError("Erreur", "Formulaire invalide.");
      return;
    }
    // On extrait uniquement les champs nécessaires
    const { _id, createdAt, updatedAt, agencyId, userId, ...employeeData } = {
      ...this.selectedEmployee,
      ...this.employeeForm.value,
    };

    this.agencyService.updateEmployee$(_id, employeeData).subscribe({
      next: () => {
        this.notificationService.showSuccess(
          "Succès",
          "Employé mis à jour avec succès."
        );
        this.showUpdateEmployeeModal = false;
        this.loadEmployees(this.currentUser); // Recharge la liste
      },
      error: (err) => {
        console.error("Erreur lors de la mise à jour :", err);
        this.notificationService.showError(
          "Erreur",
          "Impossible de mettre à jour l'employé."
        );
      },
    });
  }

  // recuperations des collecte par jour d une agences
  dayCollectes: any[] = [];

  loadCollectDay(): void {
    this.isLoading = true;
    const agencyId = this.currentUser?._id;

    if (!agencyId) {
      console.error(
        "[DEBUG] Aucune collecte trouvée pour cette agence en jour"
      );
      this.notificationService.showError(
        "Erreur",
        "Aucune agence sélectionnée."
      );
      this.isLoading = false;
      return;
    }
    this.agencyService.getAgencyAllCollectes$(agencyId).subscribe({
      next: (response) => {
        this.dayCollectes = response.data || [];
        console.log("Collectes journalières récupérées :", this.dayCollectes);
        const CollectesTab = this.tabs.find((tab) => tab.id === "collections");
        if (CollectesTab) {
          CollectesTab.badge = this.dayCollectes.length;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error("Erreur récupération collectes :", error);
        const message =
          error?.error?.message || "Impossible de récupérer les collectes.";
        this.notificationService.showError("Erreur", message);

        this.isLoading = false;
      },
    });
  }
  // recuperations des tarifs liee a une agences
  historyCollecte: any[] = [];

  loadCollectHistory(): void {
    this.isLoading = true;
    const agencyId = this.currentUser?._id;

    if (!agencyId) {
      console.error(
        "[DEBUG] Aucune collecte trouvée pour cette agence en jour"
      );
      this.notificationService.showError(
        "Erreur",
        "Aucune agence sélectionnée."
      );
      this.isLoading = false;
      return;
    }

    this.agencyService.getAgencyAllCollectes$(agencyId).subscribe({
      next: (response) => {
        this.historyCollecte = response.data || [];
        console.log(
          "Historique des Collectes récupérées :",
          this.historyCollecte
        );
        this.isLoading = false;
      },
      error: (error) => {
        console.error(
          "Erreur récupération de l historique des collectes :",
          error
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
    const updatedStatus = !employee.isActive;
    this.agencyService
      .updateEmployee$(employee._id, { isActive: updatedStatus })
      .subscribe({
        next: () => {
          employee.isActive = updatedStatus;
          this.notificationService.showSuccess(
            "Succès",
            `L'employé a été ${
              updatedStatus ? "activé" : "désactivé"
            } avec succès.`
          );
        },
        error: (error) => {
          console.error("Erreur lors de la mise à jour du statut :", error);
          this.notificationService.showError(
            "Erreur",
            "Impossible de mettre à jour le statut de l'employé."
          );
        },
      });
  }

  //methode de verification de la disponibilite de l employee
  checkCollectorAvailability(
    collectorId: string,
    date: string,
    startTime: string,
    endTime: string
  ): boolean {
    return this.schedules.some(
      (schedule) =>
        schedule.collectorId.includes(collectorId) &&
        schedule.date === date &&
        ((startTime >= schedule.startTime && startTime < schedule.endTime) ||
          (endTime > schedule.startTime && endTime <= schedule.endTime))
    );
  }

  //   toggleScheduleStatus(schedule: any): void {
  //   const updatedStatus = !schedule.isActive;
  //   this.agencyService.updateSchedule$(schedule._id, { isActive: updatedStatus }).subscribe({
  //     next: () => {
  //       schedule.isActive = updatedStatus;
  //       this.notificationService.showSuccess(
  //         "Succès",
  //         `Le planning a été ${updatedStatus ? "activé" : "désactivé"} avec succès.`
  //       );
  //     },
  //     error: (error) => {
  //       console.error("Erreur lors de la mise à jour du statut du planning :", error);
  //       this.notificationService.showError(
  //         "Erreur",
  //         "Impossible de mettre à jour le statut du planning."
  //       );
  //     },
  //   });
  // }
  loadZonesMock(): void {
    this.serviceZones = OUAGA_DATA.map((arrondissement) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: arrondissement.arrondissement,
      description: arrondissement.secteurs
        .map((secteur) => `${secteur.secteur}: ${secteur.quartiers.join(", ")}`)
        .join("; "),
      boundaries: [],
      neighborhoods: arrondissement.secteurs.flatMap(
        (secteur) => secteur.quartiers
      ),
      cities: ["Ouagadougou"],
      isActive: true,
    }));
  }
  arrondissements: QuartierData[] = OUAGA_DATA;
  arrondissementss: Arrondissement[] = [];
  cities: City[] = [];
  secteurss: Sector[] = [];
  secteurs: { secteur: string; quartiers: string[] }[] = [];
  quartiers: string[] = [];
  quartierss: Quartier[] = [];
  onArrondissementChange(arrondissement?: string) {
    if (arrondissement) {
      const sectorObj = this.arrondissementss.find(
        (a) => a.name === arrondissement
      );
      const sectors = this.countriesOrgMockService.getSectorsByArrondissement(
        sectorObj?.id || ""
      );
      this.secteurss = sectors ? sectors : [];
      console.log("Secteurs  ==> ", this.secteurss);
      this.quartiers = [];
      this.userData.address.sector = "";
      this.userData.address.neighborhood = [];
    }
  }

  onSecteurChange(secteur: string) {
    if (secteur) {
      const secteurObj = this.secteurss.find((s) => s.name === secteur);
      const quartiers = this.countriesOrgMockService.getNeighborhoodsBySector(
        secteurObj?.id || ""
      );
      console.log("Quartiers  ==> ", quartiers);
      this.quartierss = quartiers;
      this.userData.address.neighborhood = this.userData.address.neighborhood =
        [];
    }
    const secteurObj = this.secteurs.find((s) => s.secteur === secteur);
    this.quartiers = secteurObj ? secteurObj.quartiers : [];
    this.userData.address.neighborhood = this.userData.address.neighborhood =
      [];
  }

  onCityChange(city: string) {
    if (city) {
      const cityObj = this.cities.find((c) => c.name === city);
      console.log("City Object ==> ", cityObj);
      const arr = this.countriesOrgMockService.getArrondissementsByCity(
        cityObj?.id || ""
      );
      this.arrondissementss = arr ? arr : [];
      console.log("Arrondissements  ==> ", this.arrondissementss);
      this.secteurs = [];
      this.quartiers = [];
      this.userData.address.arrondissement = "";
      this.userData.address.sector = "";
      this.userData.address.neighborhood = [];
    }
  }

  openZoneModalcouverture(): void {
    this.showZoneModalcouverture = true;
  }

  closeZoneModalcouverture(): void {
    this.showZoneModalcouverture = false;
  }

  editZoneAgency(): void {
    if (
      this.userData.address.city &&
      this.userData.address.arrondissement &&
      this.userData.address.sector &&
      this.userData.address.neighborhood.length > 0
    ) {
      const zoneData = {
        serviceZones: this.userData.address.neighborhood,
      };

      const agencyId = this.currentUser?._id;

      if (!agencyId) {
        this.notificationService.showError("Erreur", "ID agence manquant.");
        return;
      }

      this.agencyService.updateAgencyZones$(agencyId, zoneData).subscribe({
        next: (response) => {
          console.log("Zone mise à jour :", response);
          this.notificationService.showSuccess(
            "Succès",
            "La zone a été mise à jour avec succès."
          );
          this.loadZones(this.currentUser);

          this.closeZoneModalcouverture();
          // this.loadZones(this.currentUser?._id);
        },
        error: (error) => {
          console.error("Erreur lors de la mise à jour de la zone :", error);
          this.notificationService.showError(
            "Erreur",
            "Impossible de mettre à jour la zone. Veuillez réessayer."
          );
        },
      });
    } else {
      this.notificationService.showError(
        "Erreur",
        "Veuillez remplir tous les champs obligatoires."
      );
    }
  }

  getAllCountries() {
    this.cities = this.countriesOrgMockService.getCitiesByCountry("1");
    console.log("Villes chargées :", this.cities);
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      this.myScrollContainer.nativeElement.scrollTop =
        this.myScrollContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }
}
