import { Role } from './enums';

// RBAC financier réel (onglets + droits) — chaînes identiques au backend
// (config/financePermissions.js), pas de table de traduction (même convention que
// FINANCIAL_ROLE_TO_FRONTEND côté serveur pour `Role`).
export type FinancePermission =
  | 'dashboard.view'
  | 'payments.view'
  | 'withdrawals.view'
  | 'withdrawals.create'
  | 'clients.view'
  | 'monthly_tracking.view'
  | 'monthly_tracking.generate'
  | 'statements.view'
  | 'agent_payments.view'
  | 'agent_payments.create'
  | 'agent_payments.manage'
  | 'contracts.view'
  | 'contracts.manage'
  | 'roles.view'
  | 'roles.manage';

// Implicites pour Role.ADMINISTRATEUR, jamais décochables dans l'UI (anti-verrouillage de
// l'écran d'administration lui-même) — même liste que PERMISSIONS_GOUVERNANCE côté backend.
export const PERMISSIONS_GOUVERNANCE: FinancePermission[] = ['roles.view', 'roles.manage'];

// Une entrée par onglet réel du dashboard financier — pilote à la fois le filtrage de
// FINANCE_NAV_ITEMS et la section "Accès aux onglets" de roles-admin.
export interface OngletPermission {
  cle: FinancePermission;
  label: string;
  route: string; // relatif à /dashboard/financial, cf. financial-dashboard.routes.ts
}

export const PERMISSIONS_ONGLETS: OngletPermission[] = [
  { cle: 'dashboard.view', label: 'Statistiques', route: 'statistiques' },
  { cle: 'payments.view', label: 'Paiements', route: 'payments' },
  { cle: 'withdrawals.view', label: 'Retraits', route: 'withdrawals' },
  { cle: 'clients.view', label: 'Clients', route: 'clients' },
  { cle: 'monthly_tracking.view', label: 'Suivi mensuel', route: 'monthly-tracking' },
  { cle: 'statements.view', label: 'Relevé', route: 'statement' },
  { cle: 'agent_payments.view', label: 'Paiement agents', route: 'agent-payment' },
  { cle: 'contracts.view', label: 'Contrats', route: 'contracts' },
  { cle: 'roles.view', label: 'Rôles & droits', route: 'roles-admin' },
];

export interface DroitFinancier {
  cle: FinancePermission;
  label: string;
}

export interface GroupeDroitsFinanciers {
  titre: string;
  droits: DroitFinancier[];
}

// Section "Droits financiers" de roles-admin — uniquement les clés d'action (les clés
// `*.view` sont déjà couvertes par la section "Accès aux onglets", jamais dupliquées ici).
export const GROUPES_DROITS_FINANCIERS: GroupeDroitsFinanciers[] = [
  { titre: 'Retraits', droits: [{ cle: 'withdrawals.create', label: 'Créer un retrait' }] },
  { titre: 'Facturation', droits: [{ cle: 'monthly_tracking.generate', label: 'Générer les factures du mois' }] },
  {
    titre: 'Agents',
    droits: [
      { cle: 'agent_payments.create', label: 'Créer un paiement agent' },
      { cle: 'agent_payments.manage', label: 'Valider / rejeter / confirmer un paiement agent' },
    ],
  },
  { titre: 'Contrats', droits: [{ cle: 'contracts.manage', label: 'Créer / résilier / suspendre / réactiver un contrat' }] },
  { titre: 'Gouvernance', droits: [{ cle: 'roles.manage', label: "Gérer les niveaux d'accès financiers" }] },
];

// Préréglages par rôle — aide UI uniquement (bouton "appliquer les droits par défaut du
// rôle" dans roles-admin) ; l'autorité réelle est recalculée côté serveur à chaque
// enregistrement (setFinancialRole réinitialise déjà au même préréglage, voir
// FinanceUsersService côté backend).
export const PRESETS_ROLE: Record<Role, FinancePermission[]> = {
  [Role.COMPTABLE]: [
    'dashboard.view', 'payments.view',
    'withdrawals.view', 'withdrawals.create',
    'clients.view',
    'monthly_tracking.view', 'monthly_tracking.generate',
    'statements.view',
    'agent_payments.view', 'agent_payments.create',
    'contracts.view', 'contracts.manage',
  ],
  [Role.MANAGER_TERRAIN]: [
    'dashboard.view', 'payments.view', 'clients.view',
    'monthly_tracking.view', 'statements.view', 'agent_payments.view',
    'contracts.view',
  ],
  [Role.ADMINISTRATEUR]: PERMISSIONS_ONGLETS.map(o => o.cle).concat(
    GROUPES_DROITS_FINANCIERS.flatMap(g => g.droits.map(d => d.cle)),
  ),
};

export interface UtilisateurAvecPermissions {
  droitsFinance: boolean;
  permissions: FinancePermission[];
}

// Coupe-circuit + droit : mêmes règles que requireFinancePermission côté backend (ET
// logique entre droitsFinance et les clés détenues), réutilisé par le garde, le shell
// (filtrage des onglets) et roles-admin (case à cocher "implicite pour un administrateur").
export function aLaPermission(u: UtilisateurAvecPermissions | null | undefined, ...cles: FinancePermission[]): boolean {
  if (!u || !u.droitsFinance) return false;
  return cles.some(c => u.permissions.includes(c));
}
