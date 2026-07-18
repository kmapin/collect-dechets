import { Retrait } from '../../../models';
import { PERIODES } from './factures.data';
import { addJours, createSeededRng, isoDatePremierJour } from './seed.util';

const MOTIFS = [
  'Réapprovisionnement caisse agence',
  'Paiement fournisseur carburant',
  'Frais de maintenance véhicules',
  'Avance sur salaire collecteurs',
  "Achat d'équipements de collecte",
  'Frais administratifs',
] as const;

const rng = createSeededRng(7);

// ~1 retrait tous les 1,3 mois (spec §5 : "retraits avec motifs") — saute un mois sur 4.
export const RETRAITS: Retrait[] = PERIODES
  .filter((_, index) => index % 4 !== 3)
  .map((periode, i) => ({
    idRetrait: `ret-${String(i + 1).padStart(3, '0')}`,
    montant: 10_000 + Math.floor(rng() * 41) * 1000, // 10 000 à 50 000 XOF
    dateRetrait: addJours(isoDatePremierJour(periode), 12 + (i % 10)),
    motif: MOTIFS[i % MOTIFS.length],
  }));
