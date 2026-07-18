import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../../../environments/environment';
import { DashboardKpi, Page, PageParams, Periode, Retrait } from '../../models';
import {
  FinanceDataService,
  FinanceStatsSeries,
  PaiementFilter,
  PaiementListe,
  RepartitionModePaiement,
  RetraitFilter,
} from '../contracts/finance-data.service';
import { mapDashboardKpiDto, mapPaiementListeDto, mapRetraitDto } from './mappers/finance.mapper';

// Squelette inerte (Prompt 17) — voir client-data.http.service.ts pour la note complète
// sur le branchement DI et INTEGRATION.md pour la liste des endpoints.
@Injectable()
export class FinanceDataHttpService implements FinanceDataService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/finance`;

  getDashboardKpi(periode?: Periode): Observable<DashboardKpi> {
    let httpParams = new HttpParams();
    if (periode) httpParams = httpParams.set('mois', periode.mois).set('annee', periode.annee);
    // GET /finance/dashboard/kpi?mois=&annee=
    return this.http.get<unknown>(`${this.base}/dashboard/kpi`, { params: httpParams }).pipe(map(mapDashboardKpiDto));
  }

  getStats(plage: { debut: Periode; fin: Periode }): Observable<FinanceStatsSeries> {
    const httpParams = new HttpParams()
      .set('debutMois', plage.debut.mois)
      .set('debutAnnee', plage.debut.annee)
      .set('finMois', plage.fin.mois)
      .set('finAnnee', plage.fin.annee);
    // GET /finance/dashboard/stats?debutMois=&debutAnnee=&finMois=&finAnnee=
    return this.http.get<FinanceStatsSeries>(`${this.base}/dashboard/stats`, { params: httpParams });
  }

  getRepartitionModePaiement(plage: { debut: Periode; fin: Periode }): Observable<RepartitionModePaiement[]> {
    const httpParams = new HttpParams()
      .set('debutMois', plage.debut.mois)
      .set('debutAnnee', plage.debut.annee)
      .set('finMois', plage.fin.mois)
      .set('finAnnee', plage.fin.annee);
    // GET /finance/dashboard/repartition-mode?debutMois=&debutAnnee=&finMois=&finAnnee=
    return this.http.get<RepartitionModePaiement[]>(`${this.base}/dashboard/repartition-mode`, { params: httpParams });
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

  enregistrerRetrait(payload: { montant: number; motif?: string }): Observable<Retrait> {
    // POST /finance/retraits { montant, motif }
    return this.http.post<unknown>(`${this.base}/retraits`, payload).pipe(map(mapRetraitDto));
  }
}
