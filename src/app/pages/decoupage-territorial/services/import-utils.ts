export const TEMPLATE_KEYS = ['Région', 'Province', 'Ville', 'Arrondissement', 'Secteur', 'Village', 'Quartier'];

export function normalizeName(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  return false;
}

export function cleanCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim().replace(/\s+/g, ' ');
}

const ARRONDISSEMENT_RE = /^arrondissement\s+(\d+)$/i;

export function arrondissementNumber(name: string): number | null {
  const m = ARRONDISSEMENT_RE.exec(name.trim());
  return m ? parseInt(m[1], 10) : null;
}

export function sortByArrondissement(a: string, b: string): number {
  const na = arrondissementNumber(a);
  const nb = arrondissementNumber(b);
  if (na !== null && nb !== null) return na - nb;
  if (na !== null) return -1;
  if (nb !== null) return 1;
  return a.localeCompare(b, 'fr');
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
