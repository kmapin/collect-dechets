// Chantier "Notifications" (inbox réelle) — forme réelle du document backend
// (models/Notification.js), PAS celle (fausse) de `SocketNotification` dans
// webstockets.ts : le champ est `user` (pas `user_id`), les horodatages sont
// `createdAt`/`updatedAt` (pas `created_at`), et il n'y a JAMAIS eu de champ `title`
// (seulement `message`) — voir NOTIFICATION_TYPE_LABELS ci-dessous pour la dérivation
// d'un titre côté UI.
export type NotificationType =
  | 'Subscribed'
  | 'Planning'
  | 'Signalement'
  | 'Contrat'
  | 'Redevance'
  | 'Retrait'
  | 'Communication'
  | 'PaiementAgent'
  // Valeurs historiques : plus jamais émises par le backend, gardées uniquement pour
  // ne pas planter sur d'anciens documents déjà en base (même principe que
  // header.ts::getNotificationType() conservait déjà 'Unsubscribed').
  | 'Assingnment'
  | 'AgencyAdd'
  | 'Unsubscribed';

export type NotificationTargetKind = 'planning' | 'signalement' | 'contrat' | 'subscription' | 'redevance' | 'retrait';

export interface NotificationTarget {
  kind: NotificationTargetKind;
  id: string;
}

export interface NotificationPlanningRef {
  _id: string;
  reference?: string;
  libelle?: string;
  date?: string;
}

export interface NotificationItem {
  _id: string;
  user: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  updatedAt: string;
  /** Calculé côté serveur à partir du premier `related*` non-null — jamais persisté. */
  target: NotificationTarget | null;
  /** Objet peuplé quand `target.kind === 'planning'` ; seul type de ressource ayant
   * une vraie route de détail côté frontend (`/planning/detail/:id`). */
  planningRef?: NotificationPlanningRef | null;
  relatedPlanning?: string | null;
  relatedSignalement?: string | null;
  relatedContrat?: string | null;
  relatedSubscription?: string | null;
  relatedRedevance?: string | null;
  relatedRetrait?: string | null;
}

export interface NotificationPage {
  items: NotificationItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UnreadCountResponse {
  count: number;
}

// Libellés repris tels quels de header.ts::getNotificationType() (déjà en prod, ne
// change aucun libellé existant) et complétés pour les 4 types réels qui manquaient.
export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  Subscribed: 'Abonnement',
  Planning: 'Collecte programmée',
  Signalement: 'Signalement',
  Contrat: 'Contrat',
  Redevance: 'Redevance',
  Retrait: 'Retrait',
  Communication: 'Communication',
  PaiementAgent: 'Paiement agent',
  Assingnment: 'Affectation',
  AgencyAdd: 'Agence ajoutée',
  Unsubscribed: 'Désabonnement',
};

export const NOTIFICATION_TYPE_ICONS: Record<string, string> = {
  Subscribed: 'card_membership',
  Planning: 'event_available',
  Signalement: 'report_problem',
  Contrat: 'description',
  Redevance: 'receipt_long',
  Retrait: 'account_balance_wallet',
  Communication: 'campaign',
  PaiementAgent: 'payments',
  Assingnment: 'assignment',
  AgencyAdd: 'business',
  Unsubscribed: 'unsubscribe',
};

export function notificationTypeLabel(type: string): string {
  return NOTIFICATION_TYPE_LABELS[type] ?? type;
}

export function notificationTypeIcon(type: string): string {
  return NOTIFICATION_TYPE_ICONS[type] ?? 'notifications';
}
