import { Observable } from 'rxjs';
import { FinancePermission, Role, Utilisateur } from '../../models';

export interface AgenceSession {
  nom: string;
  ville?: string;
  quartier?: string;
}

// Modèle de session propre au dashboard financier — `role` ici est le rôle financier
// (financialRole backend), volontairement découplé de UserRole/AuthService (DISCOVERY.md
// §4) qui restent le rôle opérationnel de la plateforme. Alimenté réellement par
// GET /finance/session/moi (SessionHttpService), pas une session mock.
export interface SessionUtilisateur {
  idUtilisateur: string;
  nomAffiche: string;
  role: Role;
  droitsFinance: boolean;
  /** RBAC financier réel (onglets + droits) — voir models/finance-permission.ts. */
  permissions: FinancePermission[];
  /** Agence de l'utilisateur — absente si non rattaché à une agence (ex. super_admin). */
  agence?: AgenceSession;
}

// Implémentation concrète : SessionHttpService (data-access/http/session.http.service.ts).
// getUtilisateurs/toggleDroitsFinance : Prompt 14 (F11 admin — roles-admin.component).
// `switchRole` (démo RBAC sans auth réelle) a été retiré du contrat lors du nettoyage 100%
// mocks : son seul appelant (RoleSwitcherComponent) a été supprimé, et le rôle vient
// désormais toujours de la session réelle (GET /finance/session/moi).
export abstract class SessionService {
  abstract readonly currentUser$: Observable<SessionUtilisateur>;
  abstract getCurrentUser(): SessionUtilisateur;
  /** F11 admin — liste des utilisateurs de l'agence pour l'écran de gestion des droits. */
  abstract getUtilisateurs(): Observable<Utilisateur[]>;
  /**
   * Bascule droitsFinance ; répercuté immédiatement sur currentUser$ si c'est l'utilisateur
   * actif. Retourne l'utilisateur à jour (et non `void`) : l'appelant doit attendre la
   * confirmation serveur avant de rafraîchir sa propre liste, sans quoi un GET lancé juste
   * après le PATCH peut le devancer (course, corrigée lors du chantier RBAC financier).
   */
  abstract toggleDroitsFinance(idUtilisateur: string): Observable<Utilisateur>;
  /**
   * Assigne (ou retire, `null`) le rôle financier d'un utilisateur ciblé — F11 admin.
   * Backend réel : couple aussi droitsFinance (rôle assigné => accès accordé, rôle retiré
   * => accès révoqué) et réinitialise `permissions` au préréglage du rôle ; voir
   * EditRecap.md backend, section "Assignation du financialRole".
   */
  abstract setFinancialRole(idUtilisateur: string, role: Role | null): Observable<Utilisateur>;
  /**
   * Remplace intégralement les droits détaillés (onglets + actions) d'un utilisateur ciblé —
   * RBAC financier réel. Le serveur refuse toute clé que l'appelant ne détient pas
   * lui-même (plafond de délégation) et toute clé de gouvernance si l'appelant n'est pas
   * administrateur — voir requireFinancePermission/FinanceUsersController côté backend.
   */
  abstract setPermissions(idUtilisateur: string, permissions: FinancePermission[]): Observable<Utilisateur>;
}
