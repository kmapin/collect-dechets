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
    showPaymentForm = false;
    tarifResponse: any = null;
    private newSubscriptionSub?: RxSubscription;

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
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.getUserSubscription();
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
        // Filtrer la subscription active
        // this.activeSubscription = this.subscriptions.find(sub => sub.status === 'active') || null;
        this.activeSubscription = this.subscriptions.length ? this.subscriptions[this.subscriptions.length - 1] : null;
        console.log("Active subscription ==>", this.activeSubscription);
      },
      error: (err) => {
        console.error('Erreur lors du chargement des abonnements', err);
      }
    });
  }

  /**
   * Initie le paiement de l'abonnement via Telecel Money
   */
  initiatePayment() {
    if (!this.activeSubscription) {
      alert('Aucun abonnement actif à payer.');
      return;
    }

    // Préparer les données pour le paiement
    this.tarifResponse = {
      tarifId: this.activeSubscription.pricingId._id,
      agencyId: this.activeSubscription.agencyId._id,
      userId: this.currentUser?._id,
      numberMonths: '1', // Un mois par défaut
      amount: this.activeSubscription.pricingId.price,
      planType: this.activeSubscription.pricingId.planType
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