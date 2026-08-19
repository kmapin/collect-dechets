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
  // Appel Moov Money échoué SANS réponse reçue (timeout/coupure réseau) — l'issue
  // réelle est inconnue, une résolution manuelle Super Admin est nécessaire
  // (voir services/transaction.js::_executerPaiementRetrait, backend). Distinct
  // de FAILED : ici on ne sait PAS si le virement a eu lieu.
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

// ── Transaction de paiement ───────────────────────────────────
// Valeurs alignées sur l'énum RÉELLE de models/transaction.js (chantier
// Finance/Paiements, item 3) — 'SUCCESS'/'FAILED'/'PENDING' seul n'a jamais
// correspondu à aucune valeur réellement écrite par le backend.
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

// ── Demande de retrait ────────────────────────────────────────
// Remplace l'ancien WithdrawalRequest {amount, method, accountNumber, accountName, note}
// (chantier Finance/Paiements, item 3) : ce shape ne correspondait à aucun endpoint réel
// (POST /finance/agency/:id/withdrawal n'existe pas côté backend, requestWithdrawal()
// n'était d'ailleurs appelée nulle part). Body exact attendu par POST /finance/retraits
// (controllers/financeStats.js::enregistrerRetrait → TransactionService.demanderRetrait).
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
