import { Role } from '../../models';

export interface FinanceNavItem {
  route: string; // relatif à /dashboard/financial
  label: string;
  icon: string;
  /** Si absent, visible pour tout rôle ayant passé le finance-access.guard. */
  rolesAutorises?: Role[];
}

export const FINANCE_NAV_ITEMS: FinanceNavItem[] = [
  { route: 'statistiques', label: 'Tableau de bord', icon: 'dashboard' },
  { route: 'payments', label: 'Paiements', icon: 'payments' },
  { route: 'withdrawals', label: 'Retraits', icon: 'account_balance_wallet' },
  { route: 'clients', label: 'Clients', icon: 'group' },
  { route: 'monthly-tracking', label: 'Suivi mensuel', icon: 'event_available' },
  { route: 'statement', label: 'Relevé', icon: 'receipt_long' },
  { route: 'agent-payment', label: 'Paiement agents', icon: 'badge' },
  // F11 admin (spec §1.11) : "Roles admin denied" pour le Comptable.
  { route: 'roles-admin', label: 'Rôles & droits', icon: 'admin_panel_settings', rolesAutorises: [Role.ADMINISTRATEUR] },
];
