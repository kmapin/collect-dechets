// Formatage monétaire centralisé (spec §1.9/§1.13 : devise jamais inlinée ailleurs).
// XOF/FCFA assumé — à confirmer (DISCOVERY.md §7 / ARCHITECTURE.md §8).
const FORMATEUR_MONTANT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

export function formatMontantXof(montant: number): string {
  return `${FORMATEUR_MONTANT.format(montant)} FCFA`;
}
