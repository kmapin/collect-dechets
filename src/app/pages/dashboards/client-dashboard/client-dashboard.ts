import { CellWidthType } from "./../../../../../node_modules/jspdf-autotable/dist/index.d";
import { BarcodeFormat } from "@zxing/library";
import { AfterViewChecked, Component, ElementRef, OnInit, ViewChild } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, TitleStrategy } from "@angular/router";
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
import { map } from "rxjs";
import { MessagesService } from "../../../services/messages.service";
import { AgencyService } from "../../../services/agency.service";
import { Message } from "../../../models/message.model";
import { MatIcon } from "@angular/material/icon";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PaymentHistory {
  id: string;
  date: Date;
  amount: number;
  status: "completed" | "pending" | "failed";
  description: string;
  method: string;
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
  imports: [CommonModule, RouterModule, FormsModule, MatIcon],
  templateUrl: './client-dashboard.html',
  styleUrl: './client-dashboard.scss'
})
export class ClientDashboard  implements OnInit, AfterViewChecked {
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
  showRechargeModal: boolean = false;

  // Montant de recharge
  rechargeAmount: number = 0;
  displayAgencyName: any;
  constructor(
    private authService: AuthService,
    private collectionService: CollectionService,
    private clientService: ClientService,
    private notificationService: NotificationService,
    private messageService: MessagesService,
    private agencyService: AgencyService
  ) {}

  ngOnInit(): void {
    // this.currentUser = this.authService.getCurrentUser();
    this.getUser();
    // console.log("Current User", this.currentUser);
    this.loadDashboardData();
  }

  getUser() {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      this.getUserSubscription();
      this.getClientWallet();
      this.getWeeklySchedule();
      this.loadPlanningHistory();
    });
    console.log("Current User", this.currentUser);
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
    const totalCollections = this.getMonthlyCollectionsLength();
    const completedCollections = this.getTotalCompletedCollectionsLength();
    const unCompletedCollections = this.getTotalUnCompletedCollectionLength();
    const upcomingCollections =
      totalCollections - (completedCollections + unCompletedCollections);
    return upcomingCollections;
  }

  // Taux de collectes complétées
  getCompletedCollectionRate() {
    const totalCollections = this.getMonthlyCollectionsLength();
    const completedCollections = this.getTotalCompletedCollectionsLength();
    if (totalCollections === 0) return 0;

    return Math.round((completedCollections / totalCollections) * 100);
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
    const totalCollections = this.getMonthlyCollectionsLength();
    const upcomingCollections = this.getTotalUpcomingCollectionsLength();
    if (totalCollections === 0) return 0;
    return Math.round((upcomingCollections / totalCollections) * 100);
  }

  // Recuperer l'historique des collectes déjà effectuées
  loadPlanningHistory(): void {
    const clientId = this.currentUser?._id || "";
    this.filteredHistories = [];
    if (!clientId) return;
    this.clientService.getClientPlanningHistory(clientId).subscribe({
      next: (response: any) => {
        // this.collectionHistory = response.reports || [];
        this.collectionHistory = (response.reports || []).map(
          (report: any) => ({
            id: report._id,
            clientId: report.clientId,
            agencyId: report.agencyId,
            collectorId: report.collectorId,
            scheduledDate: report.createdAt ? new Date(report.createdAt) : null,
            collectedDate: report.scannedAt ? new Date(report.scannedAt) : null, // si dispo
            status: report.status === "Collected" ? "Completed" : report.status, // adapter au template
            wasteTypes: report.wasteTypes || ["Déchets ménagers"], // valeur par défaut si absent
            rating: report.rating || 0,
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
        this.paymentHistory = this.subscriptions.map((sub: any) => ({
          id: sub._id,
          date: sub.startDate ? new Date(sub.startDate) : new Date(),
          amount: sub.pricingId.price,
          status: sub.isActive, // "active", "suspended", "cancelled" ou autre
          description: `Abonnement ${sub.pricingId.planType} - ${
            sub.agencyId?.name || ""
          }`,
          method: "Orange Money", // ou autre selon tes données
        }));
        // Pour la subscription active
        this.activeSubscription = this.subscriptions.length
          ? this.subscriptions[this.subscriptions.length - 1]
          : null;
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
    this.loadPaymentHistory();
    this.loadSubscription();
    this.countUnreadMessages();
    this.userMessages();
  }

  /**Gestion des messages recus par le client connecté */
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

  userMessages() {
    this.messageService
      .getMessagesForUser(this.currentUser?._id || "")
      .subscribe({
        next: (response: any) => {
          if (response) {
            console.log("API > getMessagesForUser:", response);
            this.connectedUserMessages = response || [];
            console.log(
              "this.connectedUserMessages client:",
              this.connectedUserMessages
            );
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
    this.clientService
      .userAndAgencyConversation(this.currentUser?._id || "", agencyId)
      .subscribe((messages: any) => {
        console.log("API >userAndAgencyConversation:", messages);
        if (messages) {
          console.log("API >userAndAgencyConversation:", messages);
          this.receivedMessages = (messages || []).sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          this.scrollToBottom()
          this.countUnreadMessages();
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

  loadPaymentHistory(): void {
    this.paymentHistory = [
      {
        id: "1",
        date: new Date("2024-01-01"),
        amount: 25.99,
        status: "completed",
        description: "Abonnement mensuel - Janvier 2024",
        method: "Carte bancaire **** 1234",
      },
      {
        id: "2",
        date: new Date("2023-12-01"),
        amount: 25.99,
        status: "completed",
        description: "Abonnement mensuel - Décembre 2023",
        method: "Carte bancaire **** 1234",
      },
    ];
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

  getWasteTypeName(wasteType: any): string {
    return wasteType?.name || "Type inconnu";
  }

  getStatusText(status: CollectionStatus1): string {
    const statusTexts = {
      [CollectionStatus1.SCHEDULED]: "Programmé",
      [CollectionStatus1.IN_PROGRESS]: "En cours",
      [CollectionStatus1.COMPLETED]: "Collecté",
      [CollectionStatus1.MISSED]: "Manqué",
      [CollectionStatus1.CANCELLED]: "Annulé",
      [CollectionStatus1.REPORTED]: "Signalé",
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

  rateCollection(collectionId: string): void {
    this.notificationService.showInfo(
      "Évaluation",
      "Fonctionnalité d'évaluation à venir"
    );
  }

  submitReport(): void {
    const data = {
      collecteId: this.reportData.collecteId,
      type: this.reportData.type,
      comment: this.reportData.description,
      severity: this.reportData.severity,
      clientId: this.currentUser?._id,
      agencyId: this.currentUser?.agencyId
    };

    console.log("Signalement envoyé:", this.data);
    if (
      (this.reportData.type &&
        this.reportData.description &&
        this.reportData.clientId &&
        this.reportData.agencyId) ||
      this.reportData.severity
    ) {
      console.log("Signalement envoyé:", this.data);
      this.clientService.reportClientIncident(data).subscribe({
        next: (response: any) => {
          console.log("API > reportClientIncident:", response);
          this.notificationService.showSuccess(
            "Signalement envoyé",
            "Votre signalement a été transmis à l'agence"
          );
          this.showReportModal = false;
          // this.reportData = {
          //   type: "",
          //   description: "",
          //   severity: "",
          //   clientId: "",
          //   agencyId: "",
          //   collectorId: ""
          // };
        },
        error: (error: any) => {
          console.error("API > reportClientIncident:", error);
          this.notificationService.showError(
            "Signalement non envoyé",
            "Une erreur s'est produite lors de l'envoi du signalement"
          );
        },
      });
    }
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
        payment.method,
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
