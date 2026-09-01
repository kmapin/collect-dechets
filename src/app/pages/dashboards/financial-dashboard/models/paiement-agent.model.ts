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

// 'INTERNE' : agent sans numéro Moov/Orange Money fiable — comportement historique,
// aucun transfert réel (écriture comptable interne uniquement). 'MOOV'/'ORANGE_MONEY' :
// virement réel, déclenché à la validation Super Admin (jamais à la création). Orange
// Money essayé EN PREMIER par le backend (services/paiementAgent.js::
// _resolveProviderPourAgent) — activé après migration de l'ancienne API OM (XML/mTLS)
// vers apiOM.js (REST/OAuth2, CashOut).
export type PaiementAgentProvider = 'MOOV' | 'ORANGE_MONEY' | 'INTERNE';

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

// Sous-ensemble commun à PaiementAgent (liste) et PaiementAgentDetail (détail
// enrichi, voir plus bas) — suffisant pour les actions génériques (reçu,
// vérification de statut) déclenchables aussi bien depuis une ligne de
// l'historique que depuis le drawer de détail déjà chargé. Les champs optionnels
// acceptent `string | null` (pas seulement `undefined`) : PaiementAgentDetail
// (DTO backend) envoie explicitement `null`, jamais `undefined`.
export interface PaiementAgentActionable {
  readonly idPaiementAgent: string;
  idAgent: string;
  montant: number;
  datePaiement: string; // ISO
  status: PaiementAgentStatus;
  provider: PaiementAgentProvider;
  reference?: string | null;
  failureReason?: string | null;
  rejectionReason?: string | null;
}

// DTO enrichi de GET /finance/agents/paiements/:id (services/paiementAgent.js::
// toDetailDto) — écran de détail + action "vérifier le statut" (simple re-fetch,
// voir le composant). Distinct de PaiementAgent (liste) : celui-ci résout les noms
// (agent/initiateur/validateur) côté backend plutôt que de les faire deviner au
// frontend, et expose les champs d'audit (dates, provider, référence opérateur).
export interface PaiementAgentDetail {
  readonly idPaiementAgent: string;
  idAgent: string;
  // null si l'agent a été désactivé/supprimé depuis (jamais un plantage) — voir
  // toDetailDto, backend.
  agentNom: string | null;
  montant: number;
  datePaiement: string; // ISO
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
  initiatedAt: string | null; // ISO
  completedAt: string | null; // ISO
  createdAt: string; // ISO
  updatedAt: string; // ISO
}
