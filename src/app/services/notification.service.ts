import { Injectable } from '@angular/core';
import { Subject, Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Webstockets, SocketNotification } from '../core/services/webstockets';

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
  
  // Sujets pour les notifications depuis le backend
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

  /**
   * Configure les listeners pour les événements WebSocket en temps réel
   */
  private setupWebSocketListeners(): void {
    // Écouter les nouvelles notifications
    this.websocketService.onNewNotification().subscribe((notification: SocketNotification) => {
      console.log(' Nouvelle notification reçue via WebSocket:', notification);
      
      // Ajouter la notification à la liste
      const currentNotifications = this.realtimeNotificationsSubject.value;
      this.realtimeNotificationsSubject.next([notification, ...currentNotifications]);
      
      // Incrémenter le compteur de non lus
      if (!notification.read) {
        this.unreadCountSubject.next(this.unreadCountSubject.value + 1);
      }
      
      // Afficher une notification toast
      this.showInfo(notification.title, notification.message);
    });

    // Écouter les notifications lues
    this.websocketService.onNotificationRead().subscribe(({ id }) => {
      console.log('👁️ Notification lue via WebSocket:', id);
      
      // Mettre à jour le statut de la notification
      const currentNotifications = this.realtimeNotificationsSubject.value;
      const updatedNotifications = currentNotifications.map(notif =>
        notif._id === id ? { ...notif, read: true } : notif
      );
      this.realtimeNotificationsSubject.next(updatedNotifications);
      
      // Décrémenter le compteur de non lus
      this.unreadCountSubject.next(Math.max(0, this.unreadCountSubject.value - 1));
    });

    // Écouter les notifications supprimées
    this.websocketService.onNotificationDeleted().subscribe(({ id }) => {
      console.log(' Notification supprimée via WebSocket:', id);
      
      // Retirer la notification de la liste
      const currentNotifications = this.realtimeNotificationsSubject.value;
      const notification = currentNotifications.find(n => n._id === id);
      
      const filteredNotifications = currentNotifications.filter(notif => notif._id !== id);
      this.realtimeNotificationsSubject.next(filteredNotifications);
      
      // Décrémenter le compteur si la notification était non lue
      if (notification && !notification.read) {
        this.unreadCountSubject.next(Math.max(0, this.unreadCountSubject.value - 1));
      }
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
      getAllNotificationsAgency$(userId: string): Observable<any[]> {
      const url=`${environment.apiUrl}/notifications/${userId}`;
      console.log("URL de la requête :", url); 
      return this.http.get<any[]>(url);
  
    }
    //marquer un message comme lu 
    markNotificationAsRead$(notificationId: string): Observable<any> {
        const url = `${environment.apiUrl}/notifications/update/${notificationId}`;
        return this.http.put(url, notificationId);
    }

    //suppressin d une notification
    deleteNotification$(notificationId: string): Observable<any> {
      const url = `${environment.apiUrl}/notifications/delete/${notificationId}`;
      return this.http.delete(url);
  }
}