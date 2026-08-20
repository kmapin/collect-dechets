import { Periode } from '../models';

// Basé sur l'horloge réelle (ARCHITECTURE.md §3) — jamais une valeur figée en dur.
export function periodeCourante(): Periode {
  const maintenant = new Date();
  return { mois: maintenant.getMonth() + 1, annee: maintenant.getFullYear() };
}

/** Plage des `nombreMois` derniers mois, se terminant au mois courant (inclus). */
export function plageDerniersMois(nombreMois: number): { debut: Periode; fin: Periode } {
  const fin = periodeCourante();
  const finIndex = fin.annee * 12 + (fin.mois - 1);
  const debutIndex = finIndex - (nombreMois - 1);
  return { debut: { annee: Math.floor(debutIndex / 12), mois: (debutIndex % 12) + 1 }, fin };
}

/** Décale une période de `delta` mois (peut être négatif) — pour le stepper mensuel. */
export function decalerPeriode(periode: Periode, delta: number): Periode {
  const total = periode.annee * 12 + (periode.mois - 1) + delta;
  return { annee: Math.floor(total / 12), mois: (total % 12) + 1 };
}

const MOIS_FR_LONG = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
] as const;

/** Libellé UI d'une période, ex. "Juillet 2026". */
export function labelPeriodeFr(periode: Periode): string {
  return `${MOIS_FR_LONG[periode.mois - 1]} ${periode.annee}`;
}

/**
 * Bornes calendaires réelles d'une période mensuelle : 1er jour au dernier jour du mois
 * (inclusif) — mêmes bornes que la requête backend pour ce type de plage (dateEcheance
 * $gte 1er jour, $lt 1er jour du mois suivant, cf. services/redevance.js::getReleveClient),
 * jamais un calcul différent côté frontend. `new Date(annee, mois, 0)` : jour 0 du mois
 * suivant = dernier jour du mois demandé (astuce standard JS Date, pas une valeur magique).
 */
export function bornesPeriode(periode: Periode): { debut: Date; fin: Date } {
  const debut = new Date(periode.annee, periode.mois - 1, 1);
  const fin = new Date(periode.annee, periode.mois, 0);
  return { debut, fin };
}
