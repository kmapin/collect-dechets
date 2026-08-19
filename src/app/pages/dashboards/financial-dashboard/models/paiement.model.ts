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
  // Chantier Frais plateforme (Prompt F4/F8) — snapshot figé au paiement, jamais
  // recalculé. `undefined` pour un paiement antérieur à ce chantier.
  grossAmount?: number;
  feeType?: 'FIXED' | 'PERCENTAGE';
  feeValue?: number;
  feeAmount?: number;
  feePayer?: 'CLIENT' | 'AGENCE';
  netAmount?: number;
  // platformAmount (gain de la plateforme) volontairement absent : une agence ne
  // doit jamais voir la commission de la plateforme (demande produit explicite),
  // le backend ne le renvoie plus sur cet endpoint agence.
  // Période du contrat/abonnement concerné par ce paiement (demande produit) — ISO date.
  // `undefined` si non résolue côté backend (ne devrait pas arriver pour un paiement
  // complété, mais jamais une date inventée côté frontend).
  dateDebut?: string;
  dateFin?: string;
}
