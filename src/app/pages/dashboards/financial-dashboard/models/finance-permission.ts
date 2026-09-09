import { Role } from './enums';


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
  | 'contracts.create'
  | 'contracts.manage'
  | 'roles.view'
  | 'roles.manage';


export const PERMISSIONS_GOUVERNANCE: FinancePermission[] = ['roles.view', 'roles.manage'];


export interface OngletPermission {
  cle: FinancePermission;
  label: string;
  route: string; 
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
  {
    titre: 'Contrats',
    droits: [
      { cle: 'contracts.create', label: 'Créer un contrat' },
      { cle: 'contracts.manage', label: 'Résilier / suspendre / réactiver un contrat' },
    ],
  },
  { titre: 'Gouvernance', droits: [{ cle: 'roles.manage', label: "Gérer les niveaux d'accès financiers" }] },
];


export const PRESETS_ROLE: Record<Role, FinancePermission[]> = {
  [Role.COMPTABLE]: [
    'dashboard.view', 'payments.view',
    'withdrawals.view', 'withdrawals.create',
    'clients.view',
    'monthly_tracking.view', 'monthly_tracking.generate',
    'statements.view',
    'agent_payments.view', 'agent_payments.create',
    'contracts.view', 'contracts.create', 'contracts.manage',
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


export function aLaPermission(u: UtilisateurAvecPermissions | null | undefined, ...cles: FinancePermission[]): boolean {
  if (!u || !u.droitsFinance) return false;
  return cles.some(c => u.permissions.includes(c));
}
