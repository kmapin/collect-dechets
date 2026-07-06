import { Component, OnInit, OnDestroy, HostListener, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RegisterUserData, UserRole } from '../../models/user.model';
import { NotificationService } from '../../services/notification.service';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header implements OnInit, OnDestroy {
  currentUser: RegisterUserData | null = null;
  isAuthenticated = false;
  showUserMenu = false;
  isMobileMenuOpen = false;
  isScrolled = false;
  showNotifications = false;
  notifications: any[] = [];
  unreadBadge = 0;
  private subs: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService,
    private eRef: ElementRef,
    private cdr: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    this.subs.push(
      this.authService.currentUser$.subscribe(user => {
        this.currentUser = user;
      })
    );
    this.currentUser = this.authService.getCurrentUser();

    this.subs.push(
      this.authService.isAuthenticated$.subscribe(isAuth => {
        this.isAuthenticated = isAuth;
      })
    );

    // Abonnement au flux temps réel du service (initial + WebSocket)
    this.subs.push(
      this.notificationService.realtimeNotifications$.subscribe(notifs => {
        this.notifications = notifs;
        this.cdr.detectChanges();
      })
    );

    this.subs.push(
      this.notificationService.unreadCount$.subscribe(count => {
        this.unreadBadge = count;
        this.cdr.detectChanges();
      })
    );

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
      case UserRole.MANAGER:
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
    localStorage.clear()
   
    setTimeout(() => {
      window.location.href = '/login';
    }, 500);
    
    // this.authService.logout().subscribe({
    //   next: (response: any) => {

    //     localStorage.removeItem('currentUser');
    //     console.log('deconnexion', response);
    //     if (response?.message) {
    //       console.log('deconnexion', response);
    //       localStorage.clear()
    //       this.notificationService.showSuccess(`${response?.message} !`, 'Au revoir, à bientoît !');
    //       setTimeout(() => {
    //         window.location.href = '/login';
    //       }, 500);
    //     } else {
    //       console.log('deconnexion', response);
    //       this.notificationService.showError('Erreur de connexion', response.error);
    //     }
    //   }
    // });

  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  getNotificationType(type: string): string {
    const types: { [key: string]: string } = {
      'Subscribed': 'Abonnement',
      'Unsubscribed': 'Désabonnement',
      'Assingnment': 'Affectation',
      'Planning': 'Collecte programmée',
      'AgencyAdd': 'Agence ajoutée',
      'Signalement': 'Signalement',

    };
    return types[type] || type;
  }
  unreadCount(): number {
    return this.unreadBadge;
  }

  markAsRead(notifId: string): void {
    const notif = this.notifications.find(n => n._id === notifId);
    if (!notif || notif.read) return;

    this.notificationService.markNotificationAsRead$(notifId).subscribe({
      next: () => this.notificationService.markAsReadLocally(notifId),
      error: (err) => console.error(`Erreur marquage lu ${notifId} :`, err)
    });
  }

  isDeleting = false;

  deleteNotification(notificationId: string): void {
    if (!notificationId) return;
    this.isDeleting = true;

    this.notificationService.deleteNotification$(notificationId).subscribe({
      next: () => {
        this.notificationService.removeLocally(notificationId);
        this.notificationService.showSuccess('Succès', 'Notification supprimée.');
        this.isDeleting = false;
      },
      error: (err) => {
        this.notificationService.showError('Erreur', 'Impossible de supprimer la notification.');
        console.error('Erreur suppression notification :', err);
        this.isDeleting = false;
      }
    });
  }

  @HostListener('document:click', ['$event'])
  clickOutside(event: Event) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.showNotifications = false;
    }
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
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
  const userRole = this.currentUser?.role?.toLowerCase();
  switch (notif.type.toLowerCase()) {
    case 'signalement':
      this.router.navigate([`/dashboard/${userRole==='manager' ? 'agency' : userRole}`], { 
        fragment: 'reports',
        queryParams: { source: 'notification' }
      });
      break;
    case 'planning':
      this.router.navigate([`/dashboard/${userRole==='manager' ? 'agency' : userRole}`], { 
        fragment: 'schedules',
        queryParams: { source: 'notification' }
      });
      break;
    case 'zones':
      this.router.navigate([`/dashboard/${userRole==='manager' ? 'agency' : userRole}`], { 
        fragment: 'zones',
        queryParams: { source: 'notification' }
      });
      break;
    case 'subscribed':
      this.router.navigate([`/dashboard/${userRole==='manager' ? 'agency' : userRole}`], { 
        fragment: 'clients',
        queryParams: { source: 'notification' }
      });
      break;
    case 'employee':
      this.router.navigate([`/dashboard/${userRole==='manager' ? 'agency' : userRole}`], { 
        fragment: 'employees',
        queryParams: { source: 'notification' }
      });
      break;
    default:
      this.router.navigate([`/dashboard/${userRole==='manager' ? 'agency' : userRole}`]);
      break;
  }
}
}


