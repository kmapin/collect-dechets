import { Injectable } from '@angular/core';
import { Subject, Observable, BehaviorSubject, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Webstockets, SocketNotification, SocketPlanningNotification } from '../core/services/webstockets';

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

  private realtimeNotificationsSubject = new BehaviorSubject<SocketNotification[]>([]);
  public realtimeNotifications$ = this.realtimeNotificationsSubject.asObservable();

  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(
    private http: HttpClient,
    private websocketService: Webstockets
  ) {
    this.setupWebSocketListeners();
  }

  // ── Chargement initial depuis le backend ─────────────────────

  /**
   * Appeler après login pour pré-remplir la liste de notifications.
   */
  loadInitialNotifications(userId: string): void {
    console.log('[NOTIF] Chargement notifications pour userId :', userId);
    this.getAllNotificationsAgency$(userId)
      .pipe(catchError((err) => {
        console.error('[NOTIF] Erreur chargement notifications :', err);
        return of([]);
      }))
      .subscribe((raw: any[]) => {
        console.log('[NOTIF] Notifications reçues du backend :', raw?.length ?? 0);
        if (!raw?.length) {
          console.warn('[NOTIF] Aucune notification en base');
          return;
        }
        const mapped: SocketNotification[] = raw.map((n: any) => ({
          _id: n._id || n.id || '',
          user: n.user || userId,
          type: n.type || 'info',
          title: n.title || n.type || 'Notification',
          message: n.message || n.content || '',
          read: n.read ?? false,
          createdAt: new Date(n.createdAt || n.created_at || Date.now())
        }));
        const unread = mapped.filter(n => !n.read).length;
        console.log('[NOTIF]', mapped.length, 'notification(s) chargée(s),', unread, 'non lue(s)');
        this.realtimeNotificationsSubject.next(mapped);
        this.unreadCountSubject.next(unread);
      });
  }

  // ── Listeners WebSocket ──────────────────────────────────────

  private setupWebSocketListeners(): void {
    // Nouvelle notification
    this.websocketService.onNewNotification().subscribe((notification: SocketNotification) => {
      console.log('[NOTIF] Nouvelle notification temps réel :', notification.title, '| type :', notification.type);
      const current = this.realtimeNotificationsSubject.value;
      this.realtimeNotificationsSubject.next([notification, ...current]);
      if (!notification.read) {
        this.unreadCountSubject.next(this.unreadCountSubject.value + 1);
      }
      this.showInfo(notification.title || notification.type, notification.message);
    });

    // Notification marquée lue
    this.websocketService.onNotificationRead().subscribe(({ id }) => {
      console.log('[NOTIF] Notification marquée lue :', id);
      const updated = this.realtimeNotificationsSubject.value.map(n =>
        n._id === id ? { ...n, read: true } : n
      );
      this.realtimeNotificationsSubject.next(updated);
      this.unreadCountSubject.next(Math.max(0, this.unreadCountSubject.value - 1));
    });

    // Notification supprimée
    this.websocketService.onNotificationDeleted().subscribe(({ id }) => {
      console.log('[NOTIF] Notification supprimée :', id);
      const current = this.realtimeNotificationsSubject.value;
      const target = current.find(n => n._id === id);
      this.realtimeNotificationsSubject.next(current.filter(n => n._id !== id));
      if (target && !target.read) {
        this.unreadCountSubject.next(Math.max(0, this.unreadCountSubject.value - 1));
      }
    });

    // Notification de planning (collecteur assigné)
    this.websocketService.onPlanningNotification().subscribe((data: SocketPlanningNotification) => {
      console.log('[NOTIF] Planning reçu pour collecteur :', data.collectorId, '|', data.message);
      this.showInfo('Nouveau planning', data.message);
      // Injecter comme notification temps réel
      const synth: SocketNotification = {
        _id: `planning-${Date.now()}`,
        user: data.collectorId,
        type: 'planning',
        title: 'Nouveau planning',
        message: data.message,
        read: false,
        createdAt: new Date()
      };
      const current = this.realtimeNotificationsSubject.value;
      this.realtimeNotificationsSubject.next([synth, ...current]);
      this.unreadCountSubject.next(this.unreadCountSubject.value + 1);
    });
  }

  // ── Toasts ───────────────────────────────────────────────────

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

  showWithActions(
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string,
    actions: NotificationAction[],
    duration = 0
  ): void {
    this.show(type, title, message, duration, actions);
  }

  private show(
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string,
    duration = 5000,
    actions?: NotificationAction[]
  ): void {
    const notification: NotificationI = {
      id: Math.random().toString(36).substring(2, 11),
      type,
      title,
      message,
      duration,
      ...(actions && { actions })
    };
    this.notificationSubject.next(notification);
  }

  // ── Mise à jour locale du flux temps réel ────────────────────

  markAsReadLocally(notifId: string): void {
    const updated = this.realtimeNotificationsSubject.value.map(n =>
      n._id === notifId ? { ...n, read: true } : n
    );
    this.realtimeNotificationsSubject.next(updated);
    this.unreadCountSubject.next(updated.filter(n => !n.read).length);
  }

  removeLocally(notifId: string): void {
    const current = this.realtimeNotificationsSubject.value;
    const target = current.find(n => n._id === notifId);
    this.realtimeNotificationsSubject.next(current.filter(n => n._id !== notifId));
    if (target && !target.read) {
      this.unreadCountSubject.next(Math.max(0, this.unreadCountSubject.value - 1));
    }
  }

  // ── API HTTP ─────────────────────────────────────────────────

  getAllNotificationsAgency$(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/notifications/${userId}`);
  }

  markNotificationAsRead$(notificationId: string): Observable<any> {
    return this.http.put(`${environment.apiUrl}/notifications/update/${notificationId}`, {});
  }

  deleteNotification$(notificationId: string): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/notifications/delete/${notificationId}`);
  }
}
