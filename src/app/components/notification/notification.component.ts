import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { NotificationService, Notification } from '../../services/notification.service';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-container">
      <div *ngFor="let notification of notifications" 
           class="notification fade-in"
           [class]="'notification-' + notification.type">
        <div class="notification-icon">
          <i class="material-icons">{{ getIcon(notification.type) }}</i>
        </div>
        <div class="notification-content">
          <h4 class="notification-title">{{ notification.title }}</h4>
          <p class="notification-message">{{ notification.message }}</p>
          <div class="notification-actions" *ngIf="notification.actions">
            <button *ngFor="let action of notification.actions" 
                    class="notification-action" 
                    (click)="action.action()">
              {{ action.label }}
            </button>
          </div>
        </div>
        <button class="notification-close" (click)="removeNotification(notification.id)">
          <i class="material-icons">close</i>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .notification-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1001;
      max-width: 400px;
      width: 100%;
    }

    .notification {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 16px;
      margin-bottom: 12px;
      border-radius: 8px;
      box-shadow: var(--shadow-strong);
      position: relative;
      overflow: hidden;
    }

    .notification::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      background: currentColor;
    }

    .notification-success {
      background: #e8f5e8;
      color: var(--success-color);
      border: 1px solid #c8e6c9;
    }

    .notification-error {
      background: #ffebee;
      color: var(--error-color);
      border: 1px solid #ffcdd2;
    }

    .notification-warning {
      background: #fff8e1;
      color: #f57c00;
      border: 1px solid #ffcc02;
    }

    .notification-info {
      background: #e3f2fd;
      color: var(--primary-color);
      border: 1px solid #bbdefb;
    }

    .notification-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: currentColor;
      color: var(--white);
      font-size: 18px;
      flex-shrink: 0;
    }

    .notification-content {
      flex: 1;
    }

    .notification-title {
      font-size: 1rem;
      font-weight: 600;
      margin: 0 0 4px 0;
      color: inherit;
    }

    .notification-message {
      font-size: 0.9rem;
      margin: 0;
      opacity: 0.9;
      line-height: 1.4;
    }

    .notification-actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }

    .notification-action {
      padding: 6px 12px;
      border: 1px solid currentColor;
      background: transparent;
      color: inherit;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 500;
      transition: all 0.3s ease;
    }

    .notification-action:hover {
      background: currentColor;
      color: var(--white);
    }

    .notification-close {
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      padding: 4px;
      border-radius: 50%;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      flex-shrink: 0;
    }

    .notification-close:hover {
      background: rgba(0, 0, 0, 0.1);
    }

    @media (max-width: 768px) {
      .notification-container {
        left: 20px;
        right: 20px;
        max-width: none;
      }

      .notification {
        padding: 12px;
      }

      .notification-title {
        font-size: 0.9rem;
      }

      .notification-message {
        font-size: 0.8rem;
      }
    }
  `]
})
export class NotificationComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  private subscription?: Subscription;

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.subscription = this.notificationService.notifications$.subscribe(
      notification => {
        this.notifications.push(notification);
        
        if (notification.duration && notification.duration > 0) {
          setTimeout(() => {
            this.removeNotification(notification.id);
          }, notification.duration);
        }
      }
    );
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  getIcon(type: string): string {
    switch (type) {
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'info';
    }
  }

  removeNotification(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }
}