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
