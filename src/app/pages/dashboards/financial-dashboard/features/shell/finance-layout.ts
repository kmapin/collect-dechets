import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { SESSION_SERVICE } from '../../data-access/tokens/session.token';
import { FINANCE_NAV_ITEMS } from './finance-nav.config';
import { aLaPermission } from '../../models';
import { Breadcrumb, BreadcrumbItem } from '../../../../../shared/breadcrumb/breadcrumb';
import { AuthService } from '../../../../../services/auth.service';
import { dashboardRouteForRole, dashboardLabelForRole } from '../../../../../shared/notification-route.util';


@Component({
  selector: 'app-finance-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, Breadcrumb],
  templateUrl: './finance-layout.html',
  styleUrl: './finance-layout.scss',
})
export class FinanceLayout {
  private readonly session = inject(SESSION_SERVICE);
  // Rôle applicatif principal (celui de l'espace agence), distinct du modèle de
  // permissions propre au module finance (Role.COMPTABLE/MANAGER_TERRAIN/ADMINISTRATEUR
  // ci-dessus) — utilisé uniquement pour savoir vers quel tableau de bord ramène le fil
  // d'Ariane, ce module étant atteint depuis le tableau de bord agence.
  private readonly mainAuth = inject(AuthService);

  private readonly currentUser = toSignal(this.session.currentUser$, { initialValue: null });

  readonly navItems = computed(() => {
    const utilisateur = this.currentUser();
    return FINANCE_NAV_ITEMS.filter(item => aLaPermission(utilisateur, ...item.permissions));
  });

  readonly breadcrumbItems: BreadcrumbItem[] = [
    { label: dashboardLabelForRole(this.mainAuth.getCurrentUser()?.role), route: dashboardRouteForRole(this.mainAuth.getCurrentUser()?.role), icon: 'home' },
    { label: 'Finance' },
  ];
}
