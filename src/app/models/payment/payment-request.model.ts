/**
 * Énumération des opérateurs Mobile Money disponibles
 */
export enum MobileMoneyOperator {
  ORANGE_MONEY = 'ORANGE_MONEY',
  MTN_MOMO = 'MTN_MOMO',
  MOOV_MONEY = 'MOOV_MONEY',
  WAVE = 'WAVE'
}

/**
 * Interface représentant une requête de paiement Mobile Money
 */
export interface PaymentRequest {
  /** Opérateur Mobile Money sélectionné */
  operator: MobileMoneyOperator;
  
  /** Numéro de téléphone du payeur */
  phoneNumber: string;
  
  /** Montant à payer */
  amount: number;
  
  /** Description ou référence de la transaction */
  description: string;
}
