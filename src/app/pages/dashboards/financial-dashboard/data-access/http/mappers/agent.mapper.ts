import { Agent, PaiementAgent } from '../../../models';

// DTO réel : GET /finance/agents (services/paiementAgent.js::getAgentsByAgence). Pas de
// champ solde ici (Agent n'en a pas côté modèle) : le solde affiché ailleurs vient de
// DashboardKpi.soldeDisponible (solde de l'agence, pas par agent).
export function mapAgentDto(dto: unknown): Agent {
  const d = dto as Record<string, unknown>;
  return {
    idAgent: String(d['idAgent']),
    nom: String(d['nom']),
    prenom: d['prenom'] !== undefined && d['prenom'] !== null ? String(d['prenom']) : undefined,
    telephone: d['telephone'] !== undefined && d['telephone'] !== null ? String(d['telephone']) : undefined,
  };
}

// DTO réel : GET/POST /finance/agents/paiements (services/paiementAgent.js::
// getPaiementsAgence / payerAgent).
export function mapPaiementAgentDto(dto: unknown): PaiementAgent {
  const d = dto as Record<string, unknown>;
  return {
    idPaiementAgent: String(d['idPaiementAgent']),
    idAgent: String(d['idAgent']),
    montant: Number(d['montant']),
    datePaiement: String(d['datePaiement']),
  };
}
