import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User, UserRole } from '../../models/user.model';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="navbar" [class.scrolled]="isScrolled">
      <div class="container">
        <div class="navbar-content">
          <!-- Logo et Brand -->
          <div class="navbar-brand">
            <a routerLink="/" class="brand-link">
              <div class="brand-icon">
                <i class="material-icons">eco</i>
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
<div class="notification-bell" *ngIf="isAuthenticated" (click)="toggleNotifications()">
  <i class="material-icons">notifications</i>
  <span class="badge" *ngIf="notifications?.length">{{ notifications.length }}</span>

  <div class="notifications-dropdown" *ngIf="showNotifications" [class.show]="showNotifications">
    <div class="dropdown-header">
      <strong>Notifications</strong>
    </div>

    <div class="notifications-list">
      <ng-container *ngIf="notifications && notifications.length > 0; else noNotif">
        <div *ngFor="let notif of notifications" class="notification-item" [class.read]="notif.read"  (click)="markAsRead(notif)">
          <div class="notification-main">
            <div class="notification-info">
              <div class="notif-header">
                <span class="notif-type">{{ notif.type }}</span>
                <span class="notif-date">{{ notif.createdAt | date:'short' }}</span>
              </div>
              <div class="notif-content">
                {{ notif.message }}
              </div>
            </div>

            <div class="notif-actions">
            <button class="icon-btn delete-btn" title="Supprimer" (click)="deleteNotification(notif._id)">
  <i class="material-icons">delete</i>
</button>
    <!-- @if (!notif.read) {
  <button class="icon-btn mark-btn" title="Marquer comme lu">
    <i class="material-icons">done</i>
  </button>
} -->


            </div>
          </div>

          <div class="read-indicator" *ngIf="notif.read">
            <hr />
            <hr />
          </div>
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
                <a *ngIf="currentUser?.role !== 'collector'" routerLink="/subscription" class="dropdown-item">
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
                <a *ngIf="currentUser?.role !== 'collector'" routerLink="/subscription" class="dropdown-item">
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
.notification-bell {
  position: relative;
  padding: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  color: var(--text-primary);
  border-radius: 12px;
  transition: color 0.3s ease, background-color 0.3s ease, transform 0.3s ease;
}
.notification-bell:hover {
  background: rgba(0, 188, 212, 0.08);
  color: var(--primary-color);
  transform: translateY(-1px);
}

.notification-bell .badge {
  position: absolute;
  top: 0;
  right: 0;
  background: var(--error-color);
  color: white;
  font-size: 0.7rem;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.notifications-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  min-width: 320px;
  max-height: 350px;
  overflow-y: auto;
  padding: 12px;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-10px);
  transition: all 0.3s ease;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 13px;
   /* cacher la scrollbar */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
  &::-webkit-scrollbar {
    display: none;
}
}

.notifications-dropdown.show {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
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

.notifications-list {
  max-height: 300px;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
    flex-direction: row;
  justify-content: space-between;
}

.notification-item:hover {
  background: #edf6f9;
  border-color: #38bdf8;
  transform: translateY(-2px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}
.notification-item.read {
  background-color: #f5f5f5;
}

.notif-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: #6b7280;
  width: 100%;
}


.notif-content {
  font-size: 0.95rem;
  color: #111827;
  width: 100%;
}

.notif-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
  width: 100%;
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
.read-indicator {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
}

.read-indicator hr {
  border: none;
  height: 2px;
  background-color: #38bdf8;
  width: 100%;
  margin: 0;
}

.empty-notification {
  padding: 24px;
  text-align: center;
  color: #6b7280;
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
  notifications: any[] = [];
  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService
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
    const userId = this.currentUser?.id;
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
  markAsRead(notif: any): void {
    if (!notif.read) {
      this.notificationService.markNotificationAsRead$(notif._id).subscribe({
        next: () => {
          notif.read = true;
        },
        error: (err) => {
          console.error(`Erreur lors du marquage comme lu de la notification ${notif._id} :`, err);
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



}


