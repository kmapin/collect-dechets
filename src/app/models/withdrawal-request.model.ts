// ============================================================
// WITHDRAWAL REQUEST — Validation admin des retraits d'agence
// ============================================================
// Réutilise WithdrawalStatus/PaymentMethod déjà déclarés dans finance.model.ts
// (WithdrawalStatus y était déjà défini mais jamais utilisé nulle part avant cette
// fonctionnalité) plutôt que d'introduire une 4e nomenclature de statuts dans le projet.
// "Merchant"/"Shop" du besoin initial correspondent ici aux vraies entités de l'app :
// une agence (Agency = la "boutique") et son gestionnaire (Employee = le "marchand")
// demandent le retrait du solde collecté par l'agence.
import { PaymentMethod, WithdrawalStatus } from './finance.model';

export { WithdrawalStatus, PaymentMethod };

export interface RecentWithdrawalSummary {
  id: string;
  amount: number;
  date: string; // ISO
  status: WithdrawalStatus;
}

export interface AdminWithdrawalRequest {
  id: string;

  // ── Agence (Shop) / Gestionnaire (Merchant) ──────────────────
  agencyId: string;
  agencyName: string;
  agencyManagerName: string;
  agencyManagerEmail: string;
  agencyManagerPhone: string;
  country: string;

  // ── Retrait demandé ───────────────────────────────────────────
  amount: number;
  currency: string;
  // Chantier Frais plateforme (Prompt F5/F8) — `fees`/`netAmount` restent les noms
  // historiques de ce modèle (déjà utilisés par le template), désormais alimentés par
  // le VRAI snapshot de frais (feeAmount/netAmountReceived) plutôt que hardcodés
  // `undefined`. Champs enrichis ajoutés à côté pour le détail complet (Prompt F8,
  // item 3 : "n'affiche pas juste un montant unique opaque").
  fees: number;
  netAmount: number;
  feeType?: 'FIXED' | 'PERCENTAGE';
  feeValue?: number;
  feeOption?: 'A' | 'B';
  walletDebitAmount?: number;
  platformAmount?: number;
  paymentMethod: PaymentMethod;
  walletNumber: string;
  requestDate: string; // ISO

  // ── Statut ────────────────────────────────────────────────────
  status: WithdrawalStatus;

  // ── Situation financière de l'agence à la date de la demande ──
  availableBalance: number;
  pendingWithdrawalsCount: number;
  pendingWithdrawalsAmount: number;
  totalWithdrawn: number;
  recentWithdrawals: RecentWithdrawalSummary[];

  // ── Audit ─────────────────────────────────────────────────────
  createdAt: string; // ISO
  updatedAt: string; // ISO
  processedBy?: string;
  processingDate?: string; // ISO
  rejectionReason?: string;
}

export interface WithdrawalRequestFilter {
  search?: string;
  status?: WithdrawalStatus | 'all';
  agencyId?: string | 'all';
  dateFrom?: string; // ISO
  dateTo?: string; // ISO
  page?: number;
  pageSize?: number;
  sortBy?: keyof AdminWithdrawalRequest;
  sortDir?: 'asc' | 'desc';
}

export interface PaginatedWithdrawalRequests {
  data: AdminWithdrawalRequest[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApproveWithdrawalPayload {
  adminName: string;
}

export interface RejectWithdrawalPayload {
  adminName: string;
  reason: string;
}
