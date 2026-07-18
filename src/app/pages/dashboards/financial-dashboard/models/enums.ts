// ── Statuts & rôles du domaine finance (spec Table 19) ───────────────

export enum ClientStatut {
  ACTIF = 'Actif',
  INACTIF = 'Inactif',
}

export enum FactureStatut {
  PAYEE = 'Payée',
  IMPAYEE = 'Impayée',
}

// Réservé aux évolutions futures (réconciliation / paiements partiels — TBC, spec §1.12).
// Le MVP dérive le statut de la facture directement de la présence d'un paiement (RG3),
// sans exposer d'état intermédiaire de paiement.
export enum PaiementStatut {
  VALIDE = 'Validé',
  ANNULE = 'Annulé',
}

export enum ModePaiement {
  ESPECES = 'Espèces',
  MOBILE_MONEY = 'MobileMoney',
  AUTRE = 'Autre',
}

// Rôles finance mock (voir DISCOVERY.md §4) — volontairement découplés du UserRole
// applicatif réel (client|manager|collector|municipality|super_admin).
export enum Role {
  COMPTABLE = 'Comptable',
  MANAGER_TERRAIN = 'ManagerTerrain',
  ADMINISTRATEUR = 'Administrateur',
}
