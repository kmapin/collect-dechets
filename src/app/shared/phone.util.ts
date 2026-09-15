export function normalizePhone(phone: string | null | undefined): string {
  return (phone ?? '').trim().replace(/\s+/g, '');
}
