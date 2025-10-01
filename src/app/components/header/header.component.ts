import { Component, OnInit, HostListener, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User, UserRole } from '../../models/user.model';
import { NotificationService } from '../../services/notification.service';
import { MatIconModule } from '@angular/material/icon';
import { interval, Subscription, switchMap } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  template: `
    <header class="navbar" [class.scrolled]="isScrolled">
      <div class="container">
        <div class="navbar-content">
          <!-- Logo et Brand -->
          <div class="navbar-brand">
            <a routerLink="/" class="brand-link">
              <!-- <div class="brand-icon">
                <i class="material-icons">eco</i>
              </div> -->
              <div class="brand-logo">
                <!-- <i class="material-icons">eco</i> -->
                <img src="assets/homeUseCases/Zéro_Déchet.png" alt="Logo ZéroDéchet+" class="logo">
              </div>
              <div class="brand-text">
                <span class="brand-name">ZéroDéchet+</span>
                <span class="brand-tagline">Collecter aujourd’hui, préserver demain.</span>
              </div>
            </a>
          </div>

          <!-- Navigation Desktop -->
          <nav class="navbar-nav desktop-nav">
            <div class="nav-group">
              <a routerLink="/" class="nav-link">
                <i class="material-icons">home</i>
                <span>Accueil</span>
              </a>
              <a routerLink="/agencies" class="nav-link" routerLinkActive="active">
                <i class="material-icons">business</i>
                <span>Agences</span>
              </a>
              <a routerLink="/waste-types" class="nav-link" routerLinkActive="active">
                <i class="material-icons">recycling</i>
                <span>Types de déchets</span>
              </a>
              <a routerLink="/faq" class="nav-link" routerLinkActive="active">
                <i class="material-icons">help</i>
                <span>FAQ</span>
              </a>
            </div>

            <!-- Actions utilisateur -->
            <div class="nav-actions" *ngIf="!isAuthenticated">
              <a routerLink="/login" class="nav-link login-link">
                <i class="material-icons">login</i>
                <span>Connexion</span>
              </a>
              <a routerLink="/register" class="btn btn-primary nav-cta">
                <i class="material-icons">person_add</i>
                <span>S'inscrire</span>
              </a>
            </div>
<div class="notification-bell" *ngIf="isAuthenticated">
  <i class="material-icons" (click)="toggleNotifications()">notifications</i>
  <span class="badge" *ngIf="unreadCount() > 0">{{ unreadCount() }}</span>

  <div class="dropdown-notification" [class.show]="showNotifications">
    <div class="dropdown-header">
      <strong>Notifications</strong>
    </div>

    <div class="notifications-list">
      <ng-container *ngIf="notifications && notifications.length > 0; else noNotif">
        <div *ngFor="let notif of notifications" 
             class="notification-item" 
             [class.read]="notif.read" 
             [class.unread]="!notif.read"
             (click)="markAsRead(notif._id)"
               (click)="navigateToNotification(notif)">
          
          <div class="notification-content">
            <span class="notification-title">{{ notif.type }}</span>
            <span class="notification-date">{{ notif.createdAt | date:'short' }}</span>
            <p class="notification-comment">{{ notif.message }}</p>
          </div>

          <div class="notif-actions">
            <button class="icon-btn delete-btn" title="Supprimer" (click)="deleteNotification(notif._id); $event.stopPropagation()">
              <i class="material-icons">delete</i>
            </button>
          </div>
 <mat-icon *ngIf="notif.read" class="read-indicator"
                    style="font-size: 18px;">done_all</mat-icon>
          <!-- <div class="read-indicator" *ngIf="notif.read">
           
          </div> -->
        </div>
      </ng-container>

      <ng-template #noNotif>
        <div class="empty-notification">Aucune notification</div>
      </ng-template>
    </div>
  </div>
</div>


            <!-- Menu utilisateur connecté -->
            <div class="user-menu" *ngIf="isAuthenticated && currentUser" 
                 (mouseenter)="showUserMenu = true" 
                 (mouseleave)="showUserMenu = false">
              <div class="user-trigger">
                <div class="user-avatar">
                  <img [src]="currentUser.avatar || 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop'" 
                       [alt]="currentUser.firstName">
                </div>
                <div class="user-info">
                  <span class="user-name">{{ currentUser.firstName ? currentUser.firstName : currentUser.firstname }} {{ currentUser.lastName? currentUser.lastName : currentUser.lastname }}</span>
                  <span class="user-role">{{ getRoleLabel(currentUser.role) }}</span>
                </div>
                <i class="material-icons dropdown-icon" 
                   [class.rotated]="showUserMenu">expand_more</i>
              </div>

              <div class="user-dropdown" [class.show]="showUserMenu">
                <div class="dropdown-header">
                  <div class="user-details">
                    <strong>{{ currentUser.firstName ? currentUser.firstName : currentUser.firstname }} {{ currentUser.lastName ? currentUser.lastName : currentUser.lastname }}</strong>
                    <span>{{ currentUser.email }}</span>
                  </div>
                </div>
                <div class="dropdown-divider"></div>
                <a [routerLink]="getDashboardRoute()" class="dropdown-item">
                  <i class="material-icons">dashboard</i>
                  <span>Tableau de bord</span>
                </a>
                <a routerLink="/profile" class="dropdown-item">
                  <i class="material-icons">person</i>
                  <span>Mon profil</span>
                </a>
                <a *ngIf="currentUser?.role === 'client'" routerLink="/subscription" class="dropdown-item">
                  <i class="material-icons">card_membership</i>
                  <span>Mon abonnement</span>
                </a>
                <div class="dropdown-divider"></div>
                <button (click)="logout()" class="dropdown-item logout-item">
                  <i class="material-icons">logout</i>
                  <span>Déconnexion</span>
                </button>
              </div>
            </div>
          </nav>

          <!-- Bouton menu mobile -->
          <button class="mobile-menu-toggle" 
                  (click)="toggleMobileMenu()"
                  [class.active]="isMobileMenuOpen">
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
          </button>
        </div>

        <!-- Menu mobile -->
        <div class="mobile-menu" [class.open]="isMobileMenuOpen">
          <div class="mobile-menu-content">
            <div class="mobile-nav-links">
              <a routerLink="/" class="mobile-nav-link" (click)="closeMobileMenu()">
                <i class="material-icons">home</i>
                <span>Accueil</span>
              </a>
              <a routerLink="/agencies" class="mobile-nav-link" (click)="closeMobileMenu()">
                <i class="material-icons">business</i>
                <span>Agences</span>
              </a>
              <a routerLink="/waste-types" class="mobile-nav-link" (click)="closeMobileMenu()">
                <i class="material-icons">recycling</i>
                <span>Types de déchets</span>
              </a>
              <a routerLink="/faq" class="mobile-nav-link" (click)="closeMobileMenu()">
                <i class="material-icons">help</i>
                <span>FAQ</span>
              </a>
            </div>

            <div class="mobile-auth-section" *ngIf="!isAuthenticated">
              <a routerLink="/login" class="mobile-auth-link" (click)="closeMobileMenu()">
                <i class="material-icons">login</i>
                <span>Connexion</span>
              </a>
              <a routerLink="/register" class="btn btn-primary mobile-cta" (click)="closeMobileMenu()">
                <i class="material-icons">person_add</i>
                <span>S'inscrire</span>
              </a>
            </div>

            <div class="mobile-user-section" *ngIf="isAuthenticated && currentUser">
              <div class="mobile-user-info">
                <div class="mobile-user-avatar">
                  <img [src]="currentUser.avatar || 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop'" 
                       [alt]="currentUser.firstName">
                </div>
                <div class="mobile-user-details">
                  <strong>{{ currentUser.email }} {{ currentUser.lastName }}</strong>
                  <span>{{ getRoleLabel(currentUser.role) }}</span>
                </div>
              </div>
              <div class="mobile-user-actions">
                <a [routerLink]="getDashboardRoute()" class="mobile-nav-link" (click)="closeMobileMenu()">
                  <i class="material-icons">dashboard</i>
                  <span>Tableau de bord</span>
                </a>
                <a routerLink="/profile" class="mobile-nav-link" (click)="closeMobileMenu()">
                  <i class="material-icons">person</i>
                  <span>Mon profil</span>
                </a>
                <a *ngIf="currentUser?.role === 'client'" routerLink="/subscription" class="dropdown-item">
                  <i class="material-icons">card_membership</i>
                  <span>Mon abonnement</span>
                </a>
                <button (click)="logout(); closeMobileMenu()" class="mobile-nav-link logout-mobile">
                  <i class="material-icons">logout</i>
                  <span>Déconnexion</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Overlay pour fermer le menu mobile -->
      <div class="mobile-menu-overlay" 
           [class.show]="isMobileMenuOpen" 
           (click)="closeMobileMenu()"></div>
    </header>
  `,
  styles: [`
  
    .navbar {
      /* background-color: red; */
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      min-width: 99vw;
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      position: sticky;
      top: 0;
      z-index: 1000;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .navbar.scrolled {
      background: rgba(255, 255, 255, 0.98);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      border-bottom-color: rgba(0, 0, 0, 0.1);
    }

    .container {
      max-width: 100%;
      margin: 0 auto;
      /* background-color: red; */
      padding: 0 24px;
    }

    .navbar-content {
      width:100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 74px;
      /* font-size: 24px; */
    }

    /* Brand */
    .navbar-brand {
      flex-shrink: 0;
    }

    .brand-link {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
      transition: transform 0.3s ease;
    }

    .brand-link:hover {
      transform: scale(1.02);
    }

    .brand-icon {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 30px;
      box-shadow: 0 4px 12px rgba(0, 188, 212, 0.3);
    }

    .brand-logo {
      width: 70px;
      height: 70px;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 30px;
      box-shadow: 0 4px 12px rgba(0, 188, 212, 0.3);
    }

    .brand-logo img{
      border-radius: 20px;
    }

    .brand-text {
      display: flex;
      flex-direction: column;
    }

    .brand-name {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1;
    }

    .brand-tagline {
      font-size: 0.75rem;
      color: var(--text-secondary);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Navigation Desktop */
    .desktop-nav {
      display: flex;
      align-items: center;
      gap: 32px;
    }

    .nav-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      color: var(--text-primary);
      text-decoration: none;
      font-weight: 500;
      border-radius: 12px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
    }

    .nav-link:hover {
      background: rgba(0, 188, 212, 0.08);
      color: var(--primary-color);
      transform: translateY(-1px);
      height: 40px;
    }

    .nav-link.active {
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      color: white;
      box-shadow: 0 2px 12px rgba(0, 188, 212, 0.3);
      height: 35px;
    }

    .nav-link i {
      font-size: 20px;
    }

    /* Actions utilisateur */
    .nav-actions {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .login-link {
      color: var(--text-secondary);
    }

    .nav-cta {
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      color: white;
      height: 35px;
      padding: 12px 24px;
      border-radius: 25px;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(0, 188, 212, 0.3);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .nav-cta:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 188, 212, 0.4);
    }

    /* Menu utilisateur */
    .user-menu {
      position: relative;
    }

    .user-trigger {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 16px;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .user-trigger:hover {
      background: rgba(0, 188, 212, 0.08);
    }

    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      overflow: hidden;
      border: 2px solid var(--primary-color);
    }

    .user-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
/* ====== Cloche et badge ====== */
.notification-bell {
  position: relative;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  transition: background 0.2s, transform 0.2s;
}

.notification-bell:hover {
  background: rgba(0, 188, 212, 0.08);
  transform: translateY(-2px);
}

.notification-bell .material-icons {
  font-size: 28px;
  color: #333;
  transition: color 0.2s;
}

.notification-bell .material-icons:hover {
  color: #2563eb;
}

/* Badge positionné au-dessus de la cloche */
.notification-bell .badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background-color: #ef4444;
  color: white;
  font-size: 10px;
  font-weight: bold;
  padding: 3px 6px;
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(0,0,0,0.25);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

/* ====== Dropdown notification ====== */
.dropdown-notification {
  position: absolute;
  top: 50px; 
  right: 0;
  width: 300px;
  max-height: 380px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 12px 28px rgba(0,0,0,0.18);
  border: 1px solid rgba(0,0,0,0.08);
  opacity: 0;
  visibility: hidden;
  transform: translateY(-10px);
  transition: all 0.25s ease;
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.dropdown-notification.show {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
  animation: slideInFromTop 0.25s ease-out;
}

/* Header */
.dropdown-header {
  padding: 12px 16px;
  font-weight: 600;
  border-bottom: 1px solid #e5e7eb;
  font-size: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Liste scrollable sans scrollbar visible */
.notifications-list {
  overflow-y: auto;
  max-height: 320px;
  padding: 8px 0;
  scrollbar-width: none;  /* Firefox */
  -ms-overflow-style: none;  /* IE 10+ */
}
.notifications-list::-webkit-scrollbar {
  width: 0;
  height: 0;
}

/* Notification items */
.notification-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  border-radius: 12px;
  margin: 4px 8px;
  background-color: #f9fafb;
  transition: background 0.3s, transform 0.2s;
  gap: 8px;
}

.notification-item:hover {
  background-color: #e0f2fe;
  transform: translateX(1px);
}

.notification-item.read {
  opacity: 0.8;
  background-color: #f3f4f6;
}

/* Contenu de la notification sur une seule ligne */

.notification-content {
  flex: 1; /* prend tout l'espace restant */
  font-size: 13px;
  color: #111827;
}

/* Actions bouton delete et marquer comme lu */
.notif-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.notif-actions .icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  transition: background 0.2s, transform 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notif-actions .icon-btn:hover {
  background: #f0f0f0;
  transform: scale(1.1);
}

.notif-actions .icon-btn i {
  font-size: 16px;
  color: #9ca3af;
}

.notif-actions .icon-btn:hover i {
  color: #ef4444; /* rouge delete */
}

/* Indicateur lecture type WhatsApp */
.read-indicator {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
}

.read-indicator .trait {
  width: 16px;
  height: 2px;
  background-color: #38bdf8; /* bleu */
  border-radius: 2px;
}

/* Animation dropdown */
@keyframes slideInFromTop {
  0% { opacity: 0; transform: translateY(-10px); }
  100% { opacity: 1; transform: translateY(0); }
}

/* Empty notification */
.empty-notification {
  padding: 12px;
  text-align: center;
  color: #6b7280;
  font-size: 12px;
  font-style: italic;
}

.dropdown-header {
  padding: 16px;
  border-bottom: 1px solid var(--medium-gray);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.clear-btn {
  font-size: 0.8rem;
  color: var(--primary-color);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}

.clear-btn:hover {
  background: rgba(0, 188, 212, 0.1);
}



.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  font-size: 1rem;
  display: flex;
  align-items: center;
}

.icon-btn:hover {
  color: #38bdf8;
}





    .user-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      /* gap: 16px; */
      /* padding: 16px; */
      color: var(--text-secondary);
      /* background: rgba(0, 188, 212, 0.05); */
      border-radius: 12px;
      /* margin-bottom: 16px; */
    }



    .dropdown-icon {
      color: var(--text-secondary);
      transition: transform 0.3s ease;
    }

    .dropdown-icon.rotated {
      transform: rotate(180deg);
    }

    /* Dropdown utilisateur */
    .user-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
      min-width: 280px;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-10px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid rgba(0, 0, 0, 0.05);
    }

    .user-dropdown.show {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .dropdown-header {
      padding: 20px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    }

    .user-details strong {
      display: block;
      color: var(--text-primary);
      font-weight: 600;
      margin-bottom: 4px;
    }

    .user-details span {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .dropdown-divider {
      height: 1px;
      background: rgba(0, 0, 0, 0.05);
      margin: 8px 0;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      color: var(--text-primary);
      text-decoration: none;
      border: none;
      background: none;
      width: 100%;
      cursor: pointer;
      transition: all 0.3s ease;
      font-family: inherit;
    }

    .dropdown-item:hover {
      background: rgba(0, 188, 212, 0.08);
      color: var(--primary-color);
    }

    .logout-item:hover {
      background: rgba(244, 67, 54, 0.08);
      color: var(--error-color);
    }

    /* Menu mobile */
    .mobile-menu-toggle {
      display: none;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      width: 40px;
      height: 40px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
    }

    .hamburger-line {
      width: 24px;
      height: 2px;
      background: var(--text-primary);
      margin: 3px 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 2px;
    }

    .mobile-menu-toggle.active .hamburger-line:nth-child(1) {
      transform: rotate(45deg) translate(6px, 6px);
    }

    .mobile-menu-toggle.active .hamburger-line:nth-child(2) {
      opacity: 0;
    }

    .mobile-menu-toggle.active .hamburger-line:nth-child(3) {
      transform: rotate(-45deg) translate(6px, -6px);
    }

    .mobile-menu {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border-top: 1px solid rgba(0, 0, 0, 0.05);
      transform: translateY(-100%);
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
    }

    .mobile-menu.open {
      transform: translateY(0);
      opacity: 1;
      visibility: visible;
    }

    .mobile-menu-content {
      padding: 24px;
    }

    .mobile-nav-links {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 24px;
    }

    .mobile-nav-link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      color: var(--text-primary);
      text-decoration: none;
      border-radius: 12px;
      transition: all 0.3s ease;
      border: none;
      background: none;
      width: 100%;
      cursor: pointer;
      font-family: inherit;
      font-size: 1rem;
    }

    .mobile-nav-link:hover {
      background: rgba(0, 188, 212, 0.08);
      color: var(--primary-color);
    }

    .mobile-auth-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-top: 24px;
      border-top: 1px solid rgba(0, 0, 0, 0.05);
    }

    .mobile-auth-link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      color: var(--text-secondary);
      text-decoration: none;
      border-radius: 12px;
      transition: all 0.3s ease;
    }

    .mobile-cta {
      justify-content: center;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      color: white;
      padding: 16px;
      border-radius: 12px;
      font-weight: 600;
    }

    .mobile-user-section {
      padding-top: 24px;
      border-top: 1px solid rgba(0, 0, 0, 0.05);
    }

    .mobile-user-info {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      color: var(--text-secondary);
      background: rgba(0, 188, 212, 0.05);
      border-radius: 12px;
      margin-bottom: 16px;
    }

    .mobile-user-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      overflow: hidden;
      border: 2px solid var(--primary-color);
    }

    .mobile-user-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .mobile-user-details strong {
      display: block;
      color: var(--text-primary);
      font-weight: 600;
      margin-bottom: 4px;
    }

    .mobile-user-details span {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .mobile-user-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .logout-mobile:hover {
      background: rgba(244, 67, 54, 0.08);
      color: var(--error-color);
    }

    .mobile-menu-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
      z-index: -1;
    }

    .mobile-menu-overlay.show {
      opacity: 1;
      visibility: visible;
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .desktop-nav {
        display: none;
      }

      .mobile-menu-toggle {
        display: flex;
      }
    }
    @media (max-width: 768px) {

      .brand-name {
        font-size: 1.8rem;
      }
      .brand-tagline {
        font-size: 1.1rem;
      }
      .brand-icon {
        width: 52px;
        height: 52px;
        font-size: 34px;
      }
      .navbar-content {
        height: 84px;
      }
      .container {
        padding: 0 16px;
        max-height: 120px;
      }
      .material-icons {
        font-size: 22px;
      }
      .nav-link span,
      .login-link span,
      .nav-cta span {
        font-size: 1rem;
      }
      .mobile-menu-toggle {
        border: 1px solid var(--surface-400);
        width: 50px;
        height: 50px;
        padding: 0;
      }

      /* Mobile menu block: bigger, more touch-friendly */
      .mobile-menu-content {
        padding: 20px;
      }
      .mobile-nav-link,
      .mobile-auth-link {
        padding: 18px;
        font-size: 1.1rem;
      }
      .mobile-nav-link .material-icons,
      .mobile-auth-link .material-icons,
      .mobile-cta .material-icons {
        font-size: 24px;
      }
      .mobile-cta {
        padding: 18px;
        font-size: 1.1rem;
      }
      .mobile-user-avatar {
        width: 56px;
        height: 56px;
      }
      .mobile-user-details strong {
        font-size: 1rem;
      }
      .mobile-user-details span {
        font-size: 0.95rem;
      }
    }
.read-indicator {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-left: 10px;
  align-items: center;
}

.read-indicator .trait {
  width: 16px;
  height: 2px;
  background-color: #38bdf8; /* couleur bleue */
  border-radius: 2px;
}


    @media (max-width: 480px) {
      .brand-text {
        display: none;
      }
      .navbar-content {
        height: 92px;
      }
      .mobile-menu-content {
        padding: 20px;
      }
      .mobile-nav-link,
      .mobile-auth-link {
        padding: 20px;
        font-size: 1.2rem;
      }
      .mobile-nav-link .material-icons,
      .mobile-auth-link .material-icons,
      .mobile-cta .material-icons {
        font-size: 26px;
      }
      .mobile-cta {
        padding: 20px;
        font-size: 1.15rem;
      }
      .mobile-user-avatar {
        width: 60px;
        height: 60px;
      }
      .mobile-user-details strong {
        font-size: 1.05rem;
      }
      .mobile-user-details span {
        font-size: 1rem;
      }
    }


  `]
})
export class HeaderComponent implements OnInit {
  currentUser: User | null = null;
  isAuthenticated = false;
  showUserMenu = false;
  isMobileMenuOpen = false;
  isScrolled = false;
  showNotifications = false;
    private refreshSub!: Subscription;
  notifications: any[] = [];
  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService,
    private eRef: ElementRef,
        private cdr: ChangeDetectorRef,
    
  ) { }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
    this.currentUser = this.authService.getCurrentUser();
    console.log("this.currentUser", this.currentUser);


    this.authService.isAuthenticated$.subscribe(isAuth => {
      this.isAuthenticated = isAuth;
    });
    this.loadNotifications();
        // this.startAutoRefresh();
           this.cdr.detectChanges();
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.pageYOffset > 50;
  }

  getDashboardRoute(): string {
    if (!this.currentUser) return '/';

    switch (this.currentUser.role) {
      case UserRole.CLIENT:
        return '/dashboard/client';
      case UserRole.AGENCY:
        return '/dashboard/agency';
      case UserRole.COLLECTOR:
        return '/dashboard/collector';
      case UserRole.MUNICIPALITY:
        return '/dashboard/municipality';
      case UserRole.SUPER_ADMIN:
        return '/dashboard/admin';
      default:
        return '/';
    }
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
  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
  }

  // markAllAsRead(event: Event): void {
  //   event.stopPropagation();

  // }
  logout(): void {
    // localStorage.removeItem('currentUser');
    this.authService.logout().subscribe({
      next: (response: any) => {

        localStorage.removeItem('currentUser');
        console.log('deconnexion', response);
        if (response?.message) {
          console.log('deconnexion', response);
          this.router.navigate(['/']);
          this.notificationService.showSuccess(`${response?.message} !`, 'Au revoir, à bientoît !');

        } else {
          console.log('deconnexion', response);
          this.notificationService.showError('Erreur de connexion', response.error);
        }
      }
    });

  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }
  loadNotifications(): void {
    const userId = this.currentUser?._id;
    if (!userId) {
      console.warn('UUID utilisateur introuvable.');
      return;
    }
    this.notificationService.getAllNotificationsAgency$(userId).subscribe({
      next: (data: any) => {
        console.log('Notifications reçues :', data);
        this.notifications = data.notifications;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des notifications :', err);
      }
    });

  }
