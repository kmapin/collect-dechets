import { Abonnement } from '../../../models';
import { CLIENT_SANS_HISTORIQUE_ID, CLIENTS } from './clients.data';
import { addMois, DERNIERE_PERIODE } from './seed.util';

const TARIF_FLAT = 5000; // XOF — tarif standard (spec §1.12, tarif TBC : flat vs per-client)

// Quelques clients ont un montant dérogatoire pour exercer l'ambiguïté "tarif TBC"
// (spec Mock Data Strategy §5) : index arbitraires dans la liste des clients normaux.
const TARIFS_DEROGATOIRES: Record<string, number> = {
  'cli-003': 3000,
  'cli-011': 7500,
  'cli-024': 10000,
  'cli-035': 4000,
};

// Le mois qui suit la fenêtre d'historique (voir factures.data.ts) — pour le client
// "sans historique", l'abonnement démarre après DERNIERE_PERIODE afin qu'aucune
// facture ne soit générée dans l'historique simulé.
const PERIODE_APRES_HISTORIQUE = addMois(DERNIERE_PERIODE, 1);

export const ABONNEMENTS: Abonnement[] = CLIENTS.map((client, index) => {
  const estSansHistorique = client.idClient === CLIENT_SANS_HISTORIQUE_ID;
  return {
    idAbonnement: `abo-${String(index + 1).padStart(3, '0')}`,
    idClient: client.idClient,
    montantMensuel: TARIFS_DEROGATOIRES[client.idClient] ?? TARIF_FLAT,
    dateDebut: estSansHistorique
      ? `${PERIODE_APRES_HISTORIQUE.annee}-${String(PERIODE_APRES_HISTORIQUE.mois).padStart(2, '0')}-01`
      : client.dateCreation,
    frequence: 'Mensuelle',
  };
});
