import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from '../models';
import { SESSION_SERVICE } from '../data-access/tokens/session.token';

// F11 admin : "Rôles & droits" réservé à l'Administrateur (spec §1.11 — "Roles admin
// denied" pour le Comptable, alors que financeAccessGuard le laisserait passer puisqu'il
// a droitsFinance = true). S'applique en plus de financeAccessGuard, jamais seul.
export const financeAdminGuard: CanActivateFn = () => {
  const session = inject(SESSION_SERVICE);
  const router = inject(Router);

  if (session.getCurrentUser().role === Role.ADMINISTRATEUR) return true;

  return router.createUrlTree(['/dashboard/financial/acces-refuse']);
};
