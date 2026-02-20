import { Component, OnInit, OnDestroy } from '@angular/core';

import { RouterOutlet } from '@angular/router';
import { Footer } from './components/footer/footer';
import { Header } from './components/header/header';
import { Notification } from './components/notification/notification';
import { LoadingService } from './services/loading.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    Header,
    Footer,
    Notification
],
  template: `
    <!-- Indicateur de chargement global avec design personnalisé -->
    @if (isAppLoading) {
      <div class="global-loading-overlay">
        <div class="global-loading-container">
          <div class="global-loading-spinner"></div>
          <h2 class="loading-title"> ZéroDéchet+</h2>
          <p class="loading-subtitle">Chargement en cours...</p>
          <div class="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    }
    
    @if (!isAppLoading) {
      <div class="app">
        <div class="page-header">
          <app-header></app-header>
        </div>
        <main class="main-content">
          <router-outlet></router-outlet>
        </main>
        <app-footer></app-footer>
        <app-notification></app-notification>
      </div>
    }
    `,
  styles: [`
    /* Styles pour l'indicateur de chargement global */
    .global-loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }

    .global-loading-container {
      text-align: center;
      color: white;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .global-loading-spinner {
      width: 60px;
      height: 60px;
      border: 6px solid rgba(255, 255, 255, 0.2);
      border-top: 6px solid #ffffff;
      border-radius: 50%;
      animation: globalSpin 1s linear infinite;
      margin-bottom: 2rem;
    }

    @keyframes globalSpin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .loading-title {
      font-size: 2.5rem;
      font-weight: 700;
      margin: 0 0 0.5rem 0;
      letter-spacing: -0.02em;
    }

    .loading-subtitle {
      font-size: 1.1rem;
      margin: 0 0 2rem 0;
      opacity: 0.9;
      font-weight: 300;
    }

    .loading-dots {
      display: flex;
      gap: 0.5rem;
    }

    .loading-dots span {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: rgba(255, 255, 255, 0.7);
      animation: loadingDots 1.5s infinite ease-in-out;
    }

    .loading-dots span:nth-child(2) {
      animation-delay: 0.2s;
    }

    .loading-dots span:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes loadingDots {
      0%, 60%, 100% {
        transform: scale(1);
        opacity: 0.7;
      }
      30% {
        transform: scale(1.3);
        opacity: 1;
      }
    }

    .app {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      margin: 0 auto;
    }
    .page-header {
      position: fixed;
      min-width: 100%;
      z-index: 1000;
    }
    .main-content {
      flex: 1;
      min-width: 100%;
      display: flex;
      flex-direction: column;
      margin-top: 64px;
    }

    @media ( max-width:768px) {
      .main-content {
        padding: 2px;
        margin-top: 85px;
      }
    }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'WasteManager';
  isAppLoading = true;
  private loadingSubscription: Subscription = new Subscription();

  constructor(private loadingService: LoadingService) {}

  ngOnInit() {
    // S'abonner aux changements d'état de chargement
    this.loadingSubscription = this.loadingService.loading$.subscribe(
      (loading) => {
        this.isAppLoading = loading;
      }
    );

    // Initialiser l'application
    this.initializeApp();
  }

  ngOnDestroy() {
    this.loadingSubscription.unsubscribe();
  }

  private async initializeApp() {
    // Ici vous pouvez ajouter la logique d'initialisation de votre application
    // Par exemple : charger les données utilisateur, vérifier l'authentification, etc.
    
    try {
      // Simuler l'initialisation de l'application avec un délai minimum
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Ajouter ici d'autres tâches d'initialisation si nécessaire
      // await this.authService.initializeAuth();
      // await this.configService.loadConfig();
      
      // Marquer l'application comme chargée
      this.loadingService.setLoading(false);
      
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de l\'application:', error);
      // Masquer le chargement même en cas d'erreur
      this.loadingService.setLoading(false);
    }
  }
}