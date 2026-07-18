import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Agent, Page, PageParams, PaiementAgent } from '../../models';
import { AgentDataService, PaiementAgentFilter } from '../contracts/agent-data.service';
import { AGENTS } from './data/agents.data';
import { PAIEMENTS_AGENT } from './data/paiements-agent.data';
import { MockConfigService } from './mock-config.service';
import { paginateMock, simulateResponse } from './simulate.util';

const FEATURE = 'agents';

@Injectable()
export class AgentDataMockService implements AgentDataService {
  private paiementsAgent: PaiementAgent[] = [...PAIEMENTS_AGENT];

  constructor(private readonly mockConfig: MockConfigService) {}

  getAgents(params?: PageParams): Observable<Page<Agent>> {
    const paged = paginateMock(AGENTS, params);
    return simulateResponse(FEATURE, this.mockConfig, paged, { ...paged, items: [] });
  }

  getPaiementsAgent(params?: PageParams<PaiementAgentFilter>): Observable<Page<PaiementAgent>> {
    const filtered = this.paiementsAgent.filter(
      p => !params?.filter?.idAgent || p.idAgent === params.filter.idAgent,
    );
    const paged = paginateMock(filtered, params);
    return simulateResponse(`${FEATURE}:paiements`, this.mockConfig, paged, { ...paged, items: [] });
  }

  payerAgent(payload: { idAgent: string; montant: number }): Observable<PaiementAgent> {
    const paiement: PaiementAgent = {
      idPaiementAgent: `pag-${Date.now()}`,
      idAgent: payload.idAgent,
      montant: payload.montant,
      datePaiement: new Date().toISOString(),
    };
    this.paiementsAgent = [paiement, ...this.paiementsAgent];
    return simulateResponse(`${FEATURE}:paiements:create`, this.mockConfig, paiement);
  }
}
