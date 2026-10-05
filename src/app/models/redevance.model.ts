export type RedevanceStatus = 'en_attente' | 'retard' | 'paye' | 'annule' | 'echec';

export interface Redevance {
  _id: string;
  contratId: string | { _id: string; frequenceCollecte?: string; prixParPeriode?: number; status?: string };
  clientId: string | { _id: string; firstName: string; lastName: string; email?: string; phone?: string };
  agencyId: string | { _id: string; name: string };
  montant: number;
  periodLabel: string;
  dateEcheance: string;
  status: RedevanceStatus;
  datePaiement: string | null;
  // Paiement manuel constaté par l'agence (espèces, chèque...) : montant réellement reçu
  // (peut différer de `montant`, ex : règlement partiel) et note libre — absents pour un
  // paiement mobile money (lié via transactionId) ou tant que la redevance n'est pas payée.
  montantRecu?: number | null;
  commentairePaiement?: string | null;
  transactionId: string | { _id: string; reference: string; amount: number; status: string; completedAt?: string; operator?: string } | null;
  createdAt: string;
  updatedAt: string;
  // Item 2 — compteur de tentatives/relances, voir services/paymentRetryScheduler.js.
  echecCount?: number;
  dernierEchecLe?: string | null;
  echecDefinitif?: boolean;
  periodeDebut?: string;
  periodeFin?: string | null;
}

/** Corps de PATCH /redevances/:id/payer — `transactionId` réservé au paiement mobile
 * money (relié par le backend) ; les trois autres champs sont ceux du formulaire
 * "Paiement manuel" (espèces, chèque...), tous optionnels côté API mais en pratique
 * toujours fournis par ce formulaire (voir redevances.component.ts). */
export interface PaiementManuelRedevancePayload {
  transactionId?: string;
  datePaiement?: string;
  montantRecu?: number;
  commentaire?: string;
}
