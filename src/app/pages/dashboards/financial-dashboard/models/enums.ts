// ── Statuts & rôles du domaine finance (spec Table 19) ───────────────

export enum ClientStatut {
  ACTIF = 'Actif',
  INACTIF = 'Inactif',
}

export enum FactureStatut {
  PAYEE = 'Payée',
  IMPAYEE = 'Impayée',
}

export enum ModePaiement {
  ESPECES = 'Espèces',
  MOBILE_MONEY = 'MobileMoney',
  AUTRE = 'Autre',
}

// Rôles financiers réels (financialRole backend, GET/PATCH /finance/session/*) —
// volontairement découplés du UserRole applicatif (client|manager|collector|municipality|
// super_admin, voir DISCOVERY.md §4) : un même utilisateur a un rôle opérationnel ET,
// séparément, un rôle financier optionnel.
export enum Role {
  COMPTABLE = 'Comptable',
  MANAGER_TERRAIN = 'ManagerTerrain',
  ADMINISTRATEUR = 'Administrateur',
}
