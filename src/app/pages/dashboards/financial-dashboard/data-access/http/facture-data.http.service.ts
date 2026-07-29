import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../../../environments/environment';
import { Facture, LigneReleve, Page, PageParams, Periode, SuiviAbonneMensuel } from '../../models';
import {
  FactureDataService,
  FactureFilter,
  SituationPaiementClient,
  SuiviMensuelFilter,
} from '../contracts/facture-data.service';
import { mapFactureDto, mapLigneReleveDto, mapSuiviAbonneMensuelDto } from './mappers/facture.mapper';

// Implémentation réelle, câblée en dur sur FACTURE_DATA_SERVICE dans
// financial-dashboard.routes.ts (module Facturation entièrement backé) — voir
// INTEGRATION.md pour la liste des endpoints.
@Injectable()
export class FactureDataHttpService implements FactureDataService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/finance/factures`;

  getFactures(params?: PageParams<FactureFilter>): Observable<Page<Facture>> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.pageSize) httpParams = httpParams.set('pageSize', params.pageSize);
    if (params?.filter?.idClient) httpParams = httpParams.set('idClient', params.filter.idClient);
    if (params?.filter?.statut) httpParams = httpParams.set('statut', params.filter.statut);

    // GET /finance/factures?page=&pageSize=&idClient=&statut=
    return this.http.get<{ items: unknown[]; total: number; page: number; pageSize: number }>(this.base, { params: httpParams }).pipe(
      map(res => ({ items: res.items.map(mapFactureDto), total: res.total, page: res.page, pageSize: res.pageSize })),
    );
  }

  getFacturesClient(idClient: string): Observable<Facture[]> {
    // GET /finance/factures/client/:idClient
    return this.http.get<unknown[]>(`${this.base}/client/${idClient}`).pipe(map(items => items.map(mapFactureDto)));
  }

  getSituationClients(): Observable<SituationPaiementClient[]> {
    // GET /finance/factures/situation-clients
    return this.http.get<SituationPaiementClient[]>(`${this.base}/situation-clients`);
  }

  getSuiviMensuel(periode: Periode, params?: PageParams<SuiviMensuelFilter>): Observable<Page<SuiviAbonneMensuel>> {
    let httpParams = new HttpParams().set('mois', periode.mois).set('annee', periode.annee);
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.pageSize) httpParams = httpParams.set('pageSize', params.pageSize);
    if (params?.filter?.impayeesSeulement) httpParams = httpParams.set('impayeesSeulement', true);

    // GET /finance/factures/suivi-mensuel?mois=&annee=&page=&pageSize=&impayeesSeulement=
    return this.http
      .get<{ items: unknown[]; total: number; page: number; pageSize: number }>(`${this.base}/suivi-mensuel`, { params: httpParams })
      .pipe(map(res => ({ items: res.items.map(mapSuiviAbonneMensuelDto), total: res.total, page: res.page, pageSize: res.pageSize })));
  }

  getReleve(idClient: string, plage?: { debut?: Periode; fin?: Periode }): Observable<LigneReleve[]> {
    let httpParams = new HttpParams();
    if (plage?.debut) httpParams = httpParams.set('debutMois', plage.debut.mois).set('debutAnnee', plage.debut.annee);
    if (plage?.fin) httpParams = httpParams.set('finMois', plage.fin.mois).set('finAnnee', plage.fin.annee);

    // GET /finance/factures/releve/:idClient?debutMois=&debutAnnee=&finMois=&finAnnee=
    return this.http
      .get<unknown[]>(`${this.base}/releve/${idClient}`, { params: httpParams })
      .pipe(map(items => items.map(mapLigneReleveDto)));
  }

  genererFacturesDuMois(periode: Periode): Observable<{ genere: number }> {
    // POST /finance/factures/generer  { mois, annee }
    return this.http.post<{ genere: number }>(`${this.base}/generer`, { mois: periode.mois, annee: periode.annee });
  }
}
