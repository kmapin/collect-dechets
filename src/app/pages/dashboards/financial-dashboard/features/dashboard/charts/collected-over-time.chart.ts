import { ChartConfiguration } from 'chart.js';
import { FinanceStatsSeries } from '../../../data-access/contracts/finance-data.service';
import { PALETTE_GRAPHIQUES } from '../../../shared/chart/chart-palette.util';

export function buildCollectedOverTimeConfig(series: FinanceStatsSeries): ChartConfiguration {
  return {
    type: 'line',
    data: {
      labels: [...series.labels],
      datasets: [
        {
          label: 'Total collecté',
          data: [...series.totalCollecte],
          borderColor: PALETTE_GRAPHIQUES[0],
          backgroundColor: `${PALETTE_GRAPHIQUES[0]}33`,
          fill: true,
          tension: 0.3,
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true },
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => Number(v).toLocaleString('fr-FR') } },
      },
    },
  };
}
