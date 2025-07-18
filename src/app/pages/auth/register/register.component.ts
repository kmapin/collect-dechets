import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';
import { UserRole } from '../../../models/user.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="register-page">
      <div class="register-container">
        <div class="register-card card">
          <div class="register-header">
            <div class="logo">
              <i class="material-icons">recycling</i>
              <span>WasteManager</span>
            </div>
            <h1 class="register-title">Créer un compte</h1>
            <p class="register-subtitle">
              Rejoignez notre plateforme pour une gestion intelligente de vos déchets
            </p>
          </div>

          <!-- Sélection du type de compte -->
          <div class="account-type-section">
            <h3>Type de compte</h3>
            <div class="account-types">
              <label class="account-type-option">
                <input 
                  type="radio" 
                  name="accountType" 
                  value="client"
                  [(ngModel)]="userData.role">
                <div class="account-type-card">
                  <i class="material-icons">person</i>
                  <h4>Client</h4>
                  <p>Particulier ou entreprise souhaitant souscrire à un service de collecte</p>
                </div>
              </label>
              <label class="account-type-option">
                <input 
                  type="radio" 
                  name="accountType" 
                  value="agency"
                  [(ngModel)]="userData.role">
                <div class="account-type-card">
                  <i class="material-icons">business</i>
                  <h4>Agence</h4>
                  <p>Entreprise de collecte de déchets proposant ses services</p>
                </div>
              </label>
            </div>
          </div>

          <form class="register-form" (ngSubmit)="onRegister()" #registerForm="ngForm">
            <!-- Informations personnelles -->
            <div class="form-section">
              <h3>Informations personnelles</h3>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="firstName">
                    <i class="material-icons">person</i>
                    Prénom *
                  </label>
                  <input 
                    type="text" 
                    id="firstName"
                    name="firstName"
                    [(ngModel)]="userData.firstName"
                    class="form-control"
                    placeholder="Votre prénom"
                    required
                    #firstNameInput="ngModel">
                  <div class="form-error" *ngIf="firstNameInput.invalid && firstNameInput.touched">
                    Le prénom est requis
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label" for="lastName">
                    <i class="material-icons">person</i>
                    Nom *
                  </label>
                  <input 
                    type="text" 
                    id="lastName"
                    name="lastName"
                    [(ngModel)]="userData.lastName"
                    class="form-control"
                    placeholder="Votre nom"
                    required
                    #lastNameInput="ngModel">
                  <div class="form-error" *ngIf="lastNameInput.invalid && lastNameInput.touched">
                    Le nom est requis
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="email">
                  <i class="material-icons">email</i>
                  Adresse email *
                </label>
                <input 
                  type="email" 
                  id="email"
                  name="email"
                  [(ngModel)]="userData.email"
                  class="form-control"
                  placeholder="votre@email.com"
                  required
                  #emailInput="ngModel">
                <div class="form-error" *ngIf="emailInput.invalid && emailInput.touched">
                  Veuillez saisir une adresse email valide
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="phone">
                  <i class="material-icons">phone</i>
                  Téléphone *
                </label>
                <input 
                  type="tel" 
                  id="phone"
                  name="phone"
                  [(ngModel)]="userData.phone"
                  class="form-control"
                  placeholder="+33 1 23 45 67 89"
                  required
                  #phoneInput="ngModel">
                <div class="form-error" *ngIf="phoneInput.invalid && phoneInput.touched">
                  Le numéro de téléphone est requis
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="arrondissement">
                  <i class="material-icons">map</i>
                  Arrondissement *
                </label>
                <input 
                  type="text" 
                  id="arrondissement"
                  name="arrondissement"
                  [(ngModel)]="userData.arrondissement"
                  class="form-control"
                  placeholder="5"
                  required>
              </div>
            </div>

            <!-- Adresse (pour les clients) -->
            <div class="form-section" *ngIf="userData.role === 'client'">
              <h3>Adresse de collecte</h3>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="street">
                    <i class="material-icons">location_on</i>
                    Rue *
                  </label>
                  <input 
                    type="text" 
                    id="street"
                    name="street"
                    [(ngModel)]="userData.address.street"
                    class="form-control"
                    placeholder="Nom de la rue"
                    required>
                </div>

                <div class="form-group">
                  <label class="form-label" for="doorNumber">
                    <i class="material-icons">home</i>
                    Numéro *
                  </label>
                  <input 
                    type="text" 
                    id="doorNumber"
                    name="doorNumber"
                    [(ngModel)]="userData.address.doorNumber"
                    class="form-control"
                    placeholder="123"
                    required>
                </div>

                <div class="form-group">
                  <label class="form-label" for="doorColor">
                    <i class="material-icons">palette</i>
                    Couleur porte
                  </label>
                  <select 
                    id="doorColor"
                    name="doorColor"
                    [(ngModel)]="userData.address.doorColor"
                    class="form-control">
                    <option value="">Sélectionner</option>
                    <option value="blanc">Blanc</option>
                    <option value="noir">Noir</option>
                    <option value="marron">Marron</option>
                    <option value="bleu">Bleu</option>
                    <option value="rouge">Rouge</option>
                    <option value="vert">Vert</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="neighborhood">
                    <i class="material-icons">location_city</i>
                    Quartier *
                  </label>
                  <input 
                    type="text" 
                    id="neighborhood"
                    name="neighborhood"
                    [(ngModel)]="userData.address.neighborhood"
                    class="form-control"
                    placeholder="Nom du quartier"
                    required>
                </div>

                <div class="form-group">
                  <label class="form-label" for="city">
                    <i class="material-icons">location_city</i>
                    Ville *
                  </label>
                  <input 
                    type="text" 
                    id="city"
                    name="city"
                    [(ngModel)]="userData.address.city"
                    class="form-control"
                    placeholder="Nom de la ville"
                    required>
                </div>

                <div class="form-group">
                  <label class="form-label" for="postalCode">
                    <i class="material-icons">markunread_mailbox</i>
                    Code postal *
                  </label>
                  <input 
                    type="text" 
                    id="postalCode"
                    name="postalCode"
                    [(ngModel)]="userData.address.postalCode"
                    class="form-control"
                    placeholder="75001"
                    required>
                </div>
              </div>
            </div>

            <!-- Informations agence -->
            <div class="form-section" *ngIf="userData.role === 'agency'">
              <h3>Informations de l'agence</h3>
              
              <div class="form-group">
                <label class="form-label" for="agencyName">
                  <i class="material-icons">business</i>
                  Nom de l'agence *
                </label>
                <input 
                  type="text" 
                  id="agencyName"
                  name="agencyName"
                  [(ngModel)]="userData.agencyName"
                  class="form-control"
                  placeholder="Nom de votre agence"
                  required>
              </div>

              <div class="form-group">
                <label class="form-label" for="agencyDescription">
                  <i class="material-icons">description</i>
                  Description
                </label>
                <textarea 
                  id="agencyDescription"
                  name="agencyDescription"
                  [(ngModel)]="userData.agencyDescription"
                  class="form-control"
                  placeholder="Décrivez vos services..."
                  rows="3"></textarea>
              </div>
            </div>

            <!-- Mot de passe -->
            <div class="form-section">
              <h3>Sécurité</h3>
              
              <div class="form-group">
                <label class="form-label" for="password">
                  <i class="material-icons">lock</i>
                  Mot de passe *
                </label>
                <div class="password-input">
                  <input 
                    [type]="showPassword ? 'text' : 'password'"
                    id="password"
                    name="password"
                    [(ngModel)]="userData.password"
                    class="form-control"
                    placeholder="Minimum 8 caractères"
                    required
                    minlength="8"
                    #passwordInput="ngModel">
                  <button 
                    type="button" 
                    class="password-toggle"
                    (click)="togglePassword()">
                    <i class="material-icons">{{ showPassword ? 'visibility_off' : 'visibility' }}</i>
                  </button>
                </div>
                <div class="password-strength">
                  <div class="strength-bar" [class]="getPasswordStrength()"></div>
                  <span class="strength-text">{{ getPasswordStrengthText() }}</span>
                </div>
                <div class="form-error" *ngIf="passwordInput.invalid && passwordInput.touched">
                  Le mot de passe doit contenir au moins 8 caractères
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="confirmPassword">
                  <i class="material-icons">lock</i>
                  Confirmer le mot de passe *
                </label>
                <input 
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  [(ngModel)]="userData.confirmPassword"
                  class="form-control"
                  placeholder="Répétez votre mot de passe"
                  required
                  #confirmPasswordInput="ngModel">
                <div class="form-error" *ngIf="confirmPasswordInput.touched && userData.password !== userData.confirmPassword">
                  Les mots de passe ne correspondent pas
                </div>
              </div>
            </div>

            <!-- Conditions -->
            <div class="form-section">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  [(ngModel)]="userData.termsAccepted"
                  name="termsAccepted"
                  required>
                <span class="checkmark"></span>
                J'accepte les <a routerLink="/terms" target="_blank">conditions d'utilisation</a> 
                et la <a routerLink="/privacy" target="_blank">politique de confidentialité</a>
              </label>

              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  [(ngModel)]="userData.receiveOffers"
                  name="receiveOffers">
                <span class="checkmark"></span>
                Je souhaite recevoir les actualités et offres par email
              </label>
            </div>

            <button 
              type="submit" 
              class="btn btn-primary btn-full"
              [disabled]="isLoading || registerForm.invalid || !acceptTerms || userData.password !== userData.confirmPassword">
              <i class="material-icons" *ngIf="isLoading">hourglass_empty</i>
              <i class="material-icons" *ngIf="!isLoading">person_add</i>
              {{ isLoading ? 'Création...' : 'Créer mon compte' }}
            </button>
          </form>

          <div class="register-footer">
            <p>
              Déjà un compte ? 
              <a routerLink="/login" class="login-link">Se connecter</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .register-page {
      min-height: 100vh;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      padding: 20px;
    }

    .register-container {
      max-width: 600px;
      margin: 0 auto;
    }

    .register-card {
      padding: 40px;
      margin: 20px 0;
    }

    .register-header {
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

    .register-title {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 8px;
      color: var(--text-primary);
    }

    .register-subtitle {
      color: var(--text-secondary);
      line-height: 1.5;
    }

    .account-type-section {
      margin-bottom: 32px;
    }

    .account-type-section h3 {
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 16px;
      color: var(--text-primary);
    }

    .account-types {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .account-type-option {
      cursor: pointer;
    }

    .account-type-option input[type="radio"] {
      display: none;
    }

    .account-type-card {
      padding: 20px;
      border: 2px solid var(--medium-gray);
      border-radius: 12px;
      text-align: center;
      transition: all 0.3s ease;
    }

    .account-type-option input[type="radio"]:checked + .account-type-card {
      border-color: var(--primary-color);
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      color: var(--white);
    }

    .account-type-card i {
      font-size: 32px;
      margin-bottom: 12px;
      color: var(--primary-color);
    }

    .account-type-option input[type="radio"]:checked + .account-type-card i {
      color: var(--white);
    }

    .account-type-card h4 {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .account-type-card p {
      font-size: 0.9rem;
      opacity: 0.8;
      line-height: 1.4;
    }

    .form-section {
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--medium-gray);
    }

    .form-section:last-of-type {
      border-bottom: none;
    }

    .form-section h3 {
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 20px;
      color: var(--text-primary);
    }

    .form-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
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

    textarea.form-control {
      resize: vertical;
      min-height: 80px;
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

    .password-strength {
      margin-top: 8px;
    }

    .strength-bar {
      height: 4px;
      border-radius: 2px;
      margin-bottom: 4px;
      transition: all 0.3s ease;
    }

    .strength-bar.weak {
      width: 33%;
      background: var(--error-color);
    }

    .strength-bar.medium {
      width: 66%;
      background: var(--warning-color);
    }

    .strength-bar.strong {
      width: 100%;
      background: var(--success-color);
    }

    .strength-text {
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .form-error {
      color: var(--error-color);
      font-size: 0.8rem;
      margin-top: 4px;
    }

    .checkbox-label {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      cursor: pointer;
      font-size: 0.9rem;
      color: var(--text-secondary);
      margin-bottom: 16px;
      line-height: 1.5;
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
      flex-shrink: 0;
      margin-top: 2px;
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

    .checkbox-label a {
      color: var(--primary-color);
      text-decoration: none;
    }

    .checkbox-label a:hover {
      text-decoration: underline;
    }

    .btn-full {
      width: 100%;
      padding: 16px;
      font-size: 1.1rem;
      font-weight: 600;
      margin-top: 8px;
    }

    .register-footer {
      text-align: center;
      padding-top: 24px;
      border-top: 1px solid var(--medium-gray);
      margin-top: 24px;
    }

    .login-link {
      color: var(--primary-color);
      text-decoration: none;
      font-weight: 500;
    }

    .login-link:hover {
      text-decoration: underline;
    }

    @media (max-width: 768px) {
      .register-page {
        padding: 16px;
      }

      .register-card {
        padding: 24px;
      }

      .account-types {
        grid-template-columns: 1fr;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .register-title {
        font-size: 1.8rem;
      }
    }
  `]
})
export class RegisterComponent implements OnInit {
  userData = {
    role: 'client' as UserRole,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    arrondissement: '', // <-- Ajouté
    address: {
      street: '',
      doorNumber: '',
      doorColor: '',
      neighborhood: '',
      city: '',
      postalCode: ''
    },
    agencyName: '',
    agencyDescription: '',
    termsAccepted: false, // <-- Ajouté
    receiveOffers: false  // <-- Ajouté
  };

  showPassword = false;
  acceptTerms = false;
  acceptNewsletter = false;
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {}

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  getPasswordStrength(): string {
    const password = this.userData.password;
    if (password.length < 6) return 'weak';
    if (password.length < 10) return 'medium';
    return 'strong';
  }

  getPasswordStrengthText(): string {
    const strength = this.getPasswordStrength();
    const texts = {
      weak: 'Faible',
      medium: 'Moyen',
      strong: 'Fort'
    };
    return texts[strength as keyof typeof texts] || '';
  }

  onRegister(): void {
    if (!this.validateForm()) {
      return;
    }

    this.isLoading = true;

    let body: any;
    if (this.userData.role === 'client') {
      body = {
        firstName: this.userData.firstName,
        lastName: this.userData.lastName,
        email: this.userData.email,
        phone: this.userData.phone,
        password: this.userData.password,
        confirmPassword: this.userData.confirmPassword,
        role: this.userData.role,
        arrondissement: this.userData.arrondissement,
        rue: this.userData.address.street,
        numero: this.userData.address.doorNumber,
        couleurPorte: this.userData.address.doorColor,
        quartier: this.userData.address.neighborhood,
        ville: this.userData.address.city,
        codePostal: this.userData.address.postalCode,
        termsAccepted: this.userData.termsAccepted,
        receiveOffers: this.userData.receiveOffers
      };
      console.log('[DEBUG] Body envoyé à registerClient:', body);
      this.authService.registerClient(body).subscribe({
        next: (response) => {
          console.log('[DEBUG] Réponse API registerClient:', response);
          this.isLoading = false;
          if (response.success && response.user) {
            this.notificationService.showSuccess(
              'Compte créé avec succès', 
              `Bienvenue ${response.user.firstName} ! Votre compte a été créé.`
            );
            this.redirectToDashboard(response.user.role);
          } else {
            this.notificationService.showError('Erreur', response.error || 'Erreur lors de la création du compte');
          }
        },
        error: (error) => {
          this.isLoading = false;
          console.error('[DEBUG] Erreur API registerClient:', error);
          this.notificationService.showError('Erreur', 'Une erreur est survenue lors de la création du compte');
        }
      });
      return;
    }

    // Autres rôles : ancien comportement
    body = { ...this.userData };
    this.authService.register(body).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.user) {
          this.notificationService.showSuccess(
            'Compte créé avec succès', 
            `Bienvenue ${response.user.firstName} ! Votre compte a été créé.`
          );
          this.redirectToDashboard(response.user.role);
        } else {
          this.notificationService.showError('Erreur', response.error || 'Erreur lors de la création du compte');
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.notificationService.showError('Erreur', 'Une erreur est survenue lors de la création du compte');
      }
    });
  }

  private validateForm(): boolean {
    if (!this.userData.firstName || !this.userData.lastName || !this.userData.email || !this.userData.phone) {
      this.notificationService.showError('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return false;
    }

    if (this.userData.password !== this.userData.confirmPassword) {
      this.notificationService.showError('Erreur', 'Les mots de passe ne correspondent pas');
      return false;
    }

    if (this.userData.password.length < 8) {
      this.notificationService.showError('Erreur', 'Le mot de passe doit contenir au moins 8 caractères');
      return false;
    }

    if (!this.userData.termsAccepted) {
      this.notificationService.showError('Erreur', 'Vous devez accepter les conditions d\'utilisation');
      return false;
    }

    if (this.userData.role === 'client') {
      if (!this.userData.address.street || !this.userData.address.doorNumber || 
          !this.userData.address.neighborhood || !this.userData.address.city || 
          !this.userData.address.postalCode) {
        this.notificationService.showError('Erreur', 'Veuillez remplir tous les champs d\'adresse');
        return false;
      }
    }

    if (this.userData.role === 'agency' && !this.userData.agencyName) {
      this.notificationService.showError('Erreur', 'Le nom de l\'agence est requis');
      return false;
    }

    return true;
  }

  private redirectToDashboard(role: string): void {
    const dashboardRoutes = {
      client: '/dashboard/client',
      agency: '/dashboard/agency',
      collector: '/dashboard/collector',
      municipality: '/dashboard/municipality'
    };

    const route = dashboardRoutes[role as keyof typeof dashboardRoutes] || '/';
    this.router.navigate([route]);
  }
}