import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../../../../../services/auth.service';
import { ADMINISTRATION_NAV_ITEMS } from '../administration-nav.config';
import { aLaPermissionAdministration, AdministrationPermission } from '../models/administration-permission';

/**
 * Pendant de financePermissionGuard : contrôle d'accès PAR SOUS-PAGE, lu depuis
 * route.data['permissions']. Redirige vers le premier onglet autorisé plutôt qu'un refus
 * sec, même UX que le module finance.
 */
export const administrationPermissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const permissionsRequises = (route.data?.['permissions'] as AdministrationPermission[] | undefined) ?? [];

  const user = authService.getCurrentUser();

  if (aLaPermissionAdministration(user as any, ...permissionsRequises)) {
    return true;
  }

  const premierOngletAutorise = ADMINISTRATION_NAV_ITEMS.find((item) =>
    aLaPermissionAdministration(user as any, ...item.permissions),
  );
  return router.createUrlTree([
    premierOngletAutorise
      ? `/dashboard/agency/administration/${premierOngletAutorise.route}`
      : '/dashboard/agency',
  ]);
};
