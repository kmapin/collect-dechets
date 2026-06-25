import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { RegisterUserData, User, UserRole } from '../../models/user.model';
import { AgencyService } from '../../services/agency.service';
import { MobileMoneyFormComponent } from '../payment/mobile-money-form/mobile-money-form';
import { PaymentService } from '../../services/payment/payment.service';


@Component({
  selector: 'app-subscription',
  imports: [CommonModule, MobileMoneyFormComponent],
  templateUrl: './subscription.html',
  styleUrl: './subscription.css'
})
export class Subscription  implements OnInit {
    currentUser: RegisterUserData | null = null;
    subscriptions: any[] = [];
    activeSubscription: any = null;
    showPaymentForm = false;
    tarifResponse: any = null;
  
constructor(
    private authService: AuthService,
    private agencyService: AgencyService,
    private router: Router,
    private paymentService: PaymentService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.getUserSubscription();
    });
    this.currentUser = this.authService.getCurrentUser();
    console.log("this.currentUser", this.currentUser);
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
    // Logique pour contacter le support
    alert('Fonction de contact support à implémenter.');
  }
}