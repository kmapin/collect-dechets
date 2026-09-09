import { ChartConfiguration } from 'chart.js';
import type { WasteStatistic } from '../municipality-dashboard';


export function buildWasteBreakdownConfig(data: WasteStatistic[]): ChartConfiguration {
  const config: ChartConfiguration<'doughnut'> = {
    type: 'doughnut',
    data: {
      labels: data.map((item) => item.label),
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
              return `${item.label}: ${item.quantity} collecte(s) (${item.percentage}%)`;
            },
          },
        },
      },
    },
  };
  return config as ChartConfiguration;
}
