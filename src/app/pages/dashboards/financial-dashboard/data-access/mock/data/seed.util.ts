import { Periode } from '../../../models';

// Générateur pseudo-aléatoire déterministe (mulberry32) — jamais Math.random(), pour que
// le dataset soit stable d'un run à l'autre (captures d'écran/tests reproductibles,
// spec Mock Data Strategy §5).
export function createSeededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length) % items.length];
}

export const MOIS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'] as const;
export const MOIS_FR_LONG = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
] as const;

export function periodeKey(p: Periode): string {
  return `${p.annee}-${String(p.mois).padStart(2, '0')}`;
}

export function labelPeriode(p: Periode, long = false): string {
  return `${(long ? MOIS_FR_LONG : MOIS_FR)[p.mois - 1]} ${p.annee}`;
}

/** Décale une période de `delta` mois (peut être négatif). */
export function addMois(p: Periode, delta: number): Periode {
  const total = (p.annee * 12 + (p.mois - 1)) + delta;
  return { annee: Math.floor(total / 12), mois: (total % 12) + 1 };
}

/** Construit `count` périodes consécutives se terminant à `derniere` (incluse), ordre chronologique. */
export function buildPeriodesGlissantes(count: number, derniere: Periode): Periode[] {
  return Array.from({ length: count }, (_, i) => addMois(derniere, i - (count - 1)));
}

export function isoDatePremierJour(p: Periode): string {
  return `${p.annee}-${String(p.mois).padStart(2, '0')}-01`;
}

export function addJours(dateIso: string, jours: number): string {
  const d = new Date(`${dateIso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + jours);
  return d.toISOString().slice(0, 10);
}

// Ancre fixe du dataset (pas `new Date()`) : le jeu de données doit rester identique
// à chaque exécution, indépendamment de l'horloge système (captures/tests stables).
export const AUJOURDHUI = '2026-07-18';
export const DERNIERE_PERIODE: Periode = { mois: 7, annee: 2026 };
export const NOMBRE_MOIS_HISTORIQUE = 15; // 12–18 mois demandés par la spec §5
