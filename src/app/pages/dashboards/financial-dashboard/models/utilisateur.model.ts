import { Role } from './enums';

// Table 19/23 — Utilisateur/Rôle. droitsFinance pilote le RBAC mock (F11, RG8) — voir
// DISCOVERY.md §4 : entité découplée du User/UserRole applicatif réel.
export interface Utilisateur {
  readonly idUtilisateur: string;
  identifiants: string; // identifiant de connexion (mock — pas d'authentification réelle)
  role: Role;
  droitsFinance: boolean;
}
