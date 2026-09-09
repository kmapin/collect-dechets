import { Observable } from 'rxjs';
import { FinancePermission, Role, Utilisateur } from '../../models';

export interface AgenceSession {
  nom: string;
  ville?: string;
  quartier?: string;
}

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

export abstract class SessionService {
  abstract readonly currentUser$: Observable<SessionUtilisateur>;
  abstract getCurrentUser(): SessionUtilisateur;
  /** F11 admin — liste des utilisateurs de l'agence pour l'écran de gestion des droits. */
  abstract getUtilisateurs(): Observable<Utilisateur[]>;
  abstract toggleDroitsFinance(idUtilisateur: string): Observable<Utilisateur>;
  abstract setFinancialRole(idUtilisateur: string, role: Role | null): Observable<Utilisateur>;
  abstract setPermissions(idUtilisateur: string, permissions: FinancePermission[]): Observable<Utilisateur>;
}
