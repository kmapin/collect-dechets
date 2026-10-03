import { FinancePermission } from '../../models';

export interface FinanceNavItem {
  route: string; // relatif à /dashboard/financial
  label: string;
  icon: string;
  permissions: FinancePermission[];
}


export const FINANCE_NAV_ITEMS: FinanceNavItem[] = [
  { route: 'statistiques', label: 'Statistiques', icon: 'dashboard', permissions: ['dashboard.view'] },
  { route: 'payments', label: 'Paiements', icon: 'payments', permissions: ['payments.view'] },
  { route: 'withdrawals', label: 'Retraits', icon: 'account_balance_wallet', permissions: ['withdrawals.view'] },
  { route: 'clients', label: 'Clients', icon: 'group', permissions: ['clients.view'] },
  { route: 'monthly-tracking', label: 'Suivi mensuel', icon: 'event_available', permissions: ['monthly_tracking.view'] },
  { route: 'statement', label: 'Relevé', icon: 'receipt_long', permissions: ['statements.view'] },
  { route: 'agent-payment', label: 'Paiement agents', icon: 'badge', permissions: ['agent_payments.view'] },
  { route: 'contracts', label: 'Contrats', icon: 'description', permissions: ['contracts.view'] },
  // "Rôles & droits" déplacé vers Administration -> Rôles et accès (gère désormais
  // droits financiers + permissions Administration dans un même écran) — plus d'onglet
  // dédié ici, voir financial-dashboard.routes.ts (redirection conservée sur l'ancienne
  // URL) et agency-dashboard/features/administration/roles-access/.
];
