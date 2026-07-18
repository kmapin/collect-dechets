import { Periode } from '../models';

// Basé sur l'horloge réelle (pas sur les constantes du dataset mock — voir
// ARCHITECTURE.md §3 : les composants ne doivent pas dépendre de data-access/mock).
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
