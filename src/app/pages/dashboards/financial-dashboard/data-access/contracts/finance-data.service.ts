import { Observable } from 'rxjs';
import { DashboardKpi, Page, PageParams, Paiement, Periode, Retrait } from '../../models';

export interface PaiementFilter {
  idClient?: string;
  search?: string;
}

export interface RetraitFilter {
  search?: string;
}

export interface MontantTotalFilter {
  zone?: string;
  idClient?: string;
  planType?: string;
}

export type OperateurRetrait = 'MOOV_MONEY' | 'ORANGE_MONEY';

export type FeeOptionRetrait = 'A' | 'B';

export interface FinanceStatsSeries {
  labels: string[];
  totalCollecte: number[];
  revenusNets: number[];
  facturesPayees: number[];
  facturesImpayees: number[];
}

export interface RepartitionModePaiement {
  mode: string;
  montant: number;
}

export interface PaiementListe extends Paiement {
  clientNom: string;
}

// Couvre F1 (KPI), F2 (stats + répartition par mode), F3 (paiements), F4 (retraits).
export abstract class FinanceDataService {
  abstract getDashboardKpi(periode?: Periode, filters?: MontantTotalFilter): Observable<DashboardKpi>;
  abstract getStats(plage: { debut: Periode; fin: Periode }, filters?: MontantTotalFilter): Observable<FinanceStatsSeries>;
  abstract getRepartitionModePaiement(plage: { debut: Periode; fin: Periode }): Observable<RepartitionModePaiement[]>;
  abstract getPaiements(params?: PageParams<PaiementFilter>): Observable<Page<PaiementListe>>;
  abstract getRetraits(params?: PageParams<RetraitFilter>): Observable<Page<Retrait>>;
  abstract enregistrerRetrait(payload: { montant: number; customerMsisdn: string; operator: OperateurRetrait; motif?: string; feeOption: FeeOptionRetrait }): Observable<Retrait>;
}
