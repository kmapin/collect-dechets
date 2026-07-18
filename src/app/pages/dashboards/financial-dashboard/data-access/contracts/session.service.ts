import { Observable } from 'rxjs';
import { Role, Utilisateur } from '../../models';

// Session mock uniquement — découplée d'AuthService/UserRole réels (DISCOVERY.md §4).
export interface SessionUtilisateur {
  idUtilisateur: string;
  nomAffiche: string;
  role: Role;
  droitsFinance: boolean;
}

// Implémentation concrète (SessionMockService) et role-switcher : Prompt 6.
// getUtilisateurs/toggleDroitsFinance : Prompt 14 (F11 admin — roles-admin.component).
export abstract class SessionService {
  abstract readonly currentUser$: Observable<SessionUtilisateur>;
  abstract getCurrentUser(): SessionUtilisateur;
  /** Bascule de rôle pour la démo RBAC (F11) — jamais présent en production. */
  abstract switchRole(role: Role): void;
  /** F11 admin — roster mock modifiable en mémoire, distinct du dataset seed en lecture seule. */
  abstract getUtilisateurs(): Observable<Utilisateur[]>;
  /** Bascule droitsFinance ; répercuté immédiatement sur currentUser$ si c'est l'utilisateur actif. */
  abstract toggleDroitsFinance(idUtilisateur: string): void;
}
