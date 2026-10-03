import { Routes } from '@angular/router';
import { administrationAccessGuard } from './guards/administration-access.guard';
import { administrationPermissionGuard } from './guards/administration-permission.guard';
import { rolesAccessGuard } from './guards/roles-access.guard';

export const ADMINISTRATION_ROUTES: Routes = [
  {
    path: '',
    canActivate: [administrationAccessGuard],
    loadComponent: () =>
      import('./administration-layout/administration-layout').then((m) => m.AdministrationLayout),
    children: [
      { path: '', redirectTo: 'employees', pathMatch: 'full' },
      {
        path: 'employees',
        canActivate: [administrationPermissionGuard],
        data: { permissions: ['employees.view'] },
        loadComponent: () => import('./employees/employees').then((m) => m.Employees),
        title: 'Administration — Employés',
      },
      {
        path: 'roles-access',
        // Garde dédiée (pas administrationPermissionGuard) : cette page gère à la fois
        // roles.view administration ET roles.view finance (déplacé depuis
        // financial-dashboard/features/roles-admin/) — voir guards/roles-access.guard.ts.
        canActivate: [rolesAccessGuard],
        loadComponent: () => import('./roles-access/roles-access').then((m) => m.RolesAccess),
        title: 'Administration — Droits financiers',
      },
      {
        path: 'administration-permissions',
        // administrationPermissionGuard standard (pas rolesAccessGuard) : contrairement à
        // roles-access, cette page n'affiche jamais rien côté finance — un titulaire de
        // roles.view finance uniquement n'a pas de raison d'y accéder.
        canActivate: [administrationPermissionGuard],
        data: { permissions: ['roles.view'] },
        loadComponent: () =>
          import('./administration-permissions/administration-permissions').then((m) => m.AdministrationPermissions),
        title: 'Administration — Permissions Administration',
      },
      { path: '**', redirectTo: 'employees' },
    ],
  },
];
