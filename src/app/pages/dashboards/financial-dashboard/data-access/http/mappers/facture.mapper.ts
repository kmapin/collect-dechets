import { Facture, LigneReleve, SuiviAbonneMensuel } from '../../../models';
import { FactureStatut } from '../../../models/enums';

// mapFactureDto reste un passe-plat identité : GET /finance/factures et
// GET /finance/factures/client/:idClient n'ont pas de backend à ce jour (F1, écart signalé
// "backend manquant") — deviner leur DTO serait justement ce que ce prompt interdit.
// getFactures/getFacturesClient/getSituationClients/genererFacturesDuMois restent donc en
// mock (FactureDataService entier non basculé au Prompt F5) jusqu'à ce que ces 4 endpoints
// existent côté serveur.
export function mapFactureDto(dto: unknown): Facture {
  return dto as Facture;
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
    montant: Number(d['montant']),
  };
}
