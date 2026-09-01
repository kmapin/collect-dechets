import { Component, OnInit, OnDestroy, HostListener, ElementRef, ChangeDetectorRef, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User,RegisterUserData } from '../../models/user.model';
import { NotificationService } from '../../services/notification.service';
import { Webstockets } from '../../core/services/webstockets';
import { NotificationItem, notificationTypeLabel } from '../../models/notification.model';
import { resolveNotificationNavigation, dashboardRouteForRole } from '../../shared/notification-route.util';
import { MatIconModule } from '@angular/material/icon';
import { filter, Subscription } from 'rxjs';
@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header  implements OnInit, OnDestroy {
  currentUser: RegisterUserData | null = null;
  isAuthenticated = false;
  showUserMenu = false;
  isMobileMenuOpen = false;
  isScrolled = false;
  showNotifications = false;
    private newNotificationSub?: Subscription;
    private routerEventsSub?: Subscription;
  notifications: NotificationItem[] = [];
  // Chantier "Notifications" (inbox réelle) : source unique du compteur non-lu,
  // partagée avec la page /notifications — plus de recalcul local à partir de la
  // seule liste chargée dans ce dropdown (qui ne voit de toute façon plus tout
  // l'historique). Le template continue d'appeler `unreadCount()` sans changement,
  // un signal étant lui aussi invocable comme une fonction.
  readonly unreadCount = toSignal(inject(NotificationService).unreadCount$, { initialValue: 0 });

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService,
    private websocketService: Webstockets,
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
      this.loadNotifications();
    });

    // Prompt 05 point 2 : la cloche se mettait à jour uniquement au chargement
    // (REST one-shot) — le pipeline planning/signalement unifié (Prompts 03/04)
    // émet désormais `newNotification` de façon fiable à chaque événement ; on
    // la répercute ici en direct, sans attendre un refresh manuel. Le contrat
    // socket (`joinRoom(userId)` + écoute `newNotification`) est déjà correct
    // côté `auth.service.ts`/`webstockets.ts` — rien à changer là.
    this.newNotificationSub = this.websocketService.onNewNotification().subscribe((notification: NotificationItem) => {
      if (this.notifications.some((n) => n._id === notification._id)) return;
      this.notifications = [notification, ...this.notifications];
      this.cdr.detectChanges();
    });

    this.cdr.detectChanges();

    // Filet de sécurité générique : ferme le menu mobile dès qu'une navigation aboutit,
    // quel que soit le lien cliqué — plutôt que de dépendre uniquement du
    // (click)="closeMobileMenu()" posé sur chaque lien individuellement (facile à
    // oublier sur un futur lien ajouté au menu).
    this.routerEventsSub = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        if (this.isMobileMenuOpen) this.closeMobileMenu();
      });
  }

  ngOnDestroy(): void {
    if (this.newNotificationSub) this.newNotificationSub.unsubscribe();
    if (this.routerEventsSub) this.routerEventsSub.unsubscribe();
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.pageYOffset > 50;
  }

  // Chantier "Notifications" : délègue à la même fonction que la page /notifications
  // (notification-route.util.ts) — une seule copie du mapping rôle→dashboard, pour
  // qu'elles ne puissent jamais diverger (l'ancien switch en dur ici avait dérivé,
  // voir navigateToNotification ci-dessous).
  getDashboardRoute(): string {
    return dashboardRouteForRole(this.currentUser?.role ?? null);
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
    return notificationTypeLabel(type);
  }
  loadNotifications(): void {
    if (!this.currentUser) return;
    // Un dropdown n'a pas besoin de tout l'historique — la page /notifications gère
    // la pagination complète ; les 10 plus récentes suffisent ici.
    this.notificationService.getMyNotifications$({ page: 1, pageSize: 10 }).subscribe({
      next: (result) => {
        this.notifications = result.items;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des notifications :', err);
      }
    });
    this.notificationService.refreshUnreadCount();
  }

markAsRead(notifId: string): void {
  const notif = this.notifications.find(n => n._id === notifId);

  if (notif && !notif.read) {
    this.notificationService.markAsRead$(notifId).subscribe({
      next: () => {
        notif.read = true;

      },
      error: (err: unknown) => {
        console.error(`Erreur lors du marquage comme lu de la notification ${notifId} :`, err);
      }
    });
  }
}


  markAllAsRead(event: Event): void {
    event.stopPropagation();
    this.notificationService.markAllAsRead$().subscribe({
      next: () => {
        this.notifications = this.notifications.map(n => ({ ...n, read: true }));
      },
      error: (err) => {
        console.error('Erreur lors du marquage global comme lu :', err);
        this.notificationService.showError('Erreur', 'Impossible de marquer toutes les notifications comme lues.');
      },
    });
  }

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

navigateToNotification(notif: NotificationItem): void {
  if (!notif || !notif.type) {
    console.warn('Type de notification introuvable.');
    return;
  }

  // Marquer comme lu d'abord
  if (!notif.read) {
    this.markAsRead(notif._id);
  }

  // Source UNIQUE de décision de routage — partagée avec la page /notifications
  // (chantier "Notifications"). Corrige au passage un bug réel : l'ancien switch en
  // dur construisait `/dashboard/super_admin` (inexistant, 404 silencieux) au lieu
  // de `/dashboard/admin` — getDashboardRoute() est déjà correcte pour les 5 rôles.
  const nav = resolveNotificationNavigation(notif, this.getDashboardRoute(), this.currentUser?.role ?? null);
  this.router.navigate(nav.commands, nav.extras);
}
}


