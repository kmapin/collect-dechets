import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../../../environments/environment';
import { Agent, Page, PageParams, PaiementAgent, PaiementAgentDetail } from '../../models';
import { AgentDataService, PaiementAgentFilter } from '../contracts/agent-data.service';
import { mapAgentDto, mapPaiementAgentDetailDto, mapPaiementAgentDto } from './mappers/agent.mapper';

// Implémentation réelle, câblée en dur sur AGENT_DATA_SERVICE dans
// financial-dashboard.routes.ts — voir INTEGRATION.md pour la liste des endpoints.
@Injectable()
export class AgentDataHttpService implements AgentDataService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/finance/agents`;

  getAgents(params?: PageParams): Observable<Page<Agent>> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.pageSize) httpParams = httpParams.set('pageSize', params.pageSize);

    // GET /finance/agents?page=&pageSize=
    return this.http
      .get<{ items: unknown[]; total: number; page: number; pageSize: number }>(this.base, { params: httpParams })
      .pipe(map(res => ({ items: res.items.map(mapAgentDto), total: res.total, page: res.page, pageSize: res.pageSize })));
  }

  getPaiementsAgent(params?: PageParams<PaiementAgentFilter>): Observable<Page<PaiementAgent>> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.pageSize) httpParams = httpParams.set('pageSize', params.pageSize);
    if (params?.filter?.idAgent) httpParams = httpParams.set('idAgent', params.filter.idAgent);

    // GET /finance/agents/paiements?page=&pageSize=&idAgent=
    return this.http
      .get<{ items: unknown[]; total: number; page: number; pageSize: number }>(`${this.base}/paiements`, { params: httpParams })
      .pipe(map(res => ({ items: res.items.map(mapPaiementAgentDto), total: res.total, page: res.page, pageSize: res.pageSize })));
  }

  // GET /finance/agents/paiements/:id
  getPaiementDetail(idPaiementAgent: string): Observable<PaiementAgentDetail> {
    return this.http
      .get<unknown>(`${this.base}/paiements/${idPaiementAgent}`)
      .pipe(map(mapPaiementAgentDetailDto));
  }

  payerAgent(payload: { idAgent: string; montant: number; phoneNumber?: string }): Observable<PaiementAgent> {
    // POST /finance/agents/paiements { idAgent, montant, phoneNumber? }
    return this.http.post<unknown>(`${this.base}/paiements`, payload).pipe(map(mapPaiementAgentDto));
  }

  // PATCH /finance/agents/paiements/:id/valider — réservé super_admin côté backend.
  validerPaiementAgent(idPaiementAgent: string): Observable<PaiementAgent> {
    return this.http.patch<unknown>(`${this.base}/paiements/${idPaiementAgent}/valider`, {}).pipe(map(mapPaiementAgentDto));
  }

  // PATCH /finance/agents/paiements/:id/rejeter { motif }
  rejeterPaiementAgent(idPaiementAgent: string, motif: string): Observable<PaiementAgent> {
    return this.http
      .patch<unknown>(`${this.base}/paiements/${idPaiementAgent}/rejeter`, { motif })
      .pipe(map(mapPaiementAgentDto));
  }

  // PATCH /finance/agents/paiements/:id/confirmer-virement-effectue
  confirmerVirementEffectue(idPaiementAgent: string): Observable<PaiementAgent> {
    return this.http
      .patch<unknown>(`${this.base}/paiements/${idPaiementAgent}/confirmer-virement-effectue`, {})
      .pipe(map(mapPaiementAgentDto));
  }

  // PATCH /finance/agents/paiements/:id/confirmer-virement-non-effectue
  confirmerVirementNonEffectue(idPaiementAgent: string): Observable<PaiementAgent> {
    return this.http
      .patch<unknown>(`${this.base}/paiements/${idPaiementAgent}/confirmer-virement-non-effectue`, {})
      .pipe(map(mapPaiementAgentDto));
  }
}
