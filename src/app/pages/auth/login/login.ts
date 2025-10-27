import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, RouterModule, FormsModule],
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
    if (!(this.credentials.email || this.credentials.phone) || !this.credentials.password) {
      this.notificationService.showError('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{8,}$/;
    if (!emailRegex.test(this.credentials.email ) && !phoneRegex.test(this.credentials.phone) ) {
      if(this.credentials.email){
        this.notificationService.showError('Erreur', 'Veuillez saisir une adresse email valide');
        return;
      }
      this.notificationService.showError('Erreur', 'Veuillez saisir un numéro de téléphone');
      return;
    }

    this.isLoading = true;
    console.log('[DEBUG] Login attempt with:', this.credentials.email);
    
    this.authService.loginUser(this.credentials.email || this.credentials.phone, this.credentials.password).subscribe({
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
          this.notificationService.showError(
            'Erreur de connexion', 
            response?.error || 'Email ou mot de passe incorrect'
          );
        }
      },
      error: (error) => {
        console.error('[ERROR] Login failed:', error);
        this.isLoading = false;
        this.notificationService.showError(
          'Erreur de connexion', 
          'Une erreur est survenue lors de la connexion'
        );
      }
    });
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
      agency: '/dashboard/agency',
      collector: '/dashboard/collector',
      municipality: '/dashboard/municipality',
      super_admin: '/dashboard/admin'
    };

    const route = dashboardRoutes[role as keyof typeof dashboardRoutes] || '/';
    this.router.navigate([route]);
  }
}