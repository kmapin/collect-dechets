import { NavigationExtras } from '@angular/router';
import { BreadcrumbItem } from './breadcrumb/breadcrumb';

/**
 * Certaines pages (ex: détail d'un planning) sont accessibles depuis plusieurs
 * endroits de l'app (liste des plannings, historique d'un client, détail d'une
 * équipe, ...). Leur breadcrumb doit refléter le chemin réellement emprunté par
 * l'utilisateur, pas un unique chemin "par défaut" supposé. On transporte donc
 * les maillons intermédiaires réels via `NavigationExtras.state` (Angular les
 * recopie dans `history.state`, lisible côté page cible même après navigation).
 * Si l'utilisateur arrive directement (URL tapée, F5, notification, ...), ce
 * state est absent et la page cible retombe sur son chemin par défaut.
 */
export function withBreadcrumbTrail(trail: BreadcrumbItem[]): NavigationExtras {
  return { state: { breadcrumbTrail: trail } };
}

export function readBreadcrumbTrail(): BreadcrumbItem[] | null {
  const trail = (typeof history !== 'undefined' ? history.state?.breadcrumbTrail : undefined) as
    | BreadcrumbItem[]
    | undefined;
  return trail?.length ? trail : null;
}
