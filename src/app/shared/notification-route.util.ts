import { NavigationExtras } from '@angular/router';
import { NotificationItem } from '../models/notification.model';

export interface NotificationNavigation {
  commands: any[];
  extras?: NavigationExtras;
}

// Mapping rôle -> route de dashboard, extrait de header.ts::getDashboardRoute() —
// UNIQUE copie désormais (header.ts délègue ici), pour que la page /notifications et
// la cloche calculent toujours la même route sans jamais pouvoir diverger.
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

// `agency-dashboard.ts` a un VRAI mécanisme d'onglet piloté par `?tab=` (queryParams
// -> `setActiveTab()`, voir son abonnement à `route.queryParams`) — vérifié en lisant le
// code, contrairement à l'ancien `#fragment` (`#reports`/`#schedules`/`#clients`/
// `#employees`/`#zones`) qui ne ciblait AUCUN élément existant dans AUCUN template de
// l'app (grep exhaustif sur tout `src/app`) : ce fragment n'a jamais fait quoi que ce
// soit. `TabId` réel (agency-dashboard.ts) : collections|employees|zones|schedules|
// reports|demandes|messages|vehicles|avis — PAS "clients" (délibérément commenté dans
// son propre code, aucun onglet client n'existe côté agence), et PAS "contrats" depuis
// le chantier "Contrats -> dashboard financier" (onglet retiré d'agency-dashboard,
// déplacé vers /dashboard/financial/contracts — voir l'étape 3 ci-dessous).
// Seul le rôle `manager` atterrit sur `/dashboard/agency` ; ce mapping n'est donc
// appliqué que pour ce rôle (le dashboard `super_admin` est un composant différent,
// non vérifié, hors périmètre de cette table).
const AGENCY_TAB_BY_TYPE: Record<string, string> = {
  Signalement: 'reports',
  Planning: 'schedules',
};

/**
 * Source UNIQUE de décision "au clic sur une notification, où naviguer" — utilisée à la
 * fois par la cloche du header et par la page /notifications, pour ne jamais dupliquer
 * cette logique (chantier Notifications). N'utilise QUE des routes/mécanismes
 * réellement existants et vérifiés dans l'app : jamais de route inventée, jamais un
 * fragment qui ne cible rien.
 *
 * `dashboardRoute` est fourni par l'appelant (header.ts::getDashboardRoute(), déjà
 * correcte pour les 5 rôles) plutôt que réimplémenté ici — évite une 2e copie du mapping
 * rôle→segment qui avait dérivé (l'ancien switch en dur envoyait super_admin vers
 * `/dashboard/super_admin`, route inexistante).
 */
export function resolveNotificationNavigation(
  notif: Pick<NotificationItem, 'type' | 'target'>,
  dashboardRoute: string,
  role: string | null | undefined,
): NotificationNavigation {
  // 1. Seul type de ressource avec une vraie route de détail côté frontend.
  if (notif.target?.kind === 'planning' && notif.target.id) {
    return { commands: ['/planning/detail', notif.target.id] };
  }

  // 2. Abonnement/contrat du client LUI-MÊME — correct par construction : si la
  // notification est dans l'inbox de ce client, la ressource lui appartient
  // forcément. Aucune vue agence équivalente n'existe pour un tiers.
  if (role === 'client') {
    if (notif.type === 'Subscribed' || notif.target?.kind === 'subscription') {
      return { commands: ['/subscription'] };
    }
    if (notif.type === 'Contrat' || notif.target?.kind === 'contrat') {
      return { commands: ['/contrat'] };
    }
  }

  // 3. Onglets réels et précis du dashboard financier (financial-dashboard), pour le
  // personnel finance-habilité — un manager/super_admin sans droit financier atterrira
  // sur l'écran "Accès restreint" (financeAccessGuard/financePermissionGuard), un
  // résultat honnête, jamais un échec silencieux. Contrat : chantier "Contrats ->
  // dashboard financier" (onglet réel /dashboard/financial/contracts, clé de
  // permission 'contracts.view' — remplace l'ancien ?tab=contrats d'agency-dashboard,
  // retiré).
  if (role === 'manager' || role === 'super_admin') {
    if (notif.type === 'Retrait') return { commands: ['/dashboard/financial/withdrawals'] };
    if (notif.type === 'PaiementAgent') return { commands: ['/dashboard/financial/agent-payment'] };
    if (notif.type === 'Contrat') return { commands: ['/dashboard/financial/contracts'] };
  }

  // 4. Onglet réel du dashboard agence (?tab=, mécanisme vérifié — voir commentaire de
  // AGENCY_TAB_BY_TYPE), pour un manager. Couvre Signalement/Planning (sans target,
  // c.-à-d. avant qu'un vrai Planning n'existe) — Contrat est traité à l'étape 3
  // ci-dessus, plus dans cette table.
  if (role === 'manager' && dashboardRoute === '/dashboard/agency' && AGENCY_TAB_BY_TYPE[notif.type]) {
    return {
      commands: [dashboardRoute],
      extras: { queryParams: { tab: AGENCY_TAB_BY_TYPE[notif.type], source: 'notification' } },
    };
  }

  // 5. Repli restant pour Subscribed côté personnel (pas d'onglet "abonnements" dans le
  // dashboard agence) — la liste clients du dashboard financier reste le meilleur repli
  // réel disponible. Contrat ne passe plus jamais par ici (traité à l'étape 3).
  if ((role === 'manager' || role === 'super_admin') && notif.type === 'Subscribed') {
    return { commands: ['/dashboard/financial/clients'] };
  }

  // 6. Dernier repli — dashboard nu du rôle, sans fragment (prouvé mort, voir plus
  // haut) ; `source: 'notification'` conservé (lu par agency-dashboard.ts, actuellement
  // un point d'extension inerte mais sans coût à propager).
  if (!dashboardRoute) {
    return { commands: ['/'] };
  }
  return { commands: [dashboardRoute], extras: { queryParams: { source: 'notification' } } };
}
