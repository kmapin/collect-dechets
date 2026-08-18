import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../../../environments/environment';
import { DashboardKpi, Page, PageParams, Periode, Retrait } from '../../models';
import {
  FeeOptionRetrait,
  FinanceDataService,
  FinanceStatsSeries,
  MontantTotalFilter,
  OperateurRetrait,
  PaiementFilter,
  PaiementListe,
  RepartitionModePaiement,
  RetraitFilter,
} from '../contracts/finance-data.service';
import { mapDashboardKpiDto, mapPaiementListeDto, mapRepartitionModePaiementDto, mapRetraitDto } from './mappers/finance.mapper';

// Factorisé (item 6) : les 2 endpoints filtrables (kpi, stats) partagent le même trio de
// query params optionnels.
function applyMontantTotalFilters(params: HttpParams, filters?: MontantTotalFilter): HttpParams {
  let result = params;
  if (filters?.zone) result = result.set('zone', filters.zone);
  if (filters?.idClient) result = result.set('idClient', filters.idClient);
  if (filters?.planType) result = result.set('planType', filters.planType);
  return result;
}

// Implémentation réelle, câblée en dur sur FINANCE_DATA_SERVICE dans
// financial-dashboard.routes.ts. enregistrerRetrait attend { montant, customerMsisdn,
// operator, motif? } — le body exact exigé par le backend (controllers/financeStats.js).
@Injectable()
export class FinanceDataHttpService implements FinanceDataService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/finance`;

  getDashboardKpi(periode?: Periode, filters?: MontantTotalFilter): Observable<DashboardKpi> {
    let httpParams = new HttpParams();
    if (periode) httpParams = httpParams.set('mois', periode.mois).set('annee', periode.annee);
    httpParams = applyMontantTotalFilters(httpParams, filters);
    // GET /finance/dashboard/kpi?mois=&annee=&zone=&idClient=&planType=
    return this.http.get<unknown>(`${this.base}/dashboard/kpi`, { params: httpParams }).pipe(map(mapDashboardKpiDto));
  }

  getStats(plage: { debut: Periode; fin: Periode }, filters?: MontantTotalFilter): Observable<FinanceStatsSeries> {
    let httpParams = new HttpParams()
      .set('debutMois', plage.debut.mois)
      .set('debutAnnee', plage.debut.annee)
      .set('finMois', plage.fin.mois)
      .set('finAnnee', plage.fin.annee);
    httpParams = applyMontantTotalFilters(httpParams, filters);
    // GET /finance/dashboard/stats?debutMois=&debutAnnee=&finMois=&finAnnee=&zone=&idClient=&planType=
    return this.http.get<FinanceStatsSeries>(`${this.base}/dashboard/stats`, { params: httpParams });
  }

  getRepartitionModePaiement(plage: { debut: Periode; fin: Periode }): Observable<RepartitionModePaiement[]> {
    const httpParams = new HttpParams()
      .set('debutMois', plage.debut.mois)
      .set('debutAnnee', plage.debut.annee)
      .set('finMois', plage.fin.mois)
      .set('finAnnee', plage.fin.annee);
    // GET /finance/dashboard/repartition-mode?debutMois=&debutAnnee=&finMois=&finAnnee=
    return this.http
      .get<unknown[]>(`${this.base}/dashboard/repartition-mode`, { params: httpParams })
      .pipe(map(mapRepartitionModePaiementDto));
  }

  getPaiements(params?: PageParams<PaiementFilter>): Observable<Page<PaiementListe>> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.pageSize) httpParams = httpParams.set('pageSize', params.pageSize);
    if (params?.filter?.idClient) httpParams = httpParams.set('idClient', params.filter.idClient);
    if (params?.filter?.search) httpParams = httpParams.set('search', params.filter.search);

    // GET /finance/paiements?page=&pageSize=&idClient=&search=
    return this.http
      .get<{ items: unknown[]; total: number; page: number; pageSize: number }>(`${this.base}/paiements`, { params: httpParams })
      .pipe(map(res => ({ items: res.items.map(mapPaiementListeDto), total: res.total, page: res.page, pageSize: res.pageSize })));
  }

  getRetraits(params?: PageParams<RetraitFilter>): Observable<Page<Retrait>> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.pageSize) httpParams = httpParams.set('pageSize', params.pageSize);
    if (params?.filter?.search) httpParams = httpParams.set('search', params.filter.search);
    if (params?.periode) httpParams = httpParams.set('mois', params.periode.mois).set('annee', params.periode.annee);

    // GET /finance/retraits?page=&pageSize=&search=&mois=&annee=
    return this.http
      .get<{ items: unknown[]; total: number; page: number; pageSize: number }>(`${this.base}/retraits`, { params: httpParams })
      .pipe(map(res => ({ items: res.items.map(mapRetraitDto), total: res.total, page: res.page, pageSize: res.pageSize })));
  }

  enregistrerRetrait(payload: { montant: number; customerMsisdn: string; operator: OperateurRetrait; motif?: string; feeOption: FeeOptionRetrait }): Observable<Retrait> {
    // POST /finance/retraits { montant, customerMsisdn, operator, motif, feeOption } —
    // controllers/financeStats.js::enregistrerRetrait délègue à TransactionService.
    // demanderRetrait : AUCUN débit ni appel Moov Money à ce stade (corrigé, chantier
    // Finance/Paiements item 3 — ce commentaire décrivait par erreur le comportement du
    // circuit legacy sendUserMoney/send-money, pas celui de cet endpoint). Le débit +
    // l'appel opérateur n'ont lieu qu'à l'acceptation Super Admin (accepterRetrait,
    // module Retraits). `feeOption` obligatoire depuis le chantier Frais plateforme
    // (Prompt F5) — choisi par l'agence à chaque demande, jamais un réglage permanent.
    return this.http.post<unknown>(`${this.base}/retraits`, payload).pipe(map(mapRetraitDto));
  }
}
