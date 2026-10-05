import { Client } from './client.model';
import { FactureStatut } from './enums';
import { Periode } from './periode.model';


export interface Facture {
  readonly idFacture: string;
  idClient: string;
  // Un client peut avoir plusieurs contrats actifs simultanément (un par lieu de service) —
  // sert à relier une ligne de facture au bon contrat (lien "Paiement manuel" vers la page
  // Redevances, voir billing-tab.component.ts). Optionnel : seul GET /finance/factures/*
  // (services/redevance.js::_mapRedevanceToFacture) le renseigne pour l'instant — absent
  // pour une Facture construite ailleurs (ex : getSuiviMensuelAgence, "Suivi mensuel").
  contratId?: string | null;
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
