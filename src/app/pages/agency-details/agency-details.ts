import { ChangeDetectorRef, Component, OnInit, signal } from "@angular/core";

import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { AgencyService } from "../../services/agency.service";
import { Agency, Statistics, Tarif } from "../../models/agency.model";
import { AuthService } from "../../services/auth.service";
import { NotificationService } from "../../services/notification.service";
import { RegisterUserData } from "../../models/user.model";
import { MessagesService } from "../../services/messages.service";
import { Message } from "../../models/message.model";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { TerritoryHttpService } from "../../services/territory-http.service";

import { DrawerModule } from "primeng/drawer";
import {
  Arrondissement,
  City,
  Quartier,
  Sector,
} from "../../models/countries-org.model";
import { Admin } from "../../services/admin";
import { MobileMoneyFormComponent } from "../payment/mobile-money-form/mobile-money-form";
import { Breadcrumb, BreadcrumbItem } from "../../shared/breadcrumb/breadcrumb";
import { dashboardRouteForRole, dashboardLabelForRole } from "../../shared/notification-route.util";
import { PhoneInputDirective } from "../../shared/phone-input.directive";

/** Zone de couverture telle que renvoyée par GET /agencies/:id/zones (nouveau
 * modèle, services/agency.js::_mergeZoneDetails) : `city`/`arrondissement`/`sector`
 * sont absents pour les zones ajoutées avant l'introduction de ce détail. */
export interface AgencyZone {
  city?: string;
  arrondissement?: string;
  sector?: string;
  neighborhood: string;
}

