import { Observable } from 'rxjs';
import { Role, Utilisateur } from '../../models';

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
  /** Bascule droitsFinance ; répercuté immédiatement sur currentUser$ si c'est l'utilisateur actif. */
  abstract toggleDroitsFinance(idUtilisateur: string): void;
  /**
   * Assigne (ou retire, `null`) le rôle financier d'un utilisateur ciblé — F11 admin.
   * Backend réel : couple aussi droitsFinance (rôle assigné => accès accordé, rôle retiré
   * => accès révoqué) ; voir EditRecap.md backend, section "Assignation du financialRole".
   */
  abstract setFinancialRole(idUtilisateur: string, role: Role | null): void;
}
