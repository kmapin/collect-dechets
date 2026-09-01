// ── Formatage de dates lisibles (FR), partagé Teams & Planning ──────
// Objectif : ne jamais afficher une date ISO brute (ex: 2026-07-08T14:35:22.000Z)
// dans un template ; toujours passer par une de ces fonctions.

/** Formatte une date (ISO datetime ou YYYY-MM-DD) en date FR lisible, sans heure. */
export function formatFrDate(date: string | null | undefined, month: 'short' | 'long' | 'numeric' = 'long'): string {
  if (!date) return '—';
  const datePart = date.includes('T') ? date.split('T')[0] : date;
  const parts = datePart.split('-');
  if (parts.length !== 3) return date;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month, year: 'numeric' });
}

/** Formatte un horodatage ISO complet (date + heure) en français lisible : "08 juil. 2026 à 14:35". */
export function formatFrDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/** Heure seule d'un horodatage ISO, ex: "14:35". */
export function formatFrTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Date relative ("il y a 10 min") — chantier Notifications. Seuils repris
 * d'admin-dashboard.ts pour rester cohérent avec l'unique autre endroit de l'app qui
 * affiche déjà une date relative ; au-delà de 7 jours, délègue à formatFrDateTime plutôt
 * que d'inventer un 3e format ("il y a N semaines/mois").
 */
export function formatFrRelative(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;

  const secondes = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secondes < 60) return "à l'instant";
  const minutes = Math.floor(secondes / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.floor(heures / 24);
  if (jours < 7) return `il y a ${jours} j`;
  return formatFrDateTime(iso);
}
