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


export enum Role {
  COMPTABLE = 'Comptable',
  MANAGER_TERRAIN = 'ManagerTerrain',
  ADMINISTRATEUR = 'Administrateur',
}
