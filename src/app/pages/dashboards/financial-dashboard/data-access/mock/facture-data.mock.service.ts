import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Client, Facture, FactureStatut, LigneReleve, Page, PageParams, Periode, SuiviAbonneMensuel } from '../../models';
import {
  FactureDataService,
  FactureFilter,
  SituationPaiementClient,
  SuiviMensuelFilter,
} from '../contracts/facture-data.service';
import { CLIENTS } from './data/clients.data';
import { FACTURES } from './data/factures.data';
import { addMois, periodeKey } from './data/seed.util';
import { MockConfigService } from './mock-config.service';
import { paginateMock, simulateResponse } from './simulate.util';

const FEATURE = 'factures';

const CLIENT_PAR_ID = new Map(CLIENTS.map(c => [c.idClient, c]));

function libelleClient(idClient: string): Pick<Client, 'idClient' | 'nom' | 'prenom' | 'quartier'> {
  const client = CLIENT_PAR_ID.get(idClient);
  return client
    ? { idClient: client.idClient, nom: client.nom, prenom: client.prenom, quartier: client.quartier }
    : { idClient, nom: '—', prenom: '—' };
}

// Index client → (période → facture), pour compter le retard cumulé (RG4) en remontant
// mois par mois tant que la facture existe et est impayée.
const FACTURES_PAR_CLIENT = new Map<string, Map<string, Facture>>();
for (const facture of FACTURES) {
  if (!FACTURES_PAR_CLIENT.has(facture.idClient)) FACTURES_PAR_CLIENT.set(facture.idClient, new Map());
  FACTURES_PAR_CLIENT.get(facture.idClient)!.set(periodeKey(facture.periode), facture);
}

function calculerMoisRetard(idClient: string, periode: Periode): number {
  const facturesDuClient = FACTURES_PAR_CLIENT.get(idClient);
  if (!facturesDuClient) return 0;
  let compte = 0;
  let curseur = periode;
  for (;;) {
    const facture = facturesDuClient.get(periodeKey(curseur));
    if (!facture || facture.statut !== FactureStatut.IMPAYEE) break;
    compte += 1;
    curseur = addMois(curseur, -1);
  }
  return compte;
}

@Injectable()
export class FactureDataMockService implements FactureDataService {
  constructor(private readonly mockConfig: MockConfigService) {}

  getFactures(params?: PageParams<FactureFilter>): Observable<Page<Facture>> {
    const filtered = FACTURES.filter(f => {
      if (params?.filter?.idClient && f.idClient !== params.filter.idClient) return false;
      if (params?.filter?.statut && f.statut !== params.filter.statut) return false;
      return true;
    });
    const paged = paginateMock(filtered, params);
    return simulateResponse(FEATURE, this.mockConfig, paged, { ...paged, items: [] });
  }

  getFacturesClient(idClient: string): Observable<Facture[]> {
    const items = FACTURES.filter(f => f.idClient === idClient);
    return simulateResponse(`${FEATURE}:client`, this.mockConfig, items, []);
  }

  getSituationClients(): Observable<SituationPaiementClient[]> {
    // Retard "à date" = retard cumulé jusqu'à la dernière facture générée du client
    // (pas jusqu'à une période choisie, contrairement à getSuiviMensuel).
    const dernierePeriodeParClient = new Map<string, Periode>();
    for (const facture of FACTURES) {
      const actuelle = dernierePeriodeParClient.get(facture.idClient);
      if (!actuelle || periodeKey(facture.periode) > periodeKey(actuelle)) {
        dernierePeriodeParClient.set(facture.idClient, facture.periode);
      }
    }

    const situations: SituationPaiementClient[] = CLIENTS.map(client => {
      const derniere = dernierePeriodeParClient.get(client.idClient);
      return {
        idClient: client.idClient,
        moisRetard: derniere ? calculerMoisRetard(client.idClient, derniere) : 0,
      };
    });
    return simulateResponse(`${FEATURE}:situation-clients`, this.mockConfig, situations, []);
  }

  getSuiviMensuel(periode: Periode, params?: PageParams<SuiviMensuelFilter>): Observable<Page<SuiviAbonneMensuel>> {
    // Un mois sans facture (ex. PERIODE_VIDE, voir data/scenarios.ts) retombe naturellement
    // sur une liste vide — pas de cas particulier nécessaire ici (état vide F12).
    const rows: SuiviAbonneMensuel[] = FACTURES
      .filter(f => f.periode.mois === periode.mois && f.periode.annee === periode.annee)
      .map(f => ({
        client: libelleClient(f.idClient),
        facture: f,
        statut: f.statut,
        moisRetard: calculerMoisRetard(f.idClient, f.periode),
      }));
    const filtered = params?.filter?.impayeesSeulement
      ? rows.filter(r => r.statut === FactureStatut.IMPAYEE)
      : rows;
    const paged = paginateMock(filtered, params);
    return simulateResponse(`${FEATURE}:suivi-mensuel`, this.mockConfig, paged, { ...paged, items: [] });
  }

  getReleve(idClient: string, plage?: { debut?: Periode; fin?: Periode }): Observable<LigneReleve[]> {
    const debutKey = plage?.debut ? periodeKey(plage.debut) : null;
    const finKey = plage?.fin ? periodeKey(plage.fin) : null;

    const lignes: LigneReleve[] = FACTURES
      .filter(f => {
        if (f.idClient !== idClient) return false;
        const cle = periodeKey(f.periode);
        if (debutKey && cle < debutKey) return false;
        if (finKey && cle > finKey) return false;
        return true;
      })
      .sort((a, b) => (a.dateGeneration < b.dateGeneration ? -1 : 1))
      .map(f => ({ factureLe: f.dateGeneration, payeLe: f.datePaiement, montant: f.montant }));
    return simulateResponse(`${FEATURE}:releve`, this.mockConfig, lignes, []);
  }

  genererFacturesDuMois(_periode: Periode): Observable<{ genere: number }> {
    // F9 — simulation manuelle uniquement ; aucun moteur de planification réel au MVP.
    return simulateResponse(`${FEATURE}:generation`, this.mockConfig, { genere: 0 });
  }
}
