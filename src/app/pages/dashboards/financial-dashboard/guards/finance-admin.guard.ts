import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs/operators';
import { Role } from '../models';
import { SESSION_SERVICE } from '../data-access/tokens/session.token';

// F11 admin : "Rôles & droits" réservé à l'Administrateur (spec §1.11 — "Roles admin
// denied" pour le Comptable, alors que financeAccessGuard le laisserait passer puisqu'il
// a droitsFinance = true). S'applique en plus de financeAccessGuard, jamais seul.
//
// Même correction que finance-access.guard.ts : currentUser$ (réactif) plutôt que
// getCurrentUser() (synchrone, racy avec SessionHttpService — voir ce fichier pour le
// détail).
export const financeAdminGuard: CanActivateFn = () => {
  const session = inject(SESSION_SERVICE);
  const router = inject(Router);

  return session.currentUser$.pipe(
    take(1),
    map(utilisateur => (utilisateur.role === Role.ADMINISTRATEUR ? true : router.createUrlTree(['/dashboard/financial/acces-refuse']))),
  );
};
