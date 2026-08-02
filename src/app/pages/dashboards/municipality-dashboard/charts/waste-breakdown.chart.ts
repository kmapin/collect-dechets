import { ChartConfiguration } from 'chart.js';
import type { WasteStatistic } from '../municipality-dashboard';

/**
 * "Collectes par Type de Déchets" — doughnut of waste category vs. tonnage.
 * Chart.js's own legend is disabled: the dashboard already renders a
 * `.chart-legend` from the same `wasteStatistics` array right below the
 * chart, so a second legend inside the canvas would just duplicate it.
 */
export function buildWasteBreakdownConfig(data: WasteStatistic[]): ChartConfiguration {
  const config: ChartConfiguration<'doughnut'> = {
    type: 'doughnut',
    data: {
      labels: data.map((item) => item.type),
      datasets: [
        {
          data: data.map((item) => item.quantity),
          backgroundColor: data.map((item) => item.color),
          borderWidth: 0,
        },
      ],
    },
    options: {
      cutout: '60%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const item = data[ctx.dataIndex];
              return `${item.type}: ${item.quantity}t (${item.percentage}%)`;
            },
          },
        },
      },
    },
  };
  return config as ChartConfiguration;
}
