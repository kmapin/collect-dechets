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
    showPaymentForm = false;
    tarifResponse: any = null;
    private newSubscriptionSub?: RxSubscription;

    contrats: Contrat[] = [];

    eligibility: EligibilityResult | null = null;

    // Drawer "Envoyer un message à l'agence" (contactSupport())
    showContactDrawer = false;
    contactMessage = '';
    isSendingMessage = false;
    /** Abonnement ciblé par le drawer de contact — un client multi-lieux peut avoir des
     * abonnements auprès d'agences différentes, jamais une seule "agence active" globale. */
    private contactTarget: any = null;
    /** Abonnement ciblé par le paiement en cours (voir initiatePayment). */
    private paymentTarget: any = null;

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
      },
      error: (err) => {
        console.error('Erreur lors du chargement des abonnements', err);
      }
    });
  }

  /** Contrats du client — plus affichés ici (page dédiée /contrat), seulement utilisés
   * pour conditionner le bouton "Voir mes contrats". */
  loadActiveContrat(): void {
    const clientId = this.currentUser?._id;
    if (!clientId) return;
    this.contratService.getContratsByClient$(clientId).subscribe({
      next: (contrats) => {
        this.contrats = contrats;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des contrats', err);
      },
    });
  }

  /** Clé de regroupement par lieu — "compte entier" (serviceLocationId absent) groupé à
   * part, sinon l'id du lieu (qu'il soit populé en objet ou déjà une chaîne). */
  private lieuKey(item: { serviceLocationId?: any } | null): string {
    const lieu = item?.serviceLocationId;
    if (!lieu) return 'compte-entier';
    return typeof lieu === 'object' ? lieu._id : lieu;
  }

  /** Un client peut avoir un abonnement actif PAR LIEU (Modèle C) — n'afficher que le
   * dernier ne montrait qu'un seul lieu sur plusieurs. Un par lieu (le plus récent),
   * trié lieu principal d'abord. */
  get subscriptionsToDisplay(): any[] {
    const byLieu = new Map<string, any>();
    for (const sub of this.subscriptions) {
      const key = this.lieuKey(sub);
      const current = byLieu.get(key);
      if (!current || new Date(sub.endDate).getTime() > new Date(current.endDate).getTime()) {
        byLieu.set(key, sub);
      }
    }
    return Array.from(byLieu.values()).sort((a, b) => {
      const aPrimary = typeof a.serviceLocationId === 'object' && a.serviceLocationId?.isPrimary ? 0 : 1;
      const bPrimary = typeof b.serviceLocationId === 'object' && b.serviceLocationId?.isPrimary ? 0 : 1;
      return aPrimary - bPrimary;
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

  /** Seul champ réel disponible sur Subscription (isActive) — pas de statut "annulé"/"suspendu" distinct en base (models/subscription.js). */
  subscriptionStatusLabel(subscription: any): string {
    if (!subscription) return '';
    return isSubscriptionCurrentlyActive(subscription) ? 'Actif' : 'Expiré';
  }

  isSubscriptionActive(subscription: any): boolean {
    return isSubscriptionCurrentlyActive(subscription);
  }

  /** "Tous vos lieux" = abonnement/contrat "compte entier" (serviceLocationId absent —
   * voir services/eligibility.service.js pour sa portée réelle, limitée au lieu principal). */
  serviceLocationLabel(item: { serviceLocationId?: any } | null): string {
    const lieu = item?.serviceLocationId;
    return typeof lieu === 'object' && lieu ? lieu.name : 'Tous vos lieux';
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

  /** `subscription` : celui de la carte sur laquelle le client a cliqué "Payer" — jamais
   * un "abonnement actif" global, un client multi-lieux ayant un abonnement par lieu. */
  initiatePayment(subscription: any) {
    if (!subscription) return;
    this.paymentTarget = subscription;

    // Préparer les données pour le paiement — serviceLocationId propagé explicitement
    // pour que le renouvellement reste rattaché à CE lieu (sinon resolveServiceLocationForSubscription
    // retomberait sur le lieu principal du client, potentiellement un autre lieu).
    const lieu = subscription.serviceLocationId;
    this.tarifResponse = {
      tarifId: subscription.pricingId._id,
      agencyId: subscription.agencyId._id,
      userId: this.currentUser?._id,
      numberMonths: '1', // Un mois par défaut
      amount: subscription.pricingId.price,
      planType: subscription.pricingId.planType,
      serviceLocationId: typeof lieu === 'object' ? lieu?._id : lieu,
    };

    console.log('Tarif response prepared:', this.tarifResponse);
    this.showPaymentForm = true;
  }

  closePaymentForm() {
    this.showPaymentForm = false;
    this.tarifResponse = null;
  }

  goToAgencies(): void {
    this.router.navigate(['/agencies']);
  }

  goToContracts(): void {
    this.router.navigate(['/contrat']);
  }

  /** `subscription` : celle de la carte sur laquelle "Contactez l'agence" a été cliqué —
   * un client multi-lieux peut être rattaché à des agences différentes selon le lieu. */
  contactSupport(subscription: any) {
    if (!subscription?.agencyId?._id) {
      this.notificationService.showInfo('Info', 'Aucune agence associée à contacter pour le moment.');
      return;
    }
    this.contactTarget = subscription;
    this.showContactDrawer = true;
  }

  closeContactDrawer() {
    this.showContactDrawer = false;
    this.contactMessage = '';
    this.contactTarget = null;
  }

  get contactAgencyName(): string {
    return this.contactTarget?.agencyId?.name || '';
  }

  sendContactMessage() {
    if (this.isSendingMessage) return;
    const content = this.contactMessage.trim();
    if (!content) {
      this.notificationService.showInfo('Message vide', 'Le contenu du message ne peut pas être vide.');
      return;
    }
    const agencyId = this.contactTarget?.agencyId?._id;
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