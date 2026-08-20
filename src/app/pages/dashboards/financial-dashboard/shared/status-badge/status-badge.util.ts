import { ClientStatut, FactureStatut, PaiementAgentStatus } from '../../models';
import { StatusBadgeVariant } from './status-badge.component';
import { SourceEligibilite } from '../../data-access/contracts/facture-data.service';

export interface BadgeInfo {
  label: string;
  icon: string;
  variant: StatusBadgeVariant;
}

export function badgeStatutClient(statut: ClientStatut): BadgeInfo {
  return statut === ClientStatut.ACTIF
    ? { label: 'Actif', icon: 'check_circle', variant: 'success' }
    : { label: 'Inactif', icon: 'block', variant: 'neutral' };
}

// "À jour" ⟺ abonnement actif OU contrat actif (aJour, dérivé côté backend de
// EligibilityService.checkClientEligibility — jamais recalculé ici). Un contrat actif
// reste éligible même en retard de paiement (voir eligibility.service.js), donc aJour
// prime toujours sur moisRetard. moisRetard (RG4, nombre de factures mensuelles impayées
// cumulées) ne sert qu'à distinguer, pour un client NON éligible, un simple impayé résiduel
// (ex. contrat résilié avec redevance impayée) de l'absence totale d'abonnement/contrat.
const LABEL_SOURCE: Record<SourceEligibilite, string> = {
  CONTRACT: 'Contrat',
  SUBSCRIPTION: 'Abonnement',
  NONE: '',
};

export function badgeSituationPaiement(
  { aJour, moisRetard, source }: { aJour: boolean; moisRetard: number; source: SourceEligibilite },
): BadgeInfo {
  if (aJour) return { label: `À jour (${LABEL_SOURCE[source]})`, icon: 'check_circle', variant: 'success' };
  if (moisRetard === 1) return { label: '1 mois de retard', icon: 'warning', variant: 'warning' };
  if (moisRetard > 1) return { label: `${moisRetard} mois de retard`, icon: 'error', variant: 'danger' };
  return { label: 'Aucun abonnement/contrat actif', icon: 'block', variant: 'neutral' };
}

export function badgeFacture(statut: FactureStatut): BadgeInfo {
  return statut === FactureStatut.PAYEE
    ? { label: 'Payée', icon: 'check_circle', variant: 'success' }
    : { label: 'Impayée', icon: 'error', variant: 'danger' };
}

// F12 — statut de la ligne de suivi mensuel (peut être 'NonGeneree' pour un client sans
// facture ce mois-là, cf. SuiviAbonneMensuel).
export function badgeSuiviMensuel(statut: FactureStatut | 'NonGeneree'): BadgeInfo {
  if (statut === 'NonGeneree') return { label: 'Non générée', icon: 'help_outline', variant: 'neutral' };
  return badgeFacture(statut);
}

// Onglet "Abonnements & Contrats" de la fiche client — domaine `Subscription`
// (app/services/agency.service.ts::getUserSubscription) et `Contrat`
// (app/services/contrat.service.ts), distincts du domaine Facture ci-dessus.
export function badgeAbonnement(isActive: boolean): BadgeInfo {
  return isActive
    ? { label: 'Actif', icon: 'check_circle', variant: 'success' }
    : { label: 'Inactif', icon: 'block', variant: 'neutral' };
}

export function badgeContrat(statut: 'actif' | 'suspendu' | 'resilie'): BadgeInfo {
  if (statut === 'actif') return { label: 'Actif', icon: 'check_circle', variant: 'success' };
  if (statut === 'suspendu') return { label: 'Suspendu', icon: 'pause_circle', variant: 'warning' };
  return { label: 'Résilié', icon: 'cancel', variant: 'danger' };
}

// Historique "Paiement agents" (F5, chantier M2 — paiement réel Moov Money).
// A_VERIFIER_MANUELLEMENT en 'danger' (pas 'warning') : nécessite une action urgente
// du Super Admin, pas un statut de routine — même logique que WithdrawalStatus.
// TO_VERIFY côté admin-dashboard (réutilisée séparément, module Retraits, pas
// modifiée ici).
export function badgePaiementAgent(statut: PaiementAgentStatus): BadgeInfo {
  switch (statut) {
    case 'EN_ATTENTE_VALIDATION':
      return { label: 'En attente de validation', icon: 'hourglass_empty', variant: 'warning' };
    case 'INITIATED':
      return { label: 'Validation en cours', icon: 'hourglass_top', variant: 'warning' };
    case 'COMPLETED':
      return { label: 'Payé', icon: 'check_circle', variant: 'success' };
    case 'A_VERIFIER_MANUELLEMENT':
      return { label: '⚠ À vérifier manuellement', icon: 'error', variant: 'danger' };
    case 'FAILED':
      return { label: 'Échoué', icon: 'cancel', variant: 'danger' };
    case 'REJETE':
      return { label: 'Rejeté', icon: 'block', variant: 'neutral' };
    default:
      return { label: statut, icon: 'help_outline', variant: 'neutral' };
  }
}
