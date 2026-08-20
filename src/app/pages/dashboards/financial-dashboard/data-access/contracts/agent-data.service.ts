import { Observable } from 'rxjs';
import { Agent, Page, PageParams, PaiementAgent } from '../../models';

export interface PaiementAgentFilter {
  idAgent?: string;
}

// Couvre F5 — payerAgent() crée la demande : paiement interne immédiat (comportement
// historique inchangé) si l'agent n'a pas de numéro Moov fiable, sinon demande
// EN_ATTENTE_VALIDATION (chantier M2 — services/paiementAgent.js::payerAgent). Le
// montant à verser reste saisi manuellement, aucun calcul automatique de rémunération
// suggérée (RG10, toujours ouvert — voir docs/PAIEMENT-AGENTS.md).
// validerPaiementAgent/confirmerVirementEffectue/confirmerVirementNonEffectue :
// réservés au rôle super_admin côté backend (même rôle qu'accepterRetrait, module
// Retraits) — le composant doit masquer ces actions pour tout autre rôle.
export abstract class AgentDataService {
  abstract getAgents(params?: PageParams): Observable<Page<Agent>>;
  abstract getPaiementsAgent(params?: PageParams<PaiementAgentFilter>): Observable<Page<PaiementAgent>>;
  abstract payerAgent(payload: { idAgent: string; montant: number }): Observable<PaiementAgent>;
  abstract validerPaiementAgent(idPaiementAgent: string): Observable<PaiementAgent>;
  abstract rejeterPaiementAgent(idPaiementAgent: string, motif: string): Observable<PaiementAgent>;
  abstract confirmerVirementEffectue(idPaiementAgent: string): Observable<PaiementAgent>;
  abstract confirmerVirementNonEffectue(idPaiementAgent: string): Observable<PaiementAgent>;
}
