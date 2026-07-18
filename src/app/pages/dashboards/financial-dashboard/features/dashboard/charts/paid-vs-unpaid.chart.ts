import { ChartConfiguration } from 'chart.js';
import { FinanceStatsSeries } from '../../../data-access/contracts/finance-data.service';
import { PALETTE_GRAPHIQUES } from '../../../shared/chart/chart-palette.util';

export function buildPaidVsUnpaidConfig(series: FinanceStatsSeries): ChartConfiguration {
  return {
    type: 'bar',
    data: {
      labels: [...series.labels],
      datasets: [
        { label: 'Payées', data: [...series.facturesPayees], backgroundColor: PALETTE_GRAPHIQUES[2] },
        { label: 'Impayées', data: [...series.facturesImpayees], backgroundColor: PALETTE_GRAPHIQUES[3] },
      ],
    },
    options: {
      plugins: { legend: { position: 'bottom' } },
      scales: {
        x: { stacked: true },
        y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } },
      },
    },
  };
}
