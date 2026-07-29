import { Observable } from 'rxjs';
import { DashboardKpi, ModePaiement, Page, PageParams, Paiement, Periode, Retrait } from '../../models';

export interface PaiementFilter {
  idClient?: string;
  search?: string;
}

export interface RetraitFilter {
  search?: string;
}

// Restreint à ce que le backend accepte réellement pour un retrait (services/transaction.js::
// sendUserMoney) : 'TELECEL_MONEY' existe comme opérateur ailleurs dans l'app (vérification
// de numéro), mais est explicitement rejeté ici — pas encore disponible pour les retraits.
export type OperateurRetrait = 'MOOV_MONEY' | 'ORANGE_MONEY';

// Série agrégée pour les graphiques F2 — pas un modèle de domaine (Table 20-27),
// donc définie ici plutôt que dans finance/models (voir Prompt 3 vs Prompt 4/8).
export interface FinanceStatsSeries {
  labels: string[];
  totalCollecte: number[];
  revenusNets: number[];
  facturesPayees: number[];
  facturesImpayees: number[];
}

export interface RepartitionModePaiement {
  mode: ModePaiement;
  montant: number;
}

// Ligne d'historique F3 : le paiement enrichi du nom client affichable — évite que
// l'écran payments-history refasse lui-même la jointure client (déjà faite côté mock,
// comme pour SuiviAbonneMensuel/LigneReleve — voir facture-data.service.ts).
export interface PaiementListe extends Paiement {
  clientNom: string;
}

// Couvre F1 (KPI), F2 (stats + répartition par mode), F3 (paiements), F4 (retraits).
export abstract class FinanceDataService {
  abstract getDashboardKpi(periode?: Periode): Observable<DashboardKpi>;
  abstract getStats(plage: { debut: Periode; fin: Periode }): Observable<FinanceStatsSeries>;
  abstract getRepartitionModePaiement(plage: { debut: Periode; fin: Periode }): Observable<RepartitionModePaiement[]>;
  abstract getPaiements(params?: PageParams<PaiementFilter>): Observable<Page<PaiementListe>>;
  abstract getRetraits(params?: PageParams<RetraitFilter>): Observable<Page<Retrait>>;
  abstract enregistrerRetrait(payload: { montant: number; customerMsisdn: string; operator: OperateurRetrait; motif?: string }): Observable<Retrait>;
}
