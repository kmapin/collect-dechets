import { NavigationExtras } from '@angular/router';
import { NotificationItem } from '../models/notification.model';

export interface NotificationNavigation {
  commands: any[];
  extras?: NavigationExtras;
  openPlanningSummary?: string;
}

export const PLANNING_DETAIL_ROLES = new Set(['manager', 'collector']);

const DASHBOARD_ROUTE_BY_ROLE: Record<string, string> = {
  client: '/dashboard/client',
  manager: '/dashboard/agency',
  collector: '/dashboard/collector',
  municipality: '/dashboard/municipality',
  super_admin: '/dashboard/admin',
};

export function dashboardRouteForRole(role: string | null | undefined): string {
  return (role && DASHBOARD_ROUTE_BY_ROLE[role]) || '/';
}

// Libellé du premier maillon du fil d'Ariane (app-breadcrumb) — 'Dashboard agence' est le
// seul libellé explicitement demandé (espace agence) ; les autres rôles ont un intitulé
// générique pour les pages partagées (ex. notification-settings, module finance) qu'ils
// peuvent aussi atteindre.
const DASHBOARD_LABEL_BY_ROLE: Record<string, string> = {
  client: 'Tableau de bord',
  manager: 'Dashboard agence',
  collector: 'Tableau de bord',
  municipality: 'Tableau de bord',
  super_admin: 'Tableau de bord',
};

export function dashboardLabelForRole(role: string | null | undefined): string {
  return (role && DASHBOARD_LABEL_BY_ROLE[role]) || 'Accueil';
}

const AGENCY_TAB_BY_TYPE: Record<string, string> = {
  Signalement: 'reports',
  Planning: 'schedules',
};

export function resolveNotificationNavigation(
  notif: Pick<NotificationItem, 'type' | 'target'>,
  dashboardRoute: string,
  role: string | null | undefined,
): NotificationNavigation {
  if (notif.target?.kind === 'planning' && notif.target.id) {
    if (role && PLANNING_DETAIL_ROLES.has(role)) {
      return { commands: ['/planning/detail', notif.target.id] };
    }
    return { commands: [], openPlanningSummary: notif.target.id };
  }

  if (role === 'client') {
    if (notif.type === 'Subscribed' || notif.target?.kind === 'subscription') {
      return { commands: ['/subscription'] };
    }
    if (notif.type === 'Contrat' || notif.target?.kind === 'contrat') {
      return { commands: ['/contrat'] };
    }
  }

  if (role === 'manager' || role === 'super_admin') {
    if (notif.type === 'Retrait') return { commands: ['/dashboard/financial/withdrawals'] };
    if (notif.type === 'PaiementAgent') return { commands: ['/dashboard/financial/agent-payment'] };
    if (notif.type === 'Contrat') return { commands: ['/dashboard/financial/contracts'] };
  }

  if (role === 'manager' && dashboardRoute === '/dashboard/agency' && AGENCY_TAB_BY_TYPE[notif.type]) {
    return {
      commands: [dashboardRoute],
      extras: { queryParams: { tab: AGENCY_TAB_BY_TYPE[notif.type], source: 'notification' } },
    };
  }

  if ((role === 'manager' || role === 'super_admin') && notif.type === 'Subscribed') {
    return { commands: ['/dashboard/financial/clients'] };
  }

  if (!dashboardRoute) {
    return { commands: ['/'] };
  }
  return { commands: [dashboardRoute], extras: { queryParams: { source: 'notification' } } };
}
