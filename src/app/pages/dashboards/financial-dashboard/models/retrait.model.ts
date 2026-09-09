export interface Retrait {
  readonly idRetrait: string;
  montant: number;
  dateRetrait: string;
  motif?: string;
  statut?: string;
  initiateurNom?: string;
  traitePar?: string;
  dateTraitement?: string;
  motifRejet?: string;
  grossAmount?: number;
  feeType?: 'FIXED' | 'PERCENTAGE';
  feeValue?: number;
  feeAmount?: number;
  feeOption?: 'A' | 'B';
  netAmountReceived?: number;
  walletDebitAmount?: number;
}
