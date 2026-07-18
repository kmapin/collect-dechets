// Table 27 — Paiement_Agent. RG10 (TBC) : impact sur le solde/les retraits non défini au MVP.
export interface PaiementAgent {
  readonly idPaiementAgent: string;
  idAgent: string;
  montant: number;
  datePaiement: string; // ISO date
}
