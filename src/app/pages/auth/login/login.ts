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
    this.authService.loginUser(this.credentials.email, this.credentials.password).subscribe({
      next: (response: any) => {
        console.log('response login', response);
        this.isLoading = false;
        if (response?.user) {
          this.notificationService.showSuccess('Connexion réussie', `Bienvenue ${response?.user?.firstName ?? response?.user?.firstname} ${response?.user?.lastName ?? response?.user?.lastname} !`);
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