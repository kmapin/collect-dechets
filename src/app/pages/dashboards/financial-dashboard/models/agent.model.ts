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
  // Ajouté avec l'activation d'Orange Money pour PaiementAgent (services/paiementAgent.js::
  // _resolveProviderPourAgent, essayé EN PREMIER par le backend, avant Moov) — même
  // principe que moovEligible, jamais les deux vrais en même temps pour un agent donné
  // aujourd'hui (aucun chevauchement des préfixes Orange/Moov). Un agent ni orangeEligible
  // ni moovEligible reste payé en interne (immédiat), comme avant.
  orangeEligible: boolean;
}
