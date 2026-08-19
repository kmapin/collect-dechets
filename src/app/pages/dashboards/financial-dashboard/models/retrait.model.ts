// Table 25 — Retrait. RG7 (TBC) : solde disponible = paiements − retraits.
// statut/initiateurNom/traitePar/dateTraitement/motifRejet : ajoutés pour que
// l'agence voie la décision Super Admin sur ses propres demandes (Règle 2 du
// Prompt 0 — même source de vérité) et qui, côté agence, a initié chacune
// (plusieurs gestionnaires peuvent partager la même agence).
export interface Retrait {
  readonly idRetrait: string;
  montant: number;
  dateRetrait: string; // ISO date
  motif?: string;
  statut?: string;
  initiateurNom?: string;
  traitePar?: string;
  dateTraitement?: string; // ISO date
  motifRejet?: string;
  // Chantier Frais plateforme (Prompt F5/F8) — snapshot figé à la demande, jamais
  // recalculé ensuite. `undefined` pour un retrait antérieur à ce chantier —
  // affiché comme "aucun frais historisé", jamais une valeur inventée.
  grossAmount?: number;
  feeType?: 'FIXED' | 'PERCENTAGE';
  feeValue?: number;
  feeAmount?: number;
  feeOption?: 'A' | 'B';
  netAmountReceived?: number;
  walletDebitAmount?: number;
  // platformAmount (gain de la plateforme) volontairement absent : une agence ne
  // doit jamais voir la commission de la plateforme (demande produit explicite),
  // le backend ne le renvoie plus sur cet endpoint agence.
}
