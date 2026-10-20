import { Component, OnInit, OnDestroy } from '@angular/core';

import { Subscription } from 'rxjs';
import { NotificationService, NotificationI } from '../../services/notification.service';

interface MinuteurToast {
  remaining: number;
  startedAt: number;
  timeoutId: ReturnType<typeof setTimeout> | null;
}

@Component({
  selector: 'app-notification',
  imports: [],
  templateUrl: './notification.html',
  styleUrl: './notification.css'
})
export class Notification  implements OnInit, OnDestroy {
  notifications: NotificationI[] = [];
  private subscription?: Subscription;
  // Un minuteur pausable par toast (clearTimeout + temps restant) plutôt qu'un setTimeout
  // fixe : le curseur dessus (mouseenter) doit suspendre la disparition automatique.
  private readonly minuteurs = new Map<string, MinuteurToast>();

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.subscription = this.notificationService.notifications$.subscribe(
      notification => {
        this.notifications.push(notification);

        if (notification.duration && notification.duration > 0) {
          this.demarrerMinuteur(notification.id, notification.duration);
        }
      }
    );
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.minuteurs.forEach(m => { if (m.timeoutId) clearTimeout(m.timeoutId); });
  }

  private demarrerMinuteur(id: string, duration: number): void {
    const timeoutId = setTimeout(() => this.removeNotification(id), duration);
    this.minuteurs.set(id, { remaining: duration, startedAt: Date.now(), timeoutId });
  }

  pauseMinuteur(id: string): void {
    const minuteur = this.minuteurs.get(id);
    if (!minuteur || minuteur.timeoutId === null) return;
    clearTimeout(minuteur.timeoutId);
    minuteur.remaining = Math.max(0, minuteur.remaining - (Date.now() - minuteur.startedAt));
    minuteur.timeoutId = null;
  }

  reprendreMinuteur(id: string): void {
    const minuteur = this.minuteurs.get(id);
    if (!minuteur || minuteur.timeoutId !== null) return;
    minuteur.startedAt = Date.now();
    minuteur.timeoutId = setTimeout(() => this.removeNotification(id), minuteur.remaining);
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
    const minuteur = this.minuteurs.get(id);
    if (minuteur?.timeoutId) clearTimeout(minuteur.timeoutId);
    this.minuteurs.delete(id);
    this.notifications = this.notifications.filter(n => n.id !== id);
  }
}
