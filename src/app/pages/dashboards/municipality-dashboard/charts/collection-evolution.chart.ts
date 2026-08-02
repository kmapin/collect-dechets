import { ChartConfiguration } from 'chart.js';
import type { MonthlyTrendPoint } from '../mocks/municipality-mock.types';

/**
 * "Évolution des Collectes" — number of collections per month (not
 * tonnage: that's already covered by the waste-breakdown chart). Two
 * lines — total scheduled vs. actually completed — reusing the exact
 * `MonthlyTrendPoint` fields from the Prompt 00 mock service, no new
 * time-series generator.
 */
export function buildCollectionEvolutionConfig(data: MonthlyTrendPoint[]): ChartConfiguration {
  const config: ChartConfiguration<'line'> = {
    type: 'line',
    data: {
      labels: data.map((point) => point.label),
      datasets: [
        {
          label: 'Total',
          data: data.map((point) => point.totalCollections),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.12)',
          fill: true,
          tension: 0.3,
          pointRadius: 3,
        },
        {
          label: 'Réalisées',
          data: data.map((point) => point.completedCollections),
          borderColor: '#4caf50',
          backgroundColor: 'rgba(76, 175, 80, 0.12)',
          fill: true,
          tension: 0.3,
          pointRadius: 3,
        },
      ],
    },
    options: {
      interaction: { mode: 'index', intersect: false },
      scales: {
        y: { beginAtZero: true },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => items[0]?.label ?? '',
            label: (ctx) => `${ctx.dataset.label}: ${ctx.formattedValue} collectes`,
          },
        },
      },
    },
  };
  return config as ChartConfiguration;
}
