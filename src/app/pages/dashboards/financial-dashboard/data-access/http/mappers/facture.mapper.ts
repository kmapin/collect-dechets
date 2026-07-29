import { Facture, LigneReleve, SuiviAbonneMensuel } from '../../../models';
import { FactureStatut } from '../../../models/enums';

// DTO réel : GET /finance/factures et GET /finance/factures/client/:idClient
// (services/redevance.js::_mapRedevanceToFacture, backend construit pour matcher ce modèle
// champ-à-champ). `annule` n'est jamais renvoyé par le backend (filtré en amont), donc
// `statut` est bien toujours l'une des deux valeurs binaires attendues ici.
export function mapFactureDto(dto: unknown): Facture {
  const d = dto as Record<string, unknown>;
  return {
    idFacture: String(d['idFacture']),
    idClient: String(d['idClient']),
    periode: d['periode'] as { mois: number; annee: number },
    montant: Number(d['montant']),
    statut: d['statut'] as FactureStatut,
    dateGeneration: String(d['dateGeneration']),
    datePaiement: d['datePaiement'] !== undefined && d['datePaiement'] !== null ? String(d['datePaiement']) : undefined,
  };
}

// DTO réel : GET /finance/factures/suivi-mensuel (services/redevance.js::
// getSuiviMensuelAgence). Champs déjà alignés 1:1 côté serveur (construits pour matcher ce
// modèle pendant le développement backend, Prompt 7) — y compris le statut, déjà simplifié
// en 'Payée'/'Impayée'/'NonGeneree' par le serveur (Redevance.status a 4 valeurs réelles,
// voir décision Prompt F2 : binaire conservé, pas d'enrichissement d'enum).
export function mapSuiviAbonneMensuelDto(dto: unknown): SuiviAbonneMensuel {
  const d = dto as Record<string, unknown>;
  const f = d['facture'] as Record<string, unknown> | null;
  const client = d['client'] as Record<string, unknown>;

  return {
    client: {
      idClient: String(client['idClient']),
      nom: String(client['nom']),
      prenom: String(client['prenom']),
      quartier: client['quartier'] !== undefined && client['quartier'] !== null ? String(client['quartier']) : undefined,
    },
    facture: f ? {
      idFacture: String(f['idFacture']),
      idClient: String(f['idClient']),
      periode: f['periode'] as { mois: number; annee: number },
      montant: Number(f['montant']),
      statut: f['statut'] as FactureStatut,
      dateGeneration: String(f['dateGeneration']),
      datePaiement: f['datePaiement'] !== undefined && f['datePaiement'] !== null ? String(f['datePaiement']) : undefined,
    } : null,
    statut: d['statut'] as FactureStatut | 'NonGeneree',
    moisRetard: Number(d['moisRetard']),
  };
}

// DTO réel : GET /finance/factures/releve/:idClient (services/redevance.js::getReleveClient).
export function mapLigneReleveDto(dto: unknown): LigneReleve {
  const d = dto as Record<string, unknown>;
  return {
    factureLe: String(d['factureLe']),
    payeLe: d['payeLe'] !== undefined && d['payeLe'] !== null ? String(d['payeLe']) : undefined,
    statut: d['statut'] as FactureStatut,
    montant: Number(d['montant']),
  };
}
