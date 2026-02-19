import { Component, OnInit, signal } from "@angular/core";

import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { AgencyService } from "../../services/agency.service";
import { Agency, Tarif } from "../../models/agency.model";
import { AuthService } from "../../services/auth.service";
import { NotificationService } from "../../services/notification.service";
import { RegisterUserData } from "../../models/user.model";
import { MessagesService } from "../../services/messages.service";
import { Message } from "../../models/message.model";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { CountriesOrgMockService } from "../../services/countries-org-mock.service";

import { DrawerModule } from "primeng/drawer";
import { OUAGA_DATA, QuartierData } from "../../data/mock-data";
import {
  Arrondissement,
  City,
  Quartier,
  Sector,
} from "../../models/countries-org.model";
import { Admin } from "../../services/admin";
import { MobileMoneyFormComponent } from "../payment/mobile-money-form/mobile-money-form";

@Component({
  selector: "app-agency-details",
  imports: [
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    DrawerModule,
    MobileMoneyFormComponent,
  ],
  templateUrl: "./agency-details.html",
  styleUrl: "./agency-details.css",
})
export class AgencyDetails implements OnInit {
  userData = {
    _id: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    isOwnerAgency: false,
    status: "",
    address: {
      arrondissement: "",
      sector: "",
      street: "",
      doorNumber: "",
      doorColor: "",
      neighborhood: "",
      city: "",
      postalCode: "",
      latitude: "",
      longitude: "",
    },
    agencyName: "",
    name: "",
    slogan: "",
    agencyDescription: "",
    termsAccepted: false,
    acceptTerms: true,
    receiveOffers: false,
    commune: {
      name: "",
      region: "",
      province: "",
    },
    agency: {
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
      location: {
        type: "Point",
        coordinates: [0, 0],
      },
      commune: {
        name: "",
        region: "",
        province: "",
      },
    },
  };
  arrondissements: QuartierData[] = OUAGA_DATA;
  arrondissementss: Arrondissement[] = [];
  cities: City[] = [];
  secteurss: Sector[] = [];
  secteurs: { secteur: string; quartiers: string[] }[] = [];
  quartiers: string[] = [];
  quartierss: Quartier[] = [];
  validationErrors: { [key: string]: string[] } = {};
  generalError: string = "";

  agency: any = "";
  agencyId: string | null = null;
  agencyIdd: string | null = null;
  currentUser: RegisterUserData | null = null;
  messageData: Message = {
    sender: "",
    receiver: "",
    content: "",
  };

  agencies: Agency[] = [];
  filteredAgencies: Agency[] = [];
  randomStarsList: number[] = [];

  showSubscriptionModal = false;

  showReportModal = false;
  unreadMessageCount: any;
  quartierInfos: any;
  agencyZones: string[] = [];
  visible2: boolean = false;
  visible1: boolean = false;
  showPaymentDrawer: boolean = false;

  isLogged = signal(false);
  constructor(
    private route: ActivatedRoute,
    private countriesOrgMockService: CountriesOrgMockService,
    private agencyService: AgencyService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router,
    private messageService: MessagesService,
    private adminService: Admin,
  ) {
    this.drawerWidth;
    this.loadAgencyDataOnInit();
  }

  ngOnInit(): void {
    this.loadAgencyDataOnInit();
    this.checkUserIsLooged();
    this.loadAgenciesFromApi();
  }

  checkUserIsLooged() {
    this.authService.isAuthenticated$.subscribe({
      next: (isAuth) => {
        console.log("user connected", isAuth);
        this.isLogged.set(!isAuth);
      },
    });
  }

