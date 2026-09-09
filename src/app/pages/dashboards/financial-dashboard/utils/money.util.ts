const FORMATEUR_MONTANT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

export function formatMontantXof(montant: number): string {
  return `${FORMATEUR_MONTANT.format(montant)} FCFA`;
}
