import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../../../environments/environment';
import { Agent, Page, PageParams, PaiementAgent } from '../../models';
import { AgentDataService, PaiementAgentFilter } from '../contracts/agent-data.service';
import { mapAgentDto, mapPaiementAgentDto } from './mappers/agent.mapper';

// Squelette inerte (Prompt 17) — voir client-data.http.service.ts pour la note complète
// sur le branchement DI et INTEGRATION.md pour la liste des endpoints.
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

  payerAgent(payload: { idAgent: string; montant: number }): Observable<PaiementAgent> {
    // POST /finance/agents/paiements { idAgent, montant }
    return this.http.post<unknown>(`${this.base}/paiements`, payload).pipe(map(mapPaiementAgentDto));
  }
}