  showLoginRequired() {
    if (this.isLogged()) {
      this.notificationService.showWarning(
        "Accès refusé",
        "Veuillez vous connecter ou s'inscrire pour accéder à cette page.",
        3000,
      );
      this.router.navigate(["/login"]);
    }
  }
  loadAgencyDataOnInit(): void {
    this.getAllCountries();
    this.currentUser = this.authService.getCurrentUser();
    this.agencyId = this.route.snapshot.paramMap.get("id");
    console.log("AgencyId==>", this.agencyId);
    this.onZoneActiviteChange(this.agencyId || "");
    if (this.agencyId) {
      this.loadAgencyFromApi(this.agencyId);
      this.loadTariffs(this.agencyId || "");
    }
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
    });
    this.countUnreadMessages();
  }
  get drawerWidth(): string {
    return window.innerWidth <= 768 ? "100%" : "33%";
  }

  getQuartierInfos(qrt: string) {
    const data = this.countriesOrgMockService.getQuartierInfo(qrt);
    this.quartierInfos = data;
    console.log("Quartier Infos==>", this.quartierInfos);
    return data;
  }

  // recuperations des tarifs liee a une agences
  tariffs: Tarif[] = [];

  //Tarif choisi par le client
  selectedTarif: any | null = null;

  loadTariffs(agencyId: string): void {
    this.isLoading = true;
    // const agency_id = this.agency?._id;
    const agency_id = agencyId;
    console.log("AgenceId==>", agency_id);
    if (!agency_id) {
      console.error("[DEBUG] Aucun tarif trouvé pour cette agence");
      this.isLoading = false;
      return;
    }

    this.agencyService.getAgencyAllTarifs$(agency_id).subscribe({
      next: (response: any) => {
        this.tariffs = response.data;
        this.tariffs.forEach((tariff) => {
          this.tariffSelectedMonths[tariff._id!] = 1;
        });
        console.log("Tarifs récupérés :", response);
        this.isLoading = false;
      },
      error: (error) => {
        // console.error("[DEBUG] Erreur lors du chargement des tarifs :", error);
        this.isLoading = false;
      },
    });
  }

  // Client subscription
  subscription = {
    userId: "",
    agencyId: "",
    plan: "",
    amount: 0,
    startDate: "",
    endDate: "",
    numberMonth: 1,
  };

  planPrices: any = {
    basic: 19.99,
    standard: 29.99,
    premium: 49.99,
  };

  // submitSubscription() {
  //   this.subscription.userId = this.currentUser?.id || '';
  //   this.subscription.agencyId = this.agency?._id || '';
  //   // Appel API
  //   this.agencyService.subscribeToAgencyPlan(this.subscription).subscribe({
  //     next: (res) => {
  //       this.notificationService.showSuccess('Abonnement réussi', 'Votre abonnement a bien été enregistré.');
  //       this.showSubscriptionModal = false;
  //     },
  //     error: (err) => {
  //       this.notificationService.showError('Erreur', 'Impossible d\'enregistrer l\'abonnement.');
  //     }
  //   });
  // }

  // tariffSelectedMonths: number = 1;
  tariffSelectedMonths: Record<string, number> = {};

  submitSubscription(
    currentUserId: string | undefined,
    tariffId: string | undefined,
    numberMonth: number,
    price: number,
  ) {
    const tariff_id: string | undefined = tariffId;
    const numberm_month = numberMonth || 1;
    // const payload = {
    //   tariffId,
    //   numberMonth: numberMonth || 1,
    //   userId: this.currentUser?._id || this.currentUser?.id || '',
    //   agencyId: this.agency?._id || '',
    // };

    this.selectedTarif = {
      tarifId: tariff_id,
      userId: currentUserId,
      numberMonths: numberm_month,
      amount: price * numberm_month,
      agencyId: this.agencyId ?? this.agency?._id,
    };

    console.log("selectedTarif==>", this.selectedTarif);
    if (this.selectedTarif !== null) {
      this.showPaymentDrawer = true;
    }

    // this.agencyService.subscribeToAgencyPlan(currentUserId, tariff_id, numberm_month).subscribe({
    //   next: (res) => {
    //     this.notificationService.showSuccess('Abonnement réussi', 'Votre abonnement a bien été enregistré.');
    //   },
    //   error: (err) => {
    //     this.notificationService.showError('Erreur', err?.error?.error || 'Impossible d\'enregistrer l\'abonnement.');
    //   }
    // });
  }
  updateAmount() {
    this.subscription.amount = this.planPrices[this.subscription.plan] || 0;
    this.updateEndDate();
  }

  updateEndDate() {
    if (this.subscription.startDate && this.subscription.numberMonth) {
      const start = new Date(this.subscription.startDate);
      start.setMonth(start.getMonth() + Number(this.subscription.numberMonth));
      this.subscription.endDate = start.toISOString().slice(0, 10);
    }
  }

  countUnreadMessages() {
    this.messageService
      .getUserUnreadMessagesCount(this.currentUser?._id || "")
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
  submitMessage(agencyId: string) {
    console.log("this.agencyId", agencyId);
    if (!this.currentUser) {
      this.notificationService.showError(
        "Connexion requise",
        "Vous devez être connecté pour envoyer un message",
      );
      return;
    }
    if (!this.agency) {
      this.notificationService.showError("Erreur", "Agence non trouvée");
      return;
    }
    this.messageData.sender = this.currentUser?._id || "";
    this.messageData.receiver = agencyId || "";
    this.messageData.content = this.messageData.content.trim();
    if (!this.messageData.content) {
      this.notificationService.showError(
        "Message vide",
        "Le contenu du message ne peut pas être vide",
      );
      return;
    }

    console.log("Envoi du message:", this.messageData);
    this.messageService.sendMessage(this.messageData).subscribe({
      next: (response: any) => {
        console.log("API > sendMessage:", response);
        this.notificationService.showSuccess(
          "Message envoyé",
          "Votre message a bien été envoyé",
        );
        this.showReportModal = false;
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
  /**
   * Transforme une agence API en objet compatible avec le template
   */
  private mapApiAgency(apiAgency: any): Agency {
    return {
      _id: apiAgency._id || "",
      userId: apiAgency.userId || "",
      firstName: apiAgency.firstName || "",
      lastName: apiAgency.lastName || "",
      name: apiAgency.name || "",
      slogan: apiAgency.slogan || "",
      agencyDescription: apiAgency.agencyDescription || "",
      phone: apiAgency.phone || "",
      address: apiAgency.address || {
        street: "",
        arrondissement: "",
        sector: "",
        neighborhood: "",
        city: "",
        postalCode: "",
      },

      owner: apiAgency.owner,
      arrondissement: apiAgency.address.arrondissement || "",
      secteur: apiAgency.address.sector || "",
      quartier: apiAgency.address.neighborhood || "",
      licenseNumber: apiAgency.licenseNumber || "",
      members: apiAgency.members || [],
      serviceZones: apiAgency.serviceZones || [],
      services: apiAgency.services || [],
      employees: apiAgency.employees || [],
      schedule: apiAgency.schedule || [],
      collectors: apiAgency.collectors || [],
      clients: apiAgency.clients || [],
      collections: apiAgency.collections || [],
      incidents: apiAgency.incidents || [],
      rating: apiAgency.rating || 0,
      totalClients:
        apiAgency.totalClients ||
        (apiAgency.clients ? apiAgency?.clients?.length : 0),
      acceptTerms: apiAgency.acceptTerms || false,
      receiveOffers: apiAgency.receiveOffers || false,
      isActive: apiAgency.isActive !== undefined ? apiAgency.isActive : true,
      status: apiAgency.status || "pending",
      createdAt: apiAgency.createdAt || "",
      updatedAt: apiAgency.updatedAt || "",
      __v: apiAgency.__v || 0,
    };
  }

  /**
   * Charge les détails d'une agence depuis l'API backend
   */
  loadAgencyFromApi(id: string | null): void {
    this.agencyService.getAgencyByIdFromApi(id).subscribe((response: any) => {
      if (response.success && response.data) {
        console.log("[DEBUG] Agency response:", response.data);
        this.agency = this.mapApiAgency(response.data);
        this.agencyId = this.agency?.agencyId;
        if (this.agencyId) {
          console.log("[DEBUG] Agency details:", this.agency);
          console.log("[DEBUG] AgencyID details:", this.agencyId);
          this.loadTariffs(this.agencyId || "");
        }
      } else {
        console.error("Erreur lors du chargement de l'agence");
        // Fallback vers les données mockées si l'API échoue
        this.agencyService.getAgencyById(id).subscribe((agency) => {
          this.agency = agency || null;
        });
      }
    });
  }

  getStars(rating: number): number[] {
    if (!rating || rating < 0) return [];
    return new Array(Math.floor(rating)).fill(0);
  }

  getFrequencyText(frequency: string): string {
    const frequencies: { [key: string]: string } = {
      daily: "quotidienne",
      weekly: "hebdomadaire",
      biweekly: "bi-hebdomadaire",
      monthly: "mensuelle",
    };
    return frequencies[frequency] || frequency;
  }

  getYearsInService(): number {
    if (!this.agency) return 0;
    const years =
      new Date().getFullYear() - new Date(this.agency.createdAt).getFullYear();
    return Math.max(1, years);
  }

  shareAgency(): void {
    if (navigator.share) {
      navigator.share({
        title: this.agency?.name,
        text: this.agency?.agencyDescription,
        url: window.location.href,
      });
    } else {
      // Fallback pour les navigateurs qui ne supportent pas l'API Web Share
      navigator.clipboard.writeText(window.location.href);
      this.notificationService.showSuccess(
        "Lien copié",
        "Le lien de l'agence a été copié dans le presse-papiers !",
      );
    }
  }

  subscribeToAgency(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.notificationService.showError(
        "Connexion requise",
        "Vous devez être connecté pour vous abonner à une agence",
      );
      return;
    }

    if (!this.agency) {
      this.notificationService.showError("Erreur", "Agence non trouvée");
      return;
    }

    // Get user ID - use _id if available, otherwise id
    const userId = currentUser._id || currentUser.id;
    if (!userId) {
      this.notificationService.showError("Erreur", "Utilisateur non identifié");
      return;
    }

    console.log("[DEBUG] Tentative d'abonnement:", {
      userId,
      agencyId: this.agency._id,
    });

    this.authService.subscribeToAgency(userId, this.agency._id).subscribe({
      next: (response) => {
        console.log("[DEBUG] Réponse abonnement:", response);

        // Vérifier différentes structures de réponse possibles
        const isSuccess =
          response.success ||
          response.status === "success" ||
          response.message?.includes("succès") ||
          response.message?.includes("réussi");

        if (isSuccess) {
          this.notificationService.showSuccess(
            "Abonnement réussi",
            "Vous êtes maintenant abonné à cette agence !",
          );
        } else {
          const errorMessage =
            response.message ||
            response.error ||
            "Erreur inconnue lors de l'abonnement";
          this.notificationService.showError(
            "Erreur lors de l'abonnement",
            errorMessage,
          );
        }
      },
      error: (error) => {
        console.error("[DEBUG] Erreur lors de l'abonnement:", error);
        const errorMessage =
          error?.error?.message ||
          error?.message ||
          "Erreur lors de l'abonnement. Veuillez réessayer.";
        this.notificationService.showError("Erreur", errorMessage);
      },
    });
  }

  /**Envoie un message par WhatsApp */
  defaultCountryCode = "226";

  private normalizePhoneForWhatsApp(raw: string): string {
    if (!raw) return "";
    let cleaned = raw.replace(/[\s().-]/g, "");
    cleaned = cleaned.replace(/^\+/, "");
    if (cleaned.length < 8 || !/^[1-9]/.test(cleaned)) {
      cleaned = this.defaultCountryCode + cleaned;
    }
    return cleaned;
  }

  contactAgency(): void {
    if (!this.agency?.phone) return;
    const phoneForWA = this.normalizePhoneForWhatsApp(this.agency.owner.phone);
    if (!phoneForWA) return;

    const message = encodeURIComponent(
      "Bonjour, je vous contacte au sujet de ...",
    );
    const url = `https://wa.me/${phoneForWA}?text=${message}`;

    window.open(url, "_blank");
  }

  editAgency() {
    this.userData = this.agency;
    console.log("[DEBUG] this.agency:", this.userData);
    this.onCityChange(this.userData.address.city);
    this.visible2 = true;
    // this.router.navigate(['/edit-agency', this.agencyId]);
  }
  //Activer ou desactiver une agence
  agencyStatus: string = "";
  activateAgency(id: string) {
    if (this.agency?.status === "active") {
      this.agencyStatus = "deactivate";
    } else {
      this.agencyStatus = "activate";
    }

    console.log("agency status", this.agencyStatus);
    this.agencyService.activateAgency(id, this.agencyStatus).subscribe({
      next: (response: any) => {
        console.log("agency activated  in dashboard", response);
        if (response.success) {
          this.notificationService.showSuccess("Activation", response.message);
          this.loadAgencyFromApi(id);
        } else {
          this.notificationService.showError(
            "Activation",
            "Erreur lors de l'activation de l'agence",
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
  openDirections(): void {
    if (this.agency?.address) {
      const address = `${this.agency.address.doorNumber} ${this.agency.address.street}, ${this.agency.address.city}`;
      const encodedAddress = encodeURIComponent(address);
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
        "_blank",
      );
    }
  }
  // tariffs: Tariff[] = [];
  isLoading: boolean = false;
  // loadTariffs(): void {
  //   this.isLoading = true;
  //   const agencyId = this.agencyId || this.route.snapshot.paramMap.get('id');
  //   if (!agencyId) {
  //     console.error('[DEBUG] Aucun agencyId trouvé pour l’utilisateur courant');
  //     this.isLoading = false;
  //     return;
  //   }

  //   this.agencyService.getAgencyAllTarifs$(agencyId).subscribe({
  //     next: (data: Tariff[]) => {
  //       this.tariffs = data;
  //       console.log('Tarifs récupérés :', this.tariffs);
  //       this.isLoading = false;
  //     },
  //     error: (error) => {
  //       console.error('[DEBUG] Erreur lors du chargement des tarifs :', error);
  //       this.isLoading = false;
  //     }
  //   });
  // }

  //Edit agency
  edit: boolean = false;
  onArrondissementChange(arrondissement?: string) {
    if (arrondissement) {
      const sectorObj = this.arrondissementss.find(
        (a) => a.name === arrondissement,
      );
      const sectors = this.countriesOrgMockService.getSectorsByArrondissement(
        sectorObj?.id || "",
      );
      // if(this.edit) return
      this.secteurss = sectors ? sectors : [];
      console.log("Secteurs  ==> ", this.secteurss);
      this.quartiers = [];
      this.userData.address.sector = this.userData.address.sector || "";
      if (this.userData.address.sector)
        this.onSecteurChange(this.userData.address.sector);
      this.userData.address.neighborhood =
        this.userData.address.neighborhood || "";
    }
  }

  onSecteurChange(secteur: string) {
    if (secteur) {
      const secteurObj = this.secteurss.find((s) => s.name === secteur);
      const quartiers = this.countriesOrgMockService.getNeighborhoodsBySector(
        secteurObj?.id || "",
      );
      console.log("Quartiers  ==> ", quartiers);
      this.quartierss = quartiers;
      this.userData.address.neighborhood =
        this.userData.address.neighborhood || "";
    }
    const secteurObj = this.secteurs.find((s) => s.secteur === secteur);
    this.quartiers = secteurObj ? secteurObj.quartiers : [];
    this.userData.address.neighborhood =
      this.userData.address.neighborhood || "";
  }

  onCityChange(city: string) {
    if (city) {
      const cityObj = this.cities.find((c) => c.name === city);
      console.log("City Object ==> ", cityObj);
      const arr = this.countriesOrgMockService.getArrondissementsByCity(
        cityObj?.id || "",
      );
      this.arrondissementss = arr ? arr : [];
      console.log("Arrondissements  ==> ", this.arrondissementss);
      this.secteurs = [];
      this.quartiers = [];
      this.userData.address.arrondissement =
        this.userData.address.arrondissement || "";
      if (this.userData.address.arrondissement)
        this.onArrondissementChange(this.userData.address.arrondissement);
      this.userData.address.sector = this.userData.address.sector || "";
      this.userData.address.neighborhood =
        this.userData.address.neighborhood || "";
    }
  }
  getAllCountries() {
    console.log(
      "All cities ==> ",
      this.countriesOrgMockService.getCitiesByCountry("1"),
    );
    this.cities = this.countriesOrgMockService.getCitiesByCountry("1");
  }
  isButtonDisabled(): boolean {
    const disabled = this.isLoading;
    return disabled;
  }

  /**
   * Handles registration errors and displays appropriate messages
   */
  private handleRegistrationError(
    error: string | { [key: string]: string[] } | undefined,
    fallbackMessage?: string,
  ): void {
    this.validationErrors = {};
    this.generalError = "";

    // if (typeof error === "object" && error !== null) {
    //   // Handle field-specific validation errors
    //   this.validationErrors = error;
    //   this.notificationService.showError(
    //     "Erreurs de validation",
    //     "Veuillez corriger les erreurs dans le formulaire",
    //   );
    // } else
    if (typeof error === "string" && error.trim()) {
      // Handle general error message
      this.generalError = error;
      this.notificationService.showError("Erreur lors de l'inscription", error);
    } else {
      // Handle fallback error
      const message = fallbackMessage || "Une erreur inconnue s'est produite";
      this.generalError = message;
      this.notificationService.showError(
        "Erreur lors de l'inscription",
        message,
      );
    }
  }

  onUpdateAgency(): void {
    console.log("[DEBUG] onRegister() appelée");
    console.log("[DEBUG] Données utilisateur:", this.userData);
    console.log("[DEBUG] isLoading:", this.isLoading);

    // Clear previous errors
    this.validationErrors = {};
    this.generalError = "";

    console.log("[DEBUG] Validation réussie, démarrage inscription...");

    this.isLoading = true;

    // Handle AGENCY role using the unified register method

    // Prepare agency registration data
    const registrationData: any = {
      name: this.userData.name,
      agencyDescription: this.userData.agencyDescription,
      zoneActivite: [this.userData.address.neighborhood],
      slogan: this.userData.slogan,
      status: this.userData.status,
      documents: [],
    };

    console.log(
      "[DEBUG] Données de modification agence préparées:",
      registrationData,
    );
    console.log("[DEBUG] agencyName value:", this.userData.name);
    console.log("[DEBUG] agencyId value:", this.userData._id);
    console.log(
      "[DEBUG] agencyDescription value:",
      this.userData.agencyDescription,
    );

    this.adminService
      .updateAgency(this.userData._id, registrationData)
      .subscribe({
        next: (response) => {
          this.isLoading = false;

          console.log("[DEBUG] Réponse modification agence:", response);
          // Use the unified RegisterResponse structure
          const isSuccess = response.success;

          if (isSuccess) {
            this.visible2 = false;
            this.notificationService.showSuccess(
              "Modification agence réussie",
              "Votre agence a été modifiée avec succès !",
            );
          } else {
            console.log(
              "[DEBUG] modification de l'agence manque data:",
              response,
            );
            this.handleRegistrationError(response.message || response.error);
          }
        },
        error: (error) => {
          this.isLoading = false;
          console.log("[DEBUG] Modification agence error:", error);
          this.handleRegistrationError(error.error || error.message || error);
        },
      });
    return;
  }

  //Zones d'intervention de l'agences
  onZoneActiviteChange(agencyId: string) {
    this.agencyService.getAgencyZones$(agencyId).subscribe({
      next: (response: any) => {
        if (!response.success) return;
        this.agencyZones = response.data;
        this.isLoading = false;
        console.log("[DEBUG] Zones d'activité de l'agence:", response);
      },
      error: (error) => {
        this.isLoading = false;
        console.log("[DEBUG] Zones d'activité de l'agence:", error);
        this.handleRegistrationError(error.error || error.message || error);
      },
    });
  }

  /**
   * Charge les agences depuis l'API backend et remplace les données locales
   */
  generateRandomStarsList(): void {
    this.randomStarsList = Array.from(
      { length: this.filteredAgencies.length },
      () => Math.floor(Math.random() * 5) + 1,
    );
  }
  private getRandomAgencies(list: any[]): any[] {
    const shuffled = [...list];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, Math.min(4, shuffled.length));
  }
  loadAgenciesFromApi(): void {
    this.agencyService.getAllAgenciesFromApi().subscribe((response: any) => {
      this.agencies = (response.data || []).map((a: any) =>
        this.mapApiAgency(a),
      );
      this.filteredAgencies = this.getRandomAgencies(this.agencies);
      console.log("Agences chargées :", this.filteredAgencies);
      this.generateRandomStarsList();
      // this.applyFilters();
    });
  }

  goToAgencyDetails(agencyId: string): void {
    window.location.href = `/agencies/${agencyId}`;
  }
}
