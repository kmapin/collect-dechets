import { Role } from './enums';
import { FinancePermission } from './finance-permission';

export interface Utilisateur {
  readonly idUtilisateur: string;
  identifiants: string;
  // Peut être `null` (aucun rôle financier attribué) malgré l'absence de rôle imposée par
  // ce type historiquement — comportement déjà géré en pratique (voir
  // roles-access.ts::appliquerPreregleRoleFinance, qui teste `!u.role` avant usage).
  role: Role | null;
  droitsFinance: boolean;
  permissions: FinancePermission[];
}
