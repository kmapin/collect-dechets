import { Routes } from '@angular/router';
import { administrationPermissionGuard } from './guards/administration-permission.guard';
import { rolesAccessGuard } from './guards/roles-access.guard';

export const ADMINISTRATION_ROUTES: Routes = [
  {
    path: '',
    // Pas de garde sur le shell lui-même (même principe que FinanceLayout, qui n'en a
    // jamais eu) : la protection est posée par sous-page (administrationPermissionGuard/
    // rolesAccessGuard ci-dessous), qui redirigent chacune vers 'acces-refuse' quand
    // aucun onglet n'est accessible. Mettre une garde ICI empêcherait justement cette
    // page 'acces-refuse' (un enfant de ce même shell) d'être atteinte sans redéclencher
    // cette garde — boucle de redirection infinie déjà rencontrée, voir l'historique de
    // ce fichier / administrationAccessGuard (supprimé, devenu inutile).
    loadComponent: () =>
      import('./administration-layout/administration-layout').then((m) => m.AdministrationLayout),
    children: [
      { path: '', redirectTo: 'employees', pathMatch: 'full' },
      {
        path: 'acces-refuse',
        loadComponent: () =>
          import('./access-denied/administration-access-denied').then((m) => m.AdministrationAccessDenied),
        title: 'Administration — Accès restreint',
      },
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
