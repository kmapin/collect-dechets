import { Component, signal, computed, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { NavItem } from '../models/planning.model';
import { PlanningService } from '../services/planning.service';
import { TooltipModule } from 'primeng/tooltip';
import { BadgeModule } from 'primeng/badge';

@Component({
  selector: 'app-planning-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, MatIconModule, TooltipModule, BadgeModule],
  templateUrl: './planning-layout.html',
  styleUrl: './planning-layout.scss',
})
export class PlanningLayout {
  private planningService = new PlanningService();

  collapsed = signal(false);
  mobileOpen = signal(false);
  isMobile = signal(window.innerWidth < 1024);

  alertCount = computed(() => this.planningService.alerts().length);

  navItems: NavItem[] = [
    { label: 'Tableau de bord', icon: 'dashboard',      route: '/planning/dashboard' },
    { label: 'Plannings',       icon: 'list_alt',        route: '/planning/list' },
    { label: 'Calendrier',      icon: 'calendar_month',  route: '/planning/calendar' },
    { label: 'Équipes',         icon: 'groups',          route: '/teams' },
    { label: 'Clients',         icon: 'people',          route: '/planning/clients' },
    { label: 'Zones',           icon: 'map',             route: '/planning/zones' },
    { label: 'Secteurs',        icon: 'grid_view',       route: '/planning/sectors' },
    { label: 'Rapports',        icon: 'bar_chart',       route: '/planning/reports' },
    { label: 'Paramètres',      icon: 'settings',        route: '/planning/settings' },
  ];

  bottomItems: NavItem[] = [
    { label: 'Aide',            icon: 'help_outline',    route: '/help' },
    // { label: 'Retour accueil',  icon: 'home',            route: '/' },
  ];

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 1024);
    if (window.innerWidth >= 1024) this.mobileOpen.set(false);
  }

  toggleCollapse() {
    this.collapsed.update(v => !v);
  }

  toggleMobile() {
    this.mobileOpen.update(v => !v);
  }

  closeMobile() {
    this.mobileOpen.set(false);
  }
}
