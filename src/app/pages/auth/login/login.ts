import { Component, OnInit } from '@angular/core';

import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-login',
  imports: [RouterModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnInit {
  credentials = {
    email: '',
    phone: '',
    password: ''
  };
  loginType = { 
    type: 'phone' 
  };
  showPassword = false;
  rememberMe = false;
  isLoading = false;

  // Error handling properties
  validationErrors: { [key: string]: string[] } = {};
  generalError: string = '';
  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {}

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }
  clearError(): void {
    this.generalError = '';
  }
  formatPhone(phone: any): string {
    if (!phone) return '';

    const phoneStr = String(phone).trim();

    return phoneStr
      .replace(/\s+/g, '')
      .replace(/^\+?(226|225)?/, '');
  }
  onLogin(): void {
    if (!(this.credentials.email || this.credentials.phone) || !this.credentials.password) {
      this.notificationService.showError('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    // Basic email validation

    const phoneNumber= this.formatPhone(this.credentials.phone);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{8,}$/;
    if (!emailRegex.test(this.credentials.email ) && !phoneRegex.test(phoneNumber) ) {
      if(this.credentials.email){
        this.notificationService.showError('Erreur', 'Veuillez saisir une adresse email valide');
        return;
      }
      this.notificationService.showError('Erreur', 'Veuillez saisir un numéro de téléphone');
      return;
    }

    this.isLoading = true;
    console.log('[DEBUG] Login attempt with:', this.credentials.email);
    
    this.authService.loginUser(this.credentials.email || phoneNumber, this.credentials.password).subscribe({
      next: (response: any) => {
        console.log('[DEBUG] Login response:', response);
        this.isLoading = false;
        
        if (response?.success && response?.user) {
          const user = response.user;
          const welcomeName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
          
          this.notificationService.showSuccess(
            'Connexion réussie', 
            `Bienvenue ${welcomeName || 'utilisateur'} !`
          );
          
          // Redirect based on user role
          this.redirectToDashboard(user.role);
        } else {
          this.isLoading = false;
          console.error('[ERROR] Login failed:', response);
          this.handleRegistrationError(response?.error || response?.error.message || response?.error);
        }
      },
      error: (error) => {
        console.error('[ERROR] Login failed:', error);
        this.isLoading = false;
        this.handleRegistrationError(error.error || error.message || error);
        this.notificationService.showError(
          'Erreur de connexion', 
          'Une erreur est survenue lors de la connexion'
        );
      }
    });
  }
/**
   * Handles registration errors and displays appropriate messages
   */
  private handleRegistrationError(error: string | { [key: string]: string[] } | undefined, fallbackMessage?: string): void {
    this.validationErrors = {};
    this.generalError = '';

    if (typeof error === 'object' && error !== null) {
      // Handle field-specific validation errors
      this.validationErrors = error;
      this.notificationService.showError(
        'Erreurs de validation',
        'Veuillez corriger les erreurs dans le formulaire'
      );
    } else if (typeof error === 'string' && error.trim()) {
      // Handle general error message
      this.generalError = error;
      this.notificationService.showError('Erreur de connexion', error);
    } else {
      // Handle fallback error
      const message = fallbackMessage || 'Une erreur inconnue s\'est produite';
      this.generalError = message;
      this.notificationService.showError('Erreur de connexion', message);
    }
  }

  loginAsDemo(role: string): void {
    const demoCredentials = {
      client: { email: 'client@demo.com', password: 'demo123',phone: '1234567890' },
      agency: { email: 'agency@demo.com', password: 'demo123',phone: '1234567890' },
      collector: { email: 'collector@demo.com', password: 'demo123',phone: '1234567890' },
      municipality: { email: 'municipality@demo.com', password: 'demo123',phone: '1234567890' },
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
      manager: '/dashboard/agency',
      collector: '/dashboard/collector',
      municipality: '/dashboard/municipality',
      super_admin: '/dashboard/admin'
    };

    const route = dashboardRoutes[role as keyof typeof dashboardRoutes] || '/';
    // replaceUrl : /login ne doit pas rester dans l'historique du navigateur après une
    // connexion réussie, sinon le bouton "précédent" y ramènerait l'utilisateur avant
    // même que guestGuard n'ait la main.
    this.router.navigate([route], { replaceUrl: true });
  }
}