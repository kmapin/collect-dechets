// Miroir simplifié de financial-dashboard/models/finance-permission.ts — catalogue
// indépendant (pas de fusion avec FinancePermission), même principe de bypass
// (super_admin) mais pas de notion de "droitsFinance"/financialRole : un utilisateur
// "a" une permission d'administration s'il est super_admin OU si la clé figure dans son
// tableau administrationPermissions, point.

export type AdministrationPermission =
  | 'employees.view'
  | 'employees.create'
  | 'employees.update'
  | 'employees.delete'
  | 'roles.view'
  | 'roles.manage';

export const ADMINISTRATION_PERMISSIONS: AdministrationPermission[] = [
  'employees.view',
  'employees.create',
  'employees.update',
  'employees.delete',
  'roles.view',
  'roles.manage',
];

export const PERMISSIONS_GOUVERNANCE: AdministrationPermission[] = ['roles.view', 'roles.manage'];

// Miroir de config/administrationPermissions.js::DEFAULT_OWNER_PERMISSIONS (backend) —
// doit rester synchronisé avec la logique réelle de middlewares/requirePermission.js.
// Purement côté UI (quels boutons/onglets afficher) : le backend revérifie
// indépendamment la même règle à chaque requête, cette constante ne fait qu'éviter
// d'afficher une interface que le backend refuserait de toute façon.
export const DEFAULT_OWNER_PERMISSIONS: AdministrationPermission[] = [
  'employees.view',
  'employees.create',
  'employees.update',
  'employees.delete',
];

export interface DroitAdministration {
  cle: AdministrationPermission;
  label: string;
}

export const GROUPES_DROITS_ADMINISTRATION: { titre: string; droits: DroitAdministration[] }[] = [
  {
    titre: 'Employés',
    droits: [
      { cle: 'employees.view', label: 'Voir les employés' },
      { cle: 'employees.create', label: 'Créer un employé' },
      { cle: 'employees.update', label: 'Modifier un employé' },
      { cle: 'employees.delete', label: 'Supprimer un employé' },
    ],
  },
  {
    titre: 'Gouvernance',
    droits: [
      { cle: 'roles.view', label: "Voir les rôles & accès du personnel" },
      { cle: 'roles.manage', label: "Gérer les rôles & accès du personnel" },
    ],
  },
];

export interface UtilisateurAvecPermissionsAdministration {
  role?: string;
  administrationPermissions?: string[];
  isOwnerAgency?: boolean;
}

export function aLaPermissionAdministration(
  u: UtilisateurAvecPermissionsAdministration | null | undefined,
  ...cles: AdministrationPermission[]
): boolean {
  if (!u) return false;
  if (u.role === 'super_admin') return true;
  const permissions = u.administrationPermissions || [];
  // Même préréglage implicite que middlewares/requirePermission.js (backend) : un
  // manager propriétaire d'agence dont administrationPermissions est encore vide
  // (jamais configuré par un super_admin) est traité comme détenant
  // DEFAULT_OWNER_PERMISSIONS. Dès qu'un tableau non vide existe, ce préréglage
  // s'efface : seules les clés explicitement accordées comptent.
  const estProprietaireNonConfigure = u.role === 'manager' && u.isOwnerAgency === true && permissions.length === 0;
  const permissionsEffectives = estProprietaireNonConfigure ? DEFAULT_OWNER_PERMISSIONS : permissions;
  return cles.some((c) => permissionsEffectives.includes(c));
}
