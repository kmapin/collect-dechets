// Table 26 — Agent (collecteur terrain), utilisé par F5 (paiement agent).
export interface Agent {
  readonly idAgent: string;
  nom: string;
  prenom?: string;
  telephone?: string;
  // Chantier M2 (paiement réel Moov Money) : true si `telephone` correspond à un
  // préfixe Moov Money reconnu (même vérification que services/transaction.js::
  // verifyOperatorMsisdn, backend — jamais recalculé côté frontend). Détermine si un
  // paiement pour cet agent sera un virement Moov réel ou un paiement interne —
  // affiché AVANT toute soumission (demande produit explicite).
  moovEligible: boolean;
}
