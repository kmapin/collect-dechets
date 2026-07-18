import { Observable } from 'rxjs';
import { Agent, Page, PageParams, PaiementAgent } from '../../models';

export interface PaiementAgentFilter {
  idAgent?: string;
}

// Couvre F5 — prototype UI uniquement ; payerAgent() n'écrit qu'en mémoire mock
// (aucun impact réel sur le solde tant que RG10 reste TBC, voir DISCOVERY.md §7).
export abstract class AgentDataService {
  abstract getAgents(params?: PageParams): Observable<Page<Agent>>;
  abstract getPaiementsAgent(params?: PageParams<PaiementAgentFilter>): Observable<Page<PaiementAgent>>;
  abstract payerAgent(payload: { idAgent: string; montant: number }): Observable<PaiementAgent>;
}
