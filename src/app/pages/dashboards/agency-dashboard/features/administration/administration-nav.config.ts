import { AdministrationPermission } from './models/administration-permission';

export interface AdministrationNavItem {
  route: string; // relatif à /dashboard/agency/administration
  label: string;
  icon: string;
  permissions: AdministrationPermission[];
}

export const ADMINISTRATION_NAV_ITEMS: AdministrationNavItem[] = [
  { route: 'employees', label: 'Employés', icon: 'badge', permissions: ['employees.view'] },
  { route: 'roles-access', label: 'Rôles & Accès', icon: 'admin_panel_settings', permissions: ['roles.view'] },
];
