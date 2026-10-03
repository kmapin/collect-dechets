import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../../../../services/auth.service';
import { ADMINISTRATION_NAV_ITEMS } from '../administration-nav.config';
import { aLaPermissionAdministration } from '../models/administration-permission';
import { aLaPermissionDepuisUser } from '../../../../financial-dashboard/models';
import { Breadcrumb, BreadcrumbItem } from '../../../../../../shared/breadcrumb/breadcrumb';
import { dashboardRouteForRole, dashboardLabelForRole } from '../../../../../../shared/notification-route.util';

@Component({
  selector: 'app-administration-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, Breadcrumb],
  templateUrl: './administration-layout.html',
  styleUrl: './administration-layout.scss',
})
export class AdministrationLayout {
  private readonly authService = inject(AuthService);

  // Même convention que FinanceLayout (toSignal + computed) — ici directement sur
  // AuthService.currentUser$ (pas de session/data-access dédiée à ce stade, cf.
  // consigne "ne crée pas encore de nouveau CRUD").
  private readonly currentUser = toSignal(this.authService.currentUser$, {
    initialValue: this.authService.getCurrentUser(),
  });

  readonly navItems = computed(() => {
    const user = this.currentUser();
    return ADMINISTRATION_NAV_ITEMS.filter((item) => {
      if (aLaPermissionAdministration(user as any, ...item.permissions)) return true;
      // "Rôles & Accès" gère aussi les droits financiers (déplacé depuis
      // financial-dashboard) — un titulaire de roles.view finance doit voir l'onglet
      // même sans aucune permission administration (sinon régression du module finance).
      if (item.route === 'roles-access' && aLaPermissionDepuisUser(user as any, 'roles.view')) return true;
      return false;
    });
  });

  readonly breadcrumbItems: BreadcrumbItem[] = [
    {
      label: dashboardLabelForRole(this.authService.getCurrentUser()?.role),
      route: dashboardRouteForRole(this.authService.getCurrentUser()?.role),
      icon: 'home',
    },
    { label: 'Administration' },
  ];
}
