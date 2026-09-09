import { Observable } from 'rxjs';
import { Facture, FactureStatut, LigneReleve, Page, PageParams, Periode, SuiviAbonneMensuel } from '../../models';

export interface FactureFilter {
  idClient?: string;
  statut?: FactureStatut;
}

export interface SuiviMensuelFilter {
  impayeesSeulement?: boolean;
}

export type SourceEligibilite = 'CONTRACT' | 'SUBSCRIPTION' | 'NONE';

export interface SituationPaiementClient {
  idClient: string;
  moisRetard: number; // RG4 — cumulé jusqu'à la dernière facture générée
  aJour: boolean;
  source: SourceEligibilite;
}

export abstract class FactureDataService {
  abstract getFactures(params?: PageParams<FactureFilter>): Observable<Page<Facture>>;
  abstract getFacturesClient(idClient: string): Observable<Facture[]>;
  abstract getSituationClients(): Observable<SituationPaiementClient[]>;
  abstract getSuiviMensuel(periode: Periode, params?: PageParams<SuiviMensuelFilter>): Observable<Page<SuiviAbonneMensuel>>;
  abstract getReleve(idClient: string, plage?: { debut?: Periode; fin?: Periode }): Observable<LigneReleve[]>;
  /** F9 — déclenchement manuel de simulation ; aucun moteur de planification réel au MVP. */
  abstract genererFacturesDuMois(periode: Periode): Observable<{ genere: number }>;
}
