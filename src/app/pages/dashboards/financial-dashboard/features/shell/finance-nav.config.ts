import { FinancePermission } from '../../models';

export interface FinanceNavItem {
  route: string; // relatif à /dashboard/financial
  label: string;
  icon: string;
  /** Une des clés suffit (sémantique OU) — voir aLaPermission / requireFinancePermission. */
  permissions: FinancePermission[];
}

// RBAC financier réel (onglets + droits) — une clé de permission par onglet, cf.
// models/finance-permission.ts::PERMISSIONS_ONGLETS (même mapping, dupliqué ici pour
// rester un simple tableau littéral facile à lire aux côtés de route/label/icon).
export const FINANCE_NAV_ITEMS: FinanceNavItem[] = [
  { route: 'statistiques', label: 'Tableau de bord', icon: 'dashboard', permissions: ['dashboard.view'] },
  { route: 'payments', label: 'Paiements', icon: 'payments', permissions: ['payments.view'] },
  { route: 'withdrawals', label: 'Retraits', icon: 'account_balance_wallet', permissions: ['withdrawals.view'] },
  { route: 'clients', label: 'Clients', icon: 'group', permissions: ['clients.view'] },
  { route: 'monthly-tracking', label: 'Suivi mensuel', icon: 'event_available', permissions: ['monthly_tracking.view'] },
  { route: 'statement', label: 'Relevé', icon: 'receipt_long', permissions: ['statements.view'] },
  { route: 'agent-payment', label: 'Paiement agents', icon: 'badge', permissions: ['agent_payments.view'] },
  { route: 'contracts', label: 'Contrats', icon: 'description', permissions: ['contracts.view'] },
  { route: 'roles-admin', label: 'Rôles & droits', icon: 'admin_panel_settings', permissions: ['roles.view'] },
];
