import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs/operators';
import { aLaPermission, FinancePermission } from '../models';
import { FINANCE_NAV_ITEMS } from '../features/shell/finance-nav.config';
import { SESSION_SERVICE } from '../data-access/tokens/session.token';

// RBAC financier réel (onglets + droits) — remplace le double garde financeAccessGuard
// (coupe-circuit droitsFinance, conservé tel quel, toujours composé en premier) +
// financeAdminGuard (supprimé : son seul appelant, la route roles-admin, porte désormais
// `data: { permissions: ['roles.view'] }`, un cas parmi d'autres de ce garde générique).
//
// Chaque route enfant protégée déclare la ou les clés requises dans `route.data.permissions`
// (sémantique OU, cf. aLaPermission) — voir financial-dashboard.routes.ts. Le serveur
// applique la même règle indépendamment (requireFinancePermission) : ce garde n'est qu'un
// confort d'affichage, jamais la seule barrière.
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
