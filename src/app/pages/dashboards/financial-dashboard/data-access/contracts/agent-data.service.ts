import { Observable } from 'rxjs';
import { Agent, Page, PageParams, PaiementAgent, PaiementAgentDetail } from '../../models';

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
  // Écran de détail + "vérifier le statut" (simple re-fetch de l'état réel en base —
  // voir services/paiementAgent.js::getPaiementByIdAgence pour la limite documentée :
  // aucun opérateur Mobile Money n'expose de vérification automatisée exploitable
  // pour ce flux aujourd'hui, jamais simulée ici).
  abstract getPaiementDetail(idPaiementAgent: string): Observable<PaiementAgentDetail>;
  // `phoneNumber` (optionnel) : numéro de réception du paiement différent de celui
  // enregistré sur la fiche agent (l'agent veut être payé sur un autre compte Mobile
  // Money) — remplace agent.phone pour cette demande, y compris pour déterminer le
  // provider (voir services/paiementAgent.js::_resolveProviderPourAgent, backend).
  abstract payerAgent(payload: { idAgent: string; montant: number; phoneNumber?: string }): Observable<PaiementAgent>;
  abstract validerPaiementAgent(idPaiementAgent: string): Observable<PaiementAgent>;
  abstract rejeterPaiementAgent(idPaiementAgent: string, motif: string): Observable<PaiementAgent>;
  abstract confirmerVirementEffectue(idPaiementAgent: string): Observable<PaiementAgent>;
  abstract confirmerVirementNonEffectue(idPaiementAgent: string): Observable<PaiementAgent>;
}
