import { Routes } from '@angular/router';

export const PLANNING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./planning-layout/planning-layout').then(m => m.PlanningLayout),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/planning-dashboard').then(m => m.PlanningDashboard),
        title: 'Planning – Tableau de bord',
      },
      {
        path: 'create',
        loadComponent: () =>
          import('./planning-create/planning-create').then(m => m.PlanningCreate),
        title: 'Planning – Nouveau planning',
      },
      // Les routes suivantes seront implémentées dans les prompts suivants
      {
        path: 'list',
        loadComponent: () =>
          import('./dashboard/planning-dashboard').then(m => m.PlanningDashboard),
        title: 'Planning – Liste des plannings',
      },
      {
        path: 'calendar',
        loadComponent: () =>
          import('./planning-calendar/planning-calendar').then(m => m.PlanningCalendarComponent),
        title: 'Planning – Calendrier',
      },
      {
        path: 'teams',
        loadComponent: () =>
          import('./dashboard/planning-dashboard').then(m => m.PlanningDashboard),
        title: 'Planning – Équipes',
      },
      {
        path: 'clients',
        loadComponent: () =>
          import('./dashboard/planning-dashboard').then(m => m.PlanningDashboard),
        title: 'Planning – Clients',
      },
      {
        path: 'zones',
        loadComponent: () =>
          import('./dashboard/planning-dashboard').then(m => m.PlanningDashboard),
        title: 'Planning – Zones',
      },
      {
        path: 'sectors',
        loadComponent: () =>
          import('./dashboard/planning-dashboard').then(m => m.PlanningDashboard),
        title: 'Planning – Secteurs',
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./dashboard/planning-dashboard').then(m => m.PlanningDashboard),
        title: 'Planning – Rapports',
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./dashboard/planning-dashboard').then(m => m.PlanningDashboard),
        title: 'Planning – Paramètres',
      },
      {
        path: 'detail/:id',
        loadComponent: () =>
          import('./planning-detail/planning-detail').then(m => m.PlanningDetailComponent),
        title: 'Planning – Détail',
      },
      {
        path: '**',
        redirectTo: 'dashboard',
      },
    ],
  },
];
