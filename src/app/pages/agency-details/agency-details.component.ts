import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AgencyService } from '../../services/agency.service';
import { Agency } from '../../models/agency.model';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-agency-details',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="agency-details-page" *ngIf="agency">
      <!-- Breadcrumb Navigation -->
      <div class="breadcrumb-section">
        <div class="container">
          <nav class="breadcrumb">
            <a routerLink="/" class="breadcrumb-item">
              <i class="material-icons">home</i>
              Accueil
            </a>
            <i class="material-icons breadcrumb-separator">chevron_right</i>
            <a routerLink="/agencies" class="breadcrumb-item">Agences</a>
            <i class="material-icons breadcrumb-separator">chevron_right</i>
            <span class="breadcrumb-item active">{{ agency.agencyName }}</span>
          </nav>
        </div>
      </div>

      <!-- Agency Header -->
      <div class="agency-header-section">
        <div class="container">
          <div class="agency-header-content">
            <div class="agency-main-info">
              <div class="agency-logo">
                <img src="https://images.pexels.com/photos/3735218/pexels-photo-3735218.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop" [alt]="agency.agencyName">
              </div>
              <div class="agency-details">
                <h1 class="agency-name">{{ agency.agencyName }}</h1>
                <p class="agency-description">{{ agency.agencyDescription }}</p>
                <div class="agency-meta">
                  <div class="agency-rating">
                    <div class="stars">
                      <i *ngFor="let star of getStars(agency.rating)" class="material-icons star">star</i>
                    </div>
                    <span class="rating-text">{{ agency.rating }}/5</span>
                    <span class="reviews-count">({{ agency.totalClients }} avis)</span>
                  </div>
                  <div class="agency-status">
                    <span class="status-badge" [class.active]="agency.isActive">
                      <i class="material-icons">{{ agency.isActive ? 'check_circle' : 'cancel' }}</i>
                      {{ agency.isActive ? 'Agence active' : 'Agence inactive' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div class="agency-actions">
              <button class="btn btn-accent" (click)="activateAgency(agency.userId)" *ngIf="currentUser?.role === 'super_admin'">
                <ng-container *ngIf="!agency.isActive ; else activeBtn">
                  <i class="material-icons">check</i>
                  Activer
                </ng-container>
                <ng-template #activeBtn>
                  <i class="material-icons">lock_open</i> 
                  Desactiver
                </ng-template>
              </button>
              <button class="btn btn-secondary" (click)="shareAgency()">
                <i class="material-icons">share</i>
                Partager
              </button>
              <button class="btn btn-primary btn-large" (click)="subscribeToAgency()">
                <i class="material-icons">add</i>
                S'abonner
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="agency-main-content">
        <div class="container">
          <div class="content-layout">
            <!-- Left Column - Main Information -->
            <div class="main-column">
              <!-- Quick Stats -->
              <section class="quick-stats">
                <div class="stat-item">
                  <div class="stat-icon">
                    <i class="material-icons">people</i>
                  </div>
                  <div class="stat-info">
                    <span class="stat-number">{{ agency.totalClients }}</span>
                    <span class="stat-label">Clients</span>
                  </div>
                </div>
                <div class="stat-item">
                  <div class="stat-icon">
                    <i class="material-icons">build</i>
                  </div>
                  <div class="stat-info">
                    <span class="stat-number">{{ agency.services.length }}</span>
                    <span class="stat-label">Services</span>
                  </div>
                </div>
                <div class="stat-item">
                  <div class="stat-icon">
                    <i class="material-icons">map</i>
                  </div>
                  <div class="stat-info">
                    <span class="stat-number">{{ agency.serviceZones.length }}</span>
                    <span class="stat-label">Zones</span>
                  </div>
                </div>
                <div class="stat-item">
                  <div class="stat-icon">
                    <i class="material-icons">local_shipping</i>
                  </div>
                  <div class="stat-info">
                    <span class="stat-number">{{ agency.employees.length }}</span>
                    <span class="stat-label">Employés</span>
                  </div>
                </div>
              </section>

              <!-- Services Section -->
              <section class="services-section card">
                <div class="section-header">
                  <h2>
                    <i class="material-icons">build</i>
                    Services proposés
                  </h2>
                  <span class="section-count">{{ agency.services.length }} service(s)</span>
                </div>
                <div class="services-grid">
                  <div *ngFor="let service of agency.services" class="service-card">
                    <div class="service-header">
                      <h3>{{ service.name }}</h3>
                      <div class="service-price">
                        <span class="price-amount">{{ service.price }}€</span>
                        <span class="price-period">/mois</span>
                      </div>
                    </div>
                    <p class="service-description">{{ service.description }}</p>
                    <div class="service-details">
                      <div class="service-frequency">
                        <i class="material-icons">schedule</i>
                        Collecte {{ getFrequencyText(service.frequency) }}
                      </div>
                      <div class="service-status" [class.active]="service.isActive">
                        <i class="material-icons">{{ service.isActive ? 'check_circle' : 'cancel' }}</i>
                        {{ service.isActive ? 'Disponible' : 'Indisponible' }}
                      </div>
                    </div>
                    <div class="service-actions">
                      <button class="btn btn-primary btn-small" [disabled]="!service.isActive">
                        <i class="material-icons">add_shopping_cart</i>
                        Choisir ce service
                      </button>
                    </div>
                  </div>
                </div>
                <div *ngIf="agency.services.length === 0" class="empty-state">
                  <i class="material-icons">build</i>
                  <h3>Aucun service disponible</h3>
                  <p>Cette agence ne propose actuellement aucun service.</p>
                </div>
              </section>

              <!-- Coverage Zones Section -->
              <section class="zones-section card">
                <div class="section-header">
                  <h2>
                    <i class="material-icons">map</i>
                    Zones de couverture
                  </h2>
                  <span class="section-count">{{ agency.serviceZones.length }} zone(s)</span>
                </div>
                <div class="zones-grid">
                  <div *ngFor="let zone of agency.serviceZones" class="zone-card">
                    <div class="zone-header">
                      <h4>{{ zone.name }}</h4>
                      <span class="zone-status" [class.active]="zone.isActive">
                        {{ zone.isActive ? 'Active' : 'Inactive' }}
                      </span>
                    </div>
                    <p class="zone-description">{{ zone.description }}</p>
                    <div class="zone-details">
                      <div class="zone-cities">
                        <strong>Villes :</strong>
                        <div class="cities-list">
                          <span *ngFor="let city of zone.cities" class="city-tag">{{ city }}</span>
                        </div>
                      </div>
                      <div class="zone-neighborhoods" *ngIf="zone.neighborhoods.length > 0">
                        <strong>Quartiers :</strong>
                        <div class="neighborhoods-list">
                          <span *ngFor="let neighborhood of zone.neighborhoods" class="neighborhood-tag">{{ neighborhood }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div *ngIf="agency.serviceZones.length === 0" class="empty-state">
                  <i class="material-icons">map</i>
                  <h3>Aucune zone de couverture</h3>
                  <p>Cette agence n'a pas encore défini ses zones de couverture.</p>
                </div>
              </section>
            </div>

            <!-- Right Column - Sidebar -->
            <div class="sidebar-column">
              <!-- Contact Card -->
              <div class="contact-card card">
                <div class="card-header">
                  <h3>
                    <i class="material-icons">contact_phone</i>
                    Informations de contact
                  </h3>
                </div>
                <div class="contact-content">
                  <div class="contact-item">
                    <div class="contact-icon">
                      <i class="material-icons">phone</i>
                    </div>
                    <div class="contact-info">
                      <span class="contact-label">Téléphone</span>
                      <a href="tel:{{ agency.phone }}" class="contact-value">{{ agency.phone }}</a>
                    </div>
                  </div>
                  <div class="contact-item">
                    <div class="contact-icon">
                      <i class="material-icons">location_on</i>
                    </div>
                    <div class="contact-info">
                      <span class="contact-label">Adresse</span>
                      <span class="contact-value">
                        {{ agency.address.doorNumber }} {{ agency.address.street }}<br>
                        {{ agency.address.neighborhood }}, {{ agency.address.city }} {{ agency.address.postalCode }}
                      </span>
                    </div>
                  </div>
                </div>
                <div class="contact-actions">
                  <button class="btn btn-primary btn-full" (click)="contactAgency()">
                    <i class="material-icons">phone</i>
                    Contacter l'agence
                  </button>
                </div>
              </div>

              <!-- Location Map -->
              <div class="location-card card">
                <div class="card-header">
                  <h3>
                    <i class="material-icons">place</i>
                    Localisation
                  </h3>
                </div>
                <div class="map-container">
                  <div class="map-placeholder">
                    <i class="material-icons">map</i>
                    <p>Carte de localisation</p>
                    <small>{{ agency.address.city }}, {{ agency.address.neighborhood }}</small>
                  </div>
                </div>
                <div class="location-actions">
                  <button class="btn btn-secondary btn-full" (click)="openDirections()">
                    <i class="material-icons">directions</i>
                    Obtenir l'itinéraire
                  </button>
                </div>
              </div>

              <!-- Agency Stats -->
              <div class="agency-stats-card card">
                <div class="card-header">
                  <h3>
                    <i class="material-icons">analytics</i>
                    Statistiques
                  </h3>
                </div>
                <div class="stats-content">
                  <div class="stat-row">
                    <div class="stat-icon">
                      <i class="material-icons">people</i>
                    </div>
                    <div class="stat-details">
                      <span class="stat-number">{{ agency.totalClients }}</span>
                      <span class="stat-label">Clients actifs</span>
                    </div>
                  </div>
                  <div class="stat-row">
                    <div class="stat-icon">
                      <i class="material-icons">star</i>
                    </div>
                    <div class="stat-details">
                      <span class="stat-number">{{ agency.rating }}/5</span>
                      <span class="stat-label">Note moyenne</span>
                    </div>
                  </div>
                  <div class="stat-row">
                    <div class="stat-icon">
                      <i class="material-icons">event</i>
                    </div>
                    <div class="stat-details">
                      <span class="stat-number">{{ getYearsInService() }}</span>
                      <span class="stat-label">Années de service</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Similar Agencies -->
              <div class="similar-agencies-card card">
                <div class="card-header">
                  <h3>
                    <i class="material-icons">business</i>
                    Agences similaires
                  </h3>
                </div>
                <div class="similar-agencies-list">
                  <div class="similar-agency-item">
                    <div class="similar-agency-info">
                      <h4>GreenWaste Solutions</h4>
                      <div class="similar-agency-rating">
                        <div class="stars">
                          <i class="material-icons star">star</i>
                          <i class="material-icons star">star</i>
                          <i class="material-icons star">star</i>
                          <i class="material-icons star">star</i>
                        </div>
                        <span>4.2/5</span>
                      </div>
                    </div>
                    <button class="btn btn-secondary btn-small">Voir</button>
                  </div>
                  <div class="similar-agency-item">
                    <div class="similar-agency-info">
                      <h4>EcoClean Pro</h4>
                      <div class="similar-agency-rating">
                        <div class="stars">
                          <i class="material-icons star">star</i>
                          <i class="material-icons star">star</i>
                          <i class="material-icons star">star</i>
                          <i class="material-icons star">star</i>
                          <i class="material-icons star">star</i>
                        </div>
                        <span>4.8/5</span>
                      </div>
                    </div>
                    <button class="btn btn-secondary btn-small">Voir</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .agency-details-page {
      min-height: 100vh;
      background: var(--light-gray);
      width: 100%;
      margin: 0 auto;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 24px;
      width: 100%;
    }

    .breadcrumb-section {
      background: var(--white);
      border-bottom: 1px solid var(--medium-gray);
      padding: 12px 0;
      width: 100%;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9rem;
    }

    .breadcrumb-item {
      display: flex;
      align-items: center;
      gap: 4px;
      color: var(--text-secondary);
      text-decoration: none;
      transition: color 0.3s ease;
    }

    .breadcrumb-item:hover {
      color: var(--primary-color);
    }

    .breadcrumb-item.active {
      color: var(--text-primary);
      font-weight: 500;
    }

    .breadcrumb-separator {
      color: var(--text-secondary);
      font-size: 16px;
    }

    .agency-header-section {
      background: var(--white);
      border-bottom: 1px solid var(--medium-gray);
      padding: 32px 0;
    }

    .agency-header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 32px;
    }

    .agency-main-info {
      display: flex;
      gap: 24px;
      flex: 1;
    }

    .agency-logo {
      width: 100px;
      height: 100px;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: var(--shadow-light);
      flex-shrink: 0;
    }

    .agency-logo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .agency-details {
      flex: 1;
    }

    .agency-name {
      font-size: 2.2rem;
      font-weight: 700;
      margin-bottom: 8px;
      color: var(--text-primary);
      line-height: 1.2;
    }

    .agency-description {
      font-size: 1.1rem;
      color: var(--text-secondary);
      margin-bottom: 16px;
      line-height: 1.5;
    }

    .agency-meta {
      display: flex;
      align-items: center;
      gap: 24px;
      flex-wrap: wrap;
    }

    .agency-rating {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .stars {
      display: flex;
      gap: 2px;
    }

    .star {
      font-size: 16px;
      color: #ffc107;
    }

    .rating-text {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .reviews-count {
      font-size: 0.9rem;
      color: var(--text-secondary);
    }

    .agency-status .status-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 500;
      background: #ffebee;
      color: var(--error-color);
    }

    .agency-status .status-badge.active {
      background: #e8f5e8;
      color: var(--success-color);
    }

    .agency-actions {
      display: flex;
      gap: 12px;
      flex-shrink: 0;
    }

    .btn-large {
      padding: 16px 32px;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .agency-main-content {
      padding: 32px 0;
    }

    .content-layout {
      display: grid;
      grid-template-columns: 1fr 350px;
      gap: 32px;
    }

    .main-column {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .quick-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 8px;
    }

    .quick-stats .stat-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px;
      background: var(--white);
      border-radius: 12px;
      box-shadow: var(--shadow-light);
      transition: all 0.3s ease;
    }

    .quick-stats .stat-item:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-medium);
    }

    .quick-stats .stat-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--primary-color);
      color: var(--white);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }

    .quick-stats .stat-info {
      display: flex;
      flex-direction: column;
    }

    .quick-stats .stat-number {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1;
    }

    .quick-stats .stat-label {
      font-size: 0.8rem;
      color: var(--text-secondary);
      margin-top: 2px;
    }

    .card {
      background: var(--white);
      border-radius: 12px;
      box-shadow: var(--shadow-light);
      overflow: hidden;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .section-header h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1.4rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .section-count {
      font-size: 0.9rem;
      color: var(--text-secondary);
      background: var(--light-gray);
      padding: 4px 12px;
      border-radius: 12px;
    }

    .services-section,
    .zones-section {
      padding: 24px;
    }

    .services-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }

    .service-card {
      padding: 20px;
      border: 2px solid var(--medium-gray);
      border-radius: 12px;
      background: var(--light-gray);
      transition: all 0.3s ease;
    }

    .service-card:hover {
      border-color: var(--primary-color);
      transform: translateY(-2px);
    }

    .service-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .service-card h3 {
      font-size: 1.2rem;
      font-weight: 600;
      margin: 0;
      color: var(--text-primary);
    }

    .service-price {
      text-align: right;
    }

    .price-amount {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary-color);
    }

    .price-period {
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .service-description {
      color: var(--text-secondary);
      margin-bottom: 12px;
      line-height: 1.5;
    }

    .service-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
    }

    .service-frequency,
    .service-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8rem;
    }

    .service-frequency {
      color: var(--text-secondary);
    }

    .service-status {
      color: var(--error-color);
    }

    .service-status.active {
      color: var(--success-color);
    }

    .service-actions {
      margin-top: auto;
    }

    .btn-small {
      padding: 8px 16px;
      font-size: 0.9rem;
    }

    .btn-full {
      width: 100%;
    }

    .zones-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
    }

    .zone-card {
      padding: 20px;
      border: 1px solid var(--medium-gray);
      border-radius: 12px;
      background: var(--light-gray);
      transition: all 0.3s ease;
    }

    .zone-card:hover {
      border-color: var(--primary-color);
      transform: translateY(-2px);
    }

    .zone-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .zone-card h4 {
      font-size: 1.1rem;
      font-weight: 600;
      margin: 0;
      color: var(--text-primary);
    }

    .zone-status {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.7rem;
      font-weight: 500;
      text-transform: uppercase;
      background: #ffebee;
      color: var(--error-color);
    }

    .zone-status.active {
      background: #e8f5e8;
      color: var(--success-color);
    }

    .zone-description {
      color: var(--text-secondary);
      margin-bottom: 12px;
      line-height: 1.5;
    }

    .zone-details {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .zone-cities,
    .zone-neighborhoods {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .zone-cities strong,
    .zone-neighborhoods strong {
      font-size: 0.9rem;
      color: var(--text-primary);
    }

    .cities-list,
    .neighborhoods-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .city-tag,
    .neighborhood-tag {
      padding: 4px 8px;
      background: var(--white);
      border: 1px solid var(--medium-gray);
      border-radius: 12px;
      font-size: 0.8rem;
      color: var(--text-primary);
    }

    .sidebar-column {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .card-header {
      padding: 20px 20px 0 20px;
      border-bottom: 1px solid var(--medium-gray);
      margin-bottom: 20px;
    }

    .card-header h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 20px 0;
    }

    .contact-card,
    .location-card,
    .agency-stats-card,
    .similar-agencies-card {
      background: var(--white);
      border-radius: 12px;
      box-shadow: var(--shadow-light);
      overflow: hidden;
    }

    .contact-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 0 20px;
    }

    .contact-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .contact-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--primary-color);
      color: var(--primary-color);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      flex-shrink: 0;
      background: rgba(0, 188, 212, 0.1);
    }

    .contact-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }

    .contact-label {
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--text-secondary);
      text-transform: uppercase;
    }

    .contact-value {
      color: var(--text-primary);
      text-decoration: none;
      line-height: 1.4;
    }

    .contact-value:hover {
      color: var(--primary-color);
    }

    .contact-actions,
    .location-actions {
      padding: 20px;
      border-top: 1px solid var(--medium-gray);
    }

    .map-container {
      padding: 20px;
    }

    .map-placeholder {
      height: 200px;
      background: var(--light-gray);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
    }

    .map-placeholder i {
      font-size: 48px;
      margin-bottom: 12px;
    }

    .stats-content {
      padding: 0 20px 20px 20px;
    }

    .stat-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid var(--medium-gray);
    }

    .stat-row:last-child {
      border-bottom: none;
    }

    .stat-row .stat-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(0, 188, 212, 0.1);
      color: var(--primary-color);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }

    .stat-row .stat-details {
      display: flex;
      flex-direction: column;
    }

    .stat-row .stat-number {
      font-size: 1.2rem;
      font-weight: 600;
      color: var(--text-primary);
      line-height: 1;
    }

    .stat-row .stat-label {
      font-size: 0.8rem;
      color: var(--text-secondary);
      margin-top: 2px;
    }

    .similar-agencies-list {
      padding: 0 20px 20px 20px;
    }

    .similar-agency-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid var(--medium-gray);
    }

    .similar-agency-item:last-child {
      border-bottom: none;
    }

    .similar-agency-info h4 {
      font-size: 1rem;
      font-weight: 600;
      margin: 0 0 4px 0;
      color: var(--text-primary);
    }

    .similar-agency-rating {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .similar-agency-rating .stars {
      display: flex;
      gap: 1px;
    }

    .similar-agency-rating .star {
      font-size: 12px;
      color: #ffc107;
    }

    .similar-agency-rating span {
      font-size: 0.8rem;
      color: var(--text-secondary);
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
      color: var(--text-primary);
    }

    .empty-state p {
      line-height: 1.5;
    }

    @media (max-width: 1200px) {
      .content-layout {
        grid-template-columns: 1fr 300px;
        gap: 24px;
      }

      .quick-stats {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 1024px) {
      .agency-header-content {
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 24px;
      }

      .agency-main-info {
        flex-direction: column;
        align-items: center;
        text-align: center;
      }

      .agency-meta {
        justify-content: center;
      }

      .content-layout {
        grid-template-columns: 1fr;
        gap: 32px;
      }

      .sidebar-column {
        order: -1;
      }

      .services-grid,
      .zones-grid {
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      }
    }

    @media (max-width: 768px) {
      .agency-header-section {
        padding: 24px 0;
      }

      .agency-name {
        font-size: 1.8rem;
      }

      .agency-description {
        font-size: 1rem;
      }

      .agency-actions {
        flex-direction: column;
        width: 100%;
      }

      .btn-large {
        padding: 14px 24px;
        font-size: 1rem;
      }

      .quick-stats {
        grid-template-columns: 1fr;
        gap: 16px;
      }

      .services-grid,
      .zones-grid {
        grid-template-columns: 1fr;
      }

      .service-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }

      .service-price {
        text-align: left;
      }

      .zone-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }

      .cities-list,
      .neighborhoods-list {
        flex-direction: column;
        align-items: flex-start;
      }

      .contact-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }

      .contact-icon {
        align-self: flex-start;
      }

      .similar-agency-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }
    }

    @media (max-width: 480px) {
      .agency-header-section {
        padding: 20px 0;
      }

      .agency-main-content {
        padding: 24px 0;
      }

      .agency-logo {
        width: 80px;
        height: 80px;
      }

      .agency-name {
        font-size: 1.5rem;
      }

      .services-section,
      .zones-section,
      .contact-card,
      .location-card,
      .agency-stats-card,
      .similar-agencies-card {
        margin: 0 -8px;
        border-radius: 8px;
      }

      .card-header,
      .contact-content,
      .contact-actions,
      .location-actions,
      .stats-content,
      .similar-agencies-list {
        padding-left: 16px;
        padding-right: 16px;
      }

      .service-card,
      .zone-card {
        padding: 16px;
      }

      .quick-stats .stat-item {
        padding: 16px;
      }

      .map-placeholder {
        height: 150px;
      }
    }
  `]
})
export class AgencyDetailsComponent implements OnInit {
  agency: Agency | null = null;
  agencyId: string | null = null;
  currentUser: User | null = null;
  constructor(
    private route: ActivatedRoute,
    private agencyService: AgencyService,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
       this.currentUser = this.authService.getCurrentUser();
    this.agencyId = this.route.snapshot.paramMap.get('id');
    if (this.agencyId) {
      this.loadAgencyFromApi(this.agencyId);
    }
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  /**
   * Transforme une agence API en objet compatible avec le template
   */
private mapApiAgency(apiAgency: any): Agency {
  return {
    _id: apiAgency._id || '',
    userId: apiAgency.userId || '',
    firstName: apiAgency.firstName || '',
    lastName: apiAgency.lastName || '',
    agencyName: apiAgency.agencyName || '',
    agencyDescription: apiAgency.agencyDescription || '',
    phone: apiAgency.phone || '',
    address: apiAgency.address || { 
      street: '', 
      arrondissement: '', 
      sector: '', 
      neighborhood: '', 
      city: '', 
      postalCode: '' 
    },
    arrondissement: apiAgency.arrondissement || '',
    secteur: apiAgency.secteur || '',
    quartier: apiAgency.quartier || '',
    licenseNumber: apiAgency.licenseNumber || '',
    members: apiAgency.members || [],
    serviceZones: apiAgency.serviceZones || [],
    services: apiAgency.services || [],
    employees: apiAgency.employees || [],
    schedule: apiAgency.schedule || [],
    collectors: apiAgency.collectors || [],
    clients: apiAgency.clients || [],
    collections: apiAgency.collections || [],
    incidents: apiAgency.incidents || [],
    rating: apiAgency.rating || 0,
    totalClients: apiAgency.totalClients || (apiAgency.clients ? apiAgency.clients.length : 0),
    acceptTerms: apiAgency.acceptTerms || false,
    receiveOffers: apiAgency.receiveOffers || false,
    isActive: apiAgency.isActive !== undefined ? apiAgency.isActive : true,
    createdAt: apiAgency.createdAt || '',
    updatedAt: apiAgency.updatedAt || '',
    __v: apiAgency.__v || 0
  };
}

  /**
   * Charge les détails d'une agence depuis l'API backend
   */
  loadAgencyFromApi(id: string | null): void {
    this.agencyService.getAgencyByIdFromApi(id).subscribe((response: any) => {
      if (response.success && response.data) {
        this.agency = this.mapApiAgency(response.data);
        console.log('[DEBUG] Agency details:', this.agency);
      } else {
        console.error('Erreur lors du chargement de l\'agence');
        // Fallback vers les données mockées si l'API échoue
        this.agencyService.getAgencyById(id).subscribe(agency => {
          this.agency = agency || null;
        });
      }
    });
  }

  getStars(rating: number): number[] {
    return new Array(Math.floor(rating)).fill(0);
  }

  getFrequencyText(frequency: string): string {
    const frequencies: { [key: string]: string } = {
      'daily': 'quotidienne',
      'weekly': 'hebdomadaire',
      'biweekly': 'bi-hebdomadaire',
      'monthly': 'mensuelle'
    };
    return frequencies[frequency] || frequency;
  }

  getYearsInService(): number {
    if (!this.agency) return 0;
    const years = new Date().getFullYear() - new Date(this.agency.createdAt).getFullYear();
    return Math.max(1, years);
  }

  shareAgency(): void {
    if (navigator.share) {
      navigator.share({
        title: this.agency?.agencyName,
        text: this.agency?.agencyDescription,
        url: window.location.href
      });
    } else {
      // Fallback pour les navigateurs qui ne supportent pas l'API Web Share
      navigator.clipboard.writeText(window.location.href);
      this.notificationService.showSuccess('Lien copié', 'Le lien de l\'agence a été copié dans le presse-papiers !');
    }
  }

  subscribeToAgency(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.notificationService.showError('Connexion requise', 'Vous devez être connecté pour vous abonner à une agence');
      return;
    }

    if (!this.agency) {
      this.notificationService.showError('Erreur', 'Agence non trouvée');
      return;
    }

    console.log('[DEBUG] Tentative d\'abonnement:', { userId: currentUser.id, agencyId: this.agency._id });

    this.authService.subscribeToAgency(currentUser.id, this.agency._id).subscribe({
      next: (response) => {
        console.log('[DEBUG] Réponse abonnement:', response);
        
        // Vérifier différentes structures de réponse possibles
        const isSuccess = response.success || response.status === 'success' || response.message?.includes('succès') || response.message?.includes('réussi');
        
        if (isSuccess) {
          this.notificationService.showSuccess('Abonnement réussi', 'Vous êtes maintenant abonné à cette agence !');
        } else {
          const errorMessage = response.message || response.error || 'Erreur inconnue lors de l\'abonnement';
          this.notificationService.showError('Erreur lors de l\'abonnement', errorMessage);
        }
      },
      error: (error) => {
        console.error('[DEBUG] Erreur lors de l\'abonnement:', error);
        const errorMessage = error?.error?.message || error?.message || 'Erreur lors de l\'abonnement. Veuillez réessayer.';
        this.notificationService.showError('Erreur', errorMessage);
      }
    });
  }

  contactAgency(): void {
    // Logique de contact
    if (this.agency?.phone) {
      window.open(`tel:${this.agency.phone}`);
    }
  }

  //Activer ou desactiver une agence 
    activateAgency(id: string) {
    this.agencyService.activateAgency(id).subscribe({
      next: (response: any) => {
        console.log('agency activated  in dashboard', response);
        if (response.message) {
          this.notificationService.showSuccess('Activation', 'Agence activée avec succès');
          this.loadAgencyFromApi(this.agencyId);
        } else {
          this.notificationService.showError('Activation', 'Erreur lors de l\'activation de l\'agence');
        }
      },
      error: (error: any) => {
        console.error('Error activating agency:', error);
        const msg= error?.error?.message || 'Error activating agency';
        this.notificationService.showSuccess('Activation', msg);
      }
    });
  }
  openDirections(): void {
    if (this.agency?.address) {
      const address = `${this.agency.address.doorNumber} ${this.agency.address.street}, ${this.agency.address.city}`;
      const encodedAddress = encodeURIComponent(address);
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
    }
  }
}