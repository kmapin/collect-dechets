// Table 21 — Abonnement. Relation 1–1 avec Client (RG2 : montant de facture = montantMensuel).
export interface Abonnement {
  readonly idAbonnement: string;
  idClient: string;
  montantMensuel: number; // devise centralisée dans utils/money.util.ts (Prompt 7) — pas de formatage ici
  dateDebut?: string; // ISO date — optionnel, TBC
  frequence: 'Mensuelle'; // seule fréquence prévue au MVP (spec §1.7)
}
