import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="login-page">
      <div class="login-container">
        <div class="login-card card">
          <div class="login-header">
            <div class="logo">
              <i class="material-icons">recycling</i>
              <span>WasteManager</span>
            </div>
            <h1 class="login-title">Connexion</h1>
            <p class="login-subtitle">
              Accédez à votre espace personnel pour gérer vos collectes de déchets
            </p>
          </div>

          <form class="login-form" (ngSubmit)="onLogin()" #loginForm="ngForm">
            <div class="form-group">
              <label class="form-label" for="email">
                <i class="material-icons">email</i>
                Adresse email
              </label>
              <input 
                type="email" 
                id="email"
                name="email"
                [(ngModel)]="credentials.email"
                class="form-control"
                placeholder="votre@email.com"
                required
                #emailInput="ngModel">
              <div class="form-error" *ngIf="emailInput.invalid && emailInput.touched">
                Veuillez saisir une adresse email valide
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="password">
                <i class="material-icons">lock</i>
                Mot de passe
              </label>
              <div class="password-input">
                <input 
                  [type]="showPassword ? 'text' : 'password'"
                  id="password"
                  name="password"
                  [(ngModel)]="credentials.password"
                  class="form-control"
                  placeholder="Votre mot de passe"
                  required
                  #passwordInput="ngModel">
                <button 
                  type="button" 
                  class="password-toggle"
                  (click)="togglePassword()">
                  <i class="material-icons">{{ showPassword ? 'visibility_off' : 'visibility' }}</i>
                </button>
              </div>
              <div class="form-error" *ngIf="passwordInput.invalid && passwordInput.touched">
                Le mot de passe est requis
              </div>
            </div>

            <div class="form-options">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  [(ngModel)]="rememberMe"
                  name="rememberMe">
                <span class="checkmark"></span>
                Se souvenir de moi
              </label>
              <a routerLink="/forgot-password" class="forgot-link">
                Mot de passe oublié ?
              </a>
            </div>

            <button 
              type="submit" 
              class="btn btn-primary btn-full"
              [disabled]="isLoading || loginForm.invalid">
              <i class="material-icons" *ngIf="isLoading">hourglass_empty</i>
              <i class="material-icons" *ngIf="!isLoading">login</i>
              {{ isLoading ? 'Connexion...' : 'Se connecter' }}
            </button>
          </form>
          <!------------------------------------ Comptes de démonstration  
          <div class="login-divider">
            <span>ou</span>
          </div>
          
          <div class="demo-accounts">
            <h3>Comptes de démonstration</h3>
            <div class="demo-buttons">
              <button 
                class="demo-btn client"
                (click)="loginAsDemo('client')">
                <i class="material-icons">person</i>
                <div>
                  <strong>Client</strong>
                  <small>Gérer mes collectes</small>
                </div>
              </button>
              <button 
                class="demo-btn agency"
                (click)="loginAsDemo('agency')">
                <i class="material-icons">business</i>
                <div>
                  <strong>Agence</strong>
                  <small>Gérer les services</small>
                </div>
              </button>
              <button 
                class="demo-btn collector"
                (click)="loginAsDemo('collector')">
                <i class="material-icons">local_shipping</i>
                <div>
                  <strong>Collecteur</strong>
                  <small>Interface mobile</small>
                </div>
              </button>
              <button 
                class="demo-btn municipality"
                (click)="loginAsDemo('municipality')">
                <i class="material-icons">location_city</i>
                <div>
                  <strong>Mairie</strong>
                  <small>Audit et contrôle</small>
                </div>
              </button>
            </div>
          </div>
            -->
          <div class="login-footer">
            <p>
              Pas encore de compte ? 
              <a routerLink="/register" class="register-link">Créer un compte</a>
            </p>
          </div>
        </div>

        <div class="login-info">
          <div class="info-content">
            <h2>Bienvenue sur WasteManager</h2>
            <div class="features-list">
              <div class="feature-item">
                <i class="material-icons">schedule</i>
                <div>
                  <h4>Collecte programmée</h4>
                  <p>Planifiez et suivez vos collectes en temps réel</p>
                </div>
              </div>
              <div class="feature-item">
                <i class="material-icons">eco</i>
                <div>
                  <h4>Tri intelligent</h4>
                  <p>Guide complet pour un tri efficace et écologique</p>
                </div>
              </div>
              <div class="feature-item">
                <i class="material-icons">payment</i>
                <div>
                  <h4>Paiement sécurisé</h4>
                  <p>Gestion simplifiée de vos abonnements</p>
                </div>
              </div>
              <div class="feature-item">
                <i class="material-icons">support_agent</i>
                <div>
                  <h4>Support 24/7</h4>
                  <p>Assistance dédiée pour tous vos besoins</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .login-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      max-width: 1000px;
      width: 100%;
      gap: 40px;
      align-items: center;
    }

    .login-card {
      padding: 40px;
      max-width: 450px;
      width: 100%;
      margin: 0 auto;
    }

    .login-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary-color);
      margin-bottom: 24px;
    }

    .logo i {
      font-size: 32px;
    }

    .login-title {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 8px;
      color: var(--text-primary);
    }

    .login-subtitle {
      color: var(--text-secondary);
      line-height: 1.5;
    }

    .login-form {
      margin-bottom: 24px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-label {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-weight: 500;
      color: var(--text-primary);
    }

    .form-control {
      width: 100%;
      padding: 16px;
      border: 2px solid var(--medium-gray);
      border-radius: 12px;
      font-family: 'Inter', sans-serif;
      font-size: 1rem;
      transition: all 0.3s ease;
    }

    .form-control:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(0, 188, 212, 0.1);
    }

    .password-input {
      position: relative;
    }

    .password-toggle {
      position: absolute;
      right: 16px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 4px;
    }

    .form-error {
      color: var(--error-color);
      font-size: 0.8rem;
      margin-top: 4px;
    }

    .form-options {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 0.9rem;
      color: var(--text-secondary);
    }

    .checkbox-label input[type="checkbox"] {
      display: none;
    }

    .checkmark {
      width: 18px;
      height: 18px;
      border: 2px solid var(--medium-gray);
      border-radius: 4px;
      position: relative;
      transition: all 0.3s ease;
    }

    .checkbox-label input[type="checkbox"]:checked + .checkmark {
      background: var(--primary-color);
      border-color: var(--primary-color);
    }

    .checkbox-label input[type="checkbox"]:checked + .checkmark::after {
      content: '✓';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: var(--white);
      font-size: 12px;
      font-weight: bold;
    }

    .forgot-link {
      color: var(--primary-color);
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
    }

    .forgot-link:hover {
      text-decoration: underline;
    }

    .btn-full {
      width: 100%;
      padding: 16px;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .login-divider {
      text-align: center;
      margin: 24px 0;
      position: relative;
    }

    .login-divider::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: var(--medium-gray);
    }

    .login-divider span {
      background: var(--white);
      padding: 0 16px;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .demo-accounts {
      margin-bottom: 24px;
    }

    .demo-accounts h3 {
      text-align: center;
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 16px;
      color: var(--text-primary);
    }

    .demo-buttons {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .demo-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border: 2px solid var(--medium-gray);
      border-radius: 8px;
      background: var(--white);
      cursor: pointer;
      transition: all 0.3s ease;
      text-align: left;
    }

    .demo-btn:hover {
      border-color: var(--primary-color);
      transform: translateY(-2px);
    }

    .demo-btn i {
      font-size: 24px;
    }

    .demo-btn.client i { color: var(--primary-color); }
    .demo-btn.agency i { color: var(--secondary-color); }
    .demo-btn.collector i { color: var(--accent-color); }
    .demo-btn.municipality i { color: var(--warning-color); }

    .demo-btn div {
      flex: 1;
    }

    .demo-btn strong {
      display: block;
      font-size: 0.9rem;
      color: var(--text-primary);
    }

    .demo-btn small {
      color: var(--text-secondary);
      font-size: 0.8rem;
    }

    .login-footer {
      text-align: center;
      padding-top: 24px;
      border-top: 1px solid var(--medium-gray);
    }

    .register-link {
      color: var(--primary-color);
      text-decoration: none;
      font-weight: 500;
    }

    .register-link:hover {
      text-decoration: underline;
    }

    .login-info {
      color: var(--white);
    }

    .info-content h2 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 32px;
      line-height: 1.2;
    }

    .features-list {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .feature-item {
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }

    .feature-item i {
      width: 48px;
      height: 48px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      flex-shrink: 0;
    }

    .feature-item h4 {
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .feature-item p {
      opacity: 0.9;
      line-height: 1.5;
    }

    @media (max-width: 1024px) {
      .login-container {
        grid-template-columns: 1fr;
        max-width: 500px;
      }

      .login-info {
        order: -1;
        text-align: center;
        margin-bottom: 20px;
      }

      .info-content h2 {
        font-size: 2rem;
        margin-bottom: 24px;
      }

      .features-list {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
      }

      .feature-item {
        flex-direction: column;
        text-align: center;
      }
    }

    @media (max-width: 768px) {
      .login-page {
        padding: 16px;
      }

      .login-card {
        padding: 24px;
      }

      .demo-buttons {
        grid-template-columns: 1fr;
      }

      .features-list {
        grid-template-columns: 1fr;
      }

      .info-content h2 {
        font-size: 1.8rem;
      }
    }
  `]
})
export class LoginComponent implements OnInit {
  credentials = {
    email: '',
    password: ''
  };

  showPassword = false;
  rememberMe = false;
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void { }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onLogin(): void {
    if (!this.credentials.email || !this.credentials.password) {
      this.notificationService.showError('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    this.isLoading = true;
    console.log('this.credentials', this.credentials);
    // this.authService.login(this.credentials.email, this.credentials.password).subscribe({
    this.authService.loginUser(this.credentials.email, this.credentials.password).subscribe({
      next: (response: any) => {
        console.log('response login', response);
        this.isLoading = false;
        if (response?.user) {
          this.notificationService.showSuccess('Connexion réussie', `Bienvenue ${response?.user?.firstName} ${response?.user?.lastName} !`);
          this.redirectToDashboard(response?.user?.role);
        } else {
          this.notificationService.showError('Erreur de connexion', response.error || 'Identifiants incorrects');
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.notificationService.showError('Erreur', 'Une erreur est survenue lors de la connexion');
      }
    });
  }

  loginAsDemo(role: string): void {
    const demoCredentials = {
      client: { email: 'client@demo.com', password: 'demo123' },
      agency: { email: 'agency@demo.com', password: 'demo123' },
      collector: { email: 'collector@demo.com', password: 'demo123' },
      municipality: { email: 'municipality@demo.com', password: 'demo123' }
    };

    const creds = demoCredentials[role as keyof typeof demoCredentials];
    if (creds) {
      this.credentials = creds;
      this.onLogin();
    }
  }

  private redirectToDashboard(role: string): void {
    const dashboardRoutes = {
      client: '/dashboard/client',
      agency: '/dashboard/agency',
      collector: '/dashboard/collector',
      municipality: '/dashboard/municipality',
      super_admin: '/dashboard/admin'
    };

    const route = dashboardRoutes[role as keyof typeof dashboardRoutes] || '/';
    this.router.navigate([route]);
  }
}