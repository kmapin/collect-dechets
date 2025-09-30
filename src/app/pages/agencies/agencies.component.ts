import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AgencyService } from '../../services/agency.service';
import { Agency, Tariff, WasteService } from '../../models/agency.model';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { Arrondissement, Quartier, Sector } from '../../models/countries-org.model';
import { CountriesOrgMockService } from '../../services/countries-org-mock.service';
import { AuthService } from '../../services/auth.service';


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
        <!-- <div class="quick-actions"> -->
            <button *ngIf="currentUser?.subscribedAgencyId" class="btn btn-secondary m-5" routerLink="/agencies/{{ currentUser?.subscribedAgencyId }}">
              <i class="material-icons">business</i>
              Mon agence
            </button>
              
        <!-- </div> -->
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
                placeholder="Rechercher par nom, ville, secteur, quartier..."
                class="search-input">
                    <!-- Ajout de la liste des suggestions -->
            <ul class="suggestions-list" *ngIf="suggestions.length > 0">
              <li *ngFor="let suggestion of suggestions" (click)="applySuggestion(suggestion)">
                {{ suggestion.name }}
              </li>
            </ul>
              </div>
          </div>

          <div class="filters-grid">
              <div class="filter-group">
                <label class="filter-label">Ville</label>
                <select [(ngModel)]="selectedCity" (change)="onCityChange(selectedCity)" class="filter-select">
                  <option value="">Aucune ...</option>
                  <option *ngFor="let city of cities" [value]="city">{{ city }}</option>
                </select>
              </div>
              <div class="filter-group">
                <label class="filter-label">Secteur</label>
                <select [(ngModel)]="selectedSector"
                        (change)="onSecteurChange(selectedSector)"
                        class="filter-select"
                        [disabled]="!selectedCity || !secteurss.length">
                  <option value="">Tous les secteurs</option>
                  <option *ngFor="let secteur of secteurss" [value]="secteur.name">{{ secteur.name }}</option>
                </select>
                <!-- <div *ngIf="!selectedCity"> -->
                  <sub *ngIf="!selectedCity" class="text-small font-small text-[--error-color]">Sélectionnez d'abord une ville.</sub>
                <!-- </div> -->
              </div>
              <div class="filter-group">
                <label class="filter-label">Quartier</label>
                <select [(ngModel)]="selectedNeighborhood"
                        (change)="applyFilters()"
                        class="filter-select"
                        [disabled]="!selectedCity || !quartierss.length">
                  <option value="">Tous les quartiers</option>
                  <option *ngFor="let quartier of quartierss" [value]="quartier.name">{{ quartier.name }}</option>
                </select>
                  <sub *ngIf="!selectedCity" class="text-small font-small text-[--error-color]">Sélectionnez d'abord une ville.</sub>

              </div>
              <!-- <div class="filter-group">
                <label class="filter-label">Note minimum</label>
                <select [(ngModel)]="minRating" (change)="applyFilters()" class="filter-select">
                  <option value="">Toutes</option>
                  <option value="3">3 étoiles et plus</option>
                  <option value="4">4 étoiles et plus</option>
                  <option value="4.5">4.5 étoiles et plus</option>
                </select>
              </div> -->
          </div>
          <div class="filters-actions" style="text-align:right; margin-top:8px;">
            <button class="btn  btn-small text-[--error-color] transition-all duration-200 transform hover:scale-105 shadow-xl hover:shadow-xl  gap-2 font-medium text-sm" (click)="clearFilters()" title="Réinitialiser les filtres">
              <i class="material-icons">restart_alt</i>
                            <i class="fas fa-undo-alt group-hover:rotate-180 transition-transform duration-300"></i>
               Réinitialiser
            </button>
          </div>
          <!-- <div class="flex justify-center lg:justify-end">
                        <button
                            class="group px-4 py-2.5 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2 font-medium text-sm"
                            (click)="clearFilters()" title="Réinitialiser tous les filtres">
                            <i class="fas fa-undo-alt group-hover:rotate-180 transition-transform duration-300"></i>
                            Réinitialiser
                        </button>
                    </div> -->

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
            <!-- <button 
              class="view-btn" 
              [class.active]="viewMode === 'map'"
              (click)="viewMode = 'map'">
              <i class="material-icons">map</i>
              Carte
            </button> -->
          </div>
        </div>

        <!-- Résultats -->
        <div class="results-header">
          <h2>{{ filteredAgencies.length }} agence(s) trouvée(s)</h2>
          <!-- <div class="sort-options">
            <label>Trier par:</label>
            <select [(ngModel)]="sortBy" (change)="sortAgencies()" class="sort-select">
              <option value="name">Nom</option>
              <option value="rating">Note</option>
              <option value="price">Prix</option>
              <option value="clients">Nombre de clients</option>
            </select>
          </div> -->
        </div>

        <div class="container">
          <!-- Vue grille -->
          <div *ngIf="viewMode === 'grid'" class="agencies-grid">
            <div *ngFor="let agency of filteredAgencies" class="agency-card card">
              <div class="agency-header">
                <div class="agency-logo">
                  <img [src]="'https://images.pexels.com/photos/3735218/pexels-photo-3735218.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop'" [alt]="agency.agencyName">
                </div>
                <!-- <div class="agency-badge" *ngIf="agency && agency.randomStars >= 1">
                  <i class="material-icons">star</i>
                  Top Rated
                </div> -->
              </div>
  
              
              <div class="agency-content">
                <h3 class="agency-name">{{ agency.agencyName }}</h3>
                <p class="agency-description truncate">{{ agency.agencyDescription }}</p>
                
                <div class="stars agency-ratingTop  text-white bg-primary-200 border border-primary-300 text-primary-800 rounded-full" >
                  <i *ngFor="let star of getStars(agency.rating, agency.randomStars)" class="material-icons star">star</i>
                </div>
                <div *ngIf="currentUser?.subscribedAgencyId == agency._id" class="agency-rating text-white bg-success-200 border border-success-300 text-success-800 rounded-full">
                  <!-- <span class="rating-text">{{ agency.randomStars }}/5 ({{ agency.totalClients }} avis)</span> -->
                   <div class="stars">
                    <i  class="material-icons star">star</i>
                  </div>
                  <span class="text-white rating-text">Déjà abonné(e)</span>
                </div>

                <div class="agency-info">
                  <div class="info-item">
                    <i class="material-icons">location_on</i>
                    <span>{{ agency.address.city || '-' }}, {{ agency.address.sector || '-' }}, {{ agency.address.neighborhood || '-' }}</span>
                  </div>
                  <div class="info-item">
                    <i class="material-icons">people</i>
                    <span>{{ agency.totalClients || 0 }} clients</span>
                  </div>
                  <!-- <div class="info-item">
                    <i class="material-icons">build</i>
                    <span>{{ agency.services.length || 0 }} services</span>
                  </div> -->
                </div>

                <!-- <div class="services-preview">
                  <h4>Services principaux</h4>
                  <div class="services-tags">
                    <span *ngFor="let service of (agency.services || []).slice(0, 3)" class="service-tag">
                      {{ service.name }} - {{ service.price }}€
                    </span>
                    <span *ngIf="(agency.services || []).length > 3" class="service-tag more">
                      +{{ (agency.services || []).length - 3 }} autres
                    </span>
                  </div>
                </div> -->
              </div>

              <div class="agency-actions">
                <button class="btn btn-secondary" [routerLink]="['/agencies', agency._id]">
                  <i class="material-icons">info</i>
                  Voir détails
                </button>
                <!-- <button class="btn btn-primary" (click)="subscribeToAgency(agency._id)">
                  <i class="material-icons">add</i>
                  S'abonner
                </button> -->
              </div>
            </div>
          </div>

          <!-- Vue liste -->
          <div *ngIf="viewMode === 'list'" class="agencies-list">
            <div *ngFor="let agency of filteredAgencies" class="agency-list-item card">
              <div class="agency-list-content">
                <div class="agency-list-header">
                  <div class="agency-logo-small">
                    <img src="https://images.pexels.com/photos/3735218/pexels-photo-3735218.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop" [alt]="agency.agencyName">
                  </div>
                  <div class="agency-list-info">
                    <h3 class="agency-name text-[--primary-color]">{{ agency.agencyName }}</h3>
                    <!-- <div class="agency-rating">
                      <div class="stars">
                        <i *ngFor="let star of getStars(agency.rating)" class="material-icons star">star</i>
                      </div>
                      <span class="rating-text">{{ agency.rating }}/5</span>
                    </div> -->
                    <div class="stars agency-ratingTop  text-white bg-primary-200 border border-primary-300 text-primary-800 rounded-full" >
                      <i *ngFor="let star of getStars(agency.rating, agency.randomStars)" class="material-icons star">star</i>
                    </div>
                    <div *ngIf="currentUser?.subscribedAgencyId == agency._id" class="agency-rating text-white bg-success-200 border border-success-300 text-success-800 rounded-full">
                      
                      <div class="stars">
                        <i  class="material-icons star">star</i>
                      </div>
                      <span class="text-white rating-text">Déjà abonné(e)</span>
                    </div>
                  </div>
                  <!-- <div class="agency-list-price">
                    <span class="price-from">À partir de</span>
                    <span class="price-value">{{ getMinPrice(agency) }}€</span>
                  </div> -->
                </div>
                
                <p class="agency-description truncate">{{ agency.agencyDescription }}</p>
                
                <div class="agency-list-details">
                  <div class="detail-item">
                    <i class="material-icons">location_on</i>
                    <span>{{ agency.address.city || '-' }}, {{ agency.address.sector || '-' }}, {{ agency.address.neighborhood || '-' }}</span>
                  </div>
                  <div class="detail-item">
                    <i class="material-icons">people</i>
                    <span>{{ agency.totalClients || 0 }} clients</span>
                  </div>
                  <!-- <div class="detail-item">
                    <i class="material-icons">schedule</i>
                    <span>Collecte {{ getFrequencyText(agency) }}</span>
                  </div> -->
                </div>
              </div>

              <div class="agency-list-actions">
                
                <button class="btn btn-secondary" [routerLink]="['/agencies', agency._id]">
                  <i class="material-icons">info</i>
                  Voir détails
                </button>
                <!-- <button class="btn btn-primary" (click)="subscribeToAgency(agency._id)">
                  S'abonner
                </button> -->
              </div>
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
                <h4>{{ agency.agencyName }}</h4>
                <p>{{ agency.address.city || '-' }}</p>
                <div class="agency-rating">
                  <div class="stars">
                    <i *ngFor="let star of getStars(agency.rating || 0)" class="material-icons star">star</i>
                  </div>
                  <span>{{ agency.rating || 0 }}/5</span>
                </div>
                <button class="btn btn-primary btn-small" [routerLink]="['/agencies', agency._id]">
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
    .suggestions-list {
  position: absolute;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
}

