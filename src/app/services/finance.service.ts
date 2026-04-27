import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  FinancialSummary,
  PaymentTransaction,
  WithdrawalRequest,
  WithdrawalRecord,
  WithdrawalStatus,
  PaymentChartData,
  FinanceFilters,
  PaginatedFinanceResponse,
} from '../models/finance.model';

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private readonly api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── Résumé financier ────────────────────────────────────────
  getFinancialSummary(agencyId: string): Observable<FinancialSummary> {
    return this.http
      .get<any>(`${this.api}/finance/agency/${agencyId}/summary`)
      .pipe(
        map((r) => r.data ?? r),
        catchError(() => of(this.mockSummary()))
      );
  }

  // ── Transactions de paiements ───────────────────────────────
  getTransactions(
    agencyId: string,
    filters: FinanceFilters = {}
  ): Observable<PaginatedFinanceResponse<PaymentTransaction>> {
    let params = new HttpParams();
    if (filters.startDate) params = params.set('startDate', filters.startDate);
    if (filters.endDate)   params = params.set('endDate',   filters.endDate);
    if (filters.status)    params = params.set('status',    filters.status);
    if (filters.method)    params = params.set('method',    filters.method);
    if (filters.page)      params = params.set('page',      String(filters.page));
    if (filters.limit)     params = params.set('limit',     String(filters.limit));

    return this.http
      .get<any>(`${this.api}/finance/agency/${agencyId}/transactions`, { params })
      .pipe(
        map((r) => r.data ?? r),
        catchError(() => of(this.mockTransactions()))
      );
  }

  // ── Données graphique ───────────────────────────────────────
  getChartData(
    agencyId: string,
    period: 'week' | 'month' | 'year' = 'month'
  ): Observable<PaymentChartData> {
    return this.http
      .get<any>(`${this.api}/finance/agency/${agencyId}/chart?period=${period}`)
      .pipe(
        map((r) => r.data ?? r),
        catchError(() => of(this.mockChartData(period)))
      );
  }

  // ── Demande de retrait ──────────────────────────────────────
  requestWithdrawal(agencyId: string, payload: WithdrawalRequest): Observable<any> {
    return this.http.post<any>(
      `${this.api}/finance/agency/${agencyId}/withdrawal`,
      payload
    );
  }

  // ── Historique des retraits ─────────────────────────────────
  getWithdrawals(
    agencyId: string,
    filters: FinanceFilters = {}
  ): Observable<PaginatedFinanceResponse<WithdrawalRecord>> {
    let params = new HttpParams();
    if (filters.startDate) params = params.set('startDate', filters.startDate);
    if (filters.endDate)   params = params.set('endDate',   filters.endDate);
    if (filters.status)    params = params.set('status',    filters.status);
    if (filters.page)      params = params.set('page',      String(filters.page ?? 1));
    if (filters.limit)     params = params.set('limit',     String(filters.limit ?? 10));

    return this.http
      .get<any>(`${this.api}/finance/agency/${agencyId}/withdrawals`, { params })
      .pipe(
        map((r) => r.data ?? r),
        catchError(() => of(this.mockWithdrawals()))
      );
  }

  // ════════════════════════════════════════════════════════════
  // MOCK DATA (fallback when API not available)
  // ════════════════════════════════════════════════════════════
  private mockSummary(): FinancialSummary {
    return {
      availableBalance: 342_500,
      totalCollected:   1_245_000,
      totalCommission:  124_500,
      netEarnings:      1_120_500,
      pendingAmount:    47_000,
      currency:         'XOF',
      lastUpdated:      new Date().toISOString(),
    };
  }

  private mockTransactions(): PaginatedFinanceResponse<PaymentTransaction> {
    const rows: PaymentTransaction[] = Array.from({ length: 12 }, (_, i) => ({
      _id: `txn_${i}`,
      agencyId: 'agency1',
      clientId: `client_${i}`,
      clientName: `Client ${i + 1}`,
      clientPhone: `+226 70 ${String(i).padStart(2, '0')} 00 00`,
      amount: (i + 1) * 5_000,
      commission: (i + 1) * 500,
      netAmount: (i + 1) * 4_500,
      method: i % 2 === 0 ? ('ORANGE_MONEY' as any) : ('MOOV_MONEY' as any),
      status: 'SUCCESS',
      reference: `REF-2024-${String(i + 1).padStart(4, '0')}`,
      description: 'Abonnement collecte déchets',
      createdAt: new Date(Date.now() - i * 86_400_000).toISOString(),
    }));
    return { success: true, data: rows, total: rows.length, page: 1, pages: 1 };
  }

  private mockWithdrawals(): PaginatedFinanceResponse<WithdrawalRecord> {
    const statuses: WithdrawalStatus[] = [WithdrawalStatus.PENDING, WithdrawalStatus.APPROVED, WithdrawalStatus.PROCESSED, WithdrawalStatus.REJECTED];
    const rows: WithdrawalRecord[] = Array.from({ length: 8 }, (_, i) => ({
      _id: `wd_${i}`,
      agencyId: 'agency1',
      amount: (i + 1) * 50_000,
      method: 'ORANGE_MONEY' as any,
      accountNumber: `+226 70 00 00 0${i}`,
      accountName: 'Agence ECO-COLLECT',
      status: statuses[i % 4],
      requestedAt: new Date(Date.now() - i * 7 * 86_400_000).toISOString(),
      processedAt: i % 2 === 0 ? new Date().toISOString() : undefined,
      reference: i % 4 !== 3 ? `WD-2024-${String(i + 1).padStart(4, '0')}` : undefined,
    }));
    return { success: true, data: rows, total: rows.length, page: 1, pages: 1 };
  }

  private mockChartData(period: string): PaymentChartData {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
                    'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const weeks  = Array.from({ length: 7 }, (_, i) => `Sem ${i + 1}`);
    const years  = ['2021', '2022', '2023', '2024'];

    const labels = period === 'week' ? weeks : period === 'year' ? years : months;
    return {
      labels,
      revenues:    labels.map(() => Math.floor(Math.random() * 200_000 + 50_000)),
      commissions: labels.map(() => Math.floor(Math.random() * 20_000  + 5_000)),
    };
  }
}
