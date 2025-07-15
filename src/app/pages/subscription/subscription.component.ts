import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

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
            <h2>Abonnement Actuel</h2>
            <div class="subscription-info">
              <div class="info-item">
                <strong>Service:</strong>
                <span>Collecte Standard</span>
              </div>
              <div class="info-item">
                <strong>Agence:</strong>
                <span>EcoClean Services</span>
              </div>
              <div class="info-item">
                <strong>Prix:</strong>
                <span>25.99€/mois</span>
              </div>
              <div class="info-item">
                <strong>Statut:</strong>
                <span class="status-active">Actif</span>
              </div>
            </div>
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

    .info-item:last-child {
      border-bottom: none;
    }

    .status-active {
      color: var(--success-color);
      font-weight: 500;
    }
  `]
})
export class SubscriptionComponent {
}