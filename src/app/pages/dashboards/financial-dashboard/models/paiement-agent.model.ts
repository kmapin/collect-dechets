export type PaiementAgentStatus = 'EN_ATTENTE_VALIDATION' | 'INITIATED' | 'COMPLETED' | 'FAILED' | 'A_VERIFIER_MANUELLEMENT' | 'REJETE';


export type PaiementAgentProvider = 'MOOV' | 'ORANGE_MONEY' | 'INTERNE';

export interface PaiementAgent {
  readonly idPaiementAgent: string;
  idAgent: string;
  montant: number;
  datePaiement: string; 
  status: PaiementAgentStatus;
  provider: PaiementAgentProvider;
  reference?: string;
  failureReason?: string;
  rejectionReason?: string;
  libelle?: string;
}

export interface PaiementAgentActionable {
  readonly idPaiementAgent: string;
  idAgent: string;
  montant: number;
  datePaiement: string; 
  status: PaiementAgentStatus;
  provider: PaiementAgentProvider;
  reference?: string | null;
  failureReason?: string | null;
  rejectionReason?: string | null;
}


export interface PaiementAgentDetail {
  readonly idPaiementAgent: string;
  idAgent: string;
  agentNom: string | null;
  montant: number;
  datePaiement: string; 
  status: PaiementAgentStatus;
  provider: PaiementAgentProvider;
  phoneNumber: string | null;
  operator: 'MOOV_MONEY' | 'ORANGE_MONEY' | null;
  reference: string | null;
  providerTransactionId: string | null;
  failureReason: string | null;
  rejectionReason: string | null;
  initiatedByNom: string | null;
  validatedByNom: string | null;
  initiatedAt: string | null; 
  completedAt: string | null;
  createdAt: string; 
  updatedAt: string;
}
