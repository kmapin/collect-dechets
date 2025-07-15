import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AgencyService } from '../../services/agency.service';
import { Agency } from '../../models/agency.model';

@Component({
  selector: 'app-agencies',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="agencies-page">
      <div class="page-header">
        <div class="container">
          <h1 class="page-title">Agences de Collecte</h1>
          <p class="page-subtitle">
            Découvrez toutes les agences de collecte de déchets disponibles dans votre région. 
            Comparez leurs services, zones de couverture et tarifs pour choisir celle qui vous convient le mieux.
          </p>
        </div>
      </div>

      <div class="container">
        <!-- Filtres et recherche -->
        <div class="filters-section card">
          <div class="search-bar">
            <div class="search-input-group">
              <i class="material-icons search-icon">search</i>
              <input 
                type="text" 
                [(ngModel)]="searchQuery"
                (input)="onSearch()"
                placeholder="Rechercher par nom, ville, quartier..."
                class="search-input">
            </div>
          </div>

          <div class="filters-grid">
            <div class="filter-group">
              <label class="filter-label">Ville</label>
              <select [(ngModel)]="selectedCity" (change)="applyFilters()" class="filter-select">
                <option value="">Toutes les villes</option>
                <option *ngFor="let city of cities" [value]="city">{{ city }}</option>
              </select>
            </div>

            <div class="filter-group">
              <label class="filter-label">Services</label>
              <select [(ngModel)]="selectedService" (change)="applyFilters()" class="filter-select">
                <option value="">Tous les services</option>
                <option value="standard">Collecte Standard</option>
                <option value="premium">Collecte Premium</option>
                <option value="recyclage">Recyclage</option>
                <option value="organique">Déchets Organiques</option>
              </select>
            </div>

            <div class="filter-group">
              <label class="filter-label">Prix maximum</label>
              <select [(ngModel)]="maxPrice" (change)="applyFilters()" class="filter-select">
                <option value="">Tous les prix</option>
                <option value="30">Jusqu'à 30€</option>
                <option value="50">Jusqu'à 50€</option>
                <option value="100">Jusqu'à 100€</option>
              </select>
            </div>

            <div class="filter-group">
              <label class="filter-label">Note minimum</label>
              <select [(ngModel)]="minRating" (change)="applyFilters()" class="filter-select">
                <option value="">Toutes les notes</option>
                <option value="3">3 étoiles et plus</option>
                <option value="4">4 étoiles et plus</option>
                <option value="4.5">4.5 étoiles et plus</option>
              </select>
            </div>
          </div>

          <div class="view-toggle">
            <button 
              class="view-btn" 
              [class.active]="viewMode === 'grid'"
              (click)="viewMode = 'grid'">
              <i class="material-icons">grid_view</i>
              Grille
            </button>
            <button 
              class="view-btn" 
              [class.active]="viewMode === 'list'"
              (click)="viewMode = 'list'">
              <i class="material-icons">view_list</i>
              Liste
            </button>
            <button 
              class="view-btn" 
              [class.active]="viewMode === 'map'"
              (click)="viewMode = 'map'">
              <i class="material-icons">map</i>
              Carte
            </button>
          </div>
        </div>

        <!-- Résultats -->
        <div class="results-header">
          <h2>{{ filteredAgencies.length }} agence(s) trouvée(s)</h2>
          <div class="sort-options">
            <label>Trier par:</label>
            <select [(ngModel)]="sortBy" (change)="sortAgencies()" class="sort-select">
              <option value="name">Nom</option>
              <option value="rating">Note</option>
              <option value="price">Prix</option>
              <option value="clients">Nombre de clients</option>
            </select>
          </div>
        </div>

        <!-- Vue grille -->
        <div *ngIf="viewMode === 'grid'" class="agencies-grid">
          <div *ngFor="let agency of filteredAgencies" class="agency-card card">
            <div class="agency-header">
              <div class="agency-logo">
                <img [src]="agency.logo || 'https://images.pexels.com/photos/3735218/pexels-photo-3735218.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop'" [alt]="agency.name">
              </div>
              <div class="agency-badge" *ngIf="agency.rating >= 4.5">
                <i class="material-icons">star</i>
                Top Rated
              </div>
            </div>

            <div class="agency-content">
              <h3 class="agency-name">{{ agency.name }}</h3>
              <p class="agency-description">{{ agency.description }}</p>
              
              <div class="agency-rating">
                <div class="stars">
                  <i *ngFor="let star of getStars(agency.rating)" class="material-icons star">star</i>
                </div>
                <span class="rating-text">{{ agency.rating }}/5 ({{ agency.totalClients }} avis)</span>
              </div>

              <div class="agency-info">
                <div class="info-item">
                  <i class="material-icons">location_on</i>
                  <span>{{ agency.address.city }}, {{ agency.address.neighborhood }}</span>
                </div>
                <div class="info-item">
                  <i class="material-icons">people</i>
                  <span>{{ agency.totalClients }} clients</span>
                </div>
                <div class="info-item">
                  <i class="material-icons">build</i>
                  <span>{{ agency.services.length }} services</span>
                </div>
              </div>

              <div class="services-preview">
                <h4>Services principaux</h4>
                <div class="services-tags">
                  <span *ngFor="let service of agency.services.slice(0, 3)" class="service-tag">
                    {{ service.name }} - {{ service.price }}€
                  </span>
                  <span *ngIf="agency.services.length > 3" class="service-tag more">
                    +{{ agency.services.length - 3 }} autres
                  </span>
                </div>
              </div>
            </div>

            <div class="agency-actions">
              <button class="btn btn-secondary" [routerLink]="['/agencies', agency.id]">
                <i class="material-icons">info</i>
                Voir détails
              </button>
              <button class="btn btn-primary" (click)="subscribeToAgency(agency.id)">
                <i class="material-icons">add</i>
                S'abonner
              </button>
            </div>
          </div>
        </div>

        <!-- Vue liste -->
        <div *ngIf="viewMode === 'list'" class="agencies-list">
          <div *ngFor="let agency of filteredAgencies" class="agency-list-item card">
            <div class="agency-list-content">
              <div class="agency-list-header">
                <div class="agency-logo-small">
                  <img [src]="agency.logo || 'https://images.pexels.com/photos/3735218/pexels-photo-3735218.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop'" [alt]="agency.name">
                </div>
                <div class="agency-list-info">
                  <h3 class="agency-name">{{ agency.name }}</h3>
                  <div class="agency-rating">
                    <div class="stars">
                      <i *ngFor="let star of getStars(agency.rating)" class="material-icons star">star</i>
                    </div>
                    <span class="rating-text">{{ agency.rating }}/5</span>
                  </div>
                </div>
                <div class="agency-list-price">
                  <span class="price-from">À partir de</span>
                  <span class="price-value">{{ getMinPrice(agency) }}€</span>
                </div>
              </div>
              
              <p class="agency-description">{{ agency.description }}</p>
              
              <div class="agency-list-details">
                <div class="detail-item">
                  <i class="material-icons">location_on</i>
                  <span>{{ agency.address.city }}, {{ agency.address.neighborhood }}</span>
                </div>
                <div class="detail-item">
                  <i class="material-icons">people</i>
                  <span>{{ agency.totalClients }} clients</span>
                </div>
                <div class="detail-item">
                  <i class="material-icons">schedule</i>
                  <span>Collecte {{ getFrequencyText(agency) }}</span>
                </div>
              </div>
            </div>

            <div class="agency-list-actions">
              <button class="btn btn-secondary" [routerLink]="['/agencies', agency.id]">
                Voir détails
              </button>
              <button class="btn btn-primary" (click)="subscribeToAgency(agency.id)">
                S'abonner
              </button>
            </div>
          </div>
        </div>

        <!-- Vue carte -->
        <div *ngIf="viewMode === 'map'" class="map-view">
          <div class="map-container">
            <div class="map-placeholder">
              <i class="material-icons">map</i>
              <p>Carte interactive des agences</p>
              <small>Intégration Google Maps à venir</small>
            </div>
          </div>
          <div class="map-sidebar">
            <h3>Agences sur la carte</h3>
            <div class="map-agency-list">
              <div *ngFor="let agency of filteredAgencies" class="map-agency-item">
                <h4>{{ agency.name }}</h4>
                <p>{{ agency.address.city }}</p>
                <div class="agency-rating">
                  <div class="stars">
                    <i *ngFor="let star of getStars(agency.rating)" class="material-icons star">star</i>
                  </div>
                  <span>{{ agency.rating }}/5</span>
                </div>
                <button class="btn btn-primary btn-small" [routerLink]="['/agencies', agency.id]">
                  Voir
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Message si aucun résultat -->
        <div *ngIf="filteredAgencies.length === 0" class="no-results">
          <div class="no-results-content">
            <i class="material-icons">search_off</i>
            <h3>Aucune agence trouvée</h3>
            <p>Essayez de modifier vos critères de recherche ou de supprimer certains filtres.</p>
            <button class="btn btn-primary" (click)="clearFilters()">
              Effacer les filtres
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .agencies-page {
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

    .filters-section {
      margin-bottom: 32px;
      padding: 24px;
      width: 100%;
    }

    .search-bar {
      margin-bottom: 24px;
    }

    .search-input-group {
      position: relative;
      max-width: 500px;
    }

    .search-icon {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-secondary);
    }

    .search-input {
      width: 100%;
      padding: 16px 16px 16px 48px;
      border: 2px solid var(--medium-gray);
      border-radius: 12px;
      font-size: 1rem;
      transition: all 0.3s ease;
    }

    .search-input:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(0, 188, 212, 0.1);
    }

    .filters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .filter-label {
      font-weight: 500;
      color: var(--text-primary);
      font-size: 0.9rem;
    }

    .filter-select {
      padding: 12px 16px;
      border: 2px solid var(--medium-gray);
      border-radius: 8px;
      font-family: 'Inter', sans-serif;
      transition: border-color 0.3s ease;
    }

    .filter-select:focus {
      outline: none;
      border-color: var(--primary-color);
    }

    .view-toggle {
      display: flex;
      gap: 8px;
      justify-content: center;
    }

    .view-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      background: var(--white);
      border: 2px solid var(--medium-gray);
      border-radius: 8px;
      color: var(--text-primary);
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .view-btn:hover {
      border-color: var(--primary-color);
      color: var(--primary-color);
    }

    .view-btn.active {
      background: var(--primary-color);
      border-color: var(--primary-color);
      color: var(--white);
    }

    .results-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding: 0 8px;
    }

    .results-header h2 {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .sort-options {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .sort-options label {
      font-weight: 500;
      color: var(--text-secondary);
    }

    .sort-select {
      padding: 8px 12px;
      border: 2px solid var(--medium-gray);
      border-radius: 6px;
      font-family: 'Inter', sans-serif;
    }

    .agencies-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 24px;
    }

    .agency-card {
      padding: 24px;
      transition: all 0.3s ease;
      border: 2px solid transparent;
    }

    .agency-card:hover {
      border-color: var(--primary-color);
      transform: translateY(-4px);
    }

    .agency-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .agency-logo {
      width: 60px;
      height: 60px;
      border-radius: 12px;
      overflow: hidden;
    }

    .agency-logo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .agency-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: var(--warning-color);
      color: var(--text-primary);
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .agency-content {
      margin-bottom: 20px;
    }

    .agency-name {
      font-size: 1.3rem;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--text-primary);
    }

    .agency-description {
      color: var(--text-secondary);
      margin-bottom: 16px;
      line-height: 1.5;
    }

    .agency-rating {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }

    .stars {
      display: flex;
      gap: 2px;
    }

    .star {
      font-size: 16px;
      color: var(--warning-color);
    }

    .rating-text {
      font-size: 0.9rem;
      color: var(--text-secondary);
    }

    .agency-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .info-item i {
      font-size: 18px;
    }

    .services-preview h4 {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--text-primary);
    }

    .services-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .service-tag {
      padding: 4px 8px;
      background: var(--light-gray);
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--text-primary);
    }

    .service-tag.more {
      background: var(--primary-color);
      color: var(--white);
    }

    .agency-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    .agencies-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .agency-list-item {
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .agency-list-content {
      flex: 1;
    }

    .agency-list-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 12px;
    }

    .agency-logo-small {
      width: 50px;
      height: 50px;
      border-radius: 8px;
      overflow: hidden;
    }

    .agency-logo-small img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .agency-list-info {
      flex: 1;
    }

    .agency-list-price {
      text-align: right;
    }

    .price-from {
      display: block;
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .price-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary-color);
    }

    .agency-list-details {
      display: flex;
      gap: 24px;
      margin-top: 12px;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .agency-list-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-left: 20px;
    }

    .map-view {
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: 24px;
      height: 600px;
    }

    .map-container {
      background: var(--white);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: var(--shadow-light);
    }

    .map-placeholder {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
    }

    .map-placeholder i {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .map-sidebar {
      background: var(--white);
      border-radius: 12px;
      padding: 20px;
      box-shadow: var(--shadow-light);
      overflow-y: auto;
    }

    .map-sidebar h3 {
      margin-bottom: 16px;
      color: var(--text-primary);
    }

    .map-agency-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .map-agency-item {
      padding: 12px;
      border: 1px solid var(--medium-gray);
      border-radius: 8px;
    }

    .map-agency-item h4 {
      font-size: 1rem;
      margin-bottom: 4px;
      color: var(--text-primary);
    }

    .map-agency-item p {
      color: var(--text-secondary);
      font-size: 0.9rem;
      margin-bottom: 8px;
    }

    .btn-small {
      padding: 6px 12px;
      font-size: 0.8rem;
    }

    .no-results {
      text-align: center;
      padding: 60px 20px;
    }

    .no-results-content {
      max-width: 400px;
      margin: 0 auto;
    }

    .no-results i {
      font-size: 64px;
      color: var(--text-secondary);
      margin-bottom: 20px;
    }

    .no-results h3 {
      font-size: 1.5rem;
      margin-bottom: 12px;
      color: var(--text-primary);
    }

    .no-results p {
      color: var(--text-secondary);
      margin-bottom: 24px;
      line-height: 1.6;
    }

    @media (max-width: 1024px) {
      .map-view {
        grid-template-columns: 1fr;
        height: auto;
      }

      .map-container {
        height: 400px;
      }
    }

    @media (max-width: 768px) {
      .agencies-grid {
        grid-template-columns: 1fr;
      }

      .filters-grid {
        grid-template-columns: 1fr;
      }

      .results-header {
        flex-direction: column;
        gap: 16px;
        align-items: flex-start;
      }

      .agency-list-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .agency-list-actions {
        flex-direction: row;
        margin-left: 0;
        width: 100%;
      }

      .agency-list-header {
        flex-wrap: wrap;
      }

      .agency-list-details {
        flex-direction: column;
        gap: 8px;
      }
    }
  `]
})
export class AgenciesComponent implements OnInit {
  agencies: Agency[] = [];
  filteredAgencies: Agency[] = [];
  searchQuery = '';
  selectedCity = '';
  selectedService = '';
  maxPrice = '';
  minRating = '';
  sortBy = 'name';
  viewMode: 'grid' | 'list' | 'map' = 'grid';
  
  cities: string[] = ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier'];

  constructor(
    private agencyService: AgencyService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAgencies();
  }

  loadAgencies(): void {
    this.agencyService.getAgencies().subscribe(agencies => {
      this.agencies = agencies;
      this.filteredAgencies = agencies;
    });
  }

  onSearch(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredAgencies = this.agencies.filter(agency => {
      const matchesSearch = !this.searchQuery || 
        agency.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        agency.address.city.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        agency.address.neighborhood.toLowerCase().includes(this.searchQuery.toLowerCase());

      const matchesCity = !this.selectedCity || agency.address.city === this.selectedCity;
      
      const matchesService = !this.selectedService || 
        agency.services.some(service => service.name.toLowerCase().includes(this.selectedService));

      const matchesPrice = !this.maxPrice || 
        agency.services.some(service => service.price <= parseFloat(this.maxPrice));

      const matchesRating = !this.minRating || agency.rating >= parseFloat(this.minRating);

      return matchesSearch && matchesCity && matchesService && matchesPrice && matchesRating;
    });

    this.sortAgencies();
  }

  sortAgencies(): void {
    this.filteredAgencies.sort((a, b) => {
      switch (this.sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'rating':
          return b.rating - a.rating;
        case 'price':
          return this.getMinPrice(a) - this.getMinPrice(b);
        case 'clients':
          return b.totalClients - a.totalClients;
        default:
          return 0;
      }
    });
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedCity = '';
    this.selectedService = '';
    this.maxPrice = '';
    this.minRating = '';
    this.applyFilters();
  }

  getStars(rating: number): number[] {
    return new Array(Math.floor(rating)).fill(0);
  }

  getMinPrice(agency: Agency): number {
    return Math.min(...agency.services.map(service => service.price));
  }

  getFrequencyText(agency: Agency): string {
    const frequencies = agency.services.map(s => s.frequency);
    if (frequencies.includes('weekly' as any)) return 'hebdomadaire';
    if (frequencies.includes('biweekly' as any)) return 'bi-hebdomadaire';
    if (frequencies.includes('monthly' as any)) return 'mensuelle';
    return 'régulière';
  }

  subscribeToAgency(agencyId: string): void {
    this.router.navigate(['/agencies', agencyId]);
  }
}