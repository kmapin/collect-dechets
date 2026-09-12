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
  agencyName?: string;
  periodeDebut?: Date;
  periodeFin?: Date;
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
  activeSubscription: any = null;
  latestSubscription: any = null;
  activeContrat: Contrat | null = null;
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

    if (this.route.snapshot.queryParamMap.get('action') === 'collecte-express') {
      this.openSpontaneousRequestModal();
    }

    this.newSubscriptionSub = this.websocketService.onNewNotification().subscribe((notification: SocketNotification) => {
      if (notification?.type === 'Subscribed') {
        this.getUserSubscription();
        this.loadEligibility();
      }
      if (notification?.type === 'Contrat') {
        this.loadActiveContrat();
        this.loadEligibility();
      }
    });

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
  isProcessingWalletPayment = false;
  walletPayment() {
    if (this.isProcessingWalletPayment) return;
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

    this.isProcessingWalletPayment = true;
    this.clientService.walletPayment(paymentData).subscribe({
      next: (response: any) => {
        console.log("Paiement effectué avec succès:", response?.wallet);
        this.isProcessingWalletPayment = false;
        this.getClientWallet();
        this.notificationService.showSuccess(
          "Paiement réussi",
          "Votre compte a été rechargé avec succès."
        );
        this.showRechargeModal = false;
        this.rechargeAmount = 0;
      },
      error: (error: any) => {
        this.isProcessingWalletPayment = false;
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
  getUncompletedCollectionRate() {
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
    const totalCollections = upcoming.length + history.length;

    const unCompleted = history.filter(
      (c: any) => c.status === "Missed" || c.status === "Cancelled"
    ).length;
    if (totalCollections === 0) return 0;

    return Math.round((unCompleted / totalCollections) * 100);
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
          this.notificationService.showInfo(
            "Info",
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
  isSendingChatMessage = false;
  submitMessage() {
    if (this.isSendingChatMessage) return;
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

    this.isSendingChatMessage = true;
    this.conversationService.sendMessage$(this.messageData).subscribe({
      next: (sent: any) => {
        this.isSendingChatMessage = false;
        this.appendIncomingMessage(sent);
        this.notificationService.showSuccess(
          "Message envoyé",
          "Votre message a bien été envoyé"
        );
        this.messageData.content = "";
      },
      error: (error: any) => {
        this.isSendingChatMessage = false;
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
    if ((this.receivedMessages || []).some((m: any) => m._id === message._id)) return;
    const normalized = { ...message, read: (message.read ?? false).toString() };
    this.receivedMessages = [...(this.receivedMessages || []), normalized];
    this.scrollToBottom();
    if (message.receiver === selfId) {
      this.readAndRespondMessage(message);
    }
  }

  /**Gestion des messages recus par le client connecté fin */

  private static readonly REDEVANCE_STATUS_MAP: Record<string, PaymentHistory['status']> = {
    paye: 'completed',
    en_attente: 'pending',
    retard: 'late',
    annule: 'cancelled',
    echec: 'failed',
  };

  private static readonly OPERATOR_LABEL_MAP: Record<string, string> = {
    ORANGE_MONEY: 'Orange Money',
    MOOV_MONEY: 'Moov Money',
    TELECEL_MONEY: 'Telecel Money',
    QRPAY: 'QR Pay',
  };

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
  paymentPeriodFilter: 'all' | '3m' | '6m' | '12m' = 'all';
  paymentStatusFilter: 'all' | PaymentHistory['status'] = 'all';
  paymentHistoryPeriod: { debut: Date; fin: Date } | null = null;

  private calculerPeriodePaiement(): { debut: Date; fin: Date } | null {
    const monthsWindow = { '3m': 3, '6m': 6, '12m': 12, all: null } as const;
    const months = monthsWindow[this.paymentPeriodFilter];
    if (!months) return null;
    const fin = new Date();
    const debut = new Date();
    debut.setMonth(debut.getMonth() - months);
    return { debut, fin };
  }

  loadPaymentHistory(): void {
    const clientId = this.currentUser?._id;
    if (!clientId) return;
    this.isLoadingPaymentHistory = true;
    const agencyId = this.currentUser?.subscribedAgencyId || this.currentUser?.agencyId;

    const periode = this.calculerPeriodePaiement();
    this.paymentHistoryPeriod = periode;

    forkJoin({
      redevances: this.redevanceService.getRedevancesByClient$(clientId, periode ?? undefined),
      subscriptionTransactions: agencyId
        ? this.financeService.getTransactions(agencyId, {
            userId: clientId,
            startDate: periode?.debut.toISOString(),
            endDate: periode?.fin.toISOString(),
          }).pipe(
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
            periodeDebut: r.periodeDebut ? new Date(r.periodeDebut) : undefined,
            periodeFin: r.periodeFin ? new Date(r.periodeFin) : undefined,
          };
        });

        const fromSubscriptions: PaymentHistory[] = subscriptionTransactions.map((t: any) => ({
          id: t._id,
          date: new Date(t.completedAt || t.createdAt),
          amount: t.amount,
          status: ClientDashboard.TRANSACTION_STATUS_MAP[t.status] ?? 'pending',
          description: `Abonnement${t.pricing?.planType ? ' — ' + t.pricing.planType : ''}`,
          method: ClientDashboard.OPERATOR_LABEL_MAP[t.operator ?? ''] ?? 'Mobile Money',
          // Signalé en usage réel : "Agence : —" sur le reçu d'un paiement d'Abonnement —
          // jamais peuplé pour ce chemin (contrairement aux lignes Redevance ci-dessus,
          // dont agencyId est déjà populate côté backend). `t.agence` vient du nouveau
          // lookup ajouté à TransactionService.getTransactionByAgency.
          agencyName: t.agence?.name,
          periodeDebut: t.subscription?.startDate ? new Date(t.subscription.startDate) : undefined,
          periodeFin: t.subscription?.endDate ? new Date(t.subscription.endDate) : undefined,
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

  // Filtre STATUT uniquement — la période est désormais appliquée réellement par le
  // backend (loadPaymentHistory(), dateDebut/dateFin transmis à la requête), plus un
  // second filtrage par date ici : `allPaymentHistory` est déjà scopé à la bonne plage,
  // le refiltrer par date côté client ferait courir le risque d'un écart silencieux entre
  // les deux calculs (ex. arrondi de fuseau horaire) qui masquerait des lignes pourtant
  // correctement renvoyées par le serveur.
  filterPaymentHistory(): void {
    this.paymentHistory = this.allPaymentHistory.filter(
      (p) => this.paymentStatusFilter === 'all' || p.status === this.paymentStatusFilter,
    );
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
    // Corrigé : appelait deux méthodes qui remplissaient `upcomingCollections`/
    // `collectionHistory` avec des données fictives codées en dur (Paris, dates
    // 2024), écrasant à chaque clic le vrai planning chargé par
    // getWeeklySchedule()/loadPlanningHistory() — et cassant au passage
    // rateCollection() (qui cherche la collecte réelle dans `collectionHistory`)
    // jusqu'au rechargement de la page. Ce bouton vit dans la section "Planning
    // de la semaine" (weeklySchedule) : il doit donc rafraîchir cette même
    // source réelle.
    this.getWeeklySchedule();
    this.notificationService.showSuccess(
      "Actualisé",
      "Le planning a été mis à jour"
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

  isSubmittingReport = false;
  submitReport(): void {
    if (this.isSubmittingReport) return;
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

    this.isSubmittingReport = true;
    this.clientService.createSignalement(data).subscribe({
      next: (response: any) => {
        this.isSubmittingReport = false;
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
        this.isSubmittingReport = false;
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

  // Libellé de la fenêtre RÉELLEMENT utilisée pour charger `this.paymentHistory`
  // (this.paymentHistoryPeriod, posé par loadPaymentHistory() — jamais recalculé
  // séparément ici) : "Historique complet" pour 'all' (jamais de plage fabriquée),
  // sinon "JJ/MM/AAAA au JJ/MM/AAAA" — même fenêtre que celle envoyée au backend. Public
  // (pas privé) : affiché à l'écran (client-dashboard.html) ET réutilisé tel quel dans
  // les 3 exports (PDF/CSV/Excel) — jamais un texte différent entre l'écran et le document.
  periodeCouvertePaiements(): string {
    const periode = this.paymentHistoryPeriod;
    if (!periode) return 'Historique complet';
    return `${periode.debut.toLocaleDateString('fr-FR')} au ${periode.fin.toLocaleDateString('fr-FR')}`;
  }

  // Période RÉELLEMENT concernée par CE paiement précis (p.periodeDebut/periodeFin,
  // posés par loadPaymentHistory() depuis Redevance/Subscription — jamais recalculés
  // ici). Distinct de periodeCouvertePaiements() ci-dessus (la fenêtre de filtre,
  // identique sur toutes les lignes) : signalé en usage réel qu'un export où chaque
  // ligne affichait la même valeur générique ("Historique complet") n'était pas
  // exploitable — l'utilisateur veut savoir à quel mois/quelle période CE paiement se
  // rapporte. "—" si la source réelle n'a pas pu être résolue, jamais une date fabriquée.
  periodeConcernee(p: PaymentHistory): string {
    if (!p.periodeDebut || !p.periodeFin) return '—';
    return `${p.periodeDebut.toLocaleDateString('fr-FR')} au ${p.periodeFin.toLocaleDateString('fr-FR')}`;
  }

  /**
   * Export CSV/Excel de l'historique des paiements (chantier Finance/Paiements, item 4 —
   * "le PDF existant reste"). Réutilise ExportClientService (déjà la seule implémentation
   * d'ExportService du projet, voir admin-dashboard.ts/agency-dashboard.ts) plutôt qu'un
   * mécanisme d'export propre à cet écran. Excel via le même import dynamique `xlsx` que
   * admin-dashboard.ts::exportStatistics() (ExportClientService n'a pas d'exportToExcel).
   * `periodeCouverte` (chantier "dates début/fin des exports") : même valeur sur chaque
   * ligne — n'est pas la période DE ce paiement précis (déjà dans `date`), mais la
   * fenêtre de filtre 3m/6m/12m/tout réellement appliquée à la requête, pour qu'on ne
   * puisse jamais lire ce fichier sans savoir quelle période il couvre.
   */
  exportPaymentHistoryCsv(): void {
    const periodeCouverte = this.periodeCouvertePaiements();
    const rows = this.paymentHistory.map((p) => ({
      date: p.date.toLocaleDateString('fr-FR'),
      description: p.description,
      agence: p.agencyName || '—',
      methode: p.method || '—',
      montant: p.amount,
      statut: this.getPaymentStatusText(p.status),
      periodeConcernee: this.periodeConcernee(p),
      periodeCouverte,
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
        { key: 'periodeConcernee', label: 'Période concernée' },
        { key: 'periodeCouverte', label: 'Période couverte' },
      ],
      `historique-paiements-${new Date().toISOString().slice(0, 10)}`,
    );
  }

  async exportPaymentHistoryExcel(): Promise<void> {
    const periodeCouverte = this.periodeCouvertePaiements();
    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(this.paymentHistory.map((p) => ({
      Date: p.date.toLocaleDateString('fr-FR'),
      Description: p.description,
      Agence: p.agencyName || '—',
      Méthode: p.method || '—',
      'Montant (FCFA)': p.amount,
      Statut: this.getPaymentStatusText(p.status),
      'Période concernée': this.periodeConcernee(p),
      'Période couverte': periodeCouverte,
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
    // Période couverte (chantier "dates début/fin des exports") — même fenêtre que celle
    // réellement envoyée au backend par loadPaymentHistory() (this.paymentHistoryPeriod),
    // jamais recalculée séparément ici.
    doc.text(`Période : ${this.periodeCouvertePaiements()}`, 14, 65);

    // Tableau des paiements — "Période concernée" (chantier "dates début/fin des
    // exports") : la période RÉELLE de CE paiement (Redevance/Subscription), distincte
    // de la ligne "Période : ..." ci-dessus (la fenêtre de filtre 3m/6m/12m, identique
    // sur tout le document).
    autoTable(doc, {
      startY: 71,
      head: [["Date", "Description", "Méthode", "Montant", "Statut", "Période concernée"]],
      body: this.paymentHistory.map((payment) => [
        payment.date ? new Date(payment.date).toLocaleDateString("fr-FR") : "",
        payment.description,
        payment.method!,
        `${payment.amount} FCFA`,
        this.getPaymentStatusText(payment.status),
        this.periodeConcernee(payment),
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

    // "Période concernée" : la période RÉELLE (Redevance/Subscription) si résolue,
    // sinon la description existante en repli (ex. "Abonnement — premium" reste plus
    // informatif qu'un simple "—" quand la période n'a pas pu être déterminée).
    const periodeReceipt = this.periodeConcernee(payment);
    autoTable(doc, {
      startY: 68,
      body: [
        ["Client", `${this.currentUser?.firstName || ""} ${this.currentUser?.lastName || ""}`],
        ["Agence", payment.agencyName || "—"],
        ["Description", payment.description],
        ["Période concernée", periodeReceipt !== '—' ? periodeReceipt : payment.description],
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
