import { Client } from './client.model';
import { FactureStatut } from './enums';
import { Periode } from './periode.model';

// Table 22 — Facture. RG1 : une facture par client actif par mois. RG2 : montant = montantMensuel
// de l'abonnement. RG3 : passe à "Payée" quand un paiement correspondant est enregistré ;
// datePaiement = date de règlement.
export interface Facture {
  readonly idFacture: string;
  idClient: string;
  periode: Periode;
  montant: number;
  statut: FactureStatut;
  dateGeneration: string; // ISO date — émission, distincte de la période couverte
  datePaiement?: string; // ISO date — règlement, absent tant que la facture est Impayée
  periodeDebut?: string; // ISO date
  periodeFin?: string; // ISO date
}

// ── Vue F12 : ligne de suivi mensuel des abonnés ──────────────────────
// RG4 : retard = nombre de factures mensuelles impayées cumulées pour le client.
export interface SuiviAbonneMensuel {
  client: Pick<Client, 'idClient' | 'nom' | 'prenom' | 'quartier'>;
  facture: Facture | null; // null si aucune facture générée pour la période (état vide)
  statut: FactureStatut | 'NonGeneree';
  moisRetard: number; // RG4 — cumulé, 0 si à jour
}

// ── Vue F10 : ligne de relevé de paiement ─────────────────────────────
// RG9 : facturé le / payé le / statut / montant. periodeDebut/periodeFin additifs
// (chantier "dates début/fin des exports") — Redevance.dateEcheance/frequenceCollecte
// pour une ligne Facture, Subscription.startDate/endDate pour une ligne Abonnement.
export interface LigneReleve {
  factureLe: string; // = Facture.dateGeneration
  payeLe?: string; // = Facture.datePaiement, absent si impayée
  statut: FactureStatut;
  montant: number;
  periodeDebut?: string; // ISO date
  periodeFin?: string; // ISO date
}
