import { Role, Utilisateur } from '../../../models';

// Alimente la démo RBAC (F11, Prompt 6) : un utilisateur mock par rôle finance.
export const UTILISATEURS: Utilisateur[] = [
  { idUtilisateur: 'usr-001', identifiants: 'comptable.demo', role: Role.COMPTABLE, droitsFinance: true },
  { idUtilisateur: 'usr-002', identifiants: 'manager.terrain.demo', role: Role.MANAGER_TERRAIN, droitsFinance: false },
  { idUtilisateur: 'usr-003', identifiants: 'admin.demo', role: Role.ADMINISTRATEUR, droitsFinance: true },
];
