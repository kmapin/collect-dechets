import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  FinancialSummary,
  PaymentTransaction,
  WithdrawalRequest,
  WithdrawalRecord,
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

  // ── Historique des paiements de l'agence ───────────────────
  // GET /api/transactions/agency/{agencyId}?operator=&userId=&page=&limit=
  getTransactions(
    agencyId: string,
    filters: FinanceFilters = {}
  ): Observable<PaginatedFinanceResponse<PaymentTransaction>> {
    let params = new HttpParams();
    if (filters.operator) params = params.set('operator', filters.operator);
    if (filters.userId)   params = params.set('userId',   filters.userId);
    if (filters.page)     params = params.set('page',     String(filters.page));
    if (filters.limit)    params = params.set('limit',    String(filters.limit));

    return this.http
      .get<any>(`${this.api}/transactions/agency/${agencyId}`, { params })
      .pipe(
        map((r) => {
          if (Array.isArray(r)) return { success: true, data: r, total: r.length, page: 1, pages: 1 };
          return r.data !== undefined ? r : { success: true, data: r, total: r.length ?? 0, page: 1, pages: 1 };
        }),
        catchError((err) => {
          console.error('[FinanceService] getTransactions:', err);
          return of({ success: false, data: [], total: 0, page: 1, pages: 0 } as PaginatedFinanceResponse<PaymentTransaction>);
        })
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

  // ── Historique des retraits de l'agence ────────────────────
  // GET /api/transactions/withdraws/agency/{agencyId}?operator=&userId=&page=&limit=
  getWithdrawals(
    agencyId: string,
    filters: FinanceFilters = {}
  ): Observable<PaginatedFinanceResponse<WithdrawalRecord>> {
    let params = new HttpParams();
    if (filters.operator) params = params.set('operator', filters.operator);
    if (filters.userId)   params = params.set('userId',   filters.userId);
    if (filters.page)     params = params.set('page',     String(filters.page ?? 1));
    if (filters.limit)    params = params.set('limit',    String(filters.limit ?? 10));

    return this.http
      .get<any>(`${this.api}/transactions/withdraws/agency/${agencyId}`, { params })
      .pipe(
        map((r) => {
          if (Array.isArray(r)) return { success: true, data: r, total: r.length, page: 1, pages: 1 };
          return r.data !== undefined ? r : { success: true, data: r, total: r.length ?? 0, page: 1, pages: 1 };
        }),
        catchError((err) => {
          console.error('[FinanceService] getWithdrawals:', err);
          return of({ success: false, data: [], total: 0, page: 1, pages: 0 } as PaginatedFinanceResponse<WithdrawalRecord>);
        })
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

   /* the error handler func just rethrows the error  */
    public newGlobalErrorHandler = (error: HttpErrorResponse): Observable<never> => {
        return throwError(() => error);
    }

 public payment$( payload: any): Observable<any> {
        const url = `${this.api}/transactions/send-money`;
        return this.http.post<any>(url, payload).pipe(
            tap((data) => console.log('[API] payment$ > tap :', data)),
            catchError(this.newGlobalErrorHandler)
        );
    }
}
