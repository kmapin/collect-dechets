// ============================================================
// FINANCE MODEL — Dashboard Financier Agence
// ============================================================

// Valeurs alignées sur les statuts RÉELS de models/Withdraw.js (backend) — Prompt 6.
// Les noms de membres sont conservés (aucun site d'utilisation à modifier), seules
// les valeurs sous-jacentes changent pour correspondre à l'énum backend réelle.
// APPROVED reprend INITIATED (verrouillage transitoire pendant le paiement, quasi
// jamais observable puisque résolu de façon synchrone) ; PROCESSED reprend
// COMPLETED_WITH_ERROR (valeur existante côté backend, non utilisée à ce jour).
// FAILED est un membre nouveau : un échec technique de paiement (Moov Money) est un
// état réel et distinct d'un rejet décidé par le Super Admin (REJECTED).
export enum WithdrawalStatus {
  PENDING   = 'EN_ATTENTE_VALIDATION',
  APPROVED  = 'INITIATED',
  REJECTED  = 'REJETE',
  PROCESSED = 'COMPLETED_WITH_ERROR',
  PAID      = 'COMPLETED',
  FAILED    = 'FAILED',
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

// ── Transaction de paiement ───────────────────────────────────
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
  status:         'SUCCESS' | 'FAILED' | 'PENDING';
  reference:      string;
  description:    string;
  createdAt:      string;
}

// ── Demande / Historique de retrait ──────────────────────────
export interface WithdrawalRequest {
  amount:          number;
  method:          PaymentMethod;
  accountNumber:   string;
  accountName:     string;
  note?:           string;
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
