import { FinancePermission, Role } from '../../../../financial-dashboard/models';
import { AdministrationPermission } from '../../../../agency-dashboard/features/administration/models/administration-permission';

export const FINANCIAL_ROLE_BACKEND_VERS_FRONTEND: Record<string, Role> = {
  comptable: Role.COMPTABLE,
  manager_terrain: Role.MANAGER_TERRAIN,
  administrateur: Role.ADMINISTRATEUR,
};

export const FINANCIAL_ROLE_FRONTEND_VERS_BACKEND: Record<Role, 'comptable' | 'manager_terrain' | 'administrateur'> = {
  [Role.COMPTABLE]: 'comptable',
  [Role.MANAGER_TERRAIN]: 'manager_terrain',
  [Role.ADMINISTRATEUR]: 'administrateur',
};

/**
 * Ligne de personnel pour les écrans plateforme entière (Droits financiers & Permissions
 * Administration, dashboard super_admin) — toujours un manager, de n'importe quelle agence.
 * Un seul type partagé par les deux écrans, même si chacun n'utilise que les champs de son
 * propre domaine, pour éviter deux interfaces presque identiques.
 */
export interface ManagerRoleAccess {
  idUtilisateur: string;
  identifiants: string;
  agencyId: string;
  agenceNom: string;
  financialRole: Role | null;
  droitsFinance: boolean;
  financePermissions: FinancePermission[];
  administrationPermissions: AdministrationPermission[];
}
