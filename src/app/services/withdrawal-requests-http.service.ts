import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  AdminWithdrawalRequest,
  ApproveWithdrawalPayload,
  PaginatedWithdrawalRequests,
  RejectWithdrawalPayload,
  WithdrawalRequestFilter,
} from '../models/withdrawal-request.model';

/**
 * Branchement réel (Prompt 6) — remplace WithdrawalRequestsMockService derrière
 * exactement la même API publique (mêmes noms de méthodes, mêmes types de retour),
 * comme prévu par le commentaire d'en-tête de ce dernier : aucun composant
 * consommateur n'a eu à changer au-delà de l'injection de cette classe.
 *
 * Champs sans source réelle en base (fees, netAmount, currency, country,
 * recentWithdrawals) restent volontairement `undefined`/`[]` plutôt
 * qu'inventés (Règle 4 du Prompt 0). `agencyManagerPhone` (User.phone) et
 * `pendingWithdrawalsCount/Amount`/`totalWithdrawn` (agrégats Withdraw par
 * agence) sont en revanche réellement calculés côté backend — omis à tort à
 * l'Étape 6 alors qu'ils étaient dérivables, corrigé après retour utilisateur
 * (capture d'écran montrant le drawer détail vide sur ces lignes).
 */
interface BackendRetraitItem {
  id: string;
  agencyId: string;
  agencyName: string | null;
  gestionnaireNom: string | null;
  gestionnaireEmail: string | null;
  gestionnairePhone?: string | null;
  pendingWithdrawalsCount?: number;
  pendingWithdrawalsAmount?: number;
  totalWithdrawn?: number;
  amount: number;
  availableBalance: number | null;
  paymentMethod: string;
  walletNumber: string;
  requestDate: string;
  status: string;
  motif: string | null;
  processedByNom?: string | null;
  processedBy?: string | null;
  processingDate: string | null;
  rejectionReason: string | null;
  createdAt?: string;
  updatedAt?: string;
  // Chantier Frais plateforme (Prompt F5/F8) — snapshot figé à la demande, voir
  // services/transaction.js::getAllRetraitsPaginated/getRetraitById.
  feeType?: 'FIXED' | 'PERCENTAGE' | null;
  feeValue?: number | null;
  feeAmount?: number | null;
  feeOption?: 'A' | 'B' | null;
  netAmountReceived?: number | null;
  walletDebitAmount?: number | null;
  platformAmount?: number | null;
}

function mapBackendRetrait(item: BackendRetraitItem): AdminWithdrawalRequest {
  return {
    id: item.id,
    agencyId: item.agencyId,
    agencyName: item.agencyName ?? '',
    agencyManagerName: item.gestionnaireNom ?? '',
    agencyManagerEmail: item.gestionnaireEmail ?? '',
    agencyManagerPhone: item.gestionnairePhone ?? (undefined as unknown as string),
    country: undefined as unknown as string,
    amount: item.amount,
    currency: 'FCFA',
    // `?? item.amount` : un retrait antérieur à ce chantier (ou sans frais) n'a pas ces
    // champs — comportement honnête, jamais une valeur inventée (fees=0, netAmount=amount).
    fees: item.feeAmount ?? 0,
    netAmount: item.netAmountReceived ?? item.amount,
    feeType: item.feeType ?? undefined,
    feeValue: item.feeValue ?? undefined,
    feeOption: item.feeOption ?? undefined,
    walletDebitAmount: item.walletDebitAmount ?? undefined,
    platformAmount: item.platformAmount ?? undefined,
    paymentMethod: item.paymentMethod as AdminWithdrawalRequest['paymentMethod'],
    walletNumber: item.walletNumber,
    requestDate: item.requestDate,
    status: item.status as AdminWithdrawalRequest['status'],
    availableBalance: item.availableBalance ?? (undefined as unknown as number),
    pendingWithdrawalsCount: item.pendingWithdrawalsCount ?? (undefined as unknown as number),
    pendingWithdrawalsAmount: item.pendingWithdrawalsAmount ?? (undefined as unknown as number),
    totalWithdrawn: item.totalWithdrawn ?? (undefined as unknown as number),
    recentWithdrawals: [],
    createdAt: item.createdAt ?? item.requestDate,
    updatedAt: item.updatedAt ?? item.processingDate ?? item.requestDate,
    processedBy: item.processedByNom ?? item.processedBy ?? undefined,
    processingDate: item.processingDate ?? undefined,
    rejectionReason: item.rejectionReason ?? undefined,
  };
}

@Injectable({ providedIn: 'root' })
export class WithdrawalRequestsHttpService {
  private readonly base = `${environment.apiUrl}/admin/retraits`;

  constructor(private http: HttpClient) {}

  // ── Lecture ───────────────────────────────────────────────────

  getWithdrawalRequests(filter: WithdrawalRequestFilter = {}): Observable<PaginatedWithdrawalRequests> {
    let params = new HttpParams()
      .set('page', String(filter.page ?? 1))
      .set('pageSize', String(filter.pageSize ?? 10));

    if (filter.search) params = params.set('search', filter.search);
    if (filter.status && filter.status !== 'all') params = params.set('statut', filter.status);
    if (filter.agencyId && filter.agencyId !== 'all') params = params.set('agenceId', filter.agencyId);
    if (filter.dateFrom) params = params.set('dateDebut', filter.dateFrom);
    if (filter.dateTo) params = params.set('dateFin', filter.dateTo);

    return this.http.get<{ items: BackendRetraitItem[]; total: number; page: number; pageSize: number }>(this.base, { params }).pipe(
      map((res) => {
        const pageSize = res.pageSize || filter.pageSize || 10;
        return {
          data: res.items.map(mapBackendRetrait),
          total: res.total,
          page: res.page,
          pageSize,
          totalPages: Math.max(1, Math.ceil(res.total / pageSize)),
        };
      }),
    );
  }

  getWithdrawalById(id: string): Observable<AdminWithdrawalRequest> {
    return this.http.get<BackendRetraitItem>(`${this.base}/${id}`).pipe(map(mapBackendRetrait));
  }

  /**
   * Utilisée par admin-dashboard.ts uniquement pour (a) compter les demandes en
   * attente (badge d'onglet) et (b) construire la liste déroulante "Agence" à
   * partir des agences réellement présentes. Un `pageSize` élevé couvre ces deux
   * usages sans nouvel endpoint dédié ; à revoir si le volume de demandes devient
   * significatif (agrégats dédiés côté backend).
   */
  filterWithdrawals(filter: WithdrawalRequestFilter): Observable<AdminWithdrawalRequest[]> {
    return this.getWithdrawalRequests({ ...filter, page: 1, pageSize: 1000 }).pipe(map((res) => res.data));
  }

  // ── Actions administrateur ────────────────────────────────────
  // `adminName` (ApproveWithdrawalPayload/RejectWithdrawalPayload) n'est pas
  // envoyé : le backend dérive l'administrateur traitant du JWT (req.user.id),
  // jamais d'une valeur fournie par le client (Règle 6 du Prompt 0).

  approveWithdrawal(id: string, _payload: ApproveWithdrawalPayload): Observable<AdminWithdrawalRequest> {
    return this.http.patch<BackendRetraitItem>(`${this.base}/${id}/accepter`, {}).pipe(map(mapBackendRetrait));
  }

  rejectWithdrawal(id: string, payload: RejectWithdrawalPayload): Observable<AdminWithdrawalRequest> {
    return this.http.patch<BackendRetraitItem>(`${this.base}/${id}/rejeter`, { motif: payload.reason }).pipe(map(mapBackendRetrait));
  }
}
