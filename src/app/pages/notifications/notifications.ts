import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { LoadingSpinnerComponent } from '../../components/loading-spinner/loading-spinner.component';
import { NotificationItem, notificationTypeLabel, notificationTypeIcon } from '../../models/notification.model';
import { resolveNotificationNavigation, dashboardRouteForRole } from '../../shared/notification-route.util';
import { formatFrRelative, formatFrDateTime } from '../../shared/format.util';

type FilterKey = 'all' | 'unread';
type PageState = 'loading' | 'ready' | 'error';

const PAGE_SIZE = 20;

// Chantier "Notifications" — page /notifications, inbox réelle branchée sur le backend
// (aucune donnée mockée). Organisation inspirée de Facebook (Tout/Non lu, liste
// verticale, icône à gauche, indicateur non-lu) mais entièrement rendue avec le design
// system existant de l'app (classes globales .container/.card/.btn/.page-header, voir
// src/styles.scss) — jamais le style visuel de la référence.
@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, LoadingSpinnerComponent],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss',
})
export class NotificationsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly filter = signal<FilterKey>('all');
  readonly items = signal<NotificationItem[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly state = signal<PageState>('loading');
  readonly loadingMore = signal(false);
  readonly openMenuId = signal<string | null>(null);

  // Source unique du compteur (partagée avec la cloche du header).
  readonly unreadCount = toSignal(this.notificationService.unreadCount$, { initialValue: 0 });

  readonly hasMore = computed(() => this.items().length < this.total());
  readonly isEmpty = computed(() => this.state() === 'ready' && this.items().length === 0);

  readonly formatRelative = formatFrRelative;
  readonly formatFull = formatFrDateTime;
  readonly typeLabel = notificationTypeLabel;
  readonly typeIcon = notificationTypeIcon;

  ngOnInit(): void {
    const initial = this.route.snapshot.queryParamMap.get('filter');
    this.filter.set(initial === 'unread' ? 'unread' : 'all');
    this.load(true);
    this.notificationService.refreshUnreadCount();
  }

  setFilter(next: FilterKey): void {
    if (this.filter() === next) return;
    this.filter.set(next);
    this.router.navigate([], { queryParams: { filter: next === 'unread' ? 'unread' : null }, replaceUrl: true });
    this.load(true);
  }

  reload(): void {
    this.load(true);
  }

  loadMore(): void {
    if (!this.hasMore() || this.loadingMore()) return;
    this.loadingMore.set(true);
    const nextPage = this.page() + 1;
    this.notificationService
      .getMyNotifications$({ page: nextPage, pageSize: PAGE_SIZE, read: this.filter() === 'unread' ? false : undefined })
      .subscribe({
        next: result => {
          this.items.set([...this.items(), ...result.items]);
          this.total.set(result.total);
          this.page.set(result.page);
          this.loadingMore.set(false);
        },
        error: () => {
          this.loadingMore.set(false);
          this.notificationService.showError('Erreur', 'Impossible de charger la suite des notifications.');
        },
      });
  }

  private load(reset: boolean): void {
    if (reset) this.state.set('loading');
    this.notificationService
      .getMyNotifications$({ page: 1, pageSize: PAGE_SIZE, read: this.filter() === 'unread' ? false : undefined })
      .subscribe({
        next: result => {
          this.items.set(result.items);
          this.total.set(result.total);
          this.page.set(result.page);
          this.state.set('ready');
        },
        error: () => {
          this.state.set('error');
        },
      });
  }

  toggleMenu(item: NotificationItem, event: Event): void {
    event.stopPropagation();
    this.openMenuId.set(this.openMenuId() === item._id ? null : item._id);
  }

  closeMenu(): void {
    this.openMenuId.set(null);
  }

  // Marque comme lue (si nécessaire) PUIS navigue — source unique de décision partagée
  // avec la cloche du header (notification-route.util.ts).
  open(item: NotificationItem): void {
    this.closeMenu();
    if (!item.read) {
      this.markRead(item);
    }
    const role = this.auth.getCurrentUser()?.role ?? null;
    const nav = resolveNotificationNavigation(item, dashboardRouteForRole(role), role);
    this.router.navigate(nav.commands, nav.extras);
  }

  markRead(item: NotificationItem, event?: Event): void {
    event?.stopPropagation();
    this.closeMenu();
    if (item.read) return;
    this.setLocalRead(item._id, true);
    this.notificationService.markAsRead$(item._id).subscribe({
      error: (err: HttpErrorResponse) => {
        this.setLocalRead(item._id, false);
        this.notificationService.showError('Erreur', err.error?.message ?? 'Impossible de marquer cette notification comme lue.');
      },
    });
  }

  markAllAsRead(): void {
    if (this.unreadCount() === 0) return;
    const previous = this.items();
    this.items.set(previous.map(n => ({ ...n, read: true })));
    this.notificationService.markAllAsRead$().subscribe({
      next: () => this.notificationService.showSuccess('Notifications', 'Toutes vos notifications ont été marquées comme lues.'),
      error: (err: HttpErrorResponse) => {
        this.items.set(previous);
        this.notificationService.showError('Erreur', err.error?.message ?? 'Impossible de marquer toutes les notifications comme lues.');
      },
    });
  }

  remove(item: NotificationItem, event: Event): void {
    event.stopPropagation();
    this.closeMenu();
    const previous = this.items();
    this.items.set(previous.filter(n => n._id !== item._id));
    this.total.set(Math.max(0, this.total() - 1));
    this.notificationService.deleteNotification$(item._id).subscribe({
      next: () => this.notificationService.showSuccess('Notification supprimée', 'La notification a été supprimée.'),
      error: (err: HttpErrorResponse) => {
        this.items.set(previous);
        this.total.set(previous.length);
        this.notificationService.showError('Erreur', err.error?.message ?? 'Impossible de supprimer cette notification.');
      },
    });
  }

  private setLocalRead(id: string, read: boolean): void {
    this.items.set(this.items().map(n => (n._id === id ? { ...n, read } : n)));
  }
}
