import { ClientStatut } from './enums';

// Table 20 — Client. Champs obligatoires selon la spec (§1.9) : nom, prenom, statut (RG6).
// quartier/telephone sont facultatifs — non confirmés obligatoires côté métier.
export interface Client {
  readonly idClient: string;
  nom: string;
  prenom: string;
  quartier?: string;
  telephone?: string;
  statut: ClientStatut;
  dateCreation?: string; // ISO date — optionnel, TBC
}
