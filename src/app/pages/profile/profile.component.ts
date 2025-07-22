import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="profile-page">
      <div class="page-header">
        <div class="container">
          <h1 class="page-title">Mon Profil</h1>
          <p class="page-subtitle">
            Gérez vos informations personnelles et préférences
          </p>
        </div>
      </div>

      <div class="container">
        <div class="profile-content" *ngIf="user">
          <div class="profile-card card">
            <div class="profile-header">
              <!--<div class="avatar">
                <img [src]="user.avatar || '/assets/default-avatar.png'" [alt]="user.firstName">
              </div> -->
              <div class="user-info">
                <h2>{{ user.firstName }} {{ user.lastName }}</h2>
                <p>{{ user.email }}</p>
                <span class="role-badge">{{ getRoleLabel(user.role) }}</span>
              <img [src]="user.avatar || 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop'" [alt]="user.firstName">
            </div>

            <form class="profile-form" (ngSubmit)="onSave()">
              <div class="form-section">
                <h3>Informations personnelles</h3>
                <ng-container *ngIf="user.role === 'super_admin'; else otherRole">
                <div class="form-row">
                  <div class="form-group">
                    <label for="firstName">Prénom</label>
                    <input type="text" id="firstName" [(ngModel)]="user.firstname" name="firstName">
                  </div>
                  <div class="form-group">
                    <label for="lastName">Nom</label>
                    <input type="text" id="lastName" [(ngModel)]="user.lastname" name="lastName">
                  </div>
                </div>
                </ng-container>
                <ng-template    #otherRole>
                <div class="form-row">
                  <div class="form-group">
                    <label for="firstName">Prénom</label>
                    <input type="text" id="firstName" [(ngModel)]="user.firstName" name="firstName">
                  </div>
                  <div class="form-group">
                    <label for="lastName">Nom</label>
                    <input type="text" id="lastName" [(ngModel)]="user.lastName" name="lastName">
                  </div>
                </div>
                </ng-template>
                <div class="form-group">
                  <label for="email">Email</label>
                  <input type="email" id="email" [(ngModel)]="user.email" name="email">
                </div>

                <div class="form-group">
                  <label for="phone">Téléphone</label>
                  <input type="tel" id="phone" [(ngModel)]="user.phone" name="phone">
                </div>
              </div>

              <div class="form-actions">
                <button type="submit" class="btn btn-primary">
                  <i class="material-icons">save</i>
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-page {
      min-height: 100vh;
      background: var(--light-gray);
    }

    .profile-content {
      max-width: 600px;
      margin: 0 auto;
    }

    .profile-card {
      padding: 32px;
    }

    .profile-header {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--medium-gray);
    }

    .avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      overflow: hidden;
    }

    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .user-info h2 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 4px;
      color: var(--text-primary);
    }

    .user-info p {
      color: var(--text-secondary);
      margin-bottom: 8px;
    }

    .role-badge {
      padding: 4px 12px;
      background: var(--primary-color);
      color: var(--white);
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .form-section {
      margin-bottom: 24px;
    }

    .form-section h3 {
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 16px;
      color: var(--text-primary);
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: var(--text-primary);
    }

    .form-group input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid var(--medium-gray);
      border-radius: 8px;
      font-family: 'Inter', sans-serif;
      transition: border-color 0.3s ease;
    }

    .form-group input:focus {
      outline: none;
      border-color: var(--primary-color);
    }

    .form-actions {
      text-align: right;
      padding-top: 24px;
      border-top: 1px solid var(--medium-gray);
    }

    @media (max-width: 768px) {
      .profile-header {
        flex-direction: column;
        text-align: center;
      }

      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ProfileComponent implements OnInit {
  user: any;

  constructor(private authService: AuthService) { }

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    console.log('Current user:', this.user);
  }

  getRoleLabel(role: string): string {
    const roleLabels: { [key: string]: string } = {
      'client': 'Client',
      'agency': 'Agence',
      'collector': 'Collecteur',
      'municipality': 'Mairie'
    };
    return roleLabels[role] || role;
  }

  onSave(): void {
    const userEdit = {
      email: this.user.email,
      firstName: this.user.firstName,
      lastName: this.user.lastName,
      phone: this.user.phone
    }
    console.log('Profile saved:', userEdit);
    this.authService.updateClient(this.user?.id, userEdit).subscribe(
      response => {
        console.log('Profile updated successfully:', response);
      },
      error => {
        console.error('Error updating profile:', error);
      }
    );
    // Handle profile save
  }
}