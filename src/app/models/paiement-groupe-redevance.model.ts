/**
 * Miroir de `models/PaiementGroupeRedevance.js` (backend) — proposition de paiement
 * groupé de plusieurs Redevance d'un contrat, avec une réduction accordée par l'agence.
 */
import { Redevance } from './redevance.model';

export type ReductionType = 'pourcentage' | 'montant';
export type PaiementGroupeStatus = 'proposee' | 'payee' | 'annulee';
export type ModePaiementGroupe = 'manuel' | 'mobile_money' | null;

export interface PaiementGroupeRedevance {
  _id: string;
  contratId: string;
  clientId: string;
  agencyId: string;
  redevanceIds: string[] | Redevance[];
  montantTotalAvantReduction: number;
  reductionType: ReductionType;
  reductionValeur: number;
  montantReduction: number;
  montantAPayer: number;
  genererTout: boolean;
  status: PaiementGroupeStatus;
  modePaiement: ModePaiementGroupe;
  transactionId: string | null;
  datePaiement: string | null;
  creeParUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApercuPaiementGroupe {
  redevancesExistantes: Redevance[];
  redevancesAGenerer: { periodLabel: string; dateEcheance: string; montant: number }[];
  montantTotal: number;
}
