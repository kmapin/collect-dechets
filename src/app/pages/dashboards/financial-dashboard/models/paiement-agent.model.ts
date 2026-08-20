// Table 27 — Paiement_Agent. RG10 : impact sur le solde est réel et vérifié (voir
// docs/PAIEMENT-AGENTS.md) — seule la formule de rémunération (montant saisi
// manuellement) reste un point ouvert, sans rapport avec ce modèle.
//
// Vocabulaire de statut IDENTIQUE à models/Withdraw.js (backend, chantier "correctif
// Retraits erreurs ambiguës" puis paiement agent M2) : EN_ATTENTE_VALIDATION (demande
// créée, provider MOOV, aucun débit/virement encore déclenché), INITIATED (verrou
// pendant la validation), COMPLETED, FAILED, A_VERIFIER_MANUELLEMENT (virement Moov
// sans réponse reçue — issue réelle inconnue, résolution manuelle nécessaire), REJETE
// (demande EN_ATTENTE_VALIDATION rejetée par le validateur, avant tout débit/virement).
export type PaiementAgentStatus = 'EN_ATTENTE_VALIDATION' | 'INITIATED' | 'COMPLETED' | 'FAILED' | 'A_VERIFIER_MANUELLEMENT' | 'REJETE';

// 'INTERNE' : agent sans numéro Moov Money fiable — comportement historique, aucun
// transfert réel (écriture comptable interne uniquement). 'MOOV' : virement Moov
// Money réel, déclenché à la validation Super Admin (jamais à la création).
export type PaiementAgentProvider = 'MOOV' | 'INTERNE';

export interface PaiementAgent {
  readonly idPaiementAgent: string;
  idAgent: string;
  montant: number;
  datePaiement: string; // ISO date
  status: PaiementAgentStatus;
  provider: PaiementAgentProvider;
  // Clé d'idempotence générée à la création (avant tout appel Moov) — absente pour un
  // paiement antérieur au chantier M2.
  reference?: string;
  // Motif d'échec ou d'incertitude (Moov) — absent pour un paiement interne ou réussi.
  failureReason?: string;
  // Motif de rejet, saisi par le validateur — présent uniquement pour status='REJETE'.
  // Distinct de failureReason (échec technique d'un virement tenté) : ceci reflète une
  // décision prise AVANT tout appel Moov.
  rejectionReason?: string;
  // Uniquement présent dans la réponse de création (POST) — jamais relu depuis
  // l'historique. Message explicite selon le provider (demande produit : jamais
  // silencieux sur "interne" vs "Moov réel").
  libelle?: string;
}
