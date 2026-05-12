import { Routes } from '@angular/router';

export const TEAMS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./teams-layout/teams-layout').then(m => m.TeamsLayout),
    children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      {
        path: 'list',
        loadComponent: () =>
          import('./pages/team-list/team-list').then(m => m.TeamList),
        title: 'Équipes – Liste',
      },
      {
        path: 'detail/:id',
        loadComponent: () =>
          import('./pages/team-detail/team-detail').then(m => m.TeamDetail),
        title: 'Équipes – Détail',
      },
      {
        path: 'create',
        loadComponent: () =>
          import('./pages/team-create/team-create').then(m => m.TeamCreate),
        title: 'Équipes – Nouvelle équipe',
      },
      {
        path: 'members/:id',
        loadComponent: () =>
          import('./pages/team-members/team-members').then(m => m.TeamMembers),
        title: 'Équipes – Membres',
      },
      {
        path: 'availability',
        loadComponent: () =>
          import('./pages/team-availability/team-availability').then(m => m.TeamAvailability),
        title: 'Équipes – Disponibilités',
      },
      { path: '**', redirectTo: 'list' },
    ],
  },
];
