import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { CollectionService } from '../../../services/collection.service';
import { NotificationService } from '../../../services/notification.service';
import { User } from '../../../models/user.model';
import { Collection, CollectionStatus } from '../../../models/collection.model';

interface PaymentHistory {
  id: string;
  date: Date;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  description: string;
  method: string;
}

interface Subscription {
  id: string;
  serviceName: string;
  agencyName: string;
  price: number;
  frequency: string;
  status: 'active' | 'suspended' | 'cancelled';
  nextPayment: Date;
}

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="client-dashboard">
      <div class="page-header">
        <div class="container">
          <div class="header-content">
            <div class="welcome-section">
              <h1 class="page-title">Bonjour {{ currentUser?.firstName }} !</h1>
              <p class="page-subtitle">Gérez vos collectes et abonnements en toute simplicité</p>
            </div>
            <div class="quick-actions">
              <button class="btn btn-primary" (click)="showReportModal = true">
                <i class="material-icons">report_problem</i>
                Signaler un problème
              </button>
              <button class="btn btn-secondary" routerLink="/profile">
                <i class="material-icons">settings</i>
                Mon profil
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="container">
        <div class="dashboard-content">
          <!-- Statistiques rapides -->
          <div class="stats-grid">
            <div class="stat-card card">
              <div class="stat-icon next-collection">
                <i class="material-icons">event</i>
              </div>
              <div class="stat-info">
                <h3>Prochaine collecte</h3>
                <p class="stat-value">{{ getNextCollection() }}</p>
                <span class="stat-detail">{{ getNextCollectionType() }}</span>
              </div>
            </div>

            <div class="stat-card card">
              <div class="stat-icon collections">
                <i class="material-icons">check_circle</i>
              </div>
              <div class="stat-info">
                <h3>Collectes ce mois</h3>
                <p class="stat-value">{{ getMonthlyCollections() }}</p>
                <span class="stat-detail">{{ getCollectionRate() }}% de réussite</span>
              </div>
            </div>

            <div class="stat-card card">
              <div class="stat-icon subscription">
                <i class="material-icons">card_membership</i>
              </div>
              <div class="stat-info">
                <h3>Abonnement</h3>
                <p class="stat-value">{{ subscription?.serviceName }}</p>
                <span class="stat-detail">{{ subscription?.price }}€/mois</span>
              </div>
            </div>

            <div class="stat-card card">
              <div class="stat-icon payment">
                <i class="material-icons">payment</i>
              </div>
              <div class="stat-info">
                <h3>Prochain paiement</h3>
                <p class="stat-value">{{ getNextPayment() }}</p>
                <span class="stat-detail">{{ subscription?.price }}€</span>
              </div>
            </div>
          </div>

          <!-- Contenu principal -->
          <div class="main-content">
            <div class="left-column">
              <!-- Prochains passages -->
              <section class="upcoming-collections card">
                <div class="section-header">
                  <h2>
                    <i class="material-icons">schedule</i>
                    Prochains passages planifiés
                  </h2>
                  <button class="btn btn-secondary btn-small" (click)="refreshCollections()">
                    <i class="material-icons">refresh</i>
                    Actualiser
                  </button>
                </div>

                <div class="collections-list">
                  <div *ngFor="let collection of upcomingCollections" class="collection-item">
                    <div class="collection-date">
                      <div class="day">{{ collection.scheduledDate | date:'dd' }}</div>
                      <div class="month">{{ collection.scheduledDate | date:'MMM' }}</div>
                    </div>
                    <div class="collection-info">
                      <h4>{{ getWasteTypeName(collection.wasteTypes[0]) }}</h4>
                      <p class="collection-time">
                        <i class="material-icons">access_time</i>
                        {{ collection.scheduledDate | date:'HH:mm' }}
                      </p>
                      <p class="collection-address">
                        <i class="material-icons">location_on</i>
                        {{ collection.address.doorNumber }} {{ collection.address.street }}
                      </p>
                    </div>
                    <div class="collection-status">
                      <span class="status-badge" [class]="'status-' + collection.status">
                        {{ getStatusText(collection.status) }}
                      </span>
                      <div class="collection-actions">
                        <button class="action-btn" (click)="trackCollection(collection.id)" 
                                *ngIf="collection.status === 'in_progress'">
                          <i class="material-icons">location_on</i>
                          Suivre
                        </button>
                        <button class="action-btn" (click)="reportIssue(collection.id)"
                                *ngIf="collection.status === 'scheduled'">
                          <i class="material-icons">report</i>
                          Signaler
                        </button>
                      </div>
                    </div>
                  </div>

                  <div *ngIf="upcomingCollections.length === 0" class="empty-state">
                    <i class="material-icons">event_available</i>
                    <h3>Aucune collecte programmée</h3>
                    <p>Vos prochaines collectes apparaîtront ici</p>
                  </div>
                </div>
              </section>

              <!-- Historique des collectes -->
              <section class="collection-history card">
                <div class="section-header">
                  <h2>
                    <i class="material-icons">history</i>
                    Historique des collectes
                  </h2>
                  <div class="filter-controls">
                    <select [(ngModel)]="historyFilter" (change)="filterHistory()" class="filter-select">
                      <option value="all">Toutes</option>
                      <option value="completed">Réalisées</option>
                      <option value="missed">Manquées</option>
                      <option value="cancelled">Annulées</option>
                    </select>
                  </div>
                </div>

                <div class="history-list">
                  <div *ngFor="let collection of filteredHistory" class="history-item">
                    <div class="history-date">
                      <div class="day">{{ collection.scheduledDate | date:'dd' }}</div>
                      <div class="month">{{ collection.scheduledDate | date:'MMM' }}</div>
                    </div>
                    <div class="history-info">
                      <h4>{{ getWasteTypeName(collection.wasteTypes[0]) }}</h4>
                      <p class="history-time">{{ collection.scheduledDate | date:'HH:mm' }}</p>
                      <p class="history-collector" *ngIf="collection.collectedDate">
                        Collecté le {{ collection.collectedDate | date:'dd/MM à HH:mm' }}
                      </p>
                    </div>
                    <div class="history-status">
                      <span class="status-badge" [class]="'status-' + collection.status">
                        {{ getStatusText(collection.status) }}
                      </span>
                      <div class="history-rating" *ngIf="collection.status === 'completed'">
                        <div class="stars">
                          <i *ngFor="let star of getStars(collection.rating || 0)" 
                             class="material-icons star">star</i>
                        </div>
                        <button class="rate-btn" (click)="rateCollection(collection.id)" 
                                *ngIf="!collection.rating">
                          Noter
                        </button>
                      </div>
                    </div>
                  </div>

                  <div *ngIf="filteredHistory.length === 0" class="empty-state">
                    <i class="material-icons">history</i>
                    <h3>Aucun historique</h3>
                    <p>Vos collectes passées apparaîtront ici</p>
                  </div>
                </div>
              </section>
            </div>

            <div class="right-column">
              <!-- Informations d'abonnement -->
              <section class="subscription-info card">
                <div class="section-header">
                  <h2>
                    <i class="material-icons">card_membership</i>
                    Mon abonnement
                  </h2>
                  <button class="btn btn-secondary btn-small" routerLink="/subscription">
                    <i class="material-icons">edit</i>
                    Modifier
                  </button>
                </div>

                <div class="subscription-details" *ngIf="subscription">
                  <div class="subscription-service">
                    <h3>{{ subscription.serviceName }}</h3>
                    <p>{{ subscription.agencyName }}</p>
                  </div>

                  <div class="subscription-pricing">
                    <div class="price">{{ subscription.price }}€</div>
                    <div class="frequency">par mois</div>
                  </div>

                  <div class="subscription-status">
                    <span class="status-badge" [class]="'status-' + subscription.status">
                      {{ getSubscriptionStatusText(subscription.status) }}
                    </span>
                  </div>

                  <div class="subscription-actions">
                    <button class="btn btn-primary btn-full" (click)="showPaymentModal = true">
                      <i class="material-icons">payment</i>
                      Payer maintenant
                    </button>
                  </div>
                </div>
              </section>

              <!-- Paiement en ligne -->
              <section class="payment-section card">
                <div class="section-header">
                  <h2>
                    <i class="material-icons">payment</i>
                    Paiement
                  </h2>
                </div>

                <div class="payment-info">
                  <div class="next-payment">
                    <h4>Prochain paiement</h4>
                    <p class="payment-date">{{ subscription?.nextPayment | date:'dd MMMM yyyy' }}</p>
                    <p class="payment-amount">{{ subscription?.price }}€</p>
                  </div>

                  <div class="payment-method">
                    <h4>Mode de paiement</h4>
                    <div class="payment-card">
                      <i class="material-icons">credit_card</i>
                      <span>**** **** **** 1234</span>
                      <button class="change-btn" (click)="changePaymentMethod()">Modifier</button>
                    </div>
                  </div>
                </div>
              </section>

              <!-- Historique des paiements -->
              <section class="payment-history card">
                <div class="section-header">
                  <h2>
                    <i class="material-icons">receipt</i>
                    Historique des paiements
                  </h2>
                  <button class="btn btn-secondary btn-small" (click)="downloadInvoices()">
                    <i class="material-icons">download</i>
                    Télécharger
                  </button>
                </div>

                <div class="payments-list">
                  <div *ngFor="let payment of paymentHistory" class="payment-item">
                    <div class="payment-date">
                      <div class="day">{{ payment.date | date:'dd' }}</div>
                      <div class="month">{{ payment.date | date:'MMM' }}</div>
                    </div>
                    <div class="payment-details">
                      <h4>{{ payment.description }}</h4>
                      <p class="payment-method-text">{{ payment.method }}</p>
                    </div>
                    <div class="payment-amount">
                      <span class="amount">{{ payment.amount }}€</span>
                      <span class="status-badge" [class]="'status-' + payment.status">
                        {{ getPaymentStatusText(payment.status) }}
                      </span>
                    </div>
                  </div>

                  <div *ngIf="paymentHistory.length === 0" class="empty-state">
                    <i class="material-icons">receipt</i>
                    <h3>Aucun paiement</h3>
                    <p>Vos paiements apparaîtront ici</p>
                  </div>
                </div>
              </section>

              <!-- Adresse de collecte -->
              <section class="collection-address card">
                <div class="section-header">
                  <h2>
                    <i class="material-icons">home</i>
                    Adresse de collecte
                  </h2>
                  <button class="btn btn-secondary btn-small" (click)="editAddress()">
                    <i class="material-icons">edit</i>
                    Modifier
                  </button>
                </div>

                <div class="address-details" *ngIf="currentUser">
                  <div class="address-line">
                    <i class="material-icons">location_on</i>
                    <span>{{ currentUser.firstName }} {{ currentUser.lastName }}</span>
                  </div>
                  <div class="address-line">
                    <i class="material-icons">home</i>
                    <span>123 Rue des Roses</span>
                  </div>
                  <div class="address-line">
                    <i class="material-icons">palette</i>
                    <span>Porte bleue</span>
                  </div>
                  <div class="address-line">
                    <i class="material-icons">location_city</i>
                    <span>Centre-ville, Paris 75001</span>
                  </div>
                </div>

                <div class="address-map">
                  <div class="map-placeholder">
                    <i class="material-icons">map</i>
                    <p>Localisation précise</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal de signalement -->
      <div class="modal-overlay" *ngIf="showReportModal" (click)="showReportModal = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Signaler un problème</h3>
            <button class="close-btn" (click)="showReportModal = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <form class="report-form" (ngSubmit)="submitReport()">
            <div class="form-group">
              <label>Type de problème</label>
              <select [(ngModel)]="reportData.type" name="type" required>
                <option value="">Sélectionnez</option>
                <option value="missed">Collecte manquée</option>
                <option value="incomplete">Collecte incomplète</option>
                <option value="damage">Dommage au bac</option>
                <option value="other">Autre</option>
              </select>
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea [(ngModel)]="reportData.description" name="description" 
                        rows="4" placeholder="Décrivez le problème..." required></textarea>
            </div>
            <div class="form-group">
              <label>Date du problème</label>
              <input type="date" [(ngModel)]="reportData.date" name="date" required>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" (click)="showReportModal = false">
                Annuler
              </button>
              <button type="submit" class="btn btn-primary">
                <i class="material-icons">send</i>
                Envoyer
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal de paiement -->
      <div class="modal-overlay" *ngIf="showPaymentModal" (click)="showPaymentModal = false">
        <div class="modal-content payment-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Paiement sécurisé</h3>
            <button class="close-btn" (click)="showPaymentModal = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="payment-form">
            <div class="payment-summary">
              <h4>Récapitulatif</h4>
              <div class="summary-item">
                <span>{{ subscription?.serviceName }}</span>
                <span>{{ subscription?.price }}€</span>
              </div>
              <div class="summary-total">
                <span>Total</span>
                <span>{{ subscription?.price }}€</span>
              </div>
            </div>
            <div class="payment-methods">
              <h4>Mode de paiement</h4>
              <div class="payment-option">
                <input type="radio" id="card" name="payment" value="card" checked>
                <label for="card">
                  <i class="material-icons">credit_card</i>
                  Carte bancaire
                </label>
              </div>
              <div class="payment-option">
                <input type="radio" id="transfer" name="payment" value="transfer">
                <label for="transfer">
                  <i class="material-icons">account_balance</i>
                  Virement bancaire
                </label>
              </div>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" (click)="showPaymentModal = false">
                Annuler
              </button>
              <button type="button" class="btn btn-primary" (click)="processPayment()">
                <i class="material-icons">lock</i>
                Payer {{ subscription?.price }}€
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .client-dashboard {
      min-height: 100vh;
      background: var(--light-gray);
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 24px;
    }

    .welcome-section h1 {
      color: var(--white);
      margin-bottom: 8px;
    }

    .welcome-section p {
      color: rgba(255, 255, 255, 0.9);
    }

    .quick-actions {
      display: flex;
      gap: 12px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 24px;
      transition: all 0.3s ease;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-medium);
    }

    .stat-icon {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--white);
      font-size: 28px;
    }

    .stat-icon.next-collection { background: var(--primary-color); }
    .stat-icon.collections { background: var(--success-color); }
    .stat-icon.subscription { background: var(--secondary-color); }
    .stat-icon.payment { background: var(--accent-color); }

    .stat-info h3 {
      font-size: 1rem;
      font-weight: 500;
      margin-bottom: 4px;
      color: var(--text-secondary);
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0 0 4px 0;
      color: var(--text-primary);
    }

    .stat-detail {
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .main-content {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 32px;
    }

    .left-column,
    .right-column {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--medium-gray);
    }

    .section-header h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 1.3rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .btn-small {
      padding: 8px 16px;
      font-size: 0.9rem;
    }

    .collections-list,
    .history-list,
    .payments-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .collection-item,
    .history-item,
    .payment-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: var(--light-gray);
      border-radius: 8px;
      transition: all 0.3s ease;
    }

    .collection-item:hover,
    .history-item:hover,
    .payment-item:hover {
      background: #f0f0f0;
    }

    .collection-date,
    .history-date,
    .payment-date {
      text-align: center;
      min-width: 50px;
    }

    .day {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary-color);
      line-height: 1;
    }

    .month {
      font-size: 0.8rem;
      color: var(--text-secondary);
      text-transform: uppercase;
    }

    .collection-info,
    .history-info,
    .payment-details {
      flex: 1;
    }

    .collection-info h4,
    .history-info h4,
    .payment-details h4 {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 4px;
      color: var(--text-primary);
    }

    .collection-time,
    .collection-address,
    .history-time,
    .history-collector,
    .payment-method-text {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.9rem;
      color: var(--text-secondary);
      margin: 2px 0;
    }

    .collection-status,
    .history-status {
      text-align: right;
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
      text-transform: uppercase;
    }

    .status-scheduled { background: #e3f2fd; color: var(--primary-color); }
    .status-in_progress { background: #fff3e0; color: #f57c00; }
    .status-completed { background: #e8f5e8; color: var(--success-color); }
    .status-missed { background: #ffebee; color: var(--error-color); }
    .status-cancelled { background: #f5f5f5; color: var(--text-secondary); }
    .status-active { background: #e8f5e8; color: var(--success-color); }
    .status-suspended { background: #fff3e0; color: #f57c00; }

    .collection-actions {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }

    .action-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      background: var(--white);
      border: 1px solid var(--medium-gray);
      border-radius: 6px;
      color: var(--text-primary);
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .action-btn:hover {
      border-color: var(--primary-color);
      color: var(--primary-color);
    }

    .filter-controls {
      display: flex;
      gap: 12px;
    }

    .filter-select {
      padding: 8px 12px;
      border: 1px solid var(--medium-gray);
      border-radius: 6px;
      font-size: 0.9rem;
    }

    .history-rating {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
    }

    .stars {
      display: flex;
      gap: 2px;
    }

    .star {
      font-size: 16px;
      color: var(--warning-color);
    }

    .rate-btn {
      padding: 4px 8px;
      background: var(--primary-color);
      color: var(--white);
      border: none;
      border-radius: 4px;
      font-size: 0.8rem;
      cursor: pointer;
    }

    .subscription-details {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .subscription-service h3 {
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 4px;
      color: var(--text-primary);
    }

    .subscription-service p {
      color: var(--text-secondary);
    }

    .subscription-pricing {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }

    .price {
      font-size: 2rem;
      font-weight: 700;
      color: var(--primary-color);
    }

    .frequency {
      color: var(--text-secondary);
    }

    .btn-full {
      width: 100%;
    }

    .payment-info {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .next-payment,
    .payment-method {
      padding: 16px;
      background: var(--light-gray);
      border-radius: 8px;
    }

    .next-payment h4,
    .payment-method h4 {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--text-primary);
    }

    .payment-date {
      font-size: 1.1rem;
      color: var(--text-primary);
      margin-bottom: 4px;
    }

    .payment-amount {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary-color);
    }

    .payment-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--white);
      border-radius: 6px;
    }

    .change-btn {
      margin-left: auto;
      padding: 4px 8px;
      background: none;
      border: 1px solid var(--primary-color);
      color: var(--primary-color);
      border-radius: 4px;
      font-size: 0.8rem;
      cursor: pointer;
    }

    .payment-amount {
      text-align: right;
    }

    .amount {
      display: block;
      font-size: 1.2rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 4px;
    }

    .address-details {
      margin-bottom: 16px;
    }

    .address-line {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
      color: var(--text-primary);
    }

    .address-line i {
      color: var(--primary-color);
      font-size: 20px;
    }

    .address-map {
      margin-top: 16px;
    }

    .map-placeholder {
      height: 150px;
      background: var(--light-gray);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
    }

    .map-placeholder i {
      font-size: 32px;
      margin-bottom: 8px;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: var(--text-secondary);
    }

    .empty-state i {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .empty-state h3 {
      font-size: 1.2rem;
      margin-bottom: 8px;
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: var(--white);
      border-radius: 12px;
      padding: 24px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--medium-gray);
    }

    .modal-header h3 {
      font-size: 1.3rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .close-btn {
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 4px;
      border-radius: 50%;
      transition: all 0.3s ease;
    }

    .close-btn:hover {
      background: var(--light-gray);
    }

    .report-form,
    .payment-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-group label {
      font-weight: 500;
      color: var(--text-primary);
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
      padding: 12px 16px;
      border: 2px solid var(--medium-gray);
      border-radius: 8px;
      font-family: 'Inter', sans-serif;
      transition: border-color 0.3s ease;
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: var(--primary-color);
    }

    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 16px;
    }

    .payment-modal {
      max-width: 600px;
    }

    .payment-summary {
      background: var(--light-gray);
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 24px;
    }

    .payment-summary h4 {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 16px;
      color: var(--text-primary);
    }

    .summary-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid var(--medium-gray);
    }

    .summary-total {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      font-weight: 600;
      font-size: 1.1rem;
      color: var(--text-primary);
      border-top: 2px solid var(--primary-color);
      margin-top: 8px;
    }

    .payment-methods h4 {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 16px;
      color: var(--text-primary);
    }

    .payment-option {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border: 2px solid var(--medium-gray);
      border-radius: 8px;
      margin-bottom: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .payment-option:hover {
      border-color: var(--primary-color);
    }

    .payment-option input[type="radio"]:checked + label {
      color: var(--primary-color);
    }

    .payment-option label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      flex: 1;
    }

    @media (max-width: 1024px) {
      .main-content {
        grid-template-columns: 1fr;
      }

      .header-content {
        flex-direction: column;
        text-align: center;
      }
    }

    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }

      .collection-item,
      .history-item,
      .payment-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .collection-status,
      .history-status {
        text-align: left;
        width: 100%;
      }

      .modal-content {
        margin: 20px;
        width: calc(100% - 40px);
      }
    }
  `]
})
export class ClientDashboardComponent implements OnInit {
  currentUser: User | null = null;
  upcomingCollections: Collection[] = [];
  collectionHistory: Collection[] = [];
  filteredHistory: Collection[] = [];
  paymentHistory: PaymentHistory[] = [];
  subscription: Subscription | null = null;
  
  historyFilter = 'all';
  showReportModal = false;
  showPaymentModal = false;
  
  reportData = {
    type: '',
    description: '',
    date: ''
  };

  constructor(
    private authService: AuthService,
    private collectionService: CollectionService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    // Charger les données du tableau de bord
    this.loadUpcomingCollections();
    this.loadCollectionHistory();
    this.loadPaymentHistory();
    this.loadSubscription();
  }

  loadUpcomingCollections(): void {
    // Simuler les prochaines collectes
    this.upcomingCollections = [
      {
        id: '1',
        clientId: 'client1',
        agencyId: 'agency1',
        collectorId: 'collector1',
        scheduledDate: new Date('2024-01-15T09:00:00'),
        status: CollectionStatus.SCHEDULED,
        address: {
          street: 'Rue des Roses',
          doorNumber: '15',
          doorColor: 'blue',
          neighborhood: 'Centre-ville',
          city: 'Paris',
          postalCode: '75001'
        },
        wasteTypes: [{ id: '1', name: 'Déchets ménagers', description: '', icon: 'delete', color: '#4caf50', instructions: [], acceptedItems: [], rejectedItems: [] }],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        clientId: 'client1',
        agencyId: 'agency1',
        collectorId: 'collector1',
        scheduledDate: new Date('2024-01-18T10:00:00'),
        status: CollectionStatus.SCHEDULED,
        address: {
          street: 'Rue des Roses',
          doorNumber: '15',
          doorColor: 'blue',
          neighborhood: 'Centre-ville',
          city: 'Paris',
          postalCode: '75001'
        },
        wasteTypes: [{ id: '2', name: 'Recyclables', description: '', icon: 'recycling', color: '#2196f3', instructions: [], acceptedItems: [], rejectedItems: [] }],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }

  loadCollectionHistory(): void {
    // Simuler l'historique des collectes
    this.collectionHistory = [
      {
        id: '3',
        clientId: 'client1',
        agencyId: 'agency1',
        collectorId: 'collector1',
        scheduledDate: new Date('2024-01-08T09:00:00'),
        collectedDate: new Date('2024-01-08T09:30:00'),
        status: CollectionStatus.COMPLETED,
        address: {
          street: 'Rue des Roses',
          doorNumber: '15',
          doorColor: 'blue',
          neighborhood: 'Centre-ville',
          city: 'Paris',
          postalCode: '75001'
        },
        wasteTypes: [{ id: '1', name: 'Déchets ménagers', description: '', icon: 'delete', color: '#4caf50', instructions: [], acceptedItems: [], rejectedItems: [] }],
        rating: 5,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    this.filteredHistory = [...this.collectionHistory];
  }

  loadPaymentHistory(): void {
    this.paymentHistory = [
      {
        id: '1',
        date: new Date('2024-01-01'),
        amount: 25.99,
        status: 'completed',
        description: 'Abonnement mensuel - Janvier 2024',
        method: 'Carte bancaire **** 1234'
      },
      {
        id: '2',
        date: new Date('2023-12-01'),
        amount: 25.99,
        status: 'completed',
        description: 'Abonnement mensuel - Décembre 2023',
        method: 'Carte bancaire **** 1234'
      }
    ];
  }

  loadSubscription(): void {
    this.subscription = {
      id: '1',
      serviceName: 'Collecte Standard',
      agencyName: 'EcoClean Services',
      price: 25.99,
      frequency: 'mensuel',
      status: 'active',
      nextPayment: new Date('2024-02-01')
    };
  }

  getNextCollection(): string {
    if (this.upcomingCollections.length > 0) {
      return this.upcomingCollections[0].scheduledDate.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long'
      });
    }
    return 'Aucune programmée';
  }

  getNextCollectionType(): string {
    if (this.upcomingCollections.length > 0) {
      return this.upcomingCollections[0].wasteTypes[0]?.name || '';
    }
    return '';
  }

  getMonthlyCollections(): string {
    const completed = this.collectionHistory.filter(c => c.status === CollectionStatus.COMPLETED).length;
    const total = this.collectionHistory.length + this.upcomingCollections.length;
    return `${completed} / ${total}`;
  }

  getCollectionRate(): number {
    const completed = this.collectionHistory.filter(c => c.status === CollectionStatus.COMPLETED).length;
    const total = this.collectionHistory.length;
    return total > 0 ? Math.round((completed / total) * 100) : 100;
  }

  getNextPayment(): string {
    return this.subscription?.nextPayment.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long'
    }) || '';
  }

  getWasteTypeName(wasteType: any): string {
    return wasteType?.name || 'Type inconnu';
  }

  getStatusText(status: CollectionStatus): string {
    const statusTexts = {
      [CollectionStatus.SCHEDULED]: 'Programmé',
      [CollectionStatus.IN_PROGRESS]: 'En cours',
      [CollectionStatus.COMPLETED]: 'Collecté',
      [CollectionStatus.MISSED]: 'Manqué',
      [CollectionStatus.CANCELLED]: 'Annulé',
      [CollectionStatus.REPORTED]: 'Signalé'
    };
    return statusTexts[status] || status;
  }

  getSubscriptionStatusText(status: string): string {
    const statusTexts = {
      'active': 'Actif',
      'suspended': 'Suspendu',
      'cancelled': 'Annulé'
    };
    return statusTexts[status as keyof typeof statusTexts] || status;
  }

  getPaymentStatusText(status: string): string {
    const statusTexts = {
      'completed': 'Payé',
      'pending': 'En attente',
      'failed': 'Échec'
    };
    return statusTexts[status as keyof typeof statusTexts] || status;
  }

  getStars(rating: number): number[] {
    return new Array(Math.floor(rating)).fill(0);
  }

  refreshCollections(): void {
    this.loadUpcomingCollections();
    this.notificationService.showSuccess('Actualisé', 'Les collectes ont été mises à jour');
  }

  filterHistory(): void {
    if (this.historyFilter === 'all') {
      this.filteredHistory = [...this.collectionHistory];
    } else {
      this.filteredHistory = this.collectionHistory.filter(c => c.status === this.historyFilter);
    }
  }

  trackCollection(collectionId: string): void {
    this.notificationService.showInfo('Suivi', 'Le collecteur est en route vers votre adresse');
  }

  reportIssue(collectionId: string): void {
    this.showReportModal = true;
  }

  rateCollection(collectionId: string): void {
    this.notificationService.showInfo('Évaluation', 'Fonctionnalité d\'évaluation à venir');
  }

  submitReport(): void {
    if (this.reportData.type && this.reportData.description && this.reportData.date) {
      this.notificationService.showSuccess('Signalement envoyé', 'Votre signalement a été transmis à l\'agence');
      this.showReportModal = false;
      this.reportData = { type: '', description: '', date: '' };
    }
  }

  processPayment(): void {
    this.notificationService.showSuccess('Paiement effectué', 'Votre paiement a été traité avec succès');
    this.showPaymentModal = false;
  }

  changePaymentMethod(): void {
    this.notificationService.showInfo('Modification', 'Redirection vers la gestion des moyens de paiement');
  }

  downloadInvoices(): void {
    this.notificationService.showInfo('Téléchargement', 'Génération des factures en cours...');
  }

  editAddress(): void {
    this.notificationService.showInfo('Modification', 'Redirection vers la modification d\'adresse');
  }
}