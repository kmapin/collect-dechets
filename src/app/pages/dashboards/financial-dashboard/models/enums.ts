export enum ClientStatut {
  ACTIF = 'Actif',
  INACTIF = 'Inactif',
  // Compte coquille créé par souscription sans compte préalable, en attente de
  // confirmation de paiement (models/User.js:'pending_activation') — distinct
  // d'un client réellement désactivé. Affiché mais pas proposé comme filtre.
  EN_ATTENTE = 'En attente',
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


export enum Role {
  COMPTABLE = 'Comptable',
  MANAGER_TERRAIN = 'ManagerTerrain',
  ADMINISTRATEUR = 'Administrateur',
}
