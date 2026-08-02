import { comparePerformance, aggregatePerformanceRecords } from './performance.util';
import type { PerformanceRecord } from '../mocks/municipality-mock.types';

describe('performance.util - comparePerformance', () => {
  it('classifies actual significantly below target as "under" (default threshold 10)', () => {
    expect(comparePerformance(60, 80)).toBe('under');
  });

  it('classifies actual significantly above target as "over"', () => {
    expect(comparePerformance(95, 80)).toBe('over');
  });

  it('classifies actual within the threshold of target as "on-target"', () => {
    expect(comparePerformance(75, 80)).toBe('on-target');
    expect(comparePerformance(85, 80)).toBe('on-target');
  });

  it('treats the threshold boundary as inclusive on both sides', () => {
    expect(comparePerformance(70, 80)).toBe('under'); // diff = -10
    expect(comparePerformance(90, 80)).toBe('over'); // diff = +10
    expect(comparePerformance(69, 80)).toBe('under');
    expect(comparePerformance(71, 80)).toBe('on-target');
  });

  it('respects a custom threshold', () => {
    expect(comparePerformance(72, 80, 5)).toBe('under'); // diff -8, threshold 5
    expect(comparePerformance(72, 80, 15)).toBe('on-target'); // diff -8, threshold 15
  });
});

describe('performance.util - aggregatePerformanceRecords', () => {
  function buildRecord(overrides: Partial<PerformanceRecord>): PerformanceRecord {
    return {
      id: 'perf-x',
      zoneName: 'Arrondissement 1',
      wasteType: 'Déchets ménagers',
      collectorId: 'collector-x',
      collectorName: 'Issa Ouédraogo',
      actual: 80,
      target: 80,
      ...overrides,
    };
  }

  it('averages actual/target per zone', () => {
    const records: PerformanceRecord[] = [
      buildRecord({ zoneName: 'Zone A', actual: 60, target: 80 }),
      buildRecord({ zoneName: 'Zone A', actual: 100, target: 80 }),
      buildRecord({ zoneName: 'Zone B', actual: 70, target: 90 }),
    ];

    expect(aggregatePerformanceRecords(records, 'zone')).toEqual([
      { id: 'Zone A', label: 'Zone A', actual: 80, target: 80 },
      { id: 'Zone B', label: 'Zone B', actual: 70, target: 90 },
    ]);
  });

  it('averages actual/target per waste type', () => {
    const records: PerformanceRecord[] = [
      buildRecord({ wasteType: 'Recyclables', actual: 50, target: 90 }),
      buildRecord({ wasteType: 'Recyclables', actual: 70, target: 90 }),
    ];

    expect(aggregatePerformanceRecords(records, 'wasteType')).toEqual([
      { id: 'Recyclables', label: 'Recyclables', actual: 60, target: 90 },
    ]);
  });

  it('produces one entry per collector when grouping by collector (no averaging needed)', () => {
    const records: PerformanceRecord[] = [
      buildRecord({ collectorId: 'c1', collectorName: 'Issa Ouédraogo', actual: 55, target: 85 }),
      buildRecord({ collectorId: 'c2', collectorName: 'Aminata Compaoré', actual: 92, target: 82 }),
    ];

    expect(aggregatePerformanceRecords(records, 'collector')).toEqual([
      { id: 'c1', label: 'Issa Ouédraogo', actual: 55, target: 85 },
      { id: 'c2', label: 'Aminata Compaoré', actual: 92, target: 82 },
    ]);
  });

  it('returns an empty array for an empty input (no divide-by-zero)', () => {
    expect(aggregatePerformanceRecords([], 'zone')).toEqual([]);
  });
});
