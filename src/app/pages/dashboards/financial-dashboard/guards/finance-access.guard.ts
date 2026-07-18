import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SESSION_SERVICE } from '../data-access/tokens/session.token';

// Lit uniquement la session mock (jamais AuthService/UserRole réels — DISCOVERY.md §4).
// Simplification assumée pour la démo RBAC (Prompt 6, acceptance criteria) : tout le
// module est masqué aux rôles sans droitsFinance — y compris la liste clients (F6) qui,
// selon la matrice complète de la spec (§1.11), devrait rester partiellement visible au
// Manager terrain (colonnes non financières). À affiner si le produit le demande.
export const financeAccessGuard: CanActivateFn = () => {
  const session = inject(SESSION_SERVICE);
  const router = inject(Router);

  if (session.getCurrentUser().droitsFinance) return true;

  return router.createUrlTree(['/dashboard/financial/acces-refuse']);
};
