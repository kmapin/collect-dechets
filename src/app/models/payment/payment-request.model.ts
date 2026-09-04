/**
 * Énumération des opérateurs Mobile Money disponibles
 */
export enum MobileMoneyOperator {
  ORANGE_MONEY = 'ORANGE_MONEY',
  MOOV_MONEY = 'MOOV_MONEY',
  TELECEL_MONEY = 'TELECEL_MONEY'
}

/**
 * Interface représentant une requête de paiement Mobile Money
 */
export interface PaymentRequest {
  /** Opérateur Mobile Money sélectionné */
  operator: MobileMoneyOperator;
  
  /** Numéro de téléphone du payeur */
  phoneNumber: string;
  customerMsisdn: string;
  /** Montant à payer */
  amount: number;
  
  /** Description ou référence de la transaction */
  description: string;

  /** Tarif de la transaction et identifiant de l'utilisateur */
  tarifId?: string;
  userId?: string;
  walletId?: string;
  numberMonths?: string;
  pricingId?: string;

  /** Phase 8 — paiement d'une Redevance plutôt que d'un Abonnement : le
   * backend dérive alors pricingId/agence/montant attendu depuis la
   * Redevance elle-même (voir controllers/transaction.js::initiate). */
  redevanceId?: string;

  /** Chantier "paiement groupé + réduction agence" — mutuellement exclusif avec
   * redevanceId ci-dessus : règle en une fois toutes les Redevance couvertes par une
   * proposition déjà configurée par l'agence (montant déjà réduit). */
  paiementGroupeId?: string;
}
