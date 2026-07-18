import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DashboardKpi, FactureStatut, ModePaiement, Page, PageParams, Paiement, Periode, Retrait } from '../../models';
import {
  FinanceDataService,
  FinanceStatsSeries,
  PaiementFilter,
  PaiementListe,
  RepartitionModePaiement,
  RetraitFilter,
} from '../contracts/finance-data.service';
import { CLIENTS } from './data/clients.data';
import { FACTURES } from './data/factures.data';
import { PAIEMENTS } from './data/paiements.data';
import { RETRAITS } from './data/retraits.data';
import { labelPeriode, periodeKey } from './data/seed.util';
import { MockConfigService } from './mock-config.service';
import { paginateMock, simulateResponse } from './simulate.util';

const FEATURE_DASHBOARD = 'dashboard';
const FEATURE_PAIEMENTS = 'paiements';
const FEATURE_RETRAITS = 'retraits';

// Jointure idFacture → periode, utilisée pour agréger les paiements par mois (getStats).
const PERIODE_PAR_FACTURE = new Map(FACTURES.map(f => [f.idFacture, f.periode]));

// Jointure idClient → "Nom Prénom" affichable (F3 — historique des paiements).
const NOM_PAR_CLIENT = new Map(CLIENTS.map(c => [c.idClient, `${c.nom} ${c.prenom}`]));

@Injectable()
export class FinanceDataMockService implements FinanceDataService {
  private paiements: Paiement[] = PAIEMENTS;
  private retraits: Retrait[] = RETRAITS;

  constructor(private readonly mockConfig: MockConfigService) {}

  getDashboardKpi(periode?: Periode): Observable<DashboardKpi> {
    // soldeDisponible et enAttente sont des soldes "instantanés" (RG7/RG5) : jamais
    // filtrés par période, contrairement à totalCollecte/revenusNets qui sont des flux
    // sur la fenêtre choisie par le sélecteur de période (Prompt 7).
    const totalCollecteGlobal = this.paiements.reduce((sum, p) => sum + p.montant, 0);
    const totalRetraits = this.retraits.reduce((sum, r) => sum + r.montant, 0);
    const enAttente = FACTURES
      .filter(f => f.statut === FactureStatut.IMPAYEE)
      .reduce((sum, f) => sum + f.montant, 0); // RG5 : somme due par les clients en retard

    const totalCollectePeriode = periode
      ? this.paiements
          .filter(p => {
            const periodePaiement = p.idFacture ? PERIODE_PAR_FACTURE.get(p.idFacture) : undefined;
            return periodePaiement?.mois === periode.mois && periodePaiement?.annee === periode.annee;
          })
          .reduce((sum, p) => sum + p.montant, 0)
      : totalCollecteGlobal;

    const kpi: DashboardKpi = {
      soldeDisponible: totalCollecteGlobal - totalRetraits, // RG7 — TBC, voir DISCOVERY.md §7
      totalCollecte: totalCollectePeriode,
      revenusNets: totalCollectePeriode, // pas de notion de commission dans ce module — TBC
      enAttente,
      devise: 'XOF',
      misAJourLe: new Date().toISOString(),
    };
    const kpiVide: DashboardKpi = { ...kpi, totalCollecte: 0, revenusNets: 0, enAttente: 0, soldeDisponible: 0 };
    return simulateResponse(FEATURE_DASHBOARD, this.mockConfig, kpi, kpiVide);
  }

