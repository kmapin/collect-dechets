export interface Paiement {
  readonly idPaiement: string;
  idFacture?: string; 
  idClient: string;
  montant: number;
  datePaiement: string; 
  modePaiement?: string;
  grossAmount?: number;
  feeType?: 'FIXED' | 'PERCENTAGE';
  feeValue?: number;
  feeAmount?: number;
  feePayer?: 'CLIENT' | 'AGENCE';
  netAmount?: number;
  dateDebut?: string;
  dateFin?: string;
}
