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
    // Abonnement réellement actif (isActive === true ET endDate dans le futur)
    // — plus jamais "le dernier élément du tableau" (chantier EligibilityService,
    // Prompt 0 : "Ne considère jamais subscriptions[subscriptions.length - 1]
    // comme étant automatiquement l'abonnement actif"). Piloté par les mêmes
    // champs réels que le backend (services/eligibility.service.js), pas une
    // seconde règle inventée côté client.
    activeSubscription: any = null;
    // Abonnement le plus récent (actif ou non) — sert uniquement à afficher un
    // statut/une date d'expiration réels dans le bloc "Mon Abonnement" quand
    // aucun abonnement n'est actuellement actif, plutôt que de tout masquer.
    latestSubscription: any = null;
    showPaymentForm = false;
    tarifResponse: any = null;
    private newSubscriptionSub?: RxSubscription;

    // Domaine Contrat — même rôle que client-dashboard.ts::loadActiveContrat(),
    // absent jusqu'ici de cet écran (cette page n'affichait que l'Abonnement,
    // jamais le Contrat, cause directe du message "Aucun abonnement actif"
    // pouvant apparaître à un client pourtant sous contrat actif).
    contrats: Contrat[] = [];
    activeContrat: Contrat | null = null;
    latestContrat: Contrat | null = null;

    // Source unique de vérité pour "ce client bénéficie-t-il du service ?" —
    // pilote uniquement le bandeau de continuité de service ci-dessous, jamais
    // recalculée dans ce composant (EligibilityService, backend).
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

    // Phase 5 : les notifications Abonnement passent désormais par `notifyUsers`
    // (Phase 3, backend), donc par ce même canal socket, en plus du chargement
    // initial ci-dessus — sans ceci, une expiration automatique (scheduler
    // minuit) ou une souscription faite ailleurs laisse cette page affichée
    // périmée jusqu'au prochain rechargement manuel.
    this.newSubscriptionSub = this.websocketService.onNewNotification().subscribe((notification: SocketNotification) => {
      if (notification?.type === 'Subscribed') {
        this.getUserSubscription();
        this.loadEligibility();
      }
      // Même principe pour Contrat (résiliation/réactivation automatique ou
      // manuelle) — voir client-dashboard.ts, même pattern déjà en place.
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

  /**
   * Initie le paiement de l'abonnement via Telecel Money
   */
  initiatePayment() {
    // Cible le dernier abonnement connu (même expiré) en secours, pour
    // permettre le renouvellement d'un abonnement expiré depuis ce même
    // bouton — ne change QUE la cible du paiement : ce choix ne rend jamais
    // le client éligible tant que le paiement n'a pas réellement été traité
    // (EligibilityService/le statut affiché restent basés sur les données
    // backend réelles, jamais anticipés ici).
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

  /**
   * Ferme le formulaire de paiement
   */
  closePaymentForm() {
    this.showPaymentForm = false;
    this.tarifResponse = null;
  }

  /**
   * Renouvelle l'abonnement
   */
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
    const content = this.contactMessage.trim();
    if (!content) {
      this.notificationService.showError('Message vide', 'Le contenu du message ne peut pas être vide.');
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