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
        title: 'Administration — Rôles & Accès',
      },
      { path: '**', redirectTo: 'employees' },
    ],
  },
];
