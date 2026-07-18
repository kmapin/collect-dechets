import { FactureStatut, ModePaiement, Paiement } from '../../../models';
import { FACTURES } from './factures.data';

// Un paiement par facture "Payée" (RG3) — réconciliation 1–1 pour ce MVP (pas de
// paiements partiels ni de paiements hors facture, cf. §1.12).
const MODES: readonly ModePaiement[] = [ModePaiement.MOBILE_MONEY, ModePaiement.ESPECES, ModePaiement.AUTRE];

export const PAIEMENTS: Paiement[] = FACTURES
  .filter((f): f is typeof f & { datePaiement: string } => f.statut === FactureStatut.PAYEE && !!f.datePaiement)
  .map((facture, index) => ({
    idPaiement: `pai-${facture.idFacture}`,
    idFacture: facture.idFacture,
    idClient: facture.idClient,
    montant: facture.montant,
    datePaiement: facture.datePaiement,
    modePaiement: MODES[index % MODES.length],
  }));
