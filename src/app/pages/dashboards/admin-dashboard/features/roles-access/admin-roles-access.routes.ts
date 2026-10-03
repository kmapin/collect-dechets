import { Routes } from '@angular/router';

export const ADMIN_ROLES_ACCESS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./admin-roles-access-layout').then((m) => m.AdminRolesAccessLayout),
    children: [
      { path: '', redirectTo: 'finance', pathMatch: 'full' },
      {
        path: 'finance',
        loadComponent: () => import('./finance/admin-finance-access').then((m) => m.AdminFinanceAccess),
        title: 'Droits financiers — Managers',
      },
      {
        path: 'administration-permissions',
        loadComponent: () =>
          import('./administration-permissions/admin-administration-permissions').then(
            (m) => m.AdminAdministrationPermissions,
          ),
        title: 'Permissions Administration — Managers',
      },
      { path: '**', redirectTo: 'finance' },
    ],
  },
];
