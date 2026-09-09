import { Role } from './enums';
import { FinancePermission } from './finance-permission';

export interface Utilisateur {
  readonly idUtilisateur: string;
  identifiants: string;
  role: Role;
  droitsFinance: boolean;
  permissions: FinancePermission[];
}