  getStats(plage: { debut: Periode; fin: Periode }): Observable<FinanceStatsSeries> {
    const debutKey = periodeKey(plage.debut);
    const finKey = periodeKey(plage.fin);
    const dansLaPlage = (cle: string) => cle >= debutKey && cle <= finKey;

    const totalParPeriode = new Map<string, number>();
    for (const paiement of this.paiements) {
      const periode = paiement.idFacture ? PERIODE_PAR_FACTURE.get(paiement.idFacture) : undefined;
      if (!periode) continue;
      const cle = periodeKey(periode);
      if (!dansLaPlage(cle)) continue;
      totalParPeriode.set(cle, (totalParPeriode.get(cle) ?? 0) + paiement.montant);
    }

    const payeesParPeriode = new Map<string, number>();
    const impayeesParPeriode = new Map<string, number>();
    for (const facture of FACTURES) {
      const cle = periodeKey(facture.periode);
      if (!dansLaPlage(cle)) continue;
      const cible = facture.statut === FactureStatut.PAYEE ? payeesParPeriode : impayeesParPeriode;
      cible.set(cle, (cible.get(cle) ?? 0) + 1);
    }

    const clesTriees = [...new Set([...totalParPeriode.keys(), ...payeesParPeriode.keys(), ...impayeesParPeriode.keys()])].sort();
    const series: FinanceStatsSeries = {
      labels: clesTriees.map(cle => labelPeriode(this._parsePeriode(cle))),
      totalCollecte: clesTriees.map(cle => totalParPeriode.get(cle) ?? 0),
      revenusNets: clesTriees.map(cle => totalParPeriode.get(cle) ?? 0), // pas de commission — TBC
      facturesPayees: clesTriees.map(cle => payeesParPeriode.get(cle) ?? 0),
      facturesImpayees: clesTriees.map(cle => impayeesParPeriode.get(cle) ?? 0),
    };
    return simulateResponse(`${FEATURE_DASHBOARD}:stats`, this.mockConfig, series);
  }

  getRepartitionModePaiement(plage: { debut: Periode; fin: Periode }): Observable<RepartitionModePaiement[]> {
    const debutKey = periodeKey(plage.debut);
    const finKey = periodeKey(plage.fin);

    const montantParMode = new Map<ModePaiement, number>();
    for (const paiement of this.paiements) {
      const periode = paiement.idFacture ? PERIODE_PAR_FACTURE.get(paiement.idFacture) : undefined;
      if (!periode) continue;
      const cle = periodeKey(periode);
      if (cle < debutKey || cle > finKey) continue;
      const mode = paiement.modePaiement ?? ModePaiement.AUTRE;
      montantParMode.set(mode, (montantParMode.get(mode) ?? 0) + paiement.montant);
    }

    const repartition: RepartitionModePaiement[] = [...montantParMode.entries()].map(([mode, montant]) => ({ mode, montant }));
    return simulateResponse(`${FEATURE_DASHBOARD}:repartition-mode`, this.mockConfig, repartition, []);
  }

  getPaiements(params?: PageParams<PaiementFilter>): Observable<Page<PaiementListe>> {
    const enrichis: PaiementListe[] = this.paiements.map(p => ({
      ...p,
      clientNom: NOM_PAR_CLIENT.get(p.idClient) ?? p.idClient,
    }));
    const filtered = enrichis.filter(p => {
      if (params?.filter?.idClient && p.idClient !== params.filter.idClient) return false;
      if (params?.filter?.search) {
        const q = params.filter.search.toLowerCase();
        if (!p.clientNom.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    const paged = paginateMock(filtered, params);
    return simulateResponse(FEATURE_PAIEMENTS, this.mockConfig, paged, { ...paged, items: [] });
  }

  getRetraits(params?: PageParams<RetraitFilter>): Observable<Page<Retrait>> {
    const filtered = this.retraits.filter(r => {
      if (params?.filter?.search && !(r.motif ?? '').toLowerCase().includes(params.filter.search.toLowerCase())) return false;
      if (params?.periode) {
        const [annee, mois] = r.dateRetrait.split('-').map(Number);
        if (mois !== params.periode.mois || annee !== params.periode.annee) return false;
      }
      return true;
    });
    const paged = paginateMock(filtered, params);
    return simulateResponse(FEATURE_RETRAITS, this.mockConfig, paged, { ...paged, items: [] });
  }

  enregistrerRetrait(payload: { montant: number; motif?: string }): Observable<Retrait> {
    const retrait: Retrait = {
      idRetrait: `ret-${Date.now()}`,
      montant: payload.montant,
      dateRetrait: new Date().toISOString(),
      motif: payload.motif,
    };
    this.retraits = [retrait, ...this.retraits];
    return simulateResponse(`${FEATURE_RETRAITS}:create`, this.mockConfig, retrait);
  }

  private _parsePeriode(cle: string): Periode {
    const [annee, mois] = cle.split('-').map(Number);
    return { annee, mois };
  }
}
