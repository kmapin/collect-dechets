import { ClientStatut } from './enums';


export interface Client {
  readonly idClient: string;
  nom: string;
  prenom: string;
  quartier?: string;
  telephone?: string;
  statut: ClientStatut;
  dateCreation?: string;
}
