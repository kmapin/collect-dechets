// Vue F1 — cartes KPI du tableau de bord.
// RG5 : enAttente = somme due par les clients en retard.
// RG7 (TBC) : soldeDisponible = paiements − retraits.
export interface DashboardKpi {
  soldeDisponible: number;
  totalCollecte: number;
  revenusNets: number;
  enAttente: number;
  // Item 8 (chantier Finance/Paiements) : montant facturé total (tous statuts hors
  // 'annule') sur la même période que totalCollecte, et le ratio collecté/facturé (%).
  montantFacture: number;
  tauxRecouvrement: number;
  devise: string; // XOF/FCFA — à confirmer, centralisé (DISCOVERY.md §7 / ARCHITECTURE.md §8)
  misAJourLe: string; // ISO datetime
}
