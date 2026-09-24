export type FrequenceCollecte = 'daily' | 'weekly' | 'monthly';

// 'expire' (fusion Subscription -> Contrat) : période payée (numberMonths) dépassée
// sans renouvellement — distinct de 'resilie' (résiliation volontaire). Un contrat
// 'expire' reste renouvelable par un nouveau paiement.
export type ContratStatus = 'actif' | 'suspendu' | 'resilie' | 'expire';

export interface Contrat {
  _id: string;
  clientId: string | { _id: string; firstName: string; lastName: string; email?: string; phone?: string };
  agencyId: string | { _id: string; name: string };
  pricingId: string | { _id: string; price: number; numberOfPasses: number; planType: string };
  startDate: string;
  endDate: string | null;
  /** Fusion Subscription -> Contrat : durée en mois de la période actuellement payée.
   * Présent uniquement pour un contrat né d'un paiement (ex-flux Abonnement) ou d'un
   * import Excel "abonnement" ; absent pour un contrat créé sans paiement initial en
   * mois (création agence classique, import "contrat"). */
  numberMonths?: number | null;
  frequenceCollecte: FrequenceCollecte;
  passagesParPeriode: number;
  prixParPeriode: number;
  status: ContratStatus;
  dateResiliation: string | null;
  raisonResiliation: string | null;
  documentUrl: string | null;
  documentPublicId: string | null;
  /** Absent (contrat "compte entier") ou lieu de service précis (Modèle C, multi-lieux). */
  serviceLocationId?: string | { _id: string; name: string } | null;
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

/** Un contrat par lieu sélectionné est créé côté backend (jamais un contrat unique
 * multi-lieux) — voir services/contrat.js::creerContratsMultiLieux. */
export interface CreerContratsMultiLieuxPayload {
  clientId: string;
  agencyId: string;
  pricingId: string;
  frequenceCollecte: FrequenceCollecte;
  endDate?: string;
  serviceLocationIds: string[];
}

export interface CreerContratsMultiLieuxResponse {
  message: string;
  contrats: Contrat[];
  redevances: any[];
  montantTotal: number;
}
