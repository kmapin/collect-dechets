import { ChartConfiguration } from 'chart.js';
import type { PerformanceIndicator } from '../mocks/municipality-mock.types';
import { comparePerformance } from '../utils/performance.util';

const STATUS_COLOR: Record<'under' | 'on-target' | 'over', string> = {
  under: '#f44336', 
  'on-target': '#3b82f6', 
  over: '#4caf50', 
};


export function buildPerformanceIndicatorsConfig(indicators: PerformanceIndicator[]): ChartConfiguration {
  const config: ChartConfiguration<'bar'> = {
    type: 'bar',
    data: {
      labels: indicators.map((item) => item.label),
      datasets: [
        {
          label: 'Actuel',
          data: indicators.map((item) => item.actual),
          backgroundColor: indicators.map((item) => STATUS_COLOR[comparePerformance(item.actual, item.target)]),
          borderRadius: 4,
        },
        {
          label: 'Objectif',
          data: indicators.map((item) => item.target),
          backgroundColor: '#9e9e9e',
          borderRadius: 4,
        },
      ],
    },
    options: {
      scales: {
        y: { beginAtZero: true, max: 100, title: { display: true, text: '% de réalisation' } },
      },
      plugins: {
        legend: { display: true, position: 'bottom' },
        tooltip: {
          callbacks: {
            title: (items) => items[0]?.label ?? '',
            label: (ctx) => `${ctx.dataset.label}: ${ctx.formattedValue}%`,
          },
        },
      },
    },
  };
  return config as ChartConfiguration;
}
