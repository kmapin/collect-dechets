import { ClientStatut, FactureStatut } from '../../models';
import { StatusBadgeVariant } from './status-badge.component';

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

// RG4 : retard = nombre de factures mensuelles impayées cumulées.
export function badgeSituationPaiement(moisRetard: number): BadgeInfo {
  if (moisRetard <= 0) return { label: 'À jour', icon: 'check_circle', variant: 'success' };
  if (moisRetard === 1) return { label: '1 mois de retard', icon: 'warning', variant: 'warning' };
  return { label: `${moisRetard} mois de retard`, icon: 'error', variant: 'danger' };
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
