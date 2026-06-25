import {
  Component, signal, computed, output, HostListener, inject,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TooltipModule } from 'primeng/tooltip';
import { TeamService } from '../../pages/teams/services/team.service';

interface SideNav {
  label: string;
  icon: string;
  route: string;
  exact?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatIconModule, TooltipModule],
  templateUrl: './app-sidebar.html',
  styleUrl:    './app-sidebar.scss',
})
export class AppSidebarComponent {
  private teamSvc = inject(TeamService);

  collapsed  = signal(false);
  mobileOpen = signal(false);
  isMobile   = signal(window.innerWidth < 1024);

  collapsedChange = output<boolean>();

  teamStats        = computed(() => this.teamSvc.stats());
  onMissionCount   = computed(() => this.teamSvc.stats().onMission);
  maintenanceCount = computed(() => this.teamSvc.stats().maintenance);

  // ── Navigation sections ──────────────────────────────────────

  readonly planningNav: SideNav[] = [
    { label: 'Tableau de bord', icon: 'dashboard',      route: '/planning/dashboard', exact: true },
    { label: 'Calendrier',      icon: 'calendar_month',  route: '/planning/calendar' },
    { label: 'Zones d\'intervention',           icon: 'map',             route: '/planning/zones' },
  ];

  readonly teamsNav: SideNav[] = [
    { label: 'Supervision',     icon: 'dashboard',           route: '/teams/dashboard', exact: true },
    { label: 'Équipes',         icon: 'groups',              route: '/teams/list' },
    { label: 'Disponibilités',  icon: 'calendar_view_week',  route: '/teams/availability' },
  ];

  readonly bottomNav: SideNav[] = [
    { label: 'Aide',            icon: 'help_outline',  route: '/help' },
  ];

  // ── Resize ──────────────────────────────────────────────────
  @HostListener('window:resize')
  onResize(): void {
    this.isMobile.set(window.innerWidth < 1024);
    if (window.innerWidth >= 1024) this.mobileOpen.set(false);
  }

  // ── Actions ──────────────────────────────────────────────────
  toggleCollapse(): void {
    this.collapsed.update(v => !v);
    this.collapsedChange.emit(this.collapsed());
  }

  toggleMobile(): void  { this.mobileOpen.update(v => !v); }
  closeMobile(): void   { this.mobileOpen.set(false); }

  get mini(): boolean { return this.collapsed() && !this.isMobile(); }
}
