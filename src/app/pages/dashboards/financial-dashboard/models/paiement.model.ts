import { ModePaiement } from './enums';

// Table 24 — Paiement. RG3 : un paiement peut solder une facture ; idFacture reste optionnel
// car la réconciliation paiement↔facture n'est pas figée (spec §1.12).
export interface Paiement {
  readonly idPaiement: string;
  idFacture?: string; // absent si non rapproché à une facture — TBC (réconciliation, §1.12)
  idClient: string;
  montant: number;
  datePaiement: string; // ISO date
  modePaiement?: ModePaiement; // optionnel — TBC (modes de paiement, §1.12)
}
