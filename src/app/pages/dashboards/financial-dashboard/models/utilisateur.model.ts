import { Role } from './enums';
import { FinancePermission } from './finance-permission';

// Table 19/23 — Utilisateur/Rôle. droitsFinance pilote le RBAC réel (F11, RG8,
// GET/PATCH /finance/session/utilisateurs) — voir DISCOVERY.md §4 : entité découplée du
// User/UserRole applicatif (le rôle financier est distinct du rôle opérationnel).
// `permissions` : droits détaillés (onglets + actions), RBAC financier réel — voir
// finance-permission.ts.
export interface Utilisateur {
  readonly idUtilisateur: string;
  identifiants: string; // nom affiché de l'utilisateur (prénom + nom), pas un identifiant de connexion
  role: Role;
  droitsFinance: boolean;
  permissions: FinancePermission[];
}
