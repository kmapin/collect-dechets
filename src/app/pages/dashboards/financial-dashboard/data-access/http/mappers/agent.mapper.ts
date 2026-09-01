import { Agent, PaiementAgent, PaiementAgentDetail } from '../../../models';

// DTO réel : GET /finance/agents (services/paiementAgent.js::getAgentsByAgence). Pas de
// champ solde ici (Agent n'en a pas côté modèle) : le solde affiché ailleurs vient de
// DashboardKpi.soldeDisponible (solde de l'agence, pas par agent). moovEligible
// (chantier M2) : `Boolean(...)` plutôt que `!!` pour rester cohérent avec le style
// déjà utilisé dans ce fichier — absent du DTO (backend antérieur à M2) → false,
// jamais un paiement Moov supposé par défaut.
export function mapAgentDto(dto: unknown): Agent {
  const d = dto as Record<string, unknown>;
  return {
    idAgent: String(d['idAgent']),
    nom: String(d['nom']),
    prenom: d['prenom'] !== undefined && d['prenom'] !== null ? String(d['prenom']) : undefined,
    telephone: d['telephone'] !== undefined && d['telephone'] !== null ? String(d['telephone']) : undefined,
    moovEligible: Boolean(d['moovEligible']),
    orangeEligible: Boolean(d['orangeEligible']),
  };
}

// DTO réel : GET/POST /finance/agents/paiements (services/paiementAgent.js::
// getPaiementsAgence / payerAgent), et les 3 endpoints de validation/résolution
// (chantier M2) qui renvoient le même document PaiementAgent — un seul mapper pour
// les 4 endpoints, pas un par appelant. status/provider absents du DTO (ne devrait
// jamais arriver après M2, mais évite un crash sur un DTO partiel) retombent sur des
// valeurs neutres plutôt qu'une exception.
export function mapPaiementAgentDto(dto: unknown): PaiementAgent {
  const d = dto as Record<string, unknown>;
  return {
    idPaiementAgent: String(d['idPaiementAgent']),
    idAgent: String(d['idAgent']),
    montant: Number(d['montant']),
    datePaiement: String(d['datePaiement']),
    status: (d['status'] as PaiementAgent['status']) ?? 'COMPLETED',
    provider: (d['provider'] as PaiementAgent['provider']) ?? 'INTERNE',
    reference: d['reference'] !== undefined && d['reference'] !== null ? String(d['reference']) : undefined,
    failureReason: d['failureReason'] !== undefined && d['failureReason'] !== null ? String(d['failureReason']) : undefined,
    rejectionReason: d['rejectionReason'] !== undefined && d['rejectionReason'] !== null ? String(d['rejectionReason']) : undefined,
    libelle: d['libelle'] !== undefined && d['libelle'] !== null ? String(d['libelle']) : undefined,
  };
}

// DTO réel : GET /finance/agents/paiements/:id (services/paiementAgent.js::toDetailDto)
// — écran de détail + "vérifier le statut". Champs déjà nommés `null` côté backend
// (jamais absents) quand non applicables, donc `?? null` suffit (pas de `undefined`
// à absorber comme pour mapPaiementAgentDto, DTO plus ancien/moins strict).
export function mapPaiementAgentDetailDto(dto: unknown): PaiementAgentDetail {
  const d = dto as Record<string, unknown>;
  return {
    idPaiementAgent: String(d['idPaiementAgent']),
    idAgent: String(d['idAgent']),
    agentNom: (d['agentNom'] as string | null) ?? null,
    montant: Number(d['montant']),
    datePaiement: String(d['datePaiement']),
    status: (d['status'] as PaiementAgentDetail['status']) ?? 'COMPLETED',
    provider: (d['provider'] as PaiementAgentDetail['provider']) ?? 'INTERNE',
    phoneNumber: (d['phoneNumber'] as string | null) ?? null,
    operator: (d['operator'] as PaiementAgentDetail['operator']) ?? null,
    reference: (d['reference'] as string | null) ?? null,
    providerTransactionId: (d['providerTransactionId'] as string | null) ?? null,
    failureReason: (d['failureReason'] as string | null) ?? null,
    rejectionReason: (d['rejectionReason'] as string | null) ?? null,
    initiatedByNom: (d['initiatedByNom'] as string | null) ?? null,
    validatedByNom: (d['validatedByNom'] as string | null) ?? null,
    initiatedAt: (d['initiatedAt'] as string | null) ?? null,
    completedAt: (d['completedAt'] as string | null) ?? null,
    createdAt: String(d['createdAt']),
    updatedAt: String(d['updatedAt']),
  };
}
