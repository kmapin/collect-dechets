import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../../../services/auth.service';
import { Breadcrumb, BreadcrumbItem } from '../../../../../shared/breadcrumb/breadcrumb';
import { dashboardLabelForRole, dashboardRouteForRole } from '../../../../../shared/notification-route.util';

interface NavItem {
  route: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { route: 'finance', label: 'Droits financiers', icon: 'payments' },
  { route: 'administration-permissions', label: 'Permissions Administration', icon: 'admin_panel_settings' },
];

/**
 * Shell de /dashboard/admin/roles-access — même design que administration-layout.ts côté
 * agence (page-header/breadcrumb/tabs-navigation/router-outlet), mais deux onglets
 * seulement (pas d'équivalent "Employés" ici : ce module ne gère que les managers déjà
 * créés, pas leur CRUD — voir admin-dashboard.html pour la création/suppression
 * d'utilisateurs, déjà existante). Les deux onglets enfants partagent la même liste
 * source (ManagerRoleAccessListService) mais restent des pages séparées, chacune
 * gouvernée par son propre domaine de permissions — même scission que côté agence
 * (roles-access vs administration-permissions).
 */
@Component({
  selector: 'app-admin-roles-access-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, Breadcrumb],
  templateUrl: './admin-roles-access-layout.html',
  styleUrl: './admin-roles-access-layout.scss',
})
export class AdminRolesAccessLayout {
  private readonly authService = inject(AuthService);

  readonly navItems = NAV_ITEMS;

  readonly breadcrumbItems: BreadcrumbItem[] = [
    { label: dashboardLabelForRole(this.authService.getCurrentUser()?.role), route: dashboardRouteForRole(this.authService.getCurrentUser()?.role), icon: 'home' },
    { label: 'Droits financiers & Administration' },
  ];
}
