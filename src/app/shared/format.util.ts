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
