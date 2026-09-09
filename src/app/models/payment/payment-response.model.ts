export enum PaymentStatus {
  /** Paiement en attente de validation */
  PENDING = 'PENDING',
  
  /** Paiement en attente de saisie OTP (Orange Money) */
  PENDING_OTP = 'PENDING_OTP',
  
  /** Paiement réussi */
  SUCCESS = 'SUCCESS',
  
  /** Paiement échoué */
  FAILED = 'FAILED'
}

export interface PaymentResponse {
  /** Identifiant unique de la transaction */
  transactionId: string;
  
  /** Statut du paiement */
  status: PaymentStatus;
  
  /** Message descriptif du résultat */
  message: string;
  
  /** Indique si un OTP est requis pour valider le paiement */
  requiresOtp?: boolean;
  
  /** Montant de la transaction */
  amount?: number;
  
  /** Date et heure de la transaction */
  timestamp?: Date;

  operator?: string;
  reference?: string;
  success?: boolean;
  data?: any;

  grossAmount?: number;
  feeAmount?: number;
  feePayer?: 'CLIENT' | 'AGENCE';
  netAmount?: number;
}
