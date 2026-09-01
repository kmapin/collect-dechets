import { Injectable } from '@angular/core';
import { Subject, Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Webstockets } from '../core/services/webstockets';
import { NotificationItem, NotificationPage, UnreadCountResponse, notificationTypeLabel } from '../models/notification.model';

export interface NotificationI {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationSubject = new Subject<NotificationI>();
  public notifications$ = this.notificationSubject.asObservable();

  // Chantier "Notifications" (inbox réelle) : source UNIQUE du compteur non-lu,
  // partagée par la cloche du header et la page /notifications. Amorcée par
  // refreshUnreadCount() (GET /unread-count, valeur autoritaire), puis ajustée
  // uniquement par les événements socket ci-dessous — jamais de décrément local en
  // plus de l'écho socket (double comptage sinon), ce qui est sûr maintenant que
  // chaque route notification n'émet plus qu'à la room de son propriétaire réel.
  // L'ancien `realtimeNotificationsSubject`/`realtimeNotifications$` (0 consommateur,
  // 3e liste parallèle jamais lue) a été supprimé plutôt que branché : header.ts et la
  // page /notifications tiennent chacun leur propre liste, une liste de plus dans ce
  // service aurait été exactement la duplication de source de vérité à éviter.
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  private readonly notificationsBase = `${environment.apiUrl}/notifications`;

  constructor(
    private http: HttpClient,
    private websocketService: Webstockets
  ) {
    this.setupWebSocketListeners();
  }

  /**
   * Configure les listeners pour les événements WebSocket en temps réel
   */
  private setupWebSocketListeners(): void {
    // Nouvelle notification — incrémente le compteur (si non lue) et affiche un toast.
    // NOTIFICATION_TYPE_LABELS remplace `notification.title`, qui n'a jamais existé sur
    // le vrai document backend (seul `message` existe) — corrige un bug réel : le toast
    // affichait `undefined` comme titre depuis la mise en place de ce listener.
    this.websocketService.onNewNotification().subscribe((notification: NotificationItem) => {
      if (!notification.read) {
        this.unreadCountSubject.next(this.unreadCountSubject.value + 1);
      }
      this.showInfo(notificationTypeLabel(notification.type), notification.message);
    });

    this.websocketService.onNotificationRead().subscribe(() => {
      this.unreadCountSubject.next(Math.max(0, this.unreadCountSubject.value - 1));
    });

    // Une notification supprimée peut être plus ancienne que la session (pas dans un
    // état local qu'on pourrait consulter pour savoir si elle était non lue) — un
    // re-fetch du compteur autoritaire est plus sûr qu'un delta local ici.
    this.websocketService.onNotificationDeleted().subscribe(() => {
      this.refreshUnreadCount();
    });

    this.websocketService.onAllNotificationsRead().subscribe(() => {
      this.unreadCountSubject.next(0);
    });
  }

  /** Recharge le compteur non-lu depuis le backend (valeur autoritaire). */
  refreshUnreadCount(): void {
    this.getMyUnreadCount$().subscribe({
      next: res => this.unreadCountSubject.next(res.count),
      error: () => {},
    });
  }

  showSuccess(title: string, message: string, duration = 5000): void {
    this.show('success', title, message, duration);
  }

  showError(title: string, message: string, duration = 7000): void {
    this.show('error', title, message, duration);
  }

  showWarning(title: string, message: string, duration = 6000): void {
    this.show('warning', title, message, duration);
  }

  showInfo(title: string, message: string, duration = 5000): void {
    this.show('info', title, message, duration);
  }

  private show(type: 'success' | 'error' | 'warning' | 'info', title: string, message: string, duration = 5000): void {
    const notification: NotificationI = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      title,
      message,
      duration
    };

    this.notificationSubject.next(notification);
  }

  showWithActions(type: 'success' | 'error' | 'warning' | 'info', title: string, message: string, actions: NotificationAction[], duration = 0): void {
    const notification: NotificationI = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      title,
      message,
      actions,
      duration
    };

    this.notificationSubject.next(notification);
  }

  // ── API réelle (inbox) — identité toujours dérivée du JWT côté serveur, jamais
  // d'id utilisateur transmis dans l'URL (voir routes/notification.route.js). ──────

  getMyNotifications$(opts: { page?: number; pageSize?: number; read?: boolean } = {}): Observable<NotificationPage> {
    let url = `${this.notificationsBase}?page=${opts.page ?? 1}&pageSize=${opts.pageSize ?? 20}`;
    if (opts.read === true || opts.read === false) url += `&read=${opts.read}`;
    return this.http.get<NotificationPage>(url);
  }

  getMyUnreadCount$(): Observable<UnreadCountResponse> {
    return this.http.get<UnreadCountResponse>(`${this.notificationsBase}/unread-count`);
  }

  markAsRead$(notificationId: string): Observable<{ data: boolean; message: string }> {
    return this.http.put<{ data: boolean; message: string }>(`${this.notificationsBase}/update/${notificationId}`, {});
  }

  markAllAsRead$(): Observable<{ data: boolean; modifiedCount: number; message: string }> {
    return this.http.patch<{ data: boolean; modifiedCount: number; message: string }>(`${this.notificationsBase}/read-all`, {});
  }

  deleteNotification$(notificationId: string): Observable<{ data: boolean; message: string }> {
    return this.http.delete<{ data: boolean; message: string }>(`${this.notificationsBase}/delete/${notificationId}`);
  }
}
