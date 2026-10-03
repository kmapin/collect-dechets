import { AdministrationPermission } from './models/administration-permission';

export interface AdministrationNavItem {
  route: string; // relatif à /dashboard/agency/administration
  label: string;
  icon: string;
  permissions: AdministrationPermission[];
}

export const ADMINISTRATION_NAV_ITEMS: AdministrationNavItem[] = [
  { route: 'employees', label: 'Employés', icon: 'badge', permissions: ['employees.view'] },
  // Libellé "Droits financiers" (pas "Rôles & Accès") : depuis l'ajout de l'onglet dédié
  // Permissions Administration ci-dessous, cet écran sert avant tout aux droits
  // financiers — il continue d'afficher la section Administration en plus quand elle est
  // disponible (titulaire roles.view administration), sans que ça change son rôle principal.
  { route: 'roles-access', label: 'Droits financiers', icon: 'admin_panel_settings', permissions: ['roles.view'] },
  // Pendant de roles-access ci-dessus, mais SANS les droits financiers — onglet dédié au
  // seul domaine Administration (voir administration-permissions/). Mêmes permissions
  // requises (roles.view pour consulter) : les deux pages agissent sur le même
  // AdministrationUsersService, donc le même endpoint gouverné côté backend.
  { route: 'administration-permissions', label: 'Permissions Administration', icon: 'verified_user', permissions: ['roles.view'] },
];
