import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AgencyService } from '../../services/agency.service';
import { Agency } from '../../models/agency.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="home-page">
      <!-- Hero Section Moderne -->
      <section class="hero-section">
        <div class="hero-background">
          <div class="floating-particles">
            <div class="particle" *ngFor="let i of [1,2,3,4,5,6,7,8]"></div>
          </div>
        </div>
        
        <div class="container">
          <div class="hero-content">
            <!-- Hero Principal -->
            <div class="hero-main">
              <div class="hero-badge">
                <i class="material-icons">eco</i>
                <span>Solution #1 au Burkina Faso</span>
                <div class="badge-glow"></div>
              </div>
              
              <h1 class="hero-title">
                Révolutionnez votre 
                <span class="highlight">gestion des déchets</span>
                <span class="title-decoration">✨</span>
              </h1>
              
              <p class="hero-description">
                Découvrez la première plateforme qui connecte intelligemment particuliers, 
                entreprises et agences de collecte pour une gestion des déchets simple, 
                écologique et efficace.
              </p>

              <div class="hero-cta">
                <a routerLink="/register" class="btn btn-primary btn-hero">
                  <i class="material-icons">rocket_launch</i>
                  <span>Commencer gratuitement</span>
                  <div class="btn-shine"></div>
                </a>
                <button class="btn btn-secondary btn-hero" (click)="playDemo()">
                  <i class="material-icons">play_circle</i>
                  <span>Voir la démo</span>
                </button>
              </div>

              <div class="hero-trust">
                <div class="trust-item">
                  <div class="trust-number">150+</div>
                  <div class="trust-label">Agences partenaires</div>
                </div>
                <div class="trust-item">
                  <div class="trust-number">50K+</div>
                  <div class="trust-label">Utilisateurs actifs</div>
                </div>
                <div class="trust-item">
                  <div class="trust-number">95%</div>
                  <div class="trust-label">Satisfaction client</div>
                </div>
              </div>
            </div>

            <!-- Hero Visual -->
            <div class="hero-visual">
              <div class="hero-dashboard">
                <div class="dashboard-header">
                  <div class="dashboard-nav">
                    <div class="nav-dot active"></div>
                    <div class="nav-dot"></div>
                    <div class="nav-dot"></div>
                  </div>
                  <div class="dashboard-title">Tableau de bord</div>
                </div>
                
                <div class="dashboard-content">
                  <div class="dashboard-card success">
                    <div class="card-icon">
                      <i class="material-icons">check_circle</i>
                    </div>
                    <div class="card-info">
                      <div class="card-title">Collecte réalisée</div>
                      <div class="card-subtitle">Aujourd'hui à 9h30</div>
                    </div>
                    <div class="card-pulse"></div>
                  </div>
                  
                  <div class="dashboard-card pending">
                    <div class="card-icon">
                      <i class="material-icons">schedule</i>
                    </div>
                    <div class="card-info">
                      <div class="card-title">Prochaine collecte</div>
                      <div class="card-subtitle">Demain à 8h00</div>
                    </div>
                  </div>
                  
                  <div class="dashboard-stats">
                    <div class="stat-header">
                      <span>Tri correct ce mois</span>
                      <span class="stat-percentage">85%</span>
                    </div>
                    <div class="stat-bar">
                      <div class="stat-fill" style="width: 85%"></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Éléments flottants -->
              <div class="floating-element element-1">
                <i class="material-icons">recycling</i>
              </div>
              <div class="floating-element element-2">
                <i class="material-icons">eco</i>
              </div>
              <div class="floating-element element-3">
                <i class="material-icons">local_shipping</i>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Search Section Moderne -->
      <section class="search-section">
        <div class="container">
          <div class="search-content">
            <div class="search-header">
              <div class="section-badge">
                <i class="material-icons">search</i>
                <span>Recherche Intelligente</span>
              </div>
              <h2 class="search-title">Trouvez votre agence de collecte</h2>
              <p class="search-subtitle">
                Localisez instantanément les agences qui desservent votre zone. 
                Notre algorithme intelligent vous propose les meilleures options 
                selon votre localisation et vos besoins spécifiques.
              </p>
            </div>
            
            <div class="search-card">
              <form class="search-form" (ngSubmit)="searchAgencies()">
                <div class="search-inputs">
                  <div class="search-input-group">
                    <i class="material-icons search-icon">location_on</i>
                    <input 
                      type="text" 
                      [(ngModel)]="searchQuery"
                      name="searchQuery"
                      placeholder="Saisissez votre adresse complète..."
                      class="search-input">
                    <div class="input-glow"></div>
                  </div>
                  <button type="submit" class="btn btn-primary search-btn" [disabled]="isSearching">
                    <i class="material-icons">{{ isSearching ? 'hourglass_empty' : 'search' }}</i>
                    {{ isSearching ? 'Recherche...' : 'Rechercher' }}
                  </button>
                </div>
              </form>

              <div class="search-options">
                <button class="search-option" (click)="useGeolocation()">
                  <i class="material-icons">my_location</i>
                  <span>Ma position</span>
                </button>
                <button class="search-option" (click)="showZoneSelector()">
                  <i class="material-icons">map</i>
                  <span>Sélectionner zone</span>
                </button>
                <button class="search-option" (click)="showAdvancedSearch()">
                  <i class="material-icons">tune</i>
                  <span>Recherche avancée</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Search Results Moderne -->
      <section class="results-section" *ngIf="searchResults.length > 0">
        <div class="container">
          <div class="results-header">
            <div class="results-badge">
              <i class="material-icons">business</i>
              <span>{{ searchResults.length }} Agences Trouvées</span>
            </div>
            <h2 class="section-title">Agences disponibles dans votre secteur</h2>
            <p class="results-subtitle">
              Découvrez les meilleures agences de collecte près de chez vous. 
              Comparez leurs services, consultez les avis clients et choisissez 
              la solution parfaite pour vos besoins.
            </p>
          </div>
          
          <div class="agencies-grid">
            <div *ngFor="let agency of searchResults" class="agency-card">
              <div class="agency-header">
                <div class="agency-logo">
                  <img [src]="agency.logo || 'https://images.pexels.com/photos/3735218/pexels-photo-3735218.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop'" 
                       [alt]="agency.name">
                  <div class="logo-glow"></div>
                </div>
                <div class="agency-badge" *ngIf="agency.rating >= 4.5">
                  <i class="material-icons">star</i>
                  <span>Top Rated</span>
                </div>
              </div>
              
              <div class="agency-content">
                <h3 class="agency-name">{{ agency.name }}</h3>
                <p class="agency-description">{{ agency.description }}</p>
                
                <div class="agency-rating">
                  <div class="stars">
                    <i *ngFor="let star of getStars(agency.rating)" 
                       class="material-icons star">star</i>
                  </div>
                  <span class="rating-text">{{ agency.rating }}/5</span>
                  <span class="reviews-count">({{ agency.totalClients }} avis)</span>
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
                  <h4>Services proposés</h4>
                  <div class="services-tags">
                    <div *ngFor="let service of agency.services.slice(0, 3)" class="service-tag">
                      <span class="service-name">{{ service.name }}</span>
                      <span class="service-price">{{ service.price }}€</span>
                    </div>
                    <div *ngIf="agency.services.length > 3" class="service-tag more-services">
                      +{{ agency.services.length - 3 }} autres
                    </div>
                  </div>
                </div>
              </div>

              <div class="agency-actions">
                <button class="btn btn-secondary" (click)="viewAgencyDetails(agency.id)">
                  <i class="material-icons">info</i>
                  Voir détails
                </button>
                <button class="btn btn-primary" (click)="subscribeToAgency(agency.id)">
                  <i class="material-icons">add</i>
                  S'abonner
                </button>
              </div>
              
              <div class="card-glow"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- Features Section Moderne -->
      <section class="features-section">
        <div class="container">
          <div class="features-header">
            <div class="section-badge">
              <i class="material-icons">auto_awesome</i>
              <span>Comment ça marche</span>
            </div>
            <h2 class="section-title">Un processus simple en 3 étapes</h2>
            <p class="features-subtitle">
              Notre plateforme révolutionne la gestion des déchets avec un processus 
              optimisé qui vous fait gagner du temps tout en contribuant à un 
              environnement plus propre et durable.
            </p>
          </div>
          
          <div class="features-grid">
            <div class="feature-card" *ngFor="let feature of features; let i = index">
              <div class="feature-number">{{ i + 1 }}</div>
              <div class="feature-icon">
                <i class="material-icons">{{ feature.icon }}</i>
                <div class="icon-glow"></div>
              </div>
              <h3 class="feature-title">{{ feature.title }}</h3>
              <p class="feature-description">{{ feature.description }}</p>
              <ul class="feature-list">
                <li *ngFor="let item of feature.items">
                  <i class="material-icons">check</i>
                  <span>{{ item }}</span>
                </li>
              </ul>
              <div class="feature-decoration"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- Stats Section Moderne -->
      <section class="stats-section">
        <div class="stats-background">
          <div class="stats-pattern"></div>
        </div>
        <div class="container">
          <div class="stats-header">
            <div class="section-badge light">
              <i class="material-icons">analytics</i>
              <span>Nos Performances</span>
            </div>
            <h2 class="stats-title">Des chiffres qui parlent</h2>
            <p class="stats-subtitle">
              Une plateforme de confiance qui connecte des milliers d'utilisateurs 
              chaque jour pour une gestion optimale et écologique des déchets.
            </p>
          </div>
          
          <div class="stats-grid">
            <div class="stat-card" *ngFor="let stat of stats">
              <div class="stat-icon">
                <i class="material-icons">{{ stat.icon }}</i>
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ stat.number }}</div>
                <div class="stat-label">{{ stat.label }}</div>
                <div class="stat-description">{{ stat.description }}</div>
              </div>
              <div class="stat-glow"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- Testimonials Section -->
      <section class="testimonials-section">
        <div class="container">
          <div class="testimonials-header">
            <div class="section-badge">
              <i class="material-icons">format_quote</i>
              <span>Témoignages</span>
            </div>
            <h2 class="section-title">Ce que disent nos utilisateurs</h2>
            <p class="testimonials-subtitle">
              Découvrez pourquoi des milliers de personnes font confiance à 
              WasteManager pour leur gestion des déchets au quotidien.
            </p>
          </div>
          
          <div class="testimonials-grid">
            <div class="testimonial-card" *ngFor="let testimonial of testimonials">
              <div class="testimonial-content">
                <div class="quote-icon">
                  <i class="material-icons">format_quote</i>
                </div>
                <p class="testimonial-text">{{ testimonial.text }}</p>
                <div class="testimonial-rating">
                  <div class="stars">
                    <i *ngFor="let star of getStars(testimonial.rating)" 
                       class="material-icons star">star</i>
                  </div>
                </div>
              </div>
              <div class="testimonial-author">
                <div class="author-avatar">
                  <img [src]="testimonial.avatar" [alt]="testimonial.name">
                </div>
                <div class="author-info">
                  <div class="author-name">{{ testimonial.name }}</div>
                  <div class="author-role">{{ testimonial.role }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA Section Moderne -->
      <section class="cta-section">
        <div class="cta-background">
          <div class="cta-pattern"></div>
        </div>
        <div class="container">
          <div class="cta-content">
            <div class="cta-icon">
              <i class="material-icons">rocket_launch</i>
            </div>
            <h2 class="cta-title">Prêt à révolutionner votre gestion des déchets ?</h2>
            <p class="cta-subtitle">
              Rejoignez des milliers d'utilisateurs qui ont déjà adopté la solution 
              la plus moderne et efficace pour gérer leurs déchets. Commencez 
              gratuitement dès aujourd'hui !
            </p>
            <div class="cta-actions">
              <a routerLink="/register" class="btn btn-primary btn-large">
                <i class="material-icons">person_add</i>
                <span>Créer un compte gratuit</span>
                <div class="btn-shine"></div>
              </a>
              <a routerLink="/agencies" class="btn btn-secondary btn-large">
                <i class="material-icons">search</i>
                <span>Explorer les agences</span>
              </a>
            </div>
            <div class="cta-guarantee">
              <i class="material-icons">verified</i>
              <span>Gratuit • Sans engagement • Support 24/7</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .home-page {
      min-height: 100vh;
      width: 100%;
      margin: 0 auto;
      overflow-x: hidden;
    }

    .container {
      max-width: 100%;
      margin: 0 auto;
      padding: 0 24px;
      min-width: 100%;
    }

    /* Hero Section Moderne */
    .hero-section {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: var(--white);
      padding: 120px 0 80px;
      position: relative;
      overflow: hidden;
      width: 100%;
      min-height: 90vh;
      display: flex;
      align-items: center;
    }

    .hero-background {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      overflow: hidden;
    }

    .floating-particles {
      position: absolute;
      width: 100%;
      height: 100%;
    }

    .particle {
      position: absolute;
      width: 4px;
      height: 4px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      animation: float 20s linear infinite;
    }

    .particle:nth-child(1) { left: 10%; animation-delay: 0s; }
    .particle:nth-child(2) { left: 20%; animation-delay: 2s; }
    .particle:nth-child(3) { left: 30%; animation-delay: 4s; }
    .particle:nth-child(4) { left: 40%; animation-delay: 6s; }
    .particle:nth-child(5) { left: 60%; animation-delay: 8s; }
    .particle:nth-child(6) { left: 70%; animation-delay: 10s; }
    .particle:nth-child(7) { left: 80%; animation-delay: 12s; }
    .particle:nth-child(8) { left: 90%; animation-delay: 14s; }

    @keyframes float {
      0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
      10% { opacity: 1; }
      90% { opacity: 1; }
      100% { transform: translateY(-100px) rotate(360deg); opacity: 0; }
    }

    .hero-content {
      position: relative;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 60px;
      align-items: center;
      z-index: 2;
    }

    .hero-main {
      z-index: 2;
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(20px);
      padding: 12px 20px;
      border-radius: 50px;
      font-size: 0.9rem;
      font-weight: 600;
      margin-bottom: 32px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      position: relative;
      overflow: hidden;
    }

    .badge-glow {
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
      animation: shine 3s infinite;
    }

    @keyframes shine {
      0% { left: -100%; }
      100% { left: 100%; }
    }

    .hero-title {
      font-size: 3.8rem;
      font-weight: 800;
      margin-bottom: 24px;
      line-height: 1.1;
      letter-spacing: -0.02em;
      position: relative;
    }

    .highlight {
      background: linear-gradient(135deg, #ffeaa7, #fab1a0);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      position: relative;
    }

    .title-decoration {
      display: inline-block;
      animation: bounce 2s infinite;
      margin-left: 10px;
    }

    @keyframes bounce {
      0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-10px); }
      60% { transform: translateY(-5px); }
    }

    .hero-description {
      font-size: 1.3rem;
      margin-bottom: 40px;
      opacity: 0.95;
      line-height: 1.6;
      max-width: 90%;
    }

    .hero-cta {
      display: flex;
      gap: 20px;
      margin-bottom: 48px;
    }

    .btn-hero {
      padding: 18px 32px;
      font-size: 1.1rem;
      font-weight: 600;
      border-radius: 50px;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      border: none;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    .btn-primary.btn-hero {
      background: linear-gradient(135deg, #00b894, #00cec9);
      color: white;
    }

    .btn-secondary.btn-hero {
      background: rgba(255, 255, 255, 0.15);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.3);
      backdrop-filter: blur(10px);
    }

    .btn-hero:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
    }

    .btn-shine {
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
      transition: left 0.6s;
    }

    .btn-hero:hover .btn-shine {
      left: 100%;
    }

    .hero-trust {
      display: flex;
      gap: 40px;
    }

    .trust-item {
      text-align: center;
    }

    .trust-number {
      font-size: 2.2rem;
      font-weight: 800;
      margin-bottom: 4px;
      background: linear-gradient(135deg, #ffeaa7, #fab1a0);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .trust-label {
      font-size: 0.9rem;
      opacity: 0.9;
      font-weight: 600;
    }

    .hero-visual {
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      z-index: 2;
    }

    .hero-dashboard {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: 24px;
      padding: 28px;
      box-shadow: 0 25px 80px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.2);
      width: 100%;
      max-width: 420px;
      animation: dashboardFloat 6s ease-in-out infinite;
    }

    @keyframes dashboardFloat {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-15px); }
    }

    .dashboard-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    }

    .dashboard-nav {
      display: flex;
      gap: 8px;
    }

    .nav-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #ddd;
      transition: all 0.3s ease;
    }

    .nav-dot.active {
      background: var(--primary-color);
      box-shadow: 0 0 10px rgba(0, 188, 212, 0.5);
    }

    .dashboard-title {
      font-weight: 700;
      color: var(--text-primary);
      font-size: 1.2rem;
    }

    .dashboard-content {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .dashboard-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: rgba(0, 188, 212, 0.05);
      border-radius: 16px;
      border-left: 4px solid var(--primary-color);
      position: relative;
      overflow: hidden;
    }

    .dashboard-card.success {
      background: rgba(76, 175, 80, 0.05);
      border-left-color: var(--success-color);
    }

    .dashboard-card.pending {
      background: rgba(255, 152, 0, 0.05);
      border-left-color: #ff9800;
    }

    .card-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
    }

    .dashboard-card.success .card-icon {
      background: var(--success-color);
    }

    .dashboard-card.pending .card-icon {
      background: #ff9800;
    }

    .card-title {
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 4px;
      font-size: 1.1rem;
    }

    .card-subtitle {
      font-size: 0.9rem;
      color: var(--text-secondary);
    }

    .card-pulse {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(90deg, transparent, rgba(76, 175, 80, 0.1), transparent);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    .dashboard-stats {
      padding: 20px;
      background: rgba(76, 175, 80, 0.05);
      border-radius: 16px;
    }

    .stat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .stat-percentage {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--success-color);
    }

    .stat-bar {
      height: 10px;
      background: rgba(76, 175, 80, 0.2);
      border-radius: 5px;
      overflow: hidden;
      position: relative;
    }

    .stat-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--success-color), #4caf50);
      border-radius: 5px;
      animation: fillBar 2s ease-out;
      position: relative;
    }

    .stat-fill::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
      animation: shimmer 2s infinite;
    }

    @keyframes fillBar {
      0% { width: 0%; }
    }

    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    .floating-element {
      position: absolute;
      width: 80px;
      height: 80px;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 32px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .element-1 {
      top: 15%;
      right: 8%;
      animation: floatElement 8s ease-in-out infinite;
    }

    .element-2 {
      top: 65%;
      right: 3%;
      animation: floatElement 8s ease-in-out infinite 2s;
    }

    .element-3 {
      top: 40%;
      right: 20%;
      animation: floatElement 8s ease-in-out infinite 4s;
    }

    @keyframes floatElement {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-25px) rotate(180deg); }
    }

    /* Search Section Moderne */
    .search-section {
      padding: 80px 0;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      position: relative;
    }

    .search-content {
      max-width: 900px;
      margin: 0 auto;
    }

    .search-header {
      text-align: center;
      margin-bottom: 48px;
    }

    .section-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--primary-color);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 0.9rem;
      font-weight: 600;
      margin-bottom: 20px;
    }

    .section-badge.light {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }

    .search-title {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 16px;
      color: var(--text-primary);
    }

    .search-subtitle {
      font-size: 1.1rem;
      color: var(--text-secondary);
      line-height: 1.6;
      max-width: 600px;
      margin: 0 auto;
    }

    .search-card {
      background: white;
      padding: 40px;
      border-radius: 24px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
      border: 1px solid rgba(0, 0, 0, 0.05);
    }

    .search-form {
      margin-bottom: 32px;
    }

    .search-inputs {
      display: flex;
      gap: 20px;
      margin-bottom: 24px;
    }

    .search-input-group {
      position: relative;
      flex: 1;
    }

    .search-icon {
      position: absolute;
      left: 20px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-secondary);
      font-size: 24px;
      z-index: 2;
    }

    .search-input {
      width: 100%;
      padding: 20px 20px 20px 60px;
      border: 2px solid var(--medium-gray);
      border-radius: 16px;
      font-size: 1.1rem;
      font-family: 'Inter', sans-serif;
      transition: all 0.3s ease;
      background: white;
    }

    .search-input:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 4px rgba(0, 188, 212, 0.1);
    }

    .input-glow {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border-radius: 16px;
      background: linear-gradient(45deg, var(--primary-color), var(--secondary-color));
      opacity: 0;
      transition: opacity 0.3s ease;
      z-index: -1;
    }

    .search-input:focus + .input-glow {
      opacity: 0.1;
    }

    .search-btn {
      padding: 20px 32px;
      font-size: 1.1rem;
      font-weight: 600;
      border-radius: 16px;
      white-space: nowrap;
      box-shadow: 0 8px 24px rgba(0, 188, 212, 0.3);
    }

    .search-options {
      display: flex;
      gap: 16px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .search-option {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      background: var(--light-gray);
      border: 2px solid transparent;
      border-radius: 12px;
      color: var(--text-primary);
      font-weight: 500;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .search-option:hover {
      border-color: var(--primary-color);
      color: var(--primary-color);
      background: rgba(0, 188, 212, 0.05);
      transform: translateY(-2px);
    }

    /* Results Section */
    .results-section {
      padding: 80px 0;
    }

    .results-header {
      text-align: center;
      margin-bottom: 48px;
    }

    .results-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--success-color);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 0.9rem;
      font-weight: 600;
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 16px;
      color: var(--text-primary);
    }

    .results-subtitle {
      font-size: 1.1rem;
      color: var(--text-secondary);
      line-height: 1.6;
      max-width: 600px;
      margin: 0 auto;
    }

    .agencies-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 32px;
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
      transform: translateY(-8px);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
    }

    .card-glow {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(45deg, var(--primary-color), var(--secondary-color));
      opacity: 0;
      transition: opacity 0.3s ease;
      z-index: -1;
    }

    .agency-card:hover .card-glow {
      opacity: 0.05;
    }

    .agency-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }

    .agency-logo {
      width: 70px;
      height: 70px;
      border-radius: 16px;
      overflow: hidden;
      position: relative;
    }

    .agency-logo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .logo-glow {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(45deg, transparent, rgba(255,255,255,0.3), transparent);
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .agency-card:hover .logo-glow {
      opacity: 1;
    }

    .agency-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: var(--warning-color);
      color: var(--text-primary);
      border-radius: 16px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .agency-content {
      margin-bottom: 24px;
    }

    .agency-name {
      font-size: 1.4rem;
      font-weight: 700;
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
      font-weight: 600;
      color: var(--text-primary);
    }

    .reviews-count {
      font-size: 0.9rem;
      color: var(--text-secondary);
    }

    .agency-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 20px;
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
      color: var(--primary-color);
    }

    .services-preview h4 {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 12px;
      color: var(--text-primary);
    }

    .services-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .service-tag {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: var(--light-gray);
      border-radius: 16px;
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--text-primary);
    }

    .service-name {
      color: var(--text-primary);
    }

    .service-price {
      color: var(--primary-color);
      font-weight: 600;
    }

    .service-tag.more-services {
      background: var(--primary-color);
      color: var(--white);
    }

    .agency-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    /* Features Section Moderne */
    .features-section {
      padding: 100px 0;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    }

    .features-header {
      text-align: center;
      margin-bottom: 60px;
    }

    .features-subtitle {
      font-size: 1.1rem;
      color: var(--text-secondary);
      line-height: 1.6;
      max-width: 600px;
      margin: 0 auto;
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 40px;
    }

    .feature-card {
      background: white;
      padding: 40px 32px;
      border-radius: 24px;
      text-align: center;
      box-shadow: 0 15px 50px rgba(0, 0, 0, 0.1);
      border: 2px solid transparent;
      transition: all 0.4s ease;
      position: relative;
      overflow: hidden;
    }

    .feature-card:hover {
      border-color: var(--primary-color);
      transform: translateY(-10px);
      box-shadow: 0 25px 70px rgba(0, 0, 0, 0.15);
    }

    .feature-number {
      position: absolute;
      top: 15px;
      right: 20px;
      width: 40px;
      height: 40px;
      background: var(--primary-color);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.2rem;
    }

    .feature-icon {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      color: var(--white);
      font-size: 32px;
      position: relative;
      overflow: hidden;
    }

    .icon-glow {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .feature-card:hover .icon-glow {
      opacity: 1;
    }

    .feature-title {
      font-size: 1.4rem;
      font-weight: 700;
      margin-bottom: 16px;
      color: var(--text-primary);
    }

    .feature-description {
      color: var(--text-secondary);
      line-height: 1.6;
      margin-bottom: 20px;
    }

    .feature-list {
      list-style: none;
      padding: 0;
      text-align: left;
    }

    .feature-list li {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .feature-list i {
      color: var(--success-color);
      font-size: 16px;
    }

    .feature-decoration {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
      transform: scaleX(0);
      transition: transform 0.3s ease;
    }

    .feature-card:hover .feature-decoration {
      transform: scaleX(1);
    }

    /* Stats Section Moderne */
    .stats-section {
      padding: 100px 0;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      color: var(--white);
      text-align: center;
      position: relative;
      overflow: hidden;
    }

    .stats-background {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
    }

    .stats-pattern {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
      background-size: 50px 50px;
      animation: patternMove 20s linear infinite;
    }

    @keyframes patternMove {
      0% { transform: translate(0, 0); }
      100% { transform: translate(50px, 50px); }
    }

    .stats-header {
      margin-bottom: 60px;
      position: relative;
      z-index: 2;
    }

    .stats-title {
      font-size: 2.8rem;
      font-weight: 700;
      margin-bottom: 16px;
    }

    .stats-subtitle {
      font-size: 1.2rem;
      opacity: 0.9;
      line-height: 1.6;
      max-width: 600px;
      margin: 0 auto;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 32px;
      position: relative;
      z-index: 2;
    }

    .stat-card {
      background: rgba(255, 255, 255, 0.1);
      padding: 32px 24px;
      border-radius: 20px;
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      transition: all 0.4s ease;
      position: relative;
      overflow: hidden;
    }

    .stat-card:hover {
      transform: translateY(-8px);
      background: rgba(255, 255, 255, 0.15);
    }

    .stat-icon {
      width: 60px;
      height: 60px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      font-size: 28px;
    }

    .stat-content {
      position: relative;
      z-index: 2;
    }

    .stat-number {
      font-size: 3rem;
      font-weight: 800;
      margin-bottom: 8px;
      display: block;
      line-height: 1;
    }

    .stat-label {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 8px;
      display: block;
    }

    .stat-description {
      font-size: 0.9rem;
      opacity: 0.8;
    }

    .stat-glow {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .stat-card:hover .stat-glow {
      opacity: 1;
    }

    /* Testimonials Section */
    .testimonials-section {
      padding: 100px 0;
      background: white;
    }

    .testimonials-header {
      text-align: center;
      margin-bottom: 60px;
    }

    .testimonials-subtitle {
      font-size: 1.1rem;
      color: var(--text-secondary);
      line-height: 1.6;
      max-width: 600px;
      margin: 0 auto;
    }

    .testimonials-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 32px;
    }

    .testimonial-card {
      background: white;
      padding: 32px;
      border-radius: 20px;
      box-shadow: 0 15px 50px rgba(0, 0, 0, 0.1);
      border: 2px solid transparent;
      transition: all 0.4s ease;
    }

    .testimonial-card:hover {
      border-color: var(--primary-color);
      transform: translateY(-5px);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
    }

    .testimonial-content {
      margin-bottom: 24px;
    }

    .quote-icon {
      width: 40px;
      height: 40px;
      background: var(--primary-color);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      margin-bottom: 20px;
      font-size: 20px;
    }

    .testimonial-text {
      font-size: 1.1rem;
      line-height: 1.6;
      color: var(--text-primary);
      margin-bottom: 16px;
      font-style: italic;
    }

    .testimonial-rating {
      margin-bottom: 20px;
    }

    .testimonial-author {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .author-avatar {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      overflow: hidden;
    }

    .author-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .author-name {
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 4px;
    }

    .author-role {
      font-size: 0.9rem;
      color: var(--text-secondary);
    }

    /* CTA Section Moderne */
    .cta-section {
      padding: 100px 0;
      background: linear-gradient(135deg, var(--dark-gray), #2c3e50);
      color: var(--white);
      text-align: center;
      position: relative;
      overflow: hidden;
    }

    .cta-background {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
    }

    .cta-pattern {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image: linear-gradient(45deg, rgba(255,255,255,0.05) 25%, transparent 25%), 
                        linear-gradient(-45deg, rgba(255,255,255,0.05) 25%, transparent 25%);
      background-size: 60px 60px;
      animation: patternSlide 30s linear infinite;
    }

    @keyframes patternSlide {
      0% { transform: translate(0, 0); }
      100% { transform: translate(60px, 60px); }
    }

    .cta-content {
      position: relative;
      z-index: 2;
      max-width: 800px;
      margin: 0 auto;
    }

    .cta-icon {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 32px;
      font-size: 36px;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }

    .cta-title {
      font-size: 2.8rem;
      font-weight: 700;
      margin-bottom: 20px;
      line-height: 1.2;
    }

    .cta-subtitle {
      font-size: 1.2rem;
      margin-bottom: 40px;
      opacity: 0.9;
      line-height: 1.6;
    }

    .cta-actions {
      display: flex;
      gap: 24px;
      justify-content: center;
      flex-wrap: wrap;
      margin-bottom: 32px;
    }

    .btn-large {
      padding: 20px 40px;
      font-size: 1.2rem;
      font-weight: 600;
      border-radius: 50px;
    }

    .cta-guarantee {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 0.9rem;
      opacity: 0.8;
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .hero-content {
        grid-template-columns: 1fr;
        gap: 40px;
        text-align: center;
      }

      .hero-title {
        font-size: 3rem;
      }

      .agencies-grid {
        grid-template-columns: 1fr;
      }

      .features-grid {
        grid-template-columns: 1fr;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .testimonials-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .hero-section {
        padding: 80px 0 60px;
        min-height: auto;
      }

      .hero-title {
        font-size: 2.5rem;
      }

      .hero-description {
        font-size: 1.1rem;
      }

      .hero-cta {
        flex-direction: column;
        align-items: center;
      }

      .btn-hero {
        width: 100%;
        max-width: 300px;
        justify-content: center;
      }

      .hero-trust {
        gap: 20px;
        justify-content: center;
      }

      .trust-number {
        font-size: 1.8rem;
      }

      .floating-element {
        display: none;
      }

      .search-inputs {
        flex-direction: column;
      }

      .search-options {
        flex-direction: column;
      }

      .section-title {
        font-size: 2rem;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }

      .cta-actions {
        flex-direction: column;
        align-items: center;
      }

      .btn-large {
        width: 100%;
        max-width: 300px;
      }

      .cta-title {
        font-size: 2.2rem;
      }

      .stats-title {
        font-size: 2.2rem;
      }
    }

    @media (max-width: 480px) {
      .hero-title {
        font-size: 2rem;
      }

      .hero-description {
        font-size: 1rem;
      }

      .hero-dashboard {
        max-width: 100%;
        margin: 0 -10px;
      }

      .search-card {
        padding: 24px;
        margin: 0 -8px;
      }

      .agency-card {
        margin: 0 -8px;
      }

      .feature-card {
        padding: 24px 20px;
      }

      .stat-card {
        padding: 24px 20px;
      }

      .testimonial-card {
        padding: 24px;
      }

      .cta-content {
        padding: 0 16px;
      }
    }
  `]
})
export class HomeComponent implements OnInit {
  searchQuery = '';
  searchResults: Agency[] = [];
  isSearching = false;

  features = [
    {
      icon: 'search',
      title: '1. Rechercher',
      description: 'Trouvez instantanément les agences de collecte qui desservent votre zone géographique avec notre moteur de recherche intelligent.',
      items: [
        'Recherche par adresse précise',
        'Géolocalisation automatique',
        'Filtres par type de service',
        'Résultats en temps réel'
      ]
    },
    {
      icon: 'compare_arrows',
      title: '2. Comparer',
      description: 'Analysez et comparez facilement les services, tarifs et évaluations des différentes agences pour faire le meilleur choix.',
      items: [
        'Comparaison des tarifs',
        'Évaluations clients vérifiées',
        'Détails des services',
        'Zones de couverture'
      ]
    },
    {
      icon: 'check_circle',
      title: '3. S\'abonner',
      description: 'Souscrivez en quelques clics au service qui vous convient et profitez d\'une collecte régulière et fiable.',
      items: [
        'Abonnement flexible',
        'Paiement sécurisé',
        'Suivi en temps réel',
        'Support client 24/7'
      ]
    }
  ];

  stats = [
    {
      icon: 'business',
      number: '150+',
      label: 'Agences partenaires',
      description: 'Agences certifiées dans toute la région'
    },
    {
      icon: 'people',
      number: '50,000+',
      label: 'Clients satisfaits',
      description: 'Utilisateurs actifs sur la plateforme'
    },
    {
      icon: 'star',
      number: '95%',
      label: 'Taux de satisfaction',
      description: 'Clients recommandent nos services'
    },
    {
      icon: 'local_shipping',
      number: '500+',
      label: 'Collectes par jour',
      description: 'Collectes effectuées quotidiennement'
    }
  ];

  testimonials = [
    {
      text: 'WasteManager a complètement transformé notre gestion des déchets. Simple, efficace et écologique !',
      name: 'GANGO Siméon',
      role: 'Particulier, Kossodo',
      rating: 5,
      avatar: 'https://drive.google.com/drive/folders/1-zkhOCP4zNAMlClgm1CHn7uP-CElGFgK'
    },
    {
      text: 'Une plateforme intuitive qui nous fait gagner un temps précieux. Le service client est exceptionnel.',
      name: 'W.Paulin GUIGMA',
      role: 'Gérant d\'entreprise, Ouagadougou',
      rating: 5,
      avatar: 'https://drive.google.com/drive/folders/1-zkhOCP4zNAMlClgm1CHn7uP-CElGFgK'
    },
    {
      text: 'Grâce à WasteManager, nous avons amélioré notre tri et réduit nos coûts de 30%. Parfait !',
      name: 'Rimvie OUEDRAOGO',
      role: 'Responsable RSE, Tampouy',
      rating: 5,
      avatar: 'https://drive.google.com/drive/folders/1-zkhOCP4zNAMlClgm1CHn7uP-CElGFgK'
    }
  ];

  constructor(
    private agencyService: AgencyService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadFeaturedAgenciesFromApi();
  }

  /**
   * Transforme une agence API en objet compatible avec le template
   */
  private mapApiAgency(apiAgency: any): Agency {
    return {
      id: apiAgency._id || apiAgency.id || '',
      name: apiAgency.name || '',
      description: apiAgency.description || '',
      logo: apiAgency.logo || '',
      email: apiAgency.email || '',
      phone: apiAgency.phone || '',
      address: apiAgency.address || { city: '', neighborhood: '' },
      serviceZones: apiAgency.serviceZones || apiAgency.zones || [],
      services: apiAgency.services || [],
      employees: apiAgency.employees || apiAgency.collectors || [],
      schedule: apiAgency.schedule || [],
      rating: apiAgency.rating || 0,
      totalClients: apiAgency.totalClients || (apiAgency.clients ? apiAgency.clients.length : 0),
      isActive: apiAgency.isActive !== undefined ? apiAgency.isActive : true,
      createdAt: apiAgency.createdAt ? new Date(apiAgency.createdAt) : new Date(),
      updatedAt: apiAgency.updatedAt ? new Date(apiAgency.updatedAt) : new Date()
    };
  }

  /**
   * Charge les agences depuis l'API backend et affiche les 4 premières en vedette
   */
  loadFeaturedAgenciesFromApi(): void {
    this.agencyService.getAllAgenciesFromApi().subscribe((response: any) => {
      this.searchResults = (response.data || []).slice(0, 4).map((a: any) => this.mapApiAgency(a));
      console.log('[DEBUG] searchResults:', this.searchResults);
    });
  }

  searchAgencies(): void {
    if (!this.searchQuery.trim()) return;

    this.isSearching = true;
    this.agencyService.searchAgencies(this.searchQuery).subscribe({
      next: (agencies) => {
        this.searchResults = agencies;
        this.isSearching = false;
      },
      error: (error) => {
        console.error('Search error:', error);
        this.isSearching = false;
      }
    });
  }

  useGeolocation(): void {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          this.agencyService.getAgenciesByZone(latitude, longitude).subscribe(agencies => {
            this.searchResults = agencies;
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Impossible d\'obtenir votre position');
        }
      );
    } else {
      alert('La géolocalisation n\'est pas supportée par votre navigateur');
    }
  }

  showZoneSelector(): void {
    console.log('Show zone selector');
  }

  showAdvancedSearch(): void {
    console.log('Show advanced search');
  }

  getStars(rating: number): number[] {
    return new Array(Math.floor(rating)).fill(0);
  }

  viewAgencyDetails(agencyId: string): void {
    this.router.navigate(['/agencies', agencyId]);
  }

  subscribeToAgency(agencyId: string): void {
    this.router.navigate(['/agencies', agencyId]);
  }

  playDemo(): void {
    // window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '_blank');
    window.open('#');
  }
}