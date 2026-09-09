import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs/operators';
import { aLaPermission, FinancePermission } from '../models';
import { FINANCE_NAV_ITEMS } from '../features/shell/finance-nav.config';
import { SESSION_SERVICE } from '../data-access/tokens/session.token';


export const financePermissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const session = inject(SESSION_SERVICE);
  const router = inject(Router);
  const permissionsRequises = (route.data?.['permissions'] as FinancePermission[] | undefined) ?? [];

  return session.currentUser$.pipe(
    take(1),
    map(utilisateur => {
      if (aLaPermission(utilisateur, ...permissionsRequises)) return true;

      const premierOngletAutorise = FINANCE_NAV_ITEMS.find(item => aLaPermission(utilisateur, ...item.permissions));
      return router.createUrlTree([
        premierOngletAutorise ? `/dashboard/financial/${premierOngletAutorise.route}` : '/dashboard/financial/acces-refuse',
      ]);
    }),
  );
};
