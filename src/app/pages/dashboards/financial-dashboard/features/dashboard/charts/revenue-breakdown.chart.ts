import { ChartConfiguration } from 'chart.js';
import { RepartitionModePaiement } from '../../../data-access/contracts/finance-data.service';
import { PALETTE_GRAPHIQUES } from '../../../shared/chart/chart-palette.util';

// "Revenue breakdown" (F2) — répartition du total collecté par mode de paiement,
// la seule dimension réellement dérivable du modèle Paiement (spec §1.7) : il n'existe
// pas de notion de catégorie/commission à ventiler par ailleurs (DISCOVERY.md §7).
export function buildRevenueBreakdownConfig(repartition: RepartitionModePaiement[]): ChartConfiguration {
  // Construit et type-vérifie contre la config spécifique 'doughnut' (cutout n'existe
  // que sur ce type), puis élargit vers le ChartConfiguration générique attendu par le
  // wrapper partagé (shared/chart/finance-chart.component.ts), qui accueille les trois
  // types de graphiques de ce dashboard indifféremment.
  const config: ChartConfiguration<'doughnut'> = {
    type: 'doughnut',
    data: {
      labels: repartition.map(r => r.mode),
      datasets: [
        {
          data: repartition.map(r => r.montant),
          backgroundColor: [...PALETTE_GRAPHIQUES.slice(0, repartition.length || 1)],
          borderWidth: 0,
        },
      ],
    },
    options: {
      cutout: '60%',
      plugins: { legend: { position: 'bottom' } },
    },
  };
  return config as ChartConfiguration;
}
