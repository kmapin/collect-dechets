/**
 * Miroir de `models/Contrat.js` (backend) — Phase 6, CONCEPTION_ABONNEMENT_CONTRAT.md §6.1.
 */
export type FrequenceCollecte = 'daily' | 'weekly' | 'monthly';

export type ContratStatus = 'actif' | 'suspendu' | 'resilie';

export interface Contrat {
  _id: string;
  clientId: string | { _id: string; firstName: string; lastName: string; email?: string; phone?: string };
  agencyId: string | { _id: string; name: string };
  pricingId: string | { _id: string; price: number; numberOfPasses: number; planType: string };
  startDate: string;
  endDate: string | null;
  frequenceCollecte: FrequenceCollecte;
  passagesParPeriode: number;
  prixParPeriode: number;
  status: ContratStatus;
  dateResiliation: string | null;
  raisonResiliation: string | null;
  documentUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreerContratPayload {
  clientId: string;
  agencyId: string;
  pricingId: string;
  frequenceCollecte: FrequenceCollecte;
  endDate?: string;
}
