import { CellWidthType } from "./../../../../../node_modules/jspdf-autotable/dist/index.d";
import { BarcodeFormat } from "@zxing/library";
import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, RouterModule, TitleStrategy } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { AuthService } from "../../../services/auth.service";
import { CollectionService } from "../../../services/collection.service";
import { NotificationService } from "../../../services/notification.service";
import { ClientUser, User } from "../../../models/user.model";
import {
  Collection,
  CollectionStatus,
  CollectionReport,
  CollectionStatus1,
} from "../../../models/collection.model";
import { ClientService } from "../../../services/client.service";
import { map, forkJoin, of } from "rxjs";
import { catchError } from "rxjs/operators";
import { AgencyService } from "../../../services/agency.service";
import { Message } from "../../../models/message.model";
import { MatIcon } from "@angular/material/icon";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Signalement } from "../../shared_pages/signalement/signalement";
import { Subscription as RxSubscription } from "rxjs";
import { Webstockets, SocketNotification } from "../../../core/services/webstockets";
import { ConversationService, RealtimeMessage } from "../../../services/conversation.service";
import { ContratService } from "../../../services/contrat.service";
import { Contrat } from "../../../models/contrat.model";
import { EligibilityService, EligibilityResult, isSubscriptionCurrentlyActive } from "../../../services/eligibility.service";
import { DemandeCollecteService } from "../../../services/demande-collecte.service";
import { RedevanceService } from "../../../services/redevance.service";
import { ExportClientService } from "../financial-dashboard/data-access/export/export-client.service";
import { FinanceService } from "../../../services/finance.service";

interface PaymentHistory {
  id: string;
  date: Date;
  amount: number;
  status: "completed" | "pending" | "late" | "cancelled" | "failed";
  description: string;
  method?: string;
  // Nom de l'agence émettrice (chantier Finance/Paiements, item 4 : "champ utilisateur
  // par ligne") — un client peut avoir des Contrat/Redevance avec plusieurs agences
  // (getRedevancesByClient() n'est jamais scopé à une seule agence, contrairement à
  // getFacturesByClient()), donc utile pour désambiguïser d'un coup d'œil.
  agencyName?: string;
}

interface Subscription {
  id: string;
  serviceName: string;
  agencyName: string;
  price: number;
  frequency: string;
  status: "active" | "suspended" | "cancelled";
  nextPayment: Date;
}