.suggestions-list li {
  padding: 8px;
  cursor: pointer;
}

.suggestions-list li:hover {
  background: #f0f0f0;
}

    .filters-section {
      margin-bottom: 32px;
      margin-top: 32px;
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
      background: white;
      border-radius: 20px;
      padding: 28px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
      border: 2px solid transparent;
      transition: all 0.4s ease;
      position: relative;
      overflow: hidden;
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
      color: var(--primary-color);
    }

    .agency-description {
      color: var(--text-secondary);
      margin-bottom: 16px;
      line-height: 1.5;
    }

    .agency-rating {
      display: flex;
      align-items: center;
      /* text-color: white; */
      gap: 8px;
      background: var(--primary-color);
      position: absolute;
      top: 16px;
      right: 16px;
      padding: 4px 12px;
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
      color: var(--text-white);
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
      position: absolute;
      z-index: 1;
      bottom: 10px;
      right: 30px;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    .agencies-list {
      position: relative;
      overflow: hidden;
      padding: 28px;
      border: 2px solid transparent;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
      transition: all 0.4s ease;
      border-radius: 20px;

      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .agency-list-item {
      position: relative;
      /* overflow: hidden;
      padding: 28px;
      border: 2px solid transparent;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
      transition: all 0.4s ease; */
      /* border-radius: 20px; */
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
      position: absolute;
      z-index: 1;
      bottom: 20px;
      right: 30px;
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
  agencyTariffs: WasteService[] = [];
  cities: string[] = ['Ouagadougou', 'Bobo-Dioulasso'];
  suggestions: any[] = [];
  randomStarsList: number[] = [];

// cities: string[] = [...];
//sectors: string[] = [...]; // à remplir
//neighborhoods: string[] = [...]; // à remplir

// cities: City[] = [];
arrondissementss: Arrondissement[] = [];
secteurss: Sector[] = [];
quartierss: Quartier[] = [];

// selectedCity: string = '';
selectedArrondissement: string = '';
selectedSector: string = '';
selectedNeighborhood: string = '';
// minRating: string = '';

onCityChange(city: string) {
  const cityObj = this.cities.find(c => c === city);
  // this.arrondissementss = cityObj ? this.countriesOrgMockService.getArrondissementsByCityLabel(cityObj) : [];
  this.selectedArrondissement = '';
  this.secteurss = [];
  this.selectedSector = '';
  this.quartierss = [];
  this.selectedNeighborhood = '';
  this.getCitiesContent(city);
  this.applyFilters();
}

onArrondissementChange(arrondissement: string) {
  const arrObj = this.arrondissementss.find(a => a.name === arrondissement);
  // this.secteurss = arrObj ? this.countriesOrgMockService.getSectorsByArrondissement(arrObj.id) : [];
  this.selectedSector = '';
  this.quartierss = [];
  this.selectedNeighborhood = '';
  // this.applyFilters();
}

onSecteurChange(secteur: string) {
  const secteurObj = this.secteurss.find(s => s.name === secteur);
  // this.quartierss = secteurObj ? this.countriesOrgMockService.getNeighborhoodsBySector(secteurObj.id) : [];
  this.selectedNeighborhood = '';
  this.applyFilters();
}

// selectedCity: string = '';
// selectedSector: string = '';
// selectedNeighborhood: string = '';
// minRating: string = '';
// searchQuery: string = '';
currentUser!: any ;

 private searchSubject = new Subject<string>();
  constructor(
    private agencyService: AgencyService,
        private authService: AuthService,
    
    private router: Router,
    private route: ActivatedRoute,
    private countriesOrgMockService: CountriesOrgMockService
    
  ) { }

  ngOnInit(): void {

    this.getUser();
   
    this.loadAgenciesFromApi();
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged() 
    ).subscribe((query) => {
      this.fetchSuggestions(query);
    })
     const id = this.route.snapshot.paramMap.get('id'); 
    console.log('ID récupéré :', id);

    // this.getCitiesContent(this.selectedCity);

  }

  getUser(){
   this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      
    });
    console.log("Current User", this.currentUser); 
  }

  getCitiesContent(ville: string){
    this.arrondissementss = this.countriesOrgMockService.getAllArrondissementsByVille(ville);  
    this.secteurss = this.countriesOrgMockService.getAllSectorsByVille(ville);
    this.quartierss = this.countriesOrgMockService.getAllNeighborhoodsByVille(ville);
  }

  loadAgencies(): void {
    this.agencyService.getAgencies().subscribe(agencies => {
      this.agencies = agencies;
      this.filteredAgencies = agencies;
      console.log("Agences chargées :", agencies);
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
      randomStars: Math.floor(Math.random() * 5) + 1,
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
   * Charge les agences depuis l'API backend et remplace les données locales
   */
  loadAgenciesFromApi(): void {
    this.agencyService.getAllAgenciesFromApi().subscribe((response: any) => {
      this.agencies = (response.data || []).map((a: any) => this.mapApiAgency(a));
      this.filteredAgencies = this.agencies;
      console.log("Agences chargées :", this.filteredAgencies);
      this.generateRandomStarsList()
      this.applyFilters();
    });
  }

  onSearch(): void {
    this.applyFilters();
  }

 // ...existing code...

applyFilters(): void {
  const payload: any = {
    term: this.searchQuery || '',
    city: this.selectedCity,
    arrondissement: this.selectedArrondissement,
    sector: this.selectedSector,
    neighborhood: this.selectedNeighborhood,
    rating: this.minRating ? parseFloat(this.minRating) : null
    // maxPrice: this.maxPrice ? parseFloat(this.maxPrice) : null
  };

  this.agencyService.searchAgencie(payload).subscribe({
    next: (response: any) => {
      this.filteredAgencies = (response.results || []).map((a: any) => this.mapApiAgency(a));
      console.log("Agences filtrées :", this.filteredAgencies);
      this.generateRandomStarsList();
      this.sortAgencies();
    },
    error: (err) => {
      console.error('Erreur lors de la recherche des agences :', err);
      this.filteredAgencies = [];
    }
  });
}



// ...existing code...

  sortAgencies(): void {
    this.filteredAgencies.sort((a, b) => {
      switch (this.sortBy) {
        case 'name':
          return a.agencyName.localeCompare(b.agencyName);
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

  // getStars(rating: number, randomStars?: number): number[] {
  //   console.log("Rating:", rating+1, "Random Stars:", randomStars);
  //   const stars = randomStars !== undefined ? randomStars : Math.floor(rating);
  //   return stars > 0 ? Array(stars).fill(0) : [];
  // }
  generateRandomStarsList(): void {
    this.randomStarsList = Array.from({ length: this.filteredAgencies.length }, () =>
      Math.floor(Math.random() * 5) + 1
    );
  }
  getStars(rating: number, randomStars?: number): number[]
   {
    console.log("Rating:", rating+1, "Random Stars:", randomStars);
    const stars = randomStars !== undefined ? randomStars : Math.floor(rating);
    return stars > 0 ? Array(stars).fill(0) : [];
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

  // recuperation des tarif a partir du web service
  // loadTariffsForAgency(): void {
  //   const userString = localStorage.getItem('currentUser');
  //   if (userString) {
  //     const currentUser = JSON.parse(userString);


  //     this.agencyService.getAgencyTariffs().subscribe({
  //       next: (tariffs) => {
  //         this.agencyTariffs = tariffs;
  //         console.log('Tarifs récupérés :', tariffs);
  //       },
  //       error: (err) => {
  //         console.error("Erreur lors du chargement des tarifs de l'agence", err);
  //       }
  //     });
  //   } else {
  //     console.error("Aucun utilisateur trouvé dans le stockage local.");
  //   }
  // }
//recuperation des suggestions venqnt de la base de donnese pour l utilisateur connecté
  onSearchInput(): void {
    this.searchSubject.next(this.searchQuery); // Émet la valeur saisie
  }
private fetchSuggestions(query: string): void {
    if (query.length > 2) {
      this.agencyService.getSuggestions(query).subscribe({
        next: (response) => {
          console.log('Suggestions reçues :', response);
          this.suggestions = response || [];
        },
        error: (err) => {
          console.error('Erreur lors de la récupération des suggestions :', err);
        }
      });
    } else {
      this.suggestions = [];
    }
  }

//application des suggestion
applySuggestion(suggestion: any): void {
  this.searchQuery = suggestion.name;
  this.suggestions = [];
  this.applyFilters();
}
// recuperations des tarifs liee a une agences
tariffs: Tariff[] = [];
  isLoading: boolean = false;
 loadTariffs(): void {
  this.isLoading = true;
  const agencyId = this.route.snapshot.paramMap.get('id'); 
  if (!agencyId) {
    console.error('[DEBUG] Aucun agencyId trouvé pour l’utilisateur courant');
    this.isLoading = false;
    return;
  }

  this.agencyService.getAgencyAllTarifs$(agencyId).subscribe({
    next: (data: Tariff[]) => {
      this.tariffs = data;
      console.log('Tarifs récupérés :', this.tariffs);
      this.isLoading = false;
    },
    error: (error) => {
      console.error('[DEBUG] Erreur lors du chargement des tarifs :', error);
      this.isLoading = false;
    }
  });
}
 
}