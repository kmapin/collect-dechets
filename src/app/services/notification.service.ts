import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

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
}