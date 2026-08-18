import { Observable } from 'rxjs';
import { DashboardKpi, Page, PageParams, Paiement, Periode, Retrait } from '../../models';

export interface PaiementFilter {
  idClient?: string;
  search?: string;
}

export interface RetraitFilter {
  search?: string;
}

// Filtres additifs (chantier Finance/Paiements, item 6 : "Montant total des paiements")
// sur getDashboardKpi()/getStats() — appliqués uniquement à totalCollecte/revenusNets
// (soldeDisponible/enAttente restent des soldes de portefeuille, non décomposables par
// client/zone/tarif). `zone` = quartier en texte libre (Redevance n'a pas de champ zone
// propre, jointure via le client — même convention que partout ailleurs dans l'app).
export interface MontantTotalFilter {
  zone?: string;
  idClient?: string;
  planType?: string;
}

// Restreint à ce que le backend accepte réellement pour un retrait (services/transaction.js::
// sendUserMoney) : 'TELECEL_MONEY' existe comme opérateur ailleurs dans l'app (vérification
// de numéro), mais est explicitement rejeté ici — pas encore disponible pour les retraits.
export type OperateurRetrait = 'MOOV_MONEY' | 'ORANGE_MONEY';

// Chantier Frais plateforme (Prompt F5/F8) — choisi par l'agence À CHAQUE demande
// (jamais un réglage permanent) : 'A' = frais déduits du montant reçu, 'B' = agence
// les prend en plus du débit de son wallet. Obligatoire depuis le Prompt F5.
export type FeeOptionRetrait = 'A' | 'B';

// Série agrégée pour les graphiques F2 — pas un modèle de domaine (Table 20-27),
// donc définie ici plutôt que dans finance/models (voir Prompt 3 vs Prompt 4/8).
export interface FinanceStatsSeries {
  labels: string[];
  totalCollecte: number[];
  revenusNets: number[];
  facturesPayees: number[];
  facturesImpayees: number[];
}

// `mode` est le libellé du moyen de paiement RÉEL (opérateur exact — "Orange Money",
// "Moov Money", "Telecel Money", "QR Pay" — voir mapRepartitionModePaiementDto), pas le
// bucket générique ModePaiement.MOBILE_MONEY utilisé ailleurs pour un paiement individuel
// (Paiement.modePaiement) : demande produit explicite de distinguer les opérateurs ici.
export interface RepartitionModePaiement {
  mode: string;
  montant: number;
}

// Ligne d'historique F3 : le paiement enrichi du nom client affichable — évite que
// l'écran Paiements refasse lui-même la jointure client (déjà faite côté backend,
// comme pour SuiviAbonneMensuel/LigneReleve — voir facture-data.service.ts).
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
