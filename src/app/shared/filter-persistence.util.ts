/**
 * Persistance des filtres de recherche/liste (onglet Clients, Employés, Retraits, ...)
 * dans sessionStorage, pour qu'ils survivent à une navigation complète (ex: ouvrir la
 * page "Historique des collectes" d'un client puis revenir en arrière) sans survivre
 * à la fermeture de l'onglet du navigateur. Les filtres restent en place tant que
 * l'utilisateur ne clique pas explicitement sur "Réinitialiser les filtres".
 */

export function saveFilters<T extends object>(key: string, value: T): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // sessionStorage indisponible (navigation privée, quota, etc.) — pas bloquant.
  }
}

export function loadFilters<T extends object>(key: string, defaults: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return defaults;
    const saved = JSON.parse(raw);
    return { ...defaults, ...saved };
  } catch {
    return defaults;
  }
}

export function clearFilters(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/** true si au moins un champ de `value` diffère de `defaults` — sert à rouvrir
 * automatiquement un panneau de filtres repliable quand des filtres persistés
 * sont encore actifs, plutôt que de les laisser masqués derrière le bouton. */
export function hasNonDefaultFilters<T extends object>(value: T, defaults: T): boolean {
  return Object.keys(defaults).some((key) => (value as any)[key] !== (defaults as any)[key]);
}
