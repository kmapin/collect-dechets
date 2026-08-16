/**
 * Miroir de `models/Redevance.js` (backend) — une ligne de facturation
 * périodique d'un Contrat.
 */
// 'echec' ajouté (chantier Finance/Paiements, item 2 — backend models/Redevance.js) :
// un paiement mobile money en échec se propage désormais jusqu'ici, plutôt que de
// laisser la Redevance indéfiniment 'en_attente'.
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
  transactionId: string | { _id: string; reference: string; amount: number; status: string; completedAt?: string } | null;
  createdAt: string;
  updatedAt: string;
  // Item 2 — compteur de tentatives/relances, voir services/paymentRetryScheduler.js.
  echecCount?: number;
  dernierEchecLe?: string | null;
  echecDefinitif?: boolean;
}
