import { ChartConfiguration } from 'chart.js';
import type { PerformanceIndicator } from '../mocks/municipality-mock.types';
import { comparePerformance } from '../utils/performance.util';

const STATUS_COLOR: Record<'under' | 'on-target' | 'over', string> = {
  under: '#f44336', // var(--error-color)
  'on-target': '#3b82f6', // var(--primary-color)
  over: '#4caf50', // var(--success-color)
};

/**
 * "Graphiques de performance" — grouped bar chart, actual vs. target, one
 * bar-pair per indicator (zone, waste type, or collector — the caller has
 * already aggregated to whichever grouping is active). Each "Actuel" bar is
 * colored by comparePerformance() so under/on-target/over performers are
 * visually distinct at a glance; "Objectif" bars stay a neutral gray so
 * they read as a reference line, not a competing category.
 */
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
