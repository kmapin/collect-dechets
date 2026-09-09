import { Client } from './client.model';
import { FactureStatut } from './enums';
import { Periode } from './periode.model';


export interface Facture {
  readonly idFacture: string;
  idClient: string;
  periode: Periode;
  montant: number;
  statut: FactureStatut;
  dateGeneration: string;  
  datePaiement?: string; 
  periodeDebut?: string; 
  periodeFin?: string; 
}


export interface SuiviAbonneMensuel {
  client: Pick<Client, 'idClient' | 'nom' | 'prenom' | 'quartier'>;
  facture: Facture | null; 
  statut: FactureStatut | 'NonGeneree';
  moisRetard: number;
}


export interface LigneReleve {
  factureLe: string; 
  payeLe?: string;
  statut: FactureStatut;
  montant: number;
  periodeDebut?: string; 
  periodeFin?: string; 
}
