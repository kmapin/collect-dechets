// Reprend exactement les liens de l'ancien <app-sidebar> (planningNav + teamsNav,
// voir shared/app-sidebar/app-sidebar.ts) — même routes, mêmes query params, même
// correspondance "exact" — seule la présentation change (onglets horizontaux au lieu
// d'une nav verticale), pas la navigation elle-même.
export interface PlanningTeamsNavItem {
  route: string;
  label: string;
  icon: string;
  exact?: boolean;
  queryParams?: Record<string, string>;
}

export const PLANNING_NAV_ITEMS: PlanningTeamsNavItem[] = [
  { route: '/planning/dashboard', label: 'Tableau de bord', icon: 'dashboard', exact: true },
  { route: '/planning/calendar', label: 'Calendrier', icon: 'calendar_month' },
  { route: '/dashboard/agency', label: 'Plannings', icon: 'schedule', queryParams: { tab: 'schedules' } },
];

export const TEAMS_NAV_ITEMS: PlanningTeamsNavItem[] = [
  { route: '/teams/dashboard', label: 'Supervision', icon: 'dashboard', exact: true },
  { route: '/teams/list', label: 'Équipes', icon: 'groups' },
  { route: '/teams/availability', label: 'Disponibilités', icon: 'calendar_view_week' },
];
