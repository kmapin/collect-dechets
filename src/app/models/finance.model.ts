
export enum WithdrawalStatus {
  PENDING   = 'EN_ATTENTE_VALIDATION',
  APPROVED  = 'INITIATED',
  REJECTED  = 'REJETE',
  PROCESSED = 'COMPLETED_WITH_ERROR',
  PAID      = 'COMPLETED',
  FAILED    = 'FAILED',
  TO_VERIFY = 'A_VERIFIER_MANUELLEMENT',
}

export enum TransactionType {
  PAYMENT    = 'PAYMENT',
  COMMISSION = 'COMMISSION',
  WITHDRAWAL = 'WITHDRAWAL',
  REFUND     = 'REFUND',
}

export enum PaymentMethod {
  ORANGE_MONEY  = 'ORANGE_MONEY',
  MOOV_MONEY    = 'MOOV_MONEY',
  TELECEL_MONEY = 'TELECEL_MONEY',

}

// ── Résumé financier ─────────────────────────────────────────
export interface FinancialSummary {
  availableBalance: number;   // Solde disponible
  totalCollected:   number;   // Total collecté (paiements usagers)
  totalCommission:  number;   // Commission plateforme
  netEarnings:      number;   // Revenus nets
  pendingAmount:    number;   // Montants en attente
  currency:         string;   // Devise (ex: XOF)
  lastUpdated:      string;
}

export interface PaymentTransaction {
  _id:            string;
  agencyId:       string;
  clientId:       string;
  clientName:     string;
  clientPhone?:   string;
  amount:         number;
  commission:     number;
  netAmount:      number;
  method:         PaymentMethod;
  status:         'INITIATED' | 'OTP_PENDING' | 'PENDING' | 'COMPLETED' | 'COMPLETED_WITH_ERROR' | 'FAILED' | 'CANCELLED';
  reference:      string;
  description:    string;
  createdAt:      string;
}

export interface DemanderRetraitPayload {
  montant:        number;
  customerMsisdn: string;
  operator:       PaymentMethod;
  motif?:         string;
}

export interface WithdrawalRecord {
  _id:              string;
  agencyId:         string;
  userId:           string;
  amount:           number;
  operator:         PaymentMethod;
  customerMsisdn:   string;
  status:           string;
  reference?:       string;
  createdAt:        string;
  updatedAt:        string;
}

// ── Données pour graphique paiements ─────────────────────────
export interface PaymentChartData {
  labels:   string[];
  revenues: number[];  // montants nets agence
  commissions: number[]; // commissions plateforme
}

// ── Filtres ───────────────────────────────────────────────────
export interface FinanceFilters {
  operator?:  string;
  userId?:    string;
  startDate?: string;
  endDate?:   string;
  status?:    string;
  method?:    PaymentMethod;
  page?:      number;
  limit?:     number;
}

// ── Réponse paginée générique ─────────────────────────────────
export interface PaginatedFinanceResponse<T> {
  success: boolean;
  data:    T[];
  total:   number;
  page:    number;
  pages:   number;
}