@Component({
  selector: "app-agency-details",
  imports: [
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    DrawerModule,
    MobileMoneyFormComponent,
    Breadcrumb,
    PhoneInputDirective,
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

  searchQuery = '';
  selectedCity = '';
  selectedService = '';
  maxPrice = '';
  minRating = '';
  // selectedCity: string = '';
  selectedArrondissement: string = '';
  selectedSector: string = '';
  selectedNeighborhood: string = '';

  arrondissementss: Arrondissement[] = [];
  cities: City[] = [];
  secteurss: Sector[] = [];
  secteurs: { secteur: string; quartiers: string[] }[] = [];
  quartiers: string[] = [];
  quartierss: Quartier[] = [];
  validationErrors: { [key: string]: string[] } = {};
  generalError: string = "";
  isLoadingCities = false;
  isLoadingArrondissements = false;
  isLoadingSecteurs = false;
  isLoadingQuartiers = false;

  agency: any = "";
  agencyId: string | null = null;
  agencyIdd: string | null = null;
  currentUser: RegisterUserData | null = null;

  // Le fil d'Ariane dépend de la provenance réelle : un manager qui arrive ici via
  // "Portail Agence" depuis SON tableau de bord (vérifié par comparaison d'agencyId, donc
  // fiable même après un rechargement de page) voit "Dashboard agence > Portail agence".
  // Les autres rôles (admin, municipalité, client) arrivant via une action de LEUR tableau
  // de bord (repérée par le drapeau `fromDashboard` posé sur la navigation — cf.
  // admin-dashboard/municipality-dashboard/client-dashboard/signalement) voient
  // "Leur tableau de bord > {nom de l'agence}". Sans ce drapeau (lien "Agences" public,
  // accès direct par URL, page d'accueil...), le fil d'Ariane public existant
  // ("Accueil > Agences > {nom}") reste affiché, ce qui est le comportement correct pour
  // cet accès-là.
  get isOwnAgencyView(): boolean {
    return (
      this.currentUser?.role === "manager" &&
      !!this.agencyId &&
      this.currentUser?.agencyId === this.agencyId
    );
  }

  get isFromDashboard(): boolean {
    return this.isOwnAgencyView || !!(history.state && history.state.fromDashboard);
  }

  get agencyBreadcrumbItems(): BreadcrumbItem[] {
    const label = this.isOwnAgencyView ? "Portail agence" : (this.agency?.name || "Agence");
    return [
      { label: dashboardLabelForRole(this.currentUser?.role), route: dashboardRouteForRole(this.currentUser?.role), icon: "home" },
      { label },
    ];
  }

  /** Nombre de clients visible seulement pour le manager de CETTE agence, la
   * municipalité ou le super_admin — jamais pour les clients, les managers d'une
   * autre agence, ou un visiteur non connecté. */
  get canSeeClientCount(): boolean {
    return (
      this.currentUser?.role === "super_admin" ||
      this.currentUser?.role === "municipality" ||
      this.isOwnAgencyView
    );
  }
  messageData: Message = {
    sender: "",
    receiver: "",
    content: "",
  };

  agencies: Agency[] = [];
  filteredAgencies: Agency[] = [];

  showSubscriptionModal = false;

  showReportModal = false;
  unreadMessageCount: any;
  agencyZones: AgencyZone[] = [];
  visible2: boolean = false;
  visible1: boolean = false;
  showPaymentDrawer: boolean = false;

  isLogged = signal(false);

  // ── Souscription sans compte préalable (guest checkout) ────────────────────
  /** 'phone' : demande le numéro avant paiement (visiteur non connecté).
   * 'payment' : formulaire de paiement habituel (compte réel ou coquille déjà établi). */
  subscriptionStep: "phone" | "payment" = "payment";
  guestPhone: string = "";
  /** Facultatifs — s'ils sont saisis, ils remplacent les placeholders provisoires
   * ('Client' / numéro de téléphone) posés par défaut sur le compte "coquille". */
  guestFirstName: string = "";
  guestLastName: string = "";
  /** Facultatif — si vide, un mot de passe aléatoire est généré côté serveur (voir
   * AuthService.guestCheckout) et le client pourra le définir plus tard. */
  guestPassword: string = "";
  guestConfirmPassword: string = "";
  isSubmittingGuestPhone = false;
  guestCheckoutExistingAccount = false;
  resumableTransaction: any = null;
  /** true si la session active provient d'un compte "coquille" créé pour cette
   * souscription — affiche le CTA "Accéder à mon espace" après paiement réussi. */
  wasGuestCheckout = false;

  isLoadingStatistics: boolean = false;
  statistics: Statistics = {
    totalClientsActifs: 0,
    totalEmployees: 0,
    totalZone: 0,
    totalCollectors: 0,
    totalSignalements: 0,
    activeCollectors: 0,
    todayCollections: 0,
    completedCollections: 0,
    monthlyRevenue: 0,
    averageRating: 0,
    pendingReports: 0,
    totalpendingSignalements: 0,
  };
  constructor(
    private route: ActivatedRoute,
    private territoryService: TerritoryHttpService,
    private agencyService: AgencyService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router,
    private messageService: MessagesService,
    private adminService: Admin,
        private cdr: ChangeDetectorRef,
  ) {
    this.drawerWidth;
    this.loadAgencyDataOnInit();
  }

  ngOnInit(): void {
    
    this.currentUser = this.authService.getCurrentUser();
    this.loadAgencyDataOnInit();
    this.checkUserIsLooged();
    this.loadAgenciesFromApi();
    this.cdr.detectChanges();

  }

  checkUserIsLooged() {
    this.authService.isAuthenticated$.subscribe({
      next: (isAuth) => {
        console.log("user connected", isAuth);
        this.isLogged.set(!isAuth);
      },
    });
  }

  /** Cas A du guest checkout (numéro déjà associé à un compte) : après connexion,
   * reprend directement la souscription mémorisée avant la redirection vers /login
   * (voir AuthService.setPendingSubscriptionIntent / login.ts::onLogin) au lieu de
   * faire recommencer le visiteur depuis le choix de l'abonnement. */
  private resumeSubscriptionIntentAfterLogin(): void {
    const intent = (history.state as any)?.resumeSubscription;
    if (!intent || !this.tariffs.length) return;

    const tariff = this.tariffs.find((t: any) => t._id === intent.tarifId);
    if (!tariff) return;

    this.submitSubscription(this.currentUser?._id, tariff._id, intent.numberMonths, tariff.price);
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
      this.loadAgencyStatistics(this.agencyId || "")
    }
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
    });
    this.countUnreadMessages();
  }
  get drawerWidth(): string {
    return window.innerWidth <= 768 ? "100%" : "33%";
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
        this.resumeSubscriptionIntentAfterLogin();
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

    this.selectedTarif = {
      tarifId: tariff_id,
      userId: currentUserId,
      numberMonths: numberm_month,
      amount: price * numberm_month,
      unitPrice: price,
      agencyId: this.agencyId ?? this.agency?._id,
    };

    console.log("selectedTarif==>", this.selectedTarif);
    if (this.selectedTarif !== null) {
      // isLogged() === true signifie NON authentifié (nom historique conservé) :
      // un visiteur sans session passe d'abord par l'étape téléphone (souscription
      // sans compte préalable), un utilisateur déjà connecté va directement au paiement.
      this.subscriptionStep = this.isLogged() ? "phone" : "payment";
      this.guestPhone = "";
      this.guestCheckoutExistingAccount = false;
      this.resumableTransaction = null;
      this.showPaymentDrawer = true;
    }

  }

  /** Même normalisation que login.ts/register.ts::formatPhone — l'input reste en
   * théorie déjà "national uniquement" grâce à appPhoneInput (indicatif affiché à
   * part), mais reste défensif si un numéro est collé avec son indicatif. */
  private formatGuestPhone(phone: string): string {
    if (!phone) return '';
    return String(phone).trim().replace(/\s+/g, '').replace(/^\+?(226|225)?/, '');
  }

  /** Étape téléphone du guest checkout : crée (ou réutilise) un compte "coquille"
   * pour ce numéro et établit une session, avec le mot de passe choisi par le
   * client (obligatoire — c'est celui avec lequel il se reconnectera ensuite).
   * Voir AuthService.guestCheckout(). */
  continueAsGuest(): void {
    if (this.isSubmittingGuestPhone || !this.guestPhone) return;

    if (!this.guestPassword || this.guestPassword.length < 8) {
      this.notificationService.showError("Erreur", "Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (this.guestPassword !== this.guestConfirmPassword) {
      this.notificationService.showError("Erreur", "Les mots de passe ne correspondent pas.");
      return;
    }

    this.isSubmittingGuestPhone = true;
    this.guestCheckoutExistingAccount = false;

    const phone = this.formatGuestPhone(this.guestPhone);
    this.authService.guestCheckout(phone, this.guestFirstName, this.guestLastName, this.guestPassword || undefined).subscribe({
      next: (response) => {
        this.isSubmittingGuestPhone = false;

        if (response.existingAccount) {
          // Cas A : ce numéro appartient déjà à un compte — on ne crée pas de
          // doublon, on redirige vers la connexion en mémorisant l'intention pour
          // reprendre exactement cette souscription juste après.
          this.guestCheckoutExistingAccount = true;
          this.authService.setPendingSubscriptionIntent({
            agencyId: this.selectedTarif.agencyId,
            tarifId: this.selectedTarif.tarifId,
            numberMonths: this.selectedTarif.numberMonths,
            unitPrice: this.selectedTarif.unitPrice,
          });
          this.notificationService.showInfo(
            "Compte existant",
            "Un compte existe déjà avec ce numéro. Connectez-vous pour continuer.",
          );
          this.router.navigate(["/login"]);
          return;
        }

        if (!response.success || !response.user) {
          this.notificationService.showError(
            "Erreur",
            response.error || "Impossible de continuer avec ce numéro pour le moment.",
          );
          return;
        }

        this.currentUser = response.user;
        this.wasGuestCheckout = true;
        this.selectedTarif = { ...this.selectedTarif, userId: response.user._id };

        if (response.resumableTransaction) {
          // Souscription déjà entamée pour ce numéro (abandon avant paiement) —
          // proposer de reprendre plutôt que de repartir de zéro.
          this.resumableTransaction = response.resumableTransaction;
        } else {
          this.subscriptionStep = "payment";
        }
      },
      error: () => {
        this.isSubmittingGuestPhone = false;
        this.notificationService.showError(
          "Erreur",
          "Impossible de continuer avec ce numéro pour le moment.",
        );
      },
    });
  }

  /** Reprend une souscription abandonnée : passe à l'étape paiement pour le même
   * tarif déjà connu (le client ne recommence pas depuis le choix de l'abonnement).
   * Simplification assumée : une nouvelle transaction est initiée plutôt que de
   * reprendre l'ancienne au milieu de son propre flux OTP (aucune intégration
   * frontend de /transactions/resend-otp n'existait avant cette fonctionnalité —
   * l'ajouter uniquement pour ce cas bord aurait représenté un risque disproportionné
   * par rapport au bénéfice : le client ne perd que la saisie de l'OTP, pas son
   * abonnement ni son numéro). */
  resumePendingPayment(): void {
    if (!this.resumableTransaction) return;
    this.subscriptionStep = "payment";
  }

  /** Ignore la souscription en attente et repart d'une souscription neuve pour le
   * tarif actuellement sélectionné (une nouvelle transaction sera créée). */
  startNewSubscription(): void {
    this.resumableTransaction = null;
    this.subscriptionStep = "payment";
  }

  /** CTA affiché après paiement réussi pour un compte créé via guest checkout —
   * la session est déjà active (établie dès l'étape téléphone), il ne reste qu'à
   * rediriger vers le bon espace selon le rôle. */
  goToMySpace(): void {
    const role = this.authService.getCurrentUser()?.role;
    this.router.navigate([dashboardRouteForRole(role)]);
  }

  /** Nombre de mois choisi directement dans le drawer "Abonnement" — recalcule le
   * montant (prix unitaire × mois) et remplace `selectedTarif` par une nouvelle
   * référence pour que <app-mobile-money-form> (via ngOnChanges) reprenne le nouveau
   * montant dans son propre formulaire. */
  updateSubscriptionMonths(months: number): void {
    if (!this.selectedTarif) return;
    const clamped = Math.min(12, Math.max(1, months || 1));
    this.selectedTarif = {
      ...this.selectedTarif,
      numberMonths: clamped,
      amount: this.selectedTarif.unitPrice * clamped,
    };
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
  isSendingMessage = false;
  submitMessage(agencyId: string) {
    if (this.isSendingMessage) return;
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
    this.isSendingMessage = true;
    this.messageService.sendMessage(this.messageData).subscribe({
      next: (response: any) => {
        this.isSendingMessage = false;
        console.log("API > sendMessage:", response);
        this.notificationService.showSuccess(
          "Message envoyé",
          "Votre message a bien été envoyé",
        );
        this.showReportModal = false;
      },
      error: (error: any) => {
        this.isSendingMessage = false;
        console.error("API > sendMessage:", error);
        this.notificationService.showError(
          "Message non envoyé",
          "Une erreur s'est produite lors de l'envoi du message",
        );
      },
    });
  }
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
      rating: apiAgency.rating ?? null,
      ratingsCount: apiAgency.ratingsCount || 0,
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

  loadAgencyFromApi(id: string | null): void {
    this.agencyService.getAgencyByIdFromApi(id).subscribe((response: any) => {
      if (response.success && response.data) {
        console.log("[DEBUG] Agency response:", response.data);
        this.agency = this.mapApiAgency(response.data);
      } else {
        console.error("Erreur lors du chargement de l'agence");
        // Fallback vers les données mockées si l'API échoue
        this.agencyService.getAgencyById(id).subscribe((agency) => {
          this.agency = agency || null;
        });
      }
    });
  }

  getStars(rating: number | null): number[] {
    if (!rating || rating < 0) return [];
    return new Array(Math.floor(rating)).fill(0);
  }
  isDeletingAgency = false;
  deleteAgency(agencyId: string): void {
    if (!this.agency || this.isDeletingAgency) return;

    this.isDeletingAgency = true;
    this.agencyService.deleteAgency(agencyId).subscribe({
      next: (response) => {
        this.isDeletingAgency = false;
        if(response.success){
          this.notificationService.showSuccess(
            "Agence supprimée",
            "L'agence a bien été supprimée"
          )
        }
      },
      error: (error) => {
        this.isDeletingAgency = false;
        this.notificationService.showError(
          "Agence non supprimée",
          error.error?.message
        )
      }
    })
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
  isTogglingAgencyStatus = false;
  activateAgency(id: string) {
    if (this.isTogglingAgencyStatus) return;
    if (this.agency?.status === "active") {
      this.agencyStatus = "deactivate";
    } else {
      this.agencyStatus = "activate";
    }

    console.log("agency status", this.agencyStatus);
    this.isTogglingAgencyStatus = true;
    this.agencyService.activateAgency(id, this.agencyStatus).subscribe({
      next: (response: any) => {
        this.isTogglingAgencyStatus = false;
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
        this.isTogglingAgencyStatus = false;
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


  //Edit agency
  edit: boolean = false;
  onArrondissementChange(arrondissement?: string) {
    this.secteurss = [];
    this.quartierss = [];
    this.quartiers = [];
    if (!arrondissement) return;

    const sectorObj = this.arrondissementss.find((a) => a.name === arrondissement);
    this.userData.address.sector = this.userData.address.sector || "";
    this.userData.address.neighborhood = this.userData.address.neighborhood || "";
    if (!sectorObj?.id) return;

    this.isLoadingSecteurs = true;
    this.territoryService.getSectorsByArrondissement(sectorObj.id).subscribe({
      next: (sectors) => {
        this.secteurss = sectors;
        this.isLoadingSecteurs = false;
        if (this.userData.address.sector) this.onSecteurChange(this.userData.address.sector);
      },
      error: () => { this.secteurss = []; this.isLoadingSecteurs = false; },
    });
  }

  onSecteurChange(secteur: string) {
    this.quartierss = [];
    this.quartiers = [];
    this.userData.address.neighborhood = this.userData.address.neighborhood || "";
    if (!secteur) return;

    const secteurObj = this.secteurss.find((s) => s.name === secteur);
    if (!secteurObj?.id) return;

    this.isLoadingQuartiers = true;
    this.territoryService.getNeighborhoodsBySector(secteurObj.id).subscribe({
      next: (quartiers) => { this.quartierss = quartiers; this.isLoadingQuartiers = false; },
      error: () => { this.quartierss = []; this.isLoadingQuartiers = false; },
    });
  }

  onCityChange(city: string) {
    this.arrondissementss = [];
    this.secteurss = [];
    this.quartierss = [];
    this.secteurs = [];
    this.quartiers = [];
    if (!city) return;

    const cityObj = this.cities.find((c) => c.name === city);
    this.userData.address.arrondissement = this.userData.address.arrondissement || "";
    this.userData.address.sector = this.userData.address.sector || "";
    this.userData.address.neighborhood = this.userData.address.neighborhood || "";
    if (!cityObj?.id) return;

    this.isLoadingArrondissements = true;
    this.territoryService.getArrondissementsByCity(cityObj.id).subscribe({
      next: (arr) => {
        this.arrondissementss = arr;
        this.isLoadingArrondissements = false;
        if (this.userData.address.arrondissement) this.onArrondissementChange(this.userData.address.arrondissement);
      },
      error: () => { this.arrondissementss = []; this.isLoadingArrondissements = false; },
    });
  }

  getAllCountries() {
    this.isLoadingCities = true;
    this.territoryService.getAllCities().subscribe({
      next: (cities) => { this.cities = cities; this.isLoadingCities = false; },
      error: () => { this.cities = []; this.isLoadingCities = false; },
    });
  }
  isButtonDisabled(): boolean {
    const disabled = this.isLoading;
    return disabled;
  }

  private handleRegistrationError(
    error: string | { [key: string]: string[] } | undefined,
    fallbackMessage?: string,
  ): void {
    this.validationErrors = {};
    this.generalError = "";

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

  /** Regroupe agencyZones par ville réelle (`city`) plutôt que d'afficher un
   * intitulé "Ouagadougou" figé — les zones héritées d'avant l'introduction de
   * zoneDetails (sans `city`) sont regroupées sous "Autres". */
  get zonesByCity(): { city: string; zones: AgencyZone[] }[] {
    const groups = new Map<string, AgencyZone[]>();
    for (const zone of this.agencyZones) {
      const city = zone?.city || "Autres";
      if (!groups.has(city)) groups.set(city, []);
      groups.get(city)!.push(zone);
    }
    return Array.from(groups.entries()).map(([city, zones]) => ({ city, zones }));
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

  loadAgenciesFromApi(): void {
    const payload: any = {
    term: this.searchQuery || '',
    city: this.selectedCity,
    arrondissement: this.selectedArrondissement,
    sector: this.selectedSector,
    neighborhood: this.selectedNeighborhood,
    rating: this.minRating ? parseFloat(this.minRating) : null,
    status: 'active',
    getAll: true
    // maxPrice: this.maxPrice ? parseFloat(this.maxPrice) : null
  };
    this.agencyService.getAllAgenciesFromApi(payload).subscribe((response: any) => {
      this.agencies = (response.data || []).map((a: any) =>
        this.mapApiAgency(a),
      );
      this.filteredAgencies = this.agencyService.getRandomAgencies(this.agencies);
      console.log("Agences chargées :", this.filteredAgencies);
      // this.applyFilters();
    });
  }

  goToAgencyDetails(agencyId: string): void {
    window.location.href = `/agencies/${agencyId}`;
  }


  //recuperations des statistiques de l'agence
  loadAgencyStatistics(agencyId: string): void {
    if (agencyId) {
      this.isLoadingStatistics = true;
      this.agencyService.getAgencyStats$(agencyId).subscribe({
        next: (stats) => {
          if (!stats.success) return;
          this.statistics = stats.data;
          console.log("Statistiques de l'agence chargées details :", this.statistics);
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
}
