import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { RegisterUserData, User, UserRole } from '../../models/user.model';
import { AgencyService } from '../../services/agency.service';



@Component({
  selector: 'app-subscription',
  imports: [CommonModule],
  templateUrl: './subscription.html',
  styleUrl: './subscription.css'
})
export class Subscription  implements OnInit {
    currentUser: RegisterUserData | null = null;
    subscriptions: any[] = [];
    activeSubscription: any = null;
  
constructor(
    private authService: AuthService,
    private agencyService: AgencyService,
    private router: Router,
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

  renewSubscription() {
    // Logique pour renouveler l'abonnement
    alert('Fonction de renouvellement d\'abonnement à implémenter.');
  }
  contactSupport() {
    // Logique pour contacter le support
    alert('Fonction de contact support à implémenter.');
  }
}