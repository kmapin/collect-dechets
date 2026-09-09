import { ChartConfiguration } from 'chart.js';
import { RepartitionModePaiement } from '../../../data-access/contracts/finance-data.service';
import { PALETTE_GRAPHIQUES } from '../../../shared/chart/chart-palette.util';

export function buildRevenueBreakdownConfig(repartition: RepartitionModePaiement[]): ChartConfiguration {
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
