import { ClientStatut, Facture, FactureStatut, Periode } from '../../../models';
import { ABONNEMENTS } from './abonnements.data';
import { CLIENT_SANS_HISTORIQUE_ID, CLIENTS } from './clients.data';
import {
  addJours,
  addMois,
  buildPeriodesGlissantes,
  DERNIERE_PERIODE,
  isoDatePremierJour,
  NOMBRE_MOIS_HISTORIQUE,
  periodeKey,
} from './seed.util';

// Fenêtre d'historique glissante (RG1/RG2 : une facture par client actif par mois,
// montant = abonnement.montantMensuel), chronologique, la plus récente en dernier.
export const PERIODES: Periode[] = buildPeriodesGlissantes(NOMBRE_MOIS_HISTORIQUE, DERNIERE_PERIODE);

// Mois suivant la fenêtre : jamais de facture générée — état vide F12 démontrable
// ("Aucune facture générée pour cette période").
export const PERIODE_VIDE: Periode = addMois(DERNIERE_PERIODE, 1);

function parsePeriode(dateIso: string): Periode {
  const [annee, mois] = dateIso.split('-').map(Number);
  return { annee, mois };
}

// Répartition RG4 (retard = nb de factures mensuelles impayées cumulées) parmi les
// clients actifs : ~60% à jour, ~20% à 1 mois, ~10% à 2 mois, ~10% à 3 mois.
function nombreFacturesImpayeesRecentes(index: number): number {
  const reste = index % 10;
  if (reste <= 5) return 0;
  if (reste <= 7) return 1;
  if (reste === 8) return 2;
  return 3;
}

const ABONNEMENT_PAR_CLIENT = new Map(ABONNEMENTS.map(a => [a.idClient, a]));

export const FACTURES: Facture[] = [];
let compteurPaiements = 0;

CLIENTS.forEach((client, index) => {
  // Scénario "client sans historique" (spec §5) — aucune facture générée pour lui.
  if (client.idClient === CLIENT_SANS_HISTORIQUE_ID) return;

  const abonnement = ABONNEMENT_PAR_CLIENT.get(client.idClient);
  if (!abonnement) return;

  const debutKey = periodeKey(
    parsePeriode(abonnement.dateDebut ?? client.dateCreation ?? isoDatePremierJour(PERIODES[0])),
  );

  let finPeriode: Periode;
  let nombreImpayeesEnFinDePeriode: number;

  if (client.statut === ClientStatut.ACTIF) {
    finPeriode = DERNIERE_PERIODE;
    nombreImpayeesEnFinDePeriode = nombreFacturesImpayeesRecentes(index);
  } else {
    // Client inactif : a cessé de recevoir des factures il y a 2 à 5 mois (RG1, RG6).
    const moisEcoulesDepuisChurn = 2 + (index % 4);
    finPeriode = addMois(DERNIERE_PERIODE, -moisEcoulesDepuisChurn);
    // La moitié est partie "à jour" (churn volontaire), l'autre en défaut de paiement.
    nombreImpayeesEnFinDePeriode = index % 2 === 0 ? 0 : 1 + (index % 2);
  }

  const finKey = periodeKey(finPeriode);
  const periodesDuClient = PERIODES.filter(p => periodeKey(p) >= debutKey && periodeKey(p) <= finKey);

  periodesDuClient.forEach((periode, position) => {
    const positionDepuisLaFin = periodesDuClient.length - 1 - position;
    const estImpayee = positionDepuisLaFin < nombreImpayeesEnFinDePeriode;
    const dateGeneration = isoDatePremierJour(periode);
    compteurPaiements += 1;

    FACTURES.push({
      idFacture: `fac-${periodeKey(periode)}-${client.idClient}`,
      idClient: client.idClient,
      periode,
      montant: abonnement.montantMensuel,
      statut: estImpayee ? FactureStatut.IMPAYEE : FactureStatut.PAYEE,
      dateGeneration,
      datePaiement: estImpayee ? undefined : addJours(dateGeneration, 3 + (compteurPaiements % 6)),
    });
  });
});
