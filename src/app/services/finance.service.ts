import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  FinancialSummary,
  PaymentTransaction,
  DemanderRetraitPayload,
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
  // Corrigé (chantier Finance/Paiements, item 3) : GET /finance/agency/:id/summary
  // n'existe pas côté backend (l'agencyId n'est d'ailleurs jamais lu depuis l'URL sur les
  // routes financières réelles — resolveAgency.js le dérive du JWT) — retombait
  // silencieusement sur mockSummary() à chaque appel. Réutilise le vrai
  // GET /finance/dashboard/kpi (financial-dashboard, déjà utilisé par
  // dashboard.component.ts), pas de nouvelle route créée.
  getFinancialSummary(agencyId?: string): Observable<FinancialSummary> {
    return this.http.get<any>(`${this.api}/finance/dashboard/kpi`).pipe(
      map((kpi) => ({
        availableBalance: kpi.soldeDisponible ?? 0,
        totalCollected:   kpi.totalCollecte ?? 0,
        // Aucune notion de commission dans le socle actuel (services/financeStats.js,
        // TODO explicite non résolu — voir chantier Finance/Paiements, item 1, décision
        // produit en attente) : 0 plutôt qu'un chiffre inventé.
        totalCommission:  0,
        netEarnings:      kpi.revenusNets ?? kpi.totalCollecte ?? 0,
        pendingAmount:    kpi.enAttente ?? 0,
        currency:         kpi.devise ?? 'XOF',
        lastUpdated:      kpi.misAJourLe ?? new Date().toISOString(),
      } as FinancialSummary)),
      catchError((err) => {
        console.error('[FinanceService] getFinancialSummary:', err);
        return throwError(() => err);
      })
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
  // Corrigé (item 3) : GET /finance/agency/:id/chart n'existe pas non plus — retombait sur
  // mockChartData(). Réutilise GET /finance/dashboard/stats (FinanceStatsService.
  // getStatsParPeriode, granularité mois — aucune agrégation par semaine n'existe côté
  // backend, l'option 'week' a donc été retirée de l'écran plutôt que simulée).
  // `commissions` reste à 0 pour la même raison que totalCommission ci-dessus (item 1).
  getChartData(
    agencyId: string,
    period: 'month' | 'year' = 'month'
  ): Observable<PaymentChartData> {
    const now = new Date();
    const debut = period === 'year'
      ? { mois: now.getMonth() + 1, annee: now.getFullYear() - 1 } // 12 derniers mois glissants
      : { mois: now.getMonth() + 1, annee: now.getFullYear() };
    const fin = { mois: now.getMonth() + 1, annee: now.getFullYear() };

    let params = new HttpParams()
      .set('debutMois', debut.mois).set('debutAnnee', debut.annee)
      .set('finMois', fin.mois).set('finAnnee', fin.annee);

    return this.http.get<any>(`${this.api}/finance/dashboard/stats`, { params }).pipe(
      map((stats) => ({
        labels: stats.labels ?? [],
        revenues: stats.revenusNets ?? stats.totalCollecte ?? [],
        commissions: (stats.labels ?? []).map(() => 0),
      } as PaymentChartData)),
      catchError((err) => {
        console.error('[FinanceService] getChartData:', err);
        return throwError(() => err);
      })
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

  // ── Demande de retrait ──────────────────────────────────────
  // Corrigé (item 3) : remplace payment$() (POST /transactions/send-money,
  // TransactionService.sendUserMoney) — un circuit legacy qui débite et exécute le
  // paiement Moov Money IMMÉDIATEMENT, contournant entièrement la validation Super Admin
  // du module Retraits déjà livré (un retrait initié par ce chemin n'apparaissait jamais
  // dans l'onglet Super Admin). POST /finance/retraits (TransactionService.
  // demanderRetrait) est le même workflow réel que financial-dashboard::
  // enregistrerRetrait() — aucun débit ni appel opérateur avant l'acceptation Super Admin.
  demanderRetrait$(payload: DemanderRetraitPayload): Observable<any> {
    return this.http.post<any>(`${this.api}/finance/retraits`, payload).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err))
    );
  }
}
