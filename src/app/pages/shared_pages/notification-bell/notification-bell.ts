import { Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Structurally typed (not imported from a dashboard) so this component stays
 * dashboard-agnostic and reusable elsewhere — same convention as
 * CoverageMapZone in coverage-map.ts. The caller owns deriving these from
 * whatever domain data it already has (incidents, agency audits, ...) and
 * owns the read/unread state, since that doesn't naturally exist on the
 * source records.
 */
export interface BellNotification {
  id: string;
  icon: string;
  title: string;
  message: string;
  date: Date;
  read: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Generic notification bell + dropdown — header-mounted, presentational only.
 * The app already has a global backend/WebSocket-driven bell in
 * app-header/header.ts, but it's generic (not dashboard-aware) and, per the
 * business complaint this component addresses, effectively non-functional
 * for municipality users. This component is purely in-memory: the caller
 * passes already-derived notifications in and reacts to markAsRead/
 * markAllAsRead — no HTTP calls, no persistence, matching the "no backend
 * yet" phase every other Municipality Dashboard mock feature follows.
 */
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
