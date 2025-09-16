import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';

export interface Notification {
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
  private notificationSubject = new Subject<Notification>();
  public notifications$ = this.notificationSubject.asObservable();
  constructor(private http: HttpClient) { }

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
    const notification: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      title,
      message,
      duration
    };

    this.notificationSubject.next(notification);
  }

  showWithActions(type: 'success' | 'error' | 'warning' | 'info', title: string, message: string, actions: NotificationAction[], duration = 0): void {
    const notification: Notification = {
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
        const url = `${environment.apiUrl}/notifications/${notificationId}/read`;
        return this.http.put(url, {});
    }

    //suppressin d une notification
    deleteNotification$(notificationId: string): Observable<any> {
      const url = `${environment.apiUrl}/notifications/${notificationId}`;
      return this.http.delete(url);
  }
}