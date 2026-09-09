export type NotificationType =
  | 'Subscribed'
  | 'Planning'
  | 'Signalement'
  | 'Contrat'
  | 'Redevance'
  | 'Retrait'
  | 'Communication'
  | 'PaiementAgent'
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
