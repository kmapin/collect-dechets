// Table 24 — Paiement. RG3 : un paiement peut solder une facture ; idFacture reste optionnel
// car la réconciliation paiement↔facture n'est pas figée (spec §1.12).
export interface Paiement {
  readonly idPaiement: string;
  idFacture?: string; // absent si non rapproché à une facture — TBC (réconciliation, §1.12)
  idClient: string;
  montant: number;
  datePaiement: string; // ISO date
  // Libellé de l'opérateur exact ("Orange Money"/"Moov Money"/"Telecel Money"/"QR Pay") —
  // plus le bucket générique ModePaiement (Especes/MobileMoney/Autre), qui masquait
  // l'opérateur réellement utilisé (voir mapPaiementListeDto).
  modePaiement?: string;
}
