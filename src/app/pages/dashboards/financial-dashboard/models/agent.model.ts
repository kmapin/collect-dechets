// Table 26 — Agent (collecteur terrain), utilisé par F5 (paiement agent).
export interface Agent {
  readonly idAgent: string;
  nom: string;
  prenom?: string;
  telephone?: string;
}
