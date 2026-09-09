import { Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface BellNotification {
  id: string;
  icon: string;
  title: string;
  message: string;
  date: Date;
  read: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.scss',
})
export class NotificationBell {
  @Input() notifications: BellNotification[] = [];
  @Output() markAsRead = new EventEmitter<string>();
  @Output() markAllAsRead = new EventEmitter<void>();

  isOpen = false;

  constructor(private eRef: ElementRef<HTMLElement>) {}

  get unreadCount(): number {
    return this.notifications.filter((n) => !n.read).length;
  }

  get unreadBadgeLabel(): string {
    return this.unreadCount > 99 ? '99+' : `${this.unreadCount}`;
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
  }

  close(): void {
    this.isOpen = false;
  }

  onItemActivate(notif: BellNotification): void {
    if (!notif.read) {
      this.markAsRead.emit(notif.id);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (this.isOpen && !this.eRef.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }
}
