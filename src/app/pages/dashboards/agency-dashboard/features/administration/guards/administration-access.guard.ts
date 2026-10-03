import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../../../../../services/auth.service';
import { dashboardRouteForRole } from '../../../../../../shared/notification-route.util';
import { aLaPermissionAdministration, ADMINISTRATION_PERMISSIONS } from '../models/administration-permission';
import { aLaPermissionDepuisUser } from '../../../../financial-dashboard/models';

/**
 * Porte d'entrée du module (posée sur administration-layout, comme financeAccessGuard sur
 * finance-layout) — désormais basée sur les permissions réelles (administrationPermissions)
 * plutôt que sur le rôle applicatif : synchrone via getCurrentUser(), jamais via
 * hasMinimumRole() dans un `if` (cf. le bug des guards historiques dans core/guards/
 * auth.guard.ts, jamais reproduit ici). Accès au shell dès qu'une seule permission
 * d'administration est détenue (ou super_admin) — le détail de ce qui est visible est
 * ensuite filtré par administrationPermissionGuard, par sous-page.
 *
 * Exception additive : un titulaire de 'roles.view' côté FINANCE (droit totalement
 * indépendant, voir models/administration-permission.ts) doit aussi pouvoir entrer, car
 * Rôles et accès (sous-page roles-access) gère désormais les deux domaines dans un même
 * écran — sans cette exception, un administrateur finance sans aucune permission
 * administration serait bloqué avant même d'atteindre l'écran où il a pourtant un droit
 * réel (régression du module finance, explicitement interdite).
 */
export const administrationAccessGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.getCurrentUser();

  if (aLaPermissionAdministration(user as any, ...ADMINISTRATION_PERMISSIONS) || aLaPermissionDepuisUser(user as any, 'roles.view')) {
    return true;
  }

  console.warn('Accès refusé: aucune permission du module Administration');
  router.navigate([dashboardRouteForRole(user?.role)]);
  return false;
};
