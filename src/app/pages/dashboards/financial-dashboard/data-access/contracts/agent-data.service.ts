import { Observable } from 'rxjs';
import { Agent, Page, PageParams, PaiementAgent, PaiementAgentDetail } from '../../models';

export interface PaiementAgentFilter {
  idAgent?: string;
  search?: string;
  statut?: PaiementAgent['status'];
  provider?: PaiementAgent['provider'];
  montantMin?: number;
  dateDebut?: string;
  dateFin?: string;
}

export abstract class AgentDataService {
  abstract getAgents(params?: PageParams): Observable<Page<Agent>>;
  abstract getPaiementsAgent(params?: PageParams<PaiementAgentFilter>): Observable<Page<PaiementAgent>>;
  abstract getPaiementDetail(idPaiementAgent: string): Observable<PaiementAgentDetail>;
  abstract payerAgent(payload: { idAgent: string; montant: number; phoneNumber?: string }): Observable<PaiementAgent>;
  abstract validerPaiementAgent(idPaiementAgent: string): Observable<PaiementAgent>;
  abstract rejeterPaiementAgent(idPaiementAgent: string, motif: string): Observable<PaiementAgent>;
  abstract confirmerVirementEffectue(idPaiementAgent: string): Observable<PaiementAgent>;
  abstract confirmerVirementNonEffectue(idPaiementAgent: string): Observable<PaiementAgent>;
}
