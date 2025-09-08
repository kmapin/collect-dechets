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
                <span class="brand-name">WasteManager</span>
                <span class="brand-tagline">Gestion Intelligente</span>
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
                  <span class="user-name">{{ currentUser.firstName }} {{ currentUser.lastName }}</span>
                  <span class="user-role">{{ getRoleLabel(currentUser.role) }}</span>
                </div>
                <i class="material-icons dropdown-icon" 
                   [class.rotated]="showUserMenu">expand_more</i>
              </div>

              <div class="user-dropdown" [class.show]="showUserMenu">
                <div class="dropdown-header">
                  <div class="user-details">
                    <strong>{{ currentUser.firstName }} {{ currentUser.lastName }}</strong>
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
                <a routerLink="/subscription" class="dropdown-item">
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
      /* background-color: red;*/
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
      padding: 0 24px;
    }

    .navbar-content {
      width:100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 64px;
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
      font-size: 24px;
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

    .user-info {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    .user-name {
      font-weight: 600;
      color: var(--text-primary);
      font-size: 0.9rem;
      line-height: 1;
    }

    .user-role {
      font-size: 0.75rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
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
      .navbar-content {
        height: 70px;
      }

      .container {
        padding: 0 16px;
      }

      .brand-icon {
        width: 40px;
        height: 40px;
        font-size: 20px;
      }

      .brand-name {
        font-size: 1.3rem;
      }

      .brand-tagline {
        font-size: 0.7rem;
      }
    }

    @media (max-width: 480px) {
      .brand-text {
        display: none;
      }

      .mobile-menu-content {
        padding: 16px;
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

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    this.authService.isAuthenticated$.subscribe(isAuth => {
      this.isAuthenticated = isAuth;
    });
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

  logout(): void {
    this.authService.logout().subscribe({
      next: (response: any) => {
        if (response?.message) {
          console.log('deconnexion', response);
          this.router.navigate(['/']);
          this.notificationService.showSuccess(`${response?.message} !`,'Au revoir, à bientoît !');

        } else {
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
}