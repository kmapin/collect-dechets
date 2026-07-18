import { Observable } from 'rxjs';
import { Facture, FactureStatut, LigneReleve, Page, PageParams, Periode, SuiviAbonneMensuel } from '../../models';

export interface FactureFilter {
  idClient?: string;
  statut?: FactureStatut;
}

export interface SuiviMensuelFilter {
  impayeesSeulement?: boolean;
}

// Situation de paiement "à date" d'un client (F6 — badge de retard dans la liste
// clients), indépendante d'une période précise contrairement à SuiviAbonneMensuel (F12).
export interface SituationPaiementClient {
  idClient: string;
  moisRetard: number; // RG4 — cumulé jusqu'à la dernière facture générée, 0 si à jour
}

// Couvre F6 (situation paiement clients), F8 (factures d'un client), F9 (génération —
// simulation uniquement), F10 (relevé) et F12 (suivi mensuel abonnés).
export abstract class FactureDataService {
  abstract getFactures(params?: PageParams<FactureFilter>): Observable<Page<Facture>>;
  abstract getFacturesClient(idClient: string): Observable<Facture[]>;
  abstract getSituationClients(): Observable<SituationPaiementClient[]>;
  abstract getSuiviMensuel(periode: Periode, params?: PageParams<SuiviMensuelFilter>): Observable<Page<SuiviAbonneMensuel>>;
  abstract getReleve(idClient: string, plage?: { debut?: Periode; fin?: Periode }): Observable<LigneReleve[]>;
  /** F9 — déclenchement manuel de simulation ; aucun moteur de planification réel au MVP. */
  abstract genererFacturesDuMois(periode: Periode): Observable<{ genere: number }>;
}