unreadCount(): number {
  return this.notifications.filter(n => !n.read).length;
}

markAsRead(notifId: string): void {
  const notif = this.notifications.find(n => n._id === notifId);

  if (notif && !notif.read) {
    this.notificationService.markNotificationAsRead$(notifId).subscribe({
      next: () => {
        notif.read = true;
      
      },
      error: (err) => {
        console.error(`Erreur lors du marquage comme lu de la notification ${notifId} :`, err);
      }
    });
  }
}


  //  markAllAsRead(event: Event): void {
  //     event.stopPropagation(); 

  //     const unreadNotifications = this.notifications.filter(n => !n.read);

  //     unreadNotifications.forEach(notif => {
  //       this.notificationService.markNotificationAsRead$(notif.id).subscribe({
  //         next: () => {
  //           notif.read = true; 
  //         },
  //         error: (err) => {
  //           console.error(`Erreur pour la notif ${notif.id} :`, err);
  //         }
  //       });
  //     });
  //   }
  isDeleting = false;

  deleteNotification(notificationId: string): void {
    this.isDeleting = true;

    if (notificationId) {
      this.notificationService.deleteNotification$(notificationId).subscribe(
        () => {
          this.notificationService.showSuccess(
            "Succès",
            "La notification a été supprimée avec succès."
          );
          this.loadNotifications();
          this.isDeleting = false;
        },
        (error) => {
          this.notificationService.showError(
            "Erreur",
            "Impossible de supprimer la notification. Veuillez réessayer."
          );
          console.error("Erreur lors de la suppression de la notification :", error);
          this.loadNotifications();
          this.isDeleting = false;
        }
      );
    } else {
      console.warn("Aucun ID de notification fourni.");
      this.isDeleting = false;
    }
  }

  @HostListener('document:click', ['$event'])
  clickOutside(event: Event) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.showNotifications = false;
    }
  }
   ngOnDestroy(): void {
    // Arrêter le rafraîchissement pour éviter les fuites mémoire
    if (this.refreshSub) {
      this.refreshSub.unsubscribe();
    }
  }

