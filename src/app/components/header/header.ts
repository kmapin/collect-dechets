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
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header  implements OnInit {
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


