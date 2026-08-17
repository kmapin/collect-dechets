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
export type SourceEligibilite = 'CONTRACT' | 'SUBSCRIPTION' | 'NONE';

export interface SituationPaiementClient {
  idClient: string;
  moisRetard: number; // RG4 — cumulé jusqu'à la dernière facture générée
  // Source unique de vérité : EligibilityService.checkClientEligibility (abonnement actif
  // OU contrat actif). Prime toujours sur moisRetard pour le badge "à jour" — un contrat
  // actif reste éligible même en retard de paiement (voir eligibility.service.js backend).
  aJour: boolean;
  // Précise CE QUI rend le client "à jour" (Abonnement vs Contrat), plutôt qu'un badge
  // générique — 'NONE' si aJour est false.
  source: SourceEligibilite;
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
