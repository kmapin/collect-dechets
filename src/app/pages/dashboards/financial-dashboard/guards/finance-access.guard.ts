import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs/operators';
import { SESSION_SERVICE } from '../data-access/tokens/session.token';


export const financeAccessGuard: CanActivateFn = () => {
  const session = inject(SESSION_SERVICE);
  const router = inject(Router);

  return session.currentUser$.pipe(
    take(1),
    map(utilisateur => (utilisateur.droitsFinance ? true : router.createUrlTree(['/dashboard/financial/acces-refuse']))),
  );
};
