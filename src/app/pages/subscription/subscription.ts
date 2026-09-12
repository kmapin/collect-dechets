import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription as RxSubscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { RegisterUserData, User, UserRole } from '../../models/user.model';
import { AgencyService } from '../../services/agency.service';
import { MobileMoneyFormComponent } from '../payment/mobile-money-form/mobile-money-form';
import { PaymentService } from '../../services/payment/payment.service';
import { Webstockets, SocketNotification } from '../../core/services/webstockets';
import { MessagesService } from '../../services/messages.service';
import { NotificationService } from '../../services/notification.service';
import { Message } from '../../models/message.model';
import { ContratService } from '../../services/contrat.service';
import { Contrat } from '../../models/contrat.model';
import { EligibilityService, EligibilityResult, isSubscriptionCurrentlyActive } from '../../services/eligibility.service';


@Component({
  selector: 'app-subscription',
  imports: [CommonModule, FormsModule, MobileMoneyFormComponent],
  templateUrl: './subscription.html',
  styleUrl: './subscription.css'
})
export class Subscription  implements OnInit, OnDestroy {
    currentUser: RegisterUserData | null = null;
    subscriptions: any[] = [];
    activeSubscription: any = null;
    latestSubscription: any = null;
    showPaymentForm = false;
    tarifResponse: any = null;
    private newSubscriptionSub?: RxSubscription;

    contrats: Contrat[] = [];
    activeContrat: Contrat | null = null;
    latestContrat: Contrat | null = null;

    eligibility: EligibilityResult | null = null;

    // Drawer "Envoyer un message à l'agence" (contactSupport())
    showContactDrawer = false;
    contactMessage = '';
    isSendingMessage = false;

constructor(
    private authService: AuthService,
    private agencyService: AgencyService,
    private router: Router,
    private paymentService: PaymentService,
    private websocketService: Webstockets,
    private messagesService: MessagesService,
    private notificationService: NotificationService,
    private contratService: ContratService,
    private eligibilityService: EligibilityService,
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.getUserSubscription();
      this.loadActiveContrat();
      this.loadEligibility();
    });
    this.currentUser = this.authService.getCurrentUser();
    console.log("this.currentUser", this.currentUser);

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
  }

  ngOnDestroy() {
    this.newSubscriptionSub?.unsubscribe();
  }

  getUserSubscription() {
    const userID = this.currentUser?._id || '';
    if (!userID) return;
    this.agencyService.getUserSubscription(userID).subscribe({
      next: (response: any[]) => {
        this.subscriptions = response || [];
        const sortedByEndDateDesc = [...this.subscriptions].sort(
          (a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
        );
        this.activeSubscription = sortedByEndDateDesc.find((sub) => isSubscriptionCurrentlyActive(sub)) || null;
        this.latestSubscription = sortedByEndDateDesc[0] || null;
        console.log("Active subscription ==>", this.activeSubscription);
      },
      error: (err) => {
        console.error('Erreur lors du chargement des abonnements', err);
      }
    });
  }

  /** "Mon contrat" — même rôle que client-dashboard.ts::loadActiveContrat(). */
  loadActiveContrat(): void {
    const clientId = this.currentUser?._id;
    if (!clientId) return;
    this.contratService.getContratsByClient$(clientId).subscribe({
      next: (contrats) => {
        this.contrats = contrats;
        this.activeContrat = contrats.find((c) => c.status === 'actif') || null;
        const sortedByStartDateDesc = [...contrats].sort(
          (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        );
        this.latestContrat = this.activeContrat || sortedByStartDateDesc[0] || null;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des contrats', err);
      },
    });
  }

  loadEligibility(): void {
    const clientId = this.currentUser?._id;
    if (!clientId) return;
    this.eligibilityService.checkEligibility$(clientId).subscribe({
      next: (result) => { this.eligibility = result; },
      error: (err) => { console.error("Erreur lors de la vérification de l'éligibilité", err); },
    });
  }

  /** Même mapping que client-dashboard.ts::contratStatusLabel() — une seule vérité de libellé pour ce statut. */
  contratStatusLabel(status?: string): string {
    const map: { [key: string]: string } = { actif: 'Actif', suspendu: 'Suspendu', resilie: 'Résilié' };
    return status ? (map[status] || status) : '';
  }

  contratFrequenceLabel(frequence?: string): string {
    const map: { [key: string]: string } = { daily: 'Quotidienne', weekly: 'Hebdomadaire', monthly: 'Mensuelle' };
    return frequence ? (map[frequence] || frequence) : '';
  }

  /** Seul champ réel disponible sur Subscription (isActive) — pas de statut "annulé"/"suspendu" distinct en base (models/subscription.js). */
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

  initiatePayment() {
    const target = this.activeSubscription || this.latestSubscription;
    if (!target) {
      alert('Aucun abonnement à payer ou à renouveler pour le moment.');
      return;
    }

    // Préparer les données pour le paiement
    this.tarifResponse = {
      tarifId: target.pricingId._id,
      agencyId: target.agencyId._id,
      userId: this.currentUser?._id,
      numberMonths: '1', // Un mois par défaut
      amount: target.pricingId.price,
      planType: target.pricingId.planType
    };

    console.log('Tarif response prepared:', this.tarifResponse);
    this.showPaymentForm = true;
  }

  closePaymentForm() {
    this.showPaymentForm = false;
    this.tarifResponse = null;
  }

  renewSubscription() {
    console.log('Renouvellement d\'abonnement via Telecel Money...');
    this.initiatePayment();
  }

  contactSupport() {
    if (!this.activeSubscription?.agencyId?._id) {
      alert('Aucune agence associée à contacter pour le moment.');
      return;
    }
    this.showContactDrawer = true;
  }

  closeContactDrawer() {
    this.showContactDrawer = false;
    this.contactMessage = '';
  }

  get contactAgencyName(): string {
    return this.activeSubscription?.agencyId?.name || '';
  }

  sendContactMessage() {
    if (this.isSendingMessage) return;
    const content = this.contactMessage.trim();
    if (!content) {
      this.notificationService.showInfo('Message vide', 'Le contenu du message ne peut pas être vide.');
      return;
    }
    const agencyId = this.activeSubscription?.agencyId?._id;
    if (!this.currentUser?._id || !agencyId) {
      this.notificationService.showError('Erreur', 'Impossible d\'envoyer le message pour le moment.');
      return;
    }

    const message: Message = {
      sender: this.currentUser._id,
      receiver: agencyId,
      content,
    };

    this.isSendingMessage = true;
    this.messagesService.sendMessage(message).subscribe({
      next: () => {
        this.isSendingMessage = false;
        this.notificationService.showSuccess('Message envoyé', 'Votre message a bien été envoyé à l\'agence.');
        this.closeContactDrawer();
      },
      error: (error) => {
        this.isSendingMessage = false;
        console.error('Erreur lors de l\'envoi du message à l\'agence :', error);
        this.notificationService.showError('Message non envoyé', 'Une erreur s\'est produite lors de l\'envoi du message.');
      },
    });
  }
}