export enum MobileMoneyOperator {
  ORANGE_MONEY = 'ORANGE_MONEY',
  MOOV_MONEY = 'MOOV_MONEY',
  TELECEL_MONEY = 'TELECEL_MONEY'
}

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

  redevanceId?: string;

  paiementGroupeId?: string;
}
