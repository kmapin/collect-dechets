import { Observable } from 'rxjs';
import { Agent, Page, PageParams, PaiementAgent } from '../../models';

export interface PaiementAgentFilter {
  idAgent?: string;
}

// Couvre F5 — payerAgent() débite réellement le wallet de l'agence (services/
// paiementAgent.js::payerAgent, rollback compensatoire en cas d'échec). Reste ouvert côté
// RG10 (DISCOVERY.md §7) : le montant à verser est saisi manuellement, aucun calcul
// automatique de rémunération suggérée.
export abstract class AgentDataService {
  abstract getAgents(params?: PageParams): Observable<Page<Agent>>;
  abstract getPaiementsAgent(params?: PageParams<PaiementAgentFilter>): Observable<Page<PaiementAgent>>;
  abstract payerAgent(payload: { idAgent: string; montant: number }): Observable<PaiementAgent>;
}