@Component({
  selector: 'app-client-dashboard',
  imports: [CommonModule, RouterModule, FormsModule, MatIcon, Signalement],
  providers: [ExportClientService],
  templateUrl: './client-dashboard.html',
  styleUrl: './client-dashboard.scss'
})
export class ClientDashboard  implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild("scrollMe") private myScrollContainer!: ElementRef;
  @ViewChild('chatMessages') chatMessages!: ElementRef;
  currentUser!: any;
  upcomingCollections: Collection[] = [];
  collectionHistory: any[] = [];
  filteredHistory: Collection[] = [];
  filteredHistories: any;
  paymentHistory: PaymentHistory[] = [];
  subscription: Subscription | null = null;

  historyFilter = "all";
  showReportModal = false;
  showPaymentModal = false;

  reportData = {
    type: "",
    description: "",
    severity: "",
    clientId: "",
    agencyId: "",
    collecteId: ""
  };

  // Demande de passage spontané ("Collecte express") — modèle/service dédié
  // (DemandeCollecte), sémantiquement distinct d'un Signalement : il s'agit
  // d'une demande de service, pas d'une réclamation/incident.
  showSpontaneousRequestModal = false;
  isSubmittingSpontaneousRequest = false;
  spontaneousRequestData: { wasteTypes: string[]; notes: string; requestedDate: string } = {
    wasteTypes: [],
    notes: "",
    requestedDate: "",
  };
  readonly spontaneousWasteTypeOptions = [
    { value: "menagers", label: "Déchets ménagers" },
    { value: "recyclables", label: "Recyclables" },
    { value: "verts", label: "Déchets verts" },
    { value: "encombrants", label: "Encombrants" },
    { value: "speciaux", label: "Déchets spéciaux" },
  ];
  spontaneousRequests: any[] = [];
  unreadMessageCount: any;
  receivedMessages: any;
  connectedUserMessages: any;
  agency: any;
  showMessageModal: boolean = false;
  receivedId: string = "";
  messageData: Message = {
    sender: "",
    receiver: "",
    content: "",
  };
  data: any;
  subscriptions: any[] = [];
  // Abonnement réellement actif (isActive===true ET endDate dans le futur) —
  // plus jamais "le dernier élément du tableau" (chantier EligibilityService,
  // même correctif que pages/subscription/subscription.ts).
  activeSubscription: any = null;
  // Abonnement le plus récent (actif ou non) — affichage uniquement, pour ne
  // pas faire disparaître le statut/les dates réels quand rien n'est actif.
  latestSubscription: any = null;
  // "Mon contrat" (carte de la colonne droite, même patron que activeSubscription) —
  // sans ceci, le client n'a aucune trace côté dashboard qu'il est lié à une
  // agence par un Contrat plutôt que (ou en plus) d'un Abonnement.
  activeContrat: Contrat | null = null;
  // Source unique de vérité pour "ce client bénéficie-t-il du service ?" —
  // pilote uniquement le bandeau de continuité de service, jamais recalculée
  // ici (EligibilityService, backend).
  eligibility: EligibilityResult | null = null;
  showRechargeModal: boolean = false;

  // Montant de recharge
  rechargeAmount: number = 0;
  displayAgencyName: any;
  private newSubscriptionSub?: RxSubscription;
  private incomingMessageSub?: RxSubscription;

  constructor(
    private authService: AuthService,
    private collectionService: CollectionService,
    private clientService: ClientService,
    private notificationService: NotificationService,
    private agencyService: AgencyService,
    private websocketService: Webstockets,
    private conversationService: ConversationService,
    private contratService: ContratService,
    private eligibilityService: EligibilityService,
    private demandeCollecteService: DemandeCollecteService,
    private route: ActivatedRoute,
    private redevanceService: RedevanceService,
    private exportClientService: ExportClientService,
    private financeService: FinanceService
  ) {}

  ngOnInit(): void {
    // this.currentUser = this.authService.getCurrentUser();
    this.getUser();
    // console.log("Current User", this.currentUser);
    this.loadDashboardData();

    // Point d'entrée du lien footer "Collecte express" (auparavant mort,
    // href="#") : /dashboard/client?action=collecte-express ouvre directement
    // le formulaire de demande de passage spontané.
    if (this.route.snapshot.queryParamMap.get('action') === 'collecte-express') {
      this.openSpontaneousRequestModal();
    }

    // Phase 5 : les notifications Abonnement passent désormais par
    // `notifyUsers` (Phase 3, backend) — donc par ce même canal socket, en
    // plus du chargement initial ci-dessus (`getUserSubscription()` dans
    // `getUser()`). Sans ceci, un abonnement qui expire automatiquement
    // (scheduler minuit) laisse le dashboard afficher un statut "actif"
    // périmé jusqu'au prochain rechargement manuel de page.
    this.newSubscriptionSub = this.websocketService.onNewNotification().subscribe((notification: SocketNotification) => {
      if (notification?.type === 'Subscribed') {
        this.getUserSubscription();
        this.loadEligibility();
      }
      // Même principe pour Contrat (Phase 4 backend) : création, résiliation
      // automatique (scheduler) ou manuelle doivent se refléter ici sans
      // rechargement de page.
      if (notification?.type === 'Contrat') {
        this.loadActiveContrat();
        this.loadEligibility();
      }
    });

    // Messagerie temps réel : le backend émet `messageSent` vers l'expéditeur
    // ET le destinataire (message.controller.js::sendMessage) — jusqu'ici ce
    // canal n'était jamais écouté ici, donc un message reçu n'apparaissait
    // qu'après un rechargement manuel de page. On met à jour la conversation
    // ouverte directement (pas de re-fetch HTTP complet), et on rafraîchit la
    // liste des conversations/le badge non-lus dans tous les cas.
    this.incomingMessageSub = this.conversationService.onIncomingMessage$().subscribe((message: RealtimeMessage) => {
      this.appendIncomingMessage(message);
      this.userMessages();
      this.countUnreadMessages();
    });
  }

  ngOnDestroy(): void {
    this.newSubscriptionSub?.unsubscribe();
    this.incomingMessageSub?.unsubscribe();
  }

  getUser() {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      this.getUserSubscription();
      this.loadActiveContrat();
      this.loadEligibility();
      this.getClientWallet();
      this.getWeeklySchedule();
      this.loadUpcomingPlannings();
      this.loadPlanningHistory();
      // Dépend de currentUser._id (chantier Finance/Paiements, item 4) — même raison que
      // loadActiveContrat() ci-dessus : appelée ici, pas depuis loadDashboardData()
      // (qui s'exécute avant que currentUser$ n'émette).
      this.loadPaymentHistory();
    });
    console.log("Current User", this.currentUser);
  }

  /** "Mon contrat" — même rôle que getUserSubscription() ci-dessus, pour le domaine Contrat. */
  loadActiveContrat(): void {
    const clientId = this.currentUser?._id;
    if (!clientId) return;
    this.contratService.getContratsByClient$(clientId).subscribe({
      next: (contrats) => {
        // Fallback trié par startDate desc (même logique que
        // pages/subscription/subscription.ts::latestContrat) — plutôt que
        // contrats[0] brut, dont l'ordre dépend de ce que renvoie le backend et
        // pouvait faire diverger ce dashboard de l'écran /subscription quand un
        // client a plusieurs contrats non actifs.
        const sortedByStartDateDesc = [...contrats].sort(
          (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        );
        this.activeContrat = sortedByStartDateDesc.find((c) => c.status === 'actif') || sortedByStartDateDesc[0] || null;
      },
      error: () => {
        this.activeContrat = null;
      },
    });
  }

  contratAgencyName(): string {
    const agency = this.activeContrat?.agencyId as any;
    return typeof agency === 'object' ? agency?.name : '';
  }

  contratFrequenceLabel(frequence?: string): string {
    const map: { [key: string]: string } = { daily: 'Quotidienne', weekly: 'Hebdomadaire', monthly: 'Mensuelle' };
    return frequence ? (map[frequence] || frequence) : '';
  }

  contratStatusLabel(status?: string): string {
    const map: { [key: string]: string } = { actif: 'Actif', suspendu: 'Suspendu', resilie: 'Résilié' };
    return status ? (map[status] || status) : '';
  }

  loadEligibility(): void {
    const clientId = this.currentUser?._id;
    if (!clientId) return;
    this.eligibilityService.checkEligibility$(clientId).subscribe({
      next: (result) => { this.eligibility = result; },
      error: () => { this.eligibility = null; },
    });
  }

  /** Même mapping que pages/subscription/subscription.ts::subscriptionStatusLabel() — seul champ réel disponible sur Subscription (isActive). */
  subscriptionStatusLabel(subscription: any): string {
    if (!subscription) return '';
    return isSubscriptionCurrentlyActive(subscription) ? 'Actif' : 'Expiré';
  }

  /** Piloté uniquement par EligibilityService — jamais recalculé ici (Prompt 0). */
  get showContractContinuityBanner(): boolean {
    return this.eligibility?.source === 'CONTRACT';
  }

  /** Symétrique du bandeau positif — piloté uniquement par `eligible`/`reason`. */
  get showIneligibilityBanner(): boolean {
    return this.eligibility !== null && this.eligibility.eligible === false;
  }

  /** Traduction d'affichage des valeurs réelles de `reason` — ne recalcule aucune règle. */
  ineligibilityMessage(): string {
    const map: { [key: string]: string } = {
      SUBSCRIPTION_EXPIRED: "Votre abonnement a expiré et vous n'avez aucun contrat actif. Renouvelez votre abonnement ou contactez votre agence pour continuer à bénéficier du service.",
      NO_ACTIVE_CONTRACT_OR_SUBSCRIPTION: "Vous n'avez actuellement ni abonnement ni contrat actif. Souscrivez un abonnement ou contactez votre agence pour bénéficier du service.",
    };
    const reason = this.eligibility?.reason;
    return (reason && map[reason]) || "Vous ne bénéficiez actuellement d'aucun service actif.";
  }

  //  GET CLIENT WALLET
  clientBalance!: number;
  getClientWallet() {
    const clientId = this.currentUser?._id || "";
    if (!clientId) return;
    this.clientService.getClientWallet(clientId).subscribe({
      next: (response: any) => {
        if (response.success && response.wallet.balance) {
          this.clientBalance = response?.wallet?.balance;
          console.log("Client Wallet:", response.wallet.balance, this.clientBalance);
        }
        // return response?.balance;
      },
      error: (error: any) => {
        console.error(
          "Erreur lors de la récupération du portefeuille client:",
          error
        );
      },
    });
  }

  // Virer dans le Wallet du client
  walletPayment() {
    const clientId = this.currentUser?._id || "";
    console.log("Client ID:", clientId);
    if (!clientId) return;

    const paymentData = {
      amount: this.rechargeAmount,
      clientId: clientId,
    };
    console.log("Données de paiement du wallet:", paymentData);
    if (this.rechargeAmount < 100) {
      this.notificationService.showError(
        "Montant invalide",
        "Le montant de recharge doit être au moins de 100 FCFA."
      );
      return;
    }

    this.clientService.walletPayment(paymentData).subscribe({
      next: (response: any) => {
        console.log("Paiement effectué avec succès:", response?.wallet);
        this.getClientWallet();
        this.notificationService.showSuccess(
          "Paiement réussi",
          "Votre compte a été rechargé avec succès."
        );
        this.showRechargeModal = false;
        this.rechargeAmount = 0;
      },
      error: (error: any) => {
        this.notificationService.showError(
          "Erreur de paiement",
          "Une erreur est survenue lors du paiement. Veuillez réessayer."
        );
        console.error("Erreur lors du paiement:", error);
      },
    });
  }

  // recuperer le planning de collecte de la semaine du client
  weeklySchedule: any[] = [];

  nextCollect: any;
  getWeeklySchedule() {
    const clientId = this.currentUser?._id || "";
    if (!clientId) return;

    this.clientService.getClientPlanning(clientId).subscribe({
      next: (response: any) => {
        console.log("API > getClientPlanning:", response);
        this.weeklySchedule = response|| [];
        if (this.weeklySchedule.length) {
          this.nextCollect = this.weeklySchedule[this.weeklySchedule.length - 1];
          console.log("Next collect ==> ", this.nextCollect);
        }
        // Traiter le planning récupéré
      },
      error: (error: any) => {
        console.error("Erreur lors de la récupération du planning:", error);
      },
    });
  }

  /**
   * Second pull, complémentaire à `getWeeklySchedule()` ci-dessus — montre les
   * plannings publiés/en cours qui concernent ce client AVANT même qu'une
   * Collecte n'existe (qui n'apparaît qu'au démarrage du planning). Comble le
   * trou où un planning fraîchement publié était invisible côté client malgré
   * la notification déjà reçue.
   */
  upcomingPlannings: any[] = [];
  loadUpcomingPlannings() {
    const clientId = this.currentUser?._id || "";
    if (!clientId) return;

    this.clientService.getClientUpcomingPlannings(clientId).subscribe({
      next: (plannings: any[]) => {
        this.upcomingPlannings = plannings || [];
      },
      error: (error: any) => {
        console.error("Erreur lors de la récupération des plannings à venir:", error);
      },
    });
  }

  // Recuperer le nombre de passage du mois

  getMonthlyCollectionsLength() {
    const currentMonth = new Date().getMonth();
    const monthlyCollections = this.collectionHistory.filter((col) => {
      const collectionDate = col.scheduledDate;
      return (
        collectionDate &&
        collectionDate.getMonth() === currentMonth &&
        collectionDate.getFullYear() === new Date().getFullYear()
      );
    });
    return monthlyCollections.length * 4;
  }
  getMonthlyCollectionsLengthgetMonthlyCollections() {
    const currentMonth = new Date().getMonth();
    const monthlyCollections = this.collectionHistory.filter((col) => {
      const collectionDate = col.scheduledDate;
      return (
        collectionDate &&
        collectionDate.getMonth() === currentMonth &&
        collectionDate.getFullYear() === new Date().getFullYear()
      );
    });
    return monthlyCollections;
  }

  // Completed collection datad
  getTotalCompletedCollectionsLength() {
    const completedCollections = this.collectionHistory.filter(
      (col) => col.status === "Completed"
    ).length;
    return completedCollections;
  }
  getTotalCompletedCollections() {
    const completedCollections = this.collectionHistory.filter(
      (col) => col.status === "Completed"
    );
    return completedCollections;
  }

  getTotalUnCompletedCollectionLength() {
    const unCompletedCollections = this.collectionHistory.filter(
      (col) => col.status === "Missed" || col.status === "Cancelled"
    ).length;
    return unCompletedCollections;
  }

  getTotalUpcomingCollectionsLength() {
    // const upcomingCollections = this.collectionHistory.filter(
    //   (col) => col.status === "scheduled"
    // ).length;
    const now = new Date();

    const isCurrentMonth = (date: Date | string) => {
      const d = new Date(date);
      return (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    };

    // const history = this.filteredHistories.filter((c: any) => isCurrentMonth(c.date)).length;
    const upcoming = this.weeklySchedule.filter(c => isCurrentMonth(c.date!));

    const totalCollections = this.getMonthlyCollectionsLength();
    const completedCollections = this.getTotalCompletedCollectionsLength();
    const unCompletedCollections = this.getTotalUnCompletedCollectionLength();
    const upcomingCollections =
      totalCollections - (completedCollections + unCompletedCollections);
    return upcoming.length;
  }

  // Taux de collectes complétées
  getCompletedCollectionRate() {
    const now = new Date();

    const isCurrentMonth = (date: Date | string) => {
      const d = new Date(date);
      return (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    };

    const history = this.filteredHistories.filter((c: any) => isCurrentMonth(c.date));
    const upcoming = this.weeklySchedule.filter(c => isCurrentMonth(c.date!));

    const completed = history.filter(
     (c: any) => c.status === CollectionStatus.COMPLETED
    ).length;
    
    // const totalCollections = this.getMonthlyCollectionsLength();
    const totalCollections = upcoming.length + history.length;
    // const completedCollections = this.getTotalCompletedCollectionsLength();
    if (totalCollections === 0) return 0;

    return Math.round((completed / totalCollections) * 100);
  }
  // Taux de collectes non complétées
  getUncompletedCollectionRate() {
    const totalCollections = this.getMonthlyCollectionsLength();
    const unCompletedCollections = this.getTotalUnCompletedCollectionLength();
    if (totalCollections === 0) return 0;

    return Math.round((unCompletedCollections / totalCollections) * 100);
  }

  // Taux de collectes à venir
  getUpcomingCollectionRate() {
    const now = new Date();

    const isCurrentMonth = (date: Date | string) => {
      const d = new Date(date);
      return (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    };

    const history = this.filteredHistories.filter((c: any) => isCurrentMonth(c.date));
    const upcoming = this.weeklySchedule.filter(c => isCurrentMonth(c.date!));
    // const totalCollections = this.getMonthlyCollectionsLength();
    const totalCollections = upcoming.length + history.length;
    const upcomingCollections = this.getTotalUpcomingCollectionsLength();
    if (totalCollections === 0) return 0;
    return Math.round((upcoming.length / totalCollections) * 100);
  }

  // Recuperer l'historique des collectes déjà effectuées
  loadPlanningHistory(): void {
    const clientId = this.currentUser?._id || "";
    this.filteredHistories = [];
    if (!clientId) return;
    this.clientService.getClientPlanningHistory(clientId).subscribe({
      next: (response: any) => {
        // this.collectionHistory = response.reports || [];
        console.log("API > getClientPlanningHistory:", response);
        this.collectionHistory = (response || []).map(
          (report: any) => ({
            id: report._id,
            clientId: report.clientId,
            agencyId: report.agencyId?._id || report.agencyId,
            agencyName: report.agencyId?.name || "votre agence",
            collectorId: report.collectorId,
            date: report.date,
            scheduledDate: report.createdAt ? new Date(report.createdAt) : null,
            collectedDate: report.updatedAt ? new Date(report.updatedAt) : null, // si dispo
            status: report.status === "Collected" ? "Completed" : report.status, // adapter au template
            wasteTypes: report.type || ["Déchets ménagers"], // valeur par défaut si absent
            // Notation agence : `report.rating` est soit null (jamais notée), soit
            // {_id, stars, comment, createdAt} (voir GET .../collecte-history,
            // enrichi côté backend — services/collecte.service.js::UserCollecteHistory).
            rating: report.rating?.stars || 0,
            isRated: !!report.rating,
            photos: report.photos,
            positionGPS: report.positionGPS,
            createdAt: report.createdAt,
            updatedAt: report.updatedAt,
          })
        );
        console.log("Planning history ==> ", this.collectionHistory);
        this.filteredHistories = [...this.collectionHistory];
        console.log("Filtered histories ==> ", this.filteredHistories);
        // Appliquer le filtre initial
        // this.applyHistoryFilter();
      },
      error: (error: any) => {
        console.error(
          "Erreur lors de la récupération de l'historique des collectes:",
          error
        );
      },
    });
  }

  // Afficher abonnement
  getUserSubscription() {
    const userID = this.currentUser?._id || "";
    if (!userID) return;
    this.agencyService.getUserSubscription(userID).subscribe({
      next: (response: any[]) => {
        this.subscriptions = response || [];
        console.log("Subscriptions ==>", this.subscriptions);
        // paymentHistory n'est plus construit depuis les Abonnements (chantier
        // Finance/Paiements, item 4) — voir loadRedevancesHistory(), la vraie source de
        // "paiements" (redevances récurrentes), distincte du statut d'un Abonnement.
        // Abonnement réellement actif — jamais "le dernier élément du
        // tableau" (chantier EligibilityService, même correctif que
        // pages/subscription/subscription.ts::getUserSubscription()).
        const sortedByEndDateDesc = [...this.subscriptions].sort(
          (a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
        );
        this.activeSubscription = sortedByEndDateDesc.find((sub) => isSubscriptionCurrentlyActive(sub)) || null;
        this.latestSubscription = sortedByEndDateDesc[0] || null;
        console.log("Active subscription ==>", this.activeSubscription);
        console.log("Payment history ==>", this.paymentHistory);
      },
      error: (err) => {
        console.error("Erreur lors du chargement des abonnements", err);
      },
    });
  }

  renewSubscription() {
    // Logique pour renouveler l'abonnement
    alert("Fonction de renouvellement d'abonnement à implémenter.");
  }
  contactSupport() {
    // Logique pour contacter le support
    alert("Fonction de contact support à implémenter.");
  }

  loadDashboardData(): void {
    // Charger les données du tableau de bord
    this.loadUpcomingCollections();
    this.loadCollectionHistory();
    // loadPaymentHistory() déplacée dans getUser() (dépend de currentUser._id, voir son
    // propre commentaire) — plus appelée ici.
    this.loadSubscription();
    this.countUnreadMessages();
    this.userMessages();
    this.loadClientReports();
    this.loadSpontaneousRequests();
  }
  /**Récupération des signalements d'un client */
  clientReports = [];
  loadClientReports() {
    this.clientService.getClientReports(this.currentUser?._id || "").subscribe({
      next: (response: any) => {
        this.clientReports = response || [];
        console.log("API > getClientReports:", response);
      },
      error: (error: any) => {
        console.error("API > getClientReports:", error);
      },
    })
  }
  /**Gestion des messages recus par le client connecté */
  countUnreadMessages() {
    this.conversationService
      .getUnreadCount$(this.currentUser?._id || "")
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
    this.conversationService
      .getConversationsList$(this.currentUser?._id || "")
      .subscribe({
        next: (response: any) => {
          if (response) {
            this.connectedUserMessages = response || [];
          }
        },
        error: (error: any) => {
          console.error("API > getMessagesForUser:", error);
        },
      });
  }

  userAndAgencyConversation(agency: any) {
    this.data = agency;
    this.displayAgencyName = agency.name;
    const agencyId = agency?._id || "";
    this.conversationService
      .openConversation$(this.currentUser?._id || "", agencyId)
      .subscribe((messages: any) => {
        if (messages) {
          this.countUnreadMessages();
          this.receivedMessages = messages;
          this.scrollToBottom()
          if (!agencyId) {
            this.receivedId = this.currentUser?._id;
          } else {
            this.receivedId = agencyId;
          }
          this.receivedMessages.forEach((message: any) => {
            if (message.receiver === this.currentUser?._id) {
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
    this.conversationService.markAsRead$(message._id || "").subscribe({
      next: () => {
        this.receivedId = message.sender;
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
    this.messageData.sender = this.currentUser?._id || "";
    this.messageData.receiver = this.receivedId || "";
    this.messageData.content = this.messageData.content.trim();

    if (!this.messageData.content) {
      this.notificationService.showError(
        "Message vide",
        "Le contenu du message ne peut pas être vide"
      );
      return;
    }

    this.conversationService.sendMessage$(this.messageData).subscribe({
      next: (sent: any) => {
        // Ajout local du message envoyé (retourné par le POST) — remplace
        // l'ancien re-fetch complet de la conversation ; la vue du
        // destinataire, elle, se met à jour via onIncomingMessage$ (temps réel).
        this.appendIncomingMessage(sent);
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

  /** Ajoute un message (envoyé ou reçu en temps réel) à la conversation actuellement affichée, sans re-fetch HTTP complet. */
  private appendIncomingMessage(message: any): void {
    const selfId = this.currentUser?._id;
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

  /**Gestion des messages recus par le client connecté fin */

  loadUpcomingCollections(): void {
    // Simuler les prochaines collectes
    this.upcomingCollections = [
      {
        id: "1",
        clientId: "client1",
        agencyId: "agency1",
        collectorId: "collector1",
        scheduledDate: new Date("2024-01-15T09:00:00"),
        status: CollectionStatus.SCHEDULED,
        address: {
          street: "Rue des Roses",
          doorNumber: "15",
          doorColor: "blue",
          neighborhood: "Centre-ville",
          city: "Paris",
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
      {
        id: "2",
        clientId: "client1",
        agencyId: "agency1",
        collectorId: "collector1",
        scheduledDate: new Date("2024-01-18T10:00:00"),
        status: CollectionStatus.SCHEDULED,
        address: {
          street: "Rue des Roses",
          doorNumber: "15",
          doorColor: "blue",
          neighborhood: "Centre-ville",
          city: "Paris",
          postalCode: "75001",
        },
        wasteTypes: [
          {
            id: "2",
            name: "Recyclables",
            description: "",
            icon: "recycling",
            color: "#2196f3",
            instructions: [],
            acceptedItems: [],
            rejectedItems: [],
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  loadCollectionHistory(): void {
    // Simuler l'historique des collectes
    this.collectionHistory = [
      {
        id: "3",
        clientId: "client1",
        agencyId: "agency1",
        collectorId: "collector1",
        scheduledDate: new Date("2024-01-08T09:00:00"),
        collectedDate: new Date("2024-01-08T09:30:00"),
        status: CollectionStatus.COMPLETED,
        address: {
          street: "Rue des Roses",
          doorNumber: "15",
          doorColor: "blue",
          neighborhood: "Centre-ville",
          city: "Paris",
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
        rating: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    this.filteredHistory = [...this.collectionHistory];
  }

  // ── Historique des paiements (chantier Finance/Paiements, item 4) ────────
  // Corrigé : branché sur le vrai GET /redevances/client/:clientId
  // (RedevanceService.getRedevancesByClient$, jamais appelé jusqu'ici) au lieu d'une
  // liste reconstruite depuis les Abonnements, ou (loadPaymentHistory(), ci-dessus,
  // supprimée) 2 lignes codées en dur qui coexistaient silencieusement avec les
  // données réelles.
  private static readonly REDEVANCE_STATUS_MAP: Record<string, PaymentHistory['status']> = {
    paye: 'completed',
    en_attente: 'pending',
    retard: 'late',
    annule: 'cancelled',
    echec: 'failed',
  };

  // Moyen de paiement réel (Transaction.operator, models/transaction.js) — remplace le
  // libellé générique "Mobile Money" qui ne reflétait pas l'opérateur effectivement utilisé.
  private static readonly OPERATOR_LABEL_MAP: Record<string, string> = {
    ORANGE_MONEY: 'Orange Money',
    MOOV_MONEY: 'Moov Money',
    TELECEL_MONEY: 'Telecel Money',
    QRPAY: 'QR Pay',
  };

  // Statuts Transaction (models/transaction.js) — distincts des statuts Redevance
  // ci-dessus, utilisés pour les paiements d'Abonnement (voir loadPaymentHistory()).
  private static readonly TRANSACTION_STATUS_MAP: Record<string, PaymentHistory['status']> = {
    COMPLETED: 'completed',
    COMPLETED_WITH_ERROR: 'completed',
    PENDING: 'pending',
    OTP_PENDING: 'pending',
    INITIATED: 'pending',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
  };

  allPaymentHistory: PaymentHistory[] = [];
  isLoadingPaymentHistory = false;
  // "Filtres période/statut/client" demandés — le filtre "client" ne s'applique pas ici
  // (l'utilisateur ne peut voir QUE ses propres paiements) ; conservés "période"+"statut".
  paymentPeriodFilter: 'all' | '3m' | '6m' | '12m' = 'all';
  paymentStatusFilter: 'all' | PaymentHistory['status'] = 'all';

  // "afficher les paiements abonnement ET contrat (redevances)" : la seule source de
  // "paiement" pour un client était jusqu'ici la Redevance (contrat). Un client sous
  // Abonnement (pas de contrat) avait donc un historique vide alors qu'il paie bien
  // chaque mois. Ajout de la Transaction liée à l'Abonnement (Transaction.subscriptionId,
  // renseigné uniquement pour un paiement Mobile Money — voir services/subscription.js,
  // le paiement par wallet ne crée aucune Transaction, donc aucun historique possible pour
  // ce cas précis, pas de données à afficher) via le même GET /transactions/agency/:id déjà
  // utilisé par le dashboard financier agence (FinanceService.getTransactions), filtré par
  // userId — aucune nouvelle route backend créée.
  loadPaymentHistory(): void {
    const clientId = this.currentUser?._id;
    if (!clientId) return;
    this.isLoadingPaymentHistory = true;
    const agencyId = this.currentUser?.subscribedAgencyId || this.currentUser?.agencyId;

    forkJoin({
      redevances: this.redevanceService.getRedevancesByClient$(clientId),
      subscriptionTransactions: agencyId
        ? this.financeService.getTransactions(agencyId, { userId: clientId }).pipe(
            map((res: any) => (res?.data || []).filter((t: any) => !!t.subscriptionId)),
            catchError(() => of([] as any[]))
          )
        : of([] as any[]),
    }).subscribe({
      next: ({ redevances, subscriptionTransactions }) => {
        const fromRedevances: PaymentHistory[] = redevances.map((r) => {
          const agency = typeof r.agencyId === 'object' ? r.agencyId : null;
          const transaction = typeof r.transactionId === 'object' ? r.transactionId : null;
          return {
            id: r._id,
            date: new Date(r.dateEcheance),
            amount: r.montant,
            status: ClientDashboard.REDEVANCE_STATUS_MAP[r.status] ?? 'pending',
            description: `Redevance — ${r.periodLabel}`,
            method: transaction
              ? ClientDashboard.OPERATOR_LABEL_MAP[transaction.operator ?? ''] ?? 'Mobile Money'
              : 'Paiement manuel',
            agencyName: agency?.name,
          };
        });

        const fromSubscriptions: PaymentHistory[] = subscriptionTransactions.map((t: any) => ({
          id: t._id,
          date: new Date(t.completedAt || t.createdAt),
          amount: t.amount,
          status: ClientDashboard.TRANSACTION_STATUS_MAP[t.status] ?? 'pending',
          description: `Abonnement${t.pricing?.planType ? ' — ' + t.pricing.planType : ''}`,
          method: ClientDashboard.OPERATOR_LABEL_MAP[t.operator ?? ''] ?? 'Mobile Money',
        }));

        this.allPaymentHistory = [...fromRedevances, ...fromSubscriptions].sort(
          (a, b) => b.date.getTime() - a.date.getTime()
        );
        this.filterPaymentHistory();
        this.isLoadingPaymentHistory = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement de l\'historique des paiements:', error);
        this.isLoadingPaymentHistory = false;
      },
    });
  }

  filterPaymentHistory(): void {
    const now = new Date();
    const monthsWindow = { '3m': 3, '6m': 6, '12m': 12, all: null } as const;
    const months = monthsWindow[this.paymentPeriodFilter];
    const since = months ? new Date(now.getFullYear(), now.getMonth() - months, now.getDate()) : null;

    this.paymentHistory = this.allPaymentHistory.filter((p) => {
      const statusMatch = this.paymentStatusFilter === 'all' || p.status === this.paymentStatusFilter;
      if (!statusMatch) return false;
      return !since || p.date >= since;
    });
  }

  loadSubscription(): void {
    this.subscription = {
      id: "1",
      serviceName: "Collecte Standard",
      agencyName: "EcoClean Services",
      price: 25.99,
      frequency: "mensuel",
      status: "active",
      nextPayment: new Date("2024-02-01"),
    };
  }

  getNextCollection(): string {
    if (this.upcomingCollections.length > 0) {
      return this.upcomingCollections[0].scheduledDate.toLocaleDateString(
        "fr-FR",
        {
          day: "numeric",
          month: "long",
        }
      );
    }
    return "Aucune programmée";
  }

  getNextCollectionType(): string {
    if (this.upcomingCollections.length > 0) {
      return this.upcomingCollections[0].wasteTypes[0]?.name || "";
    }
    return "";
  }

  // getMonthlyCollections(): string {
  //   const completed = this.collectionHistory.filter(c => c.status === CollectionStatus.COMPLETED).length;
  //   const total = this.collectionHistory.length + this.upcomingCollections.length;
  //   return `${completed} / ${total}`;
  // }


  calculateMonthlyCollections() {
    const now = new Date();

    const isCurrentMonth = (date: Date | string) => {
      const d = new Date(date);
      return (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    };

    const history = this.filteredHistories.filter((c: any) => isCurrentMonth(c.date));
    const upcoming = this.weeklySchedule.filter(c => isCurrentMonth(c.date!));

    const completed = history.filter(
     (c: any) => c.status === CollectionStatus.COMPLETED
    ).length;

    return`${completed} / ${history.length + upcoming.length}`;
  }


  // getCollectionRate(): number {
  //   const completed = this.collectionHistory.filter(c => c.status === CollectionStatus.COMPLETED).length;
  //   const total = this.collectionHistory.length;
  //   return total > 0 ? Math.round((completed / total) * 100) : 100;
  // }

  getNextPayment(paiementDate: string | null): string {
    paiementDate = paiementDate || this.activeSubscription?.endDate;
    if (!paiementDate) return "Aucun paiement prévu";
    // return this.activeSubscription?.endDate.toLocaleDateString('fr-FR', {
    return (
      new Date(paiementDate).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
      }) || ""
    );
  }
  getNextCollectionTime(collection: string | null): string {
    if (!collection) return "";
    return (
      new Date(collection).toLocaleTimeString("fr-FR", {
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      }) || ""
    );
  }
  getnextCollectionHour(collection: string | null): string {
    if (!collection) return "";
    return (
      new Date(collection).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }) || ""
    );
  }
  getWasteTypeName(wasteType: string): string {
    const wasteTypes: Record<string, string> = {
      Regular: "Collecte",
      In_progress: "En cours",
    };

    return wasteTypes[wasteType] ?? wasteType;
  }


  getStatusText(status: CollectionStatus1): string {
    const statusTexts = {
      [CollectionStatus1.SCHEDULED]: "Programmée",
      [CollectionStatus1.IN_PROGRESS]: "En cours",
      [CollectionStatus1.COMPLETED]: "Collectée",
      [CollectionStatus1.MISSED]: "Manquée",
      [CollectionStatus1.CANCELLED]: "Annulée",
      [CollectionStatus1.REPORTED]: "Signalée",
    };
    return statusTexts[status] || status;
  }

  getSubscriptionStatusText(status: string): string {
    const statusTexts = {
      active: "Actif",
      suspended: "Suspendu",
      cancelled: "Annulé",
    };
    return statusTexts[status as keyof typeof statusTexts] || status;
  }

  getPaymentStatusText(status: string): string {
    const statusTexts = {
      completed: "Payé",
      pending: "En attente",
      late: "En retard",
      cancelled: "Annulé",
      failed: "Échec",
    };
    return statusTexts[status as keyof typeof statusTexts] || status;
  }

  getStars(rating: number): number[] {
    if (!rating || rating < 0) return [];
    return new Array(Math.floor(rating)).fill(0);
  }

  refreshCollections(): void {
    this.loadUpcomingCollections();
    this.loadCollectionHistory();
    this.notificationService.showSuccess(
      "Actualisé",
      "Les collectes ont été mises à jour"
    );
  }

  filterHistory(): void {
    if (this.historyFilter === "all") {
      this.filteredHistory = [...this.collectionHistory];
    } else {
      this.filteredHistory = this.collectionHistory.filter(
        (c) => c.status === this.historyFilter
      );
    }
  }

  trackCollection(collectionId: string): void {
    this.notificationService.showInfo(
      "Suivi",
      "Le collecteur est en route vers votre adresse"
    );
  }

  reportIssue(collectionId: string): void {
    this.reportData.collecteId = collectionId;
    this.showReportModal = true;
  }

  /**
   * Point d'entrée séparé pour un signalement indépendant (Prompt 05, point 4)
   * — même modal/formulaire que `reportIssue()`, mais sans `collecteId`
   * prérempli : `submitReport()` omet alors ce champ du payload, et le
   * backend crée un signalement `origine:'independant'`.
   */
  reportIndependentIssue(): void {
    this.reportData.collecteId = "";
    this.showReportModal = true;
  }

  /**
   * Demande de passage spontané ("Collecte express") — hors planning, en plus
   * du planning régulier. Distincte d'un Signalement (voir reportIssue ci-
   * dessus) : c'est une demande de service, pas une réclamation. L'éligibilité
   * du client est vérifiée côté serveur (EligibilityService, source unique).
   */
  openSpontaneousRequestModal(): void {
    this.spontaneousRequestData = { wasteTypes: [], notes: "", requestedDate: "" };
    this.showSpontaneousRequestModal = true;
  }

  toggleSpontaneousWasteType(type: string): void {
    const idx = this.spontaneousRequestData.wasteTypes.indexOf(type);
    if (idx >= 0) {
      this.spontaneousRequestData.wasteTypes.splice(idx, 1);
    } else {
      this.spontaneousRequestData.wasteTypes.push(type);
    }
  }

  submitSpontaneousRequest(): void {
    if (!this.spontaneousRequestData.wasteTypes.length || this.isSubmittingSpontaneousRequest) {
      return;
    }
    const agencyId = this.currentUser?.subscribedAgencyId || this.currentUser?.agencyId;
    if (!agencyId) {
      this.notificationService.showError(
        "Demande impossible",
        "Vous devez être rattaché à une agence pour demander une collecte"
      );
      return;
    }

    this.isSubmittingSpontaneousRequest = true;
    this.demandeCollecteService
      .create({
        agencyId,
        wasteTypes: this.spontaneousRequestData.wasteTypes,
        notes: this.spontaneousRequestData.notes,
        requestedDate: this.spontaneousRequestData.requestedDate || undefined,
      })
      .subscribe({
        next: () => {
          this.notificationService.showSuccess(
            "Demande envoyée",
            "Votre demande de collecte express a été transmise à l'agence"
          );
          this.isSubmittingSpontaneousRequest = false;
          this.showSpontaneousRequestModal = false;
          this.loadSpontaneousRequests();
        },
        error: (error: any) => {
          console.error("API > createDemandeCollecte:", error);
          this.isSubmittingSpontaneousRequest = false;
          this.notificationService.showError(
            "Demande non envoyée",
            error?.error?.error?.message || "Une erreur s'est produite lors de l'envoi de la demande"
          );
        },
      });
  }

  loadSpontaneousRequests(): void {
    this.demandeCollecteService.listForClient().subscribe({
      next: (response) => {
        this.spontaneousRequests = response?.data || [];
      },
      error: (error: any) => {
        console.error("API > listForClient (demandes de collecte):", error);
      },
    });
  }

  cancelSpontaneousRequest(id: string): void {
    this.demandeCollecteService.cancel(id).subscribe({
      next: () => {
        this.notificationService.showSuccess("Demande annulée", "Votre demande a été annulée");
        this.loadSpontaneousRequests();
      },
      error: (error: any) => {
        console.error("API > cancelDemandeCollecte:", error);
        this.notificationService.showError(
          "Annulation impossible",
          error?.error?.error?.message || "Une erreur s'est produite"
        );
      },
    });
  }

  // ─── Notation d'une collecte effectuée ──────────────────────────────────
  showRatingModal = false;
  ratingTarget: any | null = null;
  ratingStars = 0;
  ratingHoverStars = 0;
  ratingComment = "";
  isSubmittingRating = false;

  rateCollection(collectionId: string): void {
    const collection = this.collectionHistory.find((c) => c.id === collectionId);
    if (!collection || collection.isRated) return;
    this.ratingTarget = collection;
    this.ratingStars = 0;
    this.ratingHoverStars = 0;
    this.ratingComment = "";
    this.showRatingModal = true;
  }

  closeRatingModal(): void {
    if (this.isSubmittingRating) return;
    this.showRatingModal = false;
    this.ratingTarget = null;
  }

  setRatingStars(value: number): void {
    this.ratingStars = value;
  }

  submitRating(): void {
    if (!this.ratingTarget || !this.ratingStars || this.isSubmittingRating) return;
    this.isSubmittingRating = true;
    this.clientService
      .rateCollecte(this.ratingTarget.id, this.ratingStars, this.ratingComment.trim() || undefined)
      .subscribe({
        next: () => {
          // Mise à jour locale immédiate — pas de rechargement de toute la liste ;
          // un rechargement normal (F5) la reconfirmera depuis le backend.
          this.ratingTarget.isRated = true;
          this.ratingTarget.rating = this.ratingStars;
          this.isSubmittingRating = false;
          this.showRatingModal = false;
          this.notificationService.showSuccess(
            "Merci pour votre avis !",
            "Votre note a bien été enregistrée."
          );
          this.ratingTarget = null;
        },
        error: (error: any) => {
          this.isSubmittingRating = false;
          // Le bouton "Noter" reste affiché (isRated n'est jamais mis à true ici) :
          // la note n'a réellement pas été enregistrée côté serveur.
          const message =
            error?.error?.error?.code === "ALREADY_RATED"
              ? "Cette collecte a déjà été notée."
              : error?.error?.error?.message || "Impossible d'enregistrer votre note. Réessayez.";
          this.notificationService.showError("Erreur", message);
          // Une note déjà existante côté serveur (double clic, autre onglet) doit
          // quand même faire disparaître le bouton "Noter" de cette ligne.
          if (error?.error?.error?.code === "ALREADY_RATED" && this.ratingTarget) {
            this.ratingTarget.isRated = true;
          }
        },
      });
  }

  submitReport(): void {
    // `collecteId` omis (chaîne vide) → signalement indépendant, voir
    // `reportIndependentIssue()` — le serveur dérive alors clientId/agencyId
    // du profil authentifié, `data.clientId`/`data.agencyId` ci-dessous ne
    // servent plus qu'au parcours lié à une collecte.
    const data: any = {
      type: this.reportData.type,
      comment: this.reportData.description,
      severity: this.reportData.severity,
      clientId: this.currentUser?._id,
      agencyId: this.currentUser?.agencyId,
    };
    if (this.reportData.collecteId) data.collecteId = this.reportData.collecteId;

    if (!this.reportData.type || !this.reportData.description || !this.reportData.severity) {
      return;
    }

    this.clientService.createSignalement(data).subscribe({
      next: (response: any) => {
        console.log("API > createSignalement:", response);
        this.notificationService.showSuccess(
          "Signalement envoyé",
          "Votre signalement a été transmis à l'agence"
        );
        this.showReportModal = false;
        this.reportData = { type: "", description: "", severity: "", clientId: "", agencyId: "", collecteId: "" };
        this.loadClientReports();
      },
      error: (error: any) => {
        console.error("API > createSignalement:", error);
        this.notificationService.showError(
          "Signalement non envoyé",
          "Une erreur s'est produite lors de l'envoi du signalement"
        );
      },
    });
  }

  processPayment(): void {
    this.notificationService.showSuccess(
      "Paiement effectué",
      "Votre paiement a été traité avec succès"
    );
    this.showPaymentModal = false;
  }

  changePaymentMethod(): void {
    this.notificationService.showInfo(
      "Modification",
      "Redirection vers la gestion des moyens de paiement"
    );
  }

  // downloadInvoices(): void {
  //   this.notificationService.showInfo(
  //     "Téléchargement",
  //     "Génération des factures en cours..."
  //   );
  // }

  /**
   * Export CSV/Excel de l'historique des paiements (chantier Finance/Paiements, item 4 —
   * "le PDF existant reste"). Réutilise ExportClientService (déjà la seule implémentation
   * d'ExportService du projet, voir admin-dashboard.ts/agency-dashboard.ts) plutôt qu'un
   * mécanisme d'export propre à cet écran. Excel via le même import dynamique `xlsx` que
   * admin-dashboard.ts::exportStatistics() (ExportClientService n'a pas d'exportToExcel).
   */
  exportPaymentHistoryCsv(): void {
    const rows = this.paymentHistory.map((p) => ({
      date: p.date.toLocaleDateString('fr-FR'),
      description: p.description,
      agence: p.agencyName || '—',
      methode: p.method || '—',
      montant: p.amount,
      statut: this.getPaymentStatusText(p.status),
    }));
    this.exportClientService.exportToCsv(
      rows,
      [
        { key: 'date', label: 'Date' },
        { key: 'description', label: 'Description' },
        { key: 'agence', label: 'Agence' },
        { key: 'methode', label: 'Méthode' },
        { key: 'montant', label: 'Montant (FCFA)' },
        { key: 'statut', label: 'Statut' },
      ],
      `historique-paiements-${new Date().toISOString().slice(0, 10)}`,
    );
  }

  async exportPaymentHistoryExcel(): Promise<void> {
    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(this.paymentHistory.map((p) => ({
      Date: p.date.toLocaleDateString('fr-FR'),
      Description: p.description,
      Agence: p.agencyName || '—',
      Méthode: p.method || '—',
      'Montant (FCFA)': p.amount,
      Statut: this.getPaymentStatusText(p.status),
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Paiements');
    XLSX.writeFile(workbook, `historique-paiements-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  editAddress(): void {
    this.notificationService.showInfo(
      "Modification",
      "Redirection vers la modification d'adresse"
    );
  }

  // Fonction de generation du pdf de l'historique des paiements
  downloadInvoices(): void {
    const doc = new jsPDF();

    // HEADER DE TAILLE
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, doc.internal.pageSize.width, 30, "F"); // Bandeau bleu en haut

    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("ZéroDéchet+", 14, 20);

    doc.setFontSize(13);
    doc.setTextColor(230, 230, 230);
    doc.setFont("helvetica", "normal");
    doc.text("Collecter aujourd’hui, préserver demain.", 14, 27);

    // Titre principal
    doc.setFontSize(18);
    doc.setTextColor(41, 128, 185);
    doc.setFont("helvetica", "bold");
    doc.text("Historique des paiements", 14, 45);

    // Sous-titre
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Client: ${this.currentUser?.firstName || ""} ${
        this.currentUser?.lastName || ""
      }`,
      14,
      53
    );
    doc.text(`Date: ${new Date().toLocaleDateString("fr-FR")}`, 14, 59);

    // Tableau des paiements
    autoTable(doc, {
      startY: 65,
      head: [["Date", "Description", "Méthode", "Montant", "Statut"]],
      body: this.paymentHistory.map((payment) => [
        payment.date ? new Date(payment.date).toLocaleDateString("fr-FR") : "",
        payment.description,
        payment.method!,
        `${payment.amount} FCFA`,
        this.getPaymentStatusText(payment.status),
      ]),
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      alternateRowStyles: { fillColor: [240, 240, 240] },
    });

    // Pied de page stylisé tout en bas
    const pageHeight = doc.internal.pageSize.height || 297;
    doc.setDrawColor(41, 128, 185);
    doc.setLineWidth(0.7);
    doc.line(14, pageHeight - 20, 195, pageHeight - 20);

    doc.setFontSize(12);
    doc.setTextColor(41, 128, 185);
    doc.setFont("helvetica", "bold");
    doc.text(
      "Merci pour votre confiance !",
      doc.internal.pageSize.width / 2,
      pageHeight - 12,
      { align: "center" }
    );

    doc.save("Historique-paiement-client.pdf");
  }

  /**
   * Reçu de paiement UNITAIRE (chantier Finance/Paiements, item 5) — jusqu'ici le client
   * n'avait accès qu'au PDF listant TOUT l'historique (downloadInvoices() ci-dessus),
   * sans le mot "reçu" ni la période concernée pour une transaction précise. Réutilise
   * exactement la même bibliothèque/mise en page (jsPDF, même bandeau ZéroDéchet+) plutôt
   * que d'introduire un second mécanisme de génération PDF.
   */
  downloadReceipt(payment: PaymentHistory): void {
    const doc = new jsPDF();

    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, doc.internal.pageSize.width, 30, "F");

    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("ZéroDéchet+", 14, 20);

    doc.setFontSize(13);
    doc.setTextColor(230, 230, 230);
    doc.setFont("helvetica", "normal");
    doc.text("Collecter aujourd’hui, préserver demain.", 14, 27);

    doc.setFontSize(20);
    doc.setTextColor(41, 128, 185);
    doc.setFont("helvetica", "bold");
    doc.text("REÇU DE PAIEMENT", 14, 45);

    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "normal");
    doc.text(`Référence : ${payment.id}`, 14, 53);
    doc.text(`Émis le : ${new Date().toLocaleDateString("fr-FR")}`, 14, 59);

    autoTable(doc, {
      startY: 68,
      body: [
        ["Client", `${this.currentUser?.firstName || ""} ${this.currentUser?.lastName || ""}`],
        ["Agence", payment.agencyName || "—"],
        ["Période concernée", payment.description],
        ["Méthode de paiement", payment.method || "—"],
        ["Date du paiement", new Date(payment.date).toLocaleDateString("fr-FR")],
        ["Statut", this.getPaymentStatusText(payment.status)],
        ["Montant payé", `${payment.amount} FCFA`],
      ],
      theme: "grid",
      styles: { fontSize: 11, cellPadding: 4 },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 60 } },
    });

    const pageHeight = doc.internal.pageSize.height || 297;
    doc.setDrawColor(41, 128, 185);
    doc.setLineWidth(0.7);
    doc.line(14, pageHeight - 20, 195, pageHeight - 20);

    doc.setFontSize(12);
    doc.setTextColor(41, 128, 185);
    doc.setFont("helvetica", "bold");
    doc.text(
      "Merci pour votre confiance !",
      doc.internal.pageSize.width / 2,
      pageHeight - 12,
      { align: "center" }
    );

    doc.save(`Recu-paiement-${payment.id}.pdf`);
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }

  scrollToChat() {
    this.chatMessages.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }
}
