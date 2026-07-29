import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs/operators';
import { SESSION_SERVICE } from '../data-access/tokens/session.token';

// Simplification assumée pour la démo RBAC (Prompt 6, acceptance criteria) : tout le
// module est masqué aux rôles sans droitsFinance — y compris la liste clients (F6) qui,
// selon la matrice complète de la spec (§1.11), devrait rester partiellement visible au
// Manager terrain (colonnes non financières). À affiner si le produit le demande.
//
// Lit currentUser$ (réactif) plutôt que getCurrentUser() (synchrone) : ce dernier ne
// posait jamais problème avec SessionMockService (valeur déjà disponible dans son
// BehaviorSubject dès la construction), mais devient une vraie course avec
// SessionHttpService (intégration backend, Prompt F5) — sa valeur n'existe qu'après la
// résolution asynchrone de GET /finance/session/moi. take(1) reproduit le comportement
// synchrone d'origine pour le mock (émission immédiate) tout en attendant la vraie
// réponse serveur le temps qu'il faut pour l'Http.
export const financeAccessGuard: CanActivateFn = () => {
  const session = inject(SESSION_SERVICE);
  const router = inject(Router);

  return session.currentUser$.pipe(
    take(1),
    map(utilisateur => (utilisateur.droitsFinance ? true : router.createUrlTree(['/dashboard/financial/acces-refuse']))),
  );
};
