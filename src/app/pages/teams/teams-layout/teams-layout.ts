import {
  Component, signal, computed, HostListener, inject,
} from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TooltipModule } from 'primeng/tooltip';
import { BadgeModule } from 'primeng/badge';
import { TeamService } from '../services/team.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  badge?: () => number;
}

@Component({
  selector: 'app-teams-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, MatIconModule, TooltipModule, BadgeModule],
  templateUrl: './teams-layout.html',
  styleUrl: './teams-layout.scss',
})
export class TeamsLayout {
  readonly svc = inject(TeamService);

  collapsed  = signal(false);
  mobileOpen = signal(false);
  isMobile   = signal(window.innerWidth < 768);

  onMissionCount = computed(() => this.svc.stats().onMission);
  maintenanceCount = computed(() => this.svc.stats().maintenance);

  navItems: NavItem[] = [
    { label: 'Tableau de bord', icon: 'dashboard',     route: '/teams/list' },
    { label: 'En mission',      icon: 'directions_run', route: '/teams/list' },
    { label: 'Statistiques',    icon: 'bar_chart',      route: '/teams/list' },
    { label: 'Plannings',       icon: 'calendar_month', route: '/planning/dashboard' },
  ];

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile.set(window.innerWidth < 768);
    if (!this.isMobile()) this.mobileOpen.set(false);
  }

  toggleCollapse(): void { this.collapsed.update(v => !v); }
  toggleMobile(): void   { this.mobileOpen.update(v => !v); }
  closeMobile(): void    { this.mobileOpen.set(false); }
}