startAutoRefresh(): void {
    const userId = this.currentUser?.id;
    if (!userId) {
      console.warn('UUID utilisateur introuvable.');
      return;
    }

    // Rafraîchir toutes les  secondes
    this.refreshSub = interval(5000)
      .pipe(
        switchMap(() => this.notificationService.getAllNotificationsAgency$(userId))
      )
      .subscribe({
        next: (data: any) => {
          console.log('Notifications reçues :', data);
          this.notifications = data.notifications;
        },
        error: (err) => {
          console.error('Erreur lors du chargement des notifications :', err);
        }
      });
  }

navigateToNotification(notif: any): void {
  if (!notif || !notif.type) {
    console.warn('Type de notification introuvable.');
    return;
  }

  // Marquer comme lu d'abord
  if (!notif.read) {
    this.markAsRead(notif._id);
  }

  switch (notif.type.toLowerCase()) {
    case 'signalement':
      this.router.navigate(['/dashboard/agency'], { 
        fragment: 'reports',
        queryParams: { source: 'notification' }
      });
      break;
    case 'planning':
      this.router.navigate(['/dashboard/agency'], { 
        fragment: 'schedules',
        queryParams: { source: 'notification' }
      });
      break;
    case 'zones':
      this.router.navigate(['/dashboard/agency'], { 
        fragment: 'zones',
        queryParams: { source: 'notification' }
      });
      break;
    case 'employee':
      this.router.navigate(['/dashboard/agency'], { 
        fragment: 'employees',
        queryParams: { source: 'notification' }
      });
      break;
    default:
      this.router.navigate(['/dashboard/agency']);
      break;
  }
}
}


