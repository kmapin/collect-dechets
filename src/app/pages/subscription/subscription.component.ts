import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { User, UserRole } from '../../models/user.model';
import { AgencyService } from '../../services/agency.service';



@Component({
  selector: 'app-subscription',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="subscription-page">
      <div class="page-header">
        <div class="container">
          <h1 class="page-title">Mon Abonnement</h1>
          <p class="page-subtitle">
            Gérez votre abonnement et vos services de collecte
          </p>
        </div>
      </div>

      <div class="container">
        <div class="subscription-content">
          <div class="subscription-card card">
            <h1 class="text-[28px] font-semibold text-[--primary-color]">Abonnement Actuel</h1>
            <!-- ...existing code... -->
            <div class="subscription-info" *ngIf="activeSubscription; else noSub">
              <div class="plan-summary">
                <span class="plan-badge" [ngClass]="activeSubscription.plan">
                  <ng-container [ngSwitch]="activeSubscription.plan">
                    <ng-container *ngSwitchCase="'premium'">
                      <i class="material-icons" style="font-size:32px;color:gold;">star</i>
                    </ng-container>
                    <ng-container *ngSwitchCase="'standard'">
                      <i class="material-icons" style="font-size:32px;color:#2196f3;">star_half</i>
                    </ng-container>
                    <ng-container *ngSwitchCase="'basic'">
                      <i class="material-icons" style="font-size:32px;color:#9e9e9e;">star_outline</i>
                    </ng-container>
                  </ng-container>
                  {{ activeSubscription.plan | titlecase }}
                </span>
                <span class="status-badge" [class.active]="activeSubscription.status === 'active'">
                  {{ activeSubscription.status | titlecase }}
                </span>
              </div>
              <div class="info-item-agencyName">
                <strong>Agence:</strong>
                <span class="font-semibold text-[--primary-color]">{{ activeSubscription.agencyId?.agencyName }}</span>
              </div>
              <div class="info-item">
                <strong>Adresses:</strong>
                <span>{{ activeSubscription.agencyId?.address?.city }} - {{ activeSubscription.agencyId?.address?.neighborhood }} - {{ activeSubscription.agencyId?.address?.sector }}</span>
              </div>

              <div class="info-item">
                <strong>Code postal:</strong>
                <span>{{ activeSubscription.agencyId?.address?.postalCode }}</span>
              </div>
              <div class="info-item">
                <strong>Prix:</strong>
                <span class="text-[20px] font-semibold text-[--primary-color]">{{ activeSubscription.amount }} <sup class="tex-black">FCFA</sup>/ Mois</span>
              </div>
              <div class="info-item">
                <strong>Début:</strong>
                <span>{{ activeSubscription.startDate | date:'dd/MM/yyyy' }}</span>
              </div>
              <div class="info-item">
                <strong>Fin:</strong>
                <span>{{ activeSubscription.endDate | date:'dd/MM/yyyy' }}</span>
              </div>
              <div class="contact-info">
                <strong>Contacts:</strong>
                <span>{{ activeSubscription.agencyId?.phone }}</span>
              </div>
              <div class="actions">
                <button class="btn btn-primary" (click)="renewSubscription()">Renouveler</button>
                <button class="btn btn-secondary" (click)="contactSupport()">Support</button>
              </div>
            </div>
            <ng-template #noSub>
              <div class="info-item">
                <span>Aucun abonnement actif.</span>
              </div>
            </ng-template>
            <!-- ...existing code... -->
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .subscription-page {
      min-height: 100vh;
      background: var(--light-gray);
    }

    .subscription-content {
      max-width: 600px;
      margin: 0 auto;
    }

    .subscription-card {
      padding: 32px;
    }

    .subscription-info {
      margin-top: 24px;
    }

    .info-item {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid var(--medium-gray);
    }
    .info-item-agencyName {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 2px solid var(--primary-color);

    }

    .contact-info {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      color: var(--primary-color);
      font-weight: 10;
      border-bottom: 2px solid var(--primary-color);
    }

    .info-item:last-child {
      border-bottom: none;
    }

    .status-active {
      color: var(--success-color);
      font-weight: 500;
    }
    .status-premium {
      color: var(--warning-color);
      font-weight: 500;
    }
    .status-standard {
      color: var(--primary-color);
      font-weight: 500;
    }

    .plan-summary {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
    }
    .plan-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1.2rem;
      font-weight: 600;
      padding: 8px 16px;
      border-radius: 24px;
      background: #f5f5f5;
    }
    .plan-badge.premium { background: #fffbe6; color: #bfa100; }
    .plan-badge.standard { background: #e3f2fd; color: #2196f3; }
    .plan-badge.basic { background: #f5f5f5; color: #757575; }
    .status-badge {
      padding: 6px 12px;
      border-radius: 16px;
      font-size: 0.9rem;
      font-weight: 500;
      background: #e8f5e9;
      color: #388e3c;
    }
    .status-badge.active { background: #e8f5e9; color: #388e3c; }
    .actions {
      margin-top: 24px;
      display: flex;
      gap: 12px;
    }
  `]
})
export class SubscriptionComponent implements OnInit {
    currentUser: User | null = null;
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
    const userID = this.currentUser?.id || '';
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