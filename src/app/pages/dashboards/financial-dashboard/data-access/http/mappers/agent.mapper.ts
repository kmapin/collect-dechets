import { Agent, PaiementAgent, PaiementAgentDetail } from '../../../models';

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
