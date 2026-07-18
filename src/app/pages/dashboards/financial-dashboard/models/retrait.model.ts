// Table 25 — Retrait. RG7 (TBC) : solde disponible = paiements − retraits.
export interface Retrait {
  readonly idRetrait: string;
  montant: number;
  dateRetrait: string; // ISO date
  motif?: string;
}
