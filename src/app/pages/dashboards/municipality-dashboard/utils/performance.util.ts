import type { PerformanceRecord, PerformanceIndicator, PerformanceGroupType } from '../mocks/municipality-mock.types';

/**
 * Pure "actual vs target" classification, independent of mock data or
 * Angular — usable against real data the day a real endpoint exists.
 */
export type PerformanceStatus = 'under' | 'on-target' | 'over';

/**
 * Classifies `actual` against `target`. `thresholdPoints` (percentage
 * points) is how far below/above target counts as "significant" —
 * default 10, matching the business ask to flag entries "significantly
 * below target", not just marginally so.
 */
export function comparePerformance(actual: number, target: number, thresholdPoints = 10): PerformanceStatus {
  const diff = actual - target;
  if (diff <= -thresholdPoints) {
    return 'under';
  }
  if (diff >= thresholdPoints) {
    return 'over';
  }
  return 'on-target';
}

function groupKeyFor(record: PerformanceRecord, groupBy: PerformanceGroupType): { id: string; label: string } {
  switch (groupBy) {
    case 'zone':
      return { id: record.zoneName, label: record.zoneName };
    case 'wasteType':
      return { id: record.wasteType, label: record.wasteType };
    case 'collector':
      return { id: record.collectorId, label: record.collectorName };
  }
}

/**
 * Groups flat per-collector records by zone/wasteType/collector and
 * averages actual/target within each group — pure, no side effects.
 * Group order follows first-appearance order in `records` (deterministic
 * given a deterministic input, no extra sort needed).
 */
export function aggregatePerformanceRecords(
  records: PerformanceRecord[],
  groupBy: PerformanceGroupType
): PerformanceIndicator[] {
  const groups = new Map<string, { label: string; actualSum: number; targetSum: number; count: number }>();

  for (const record of records) {
    const key = groupKeyFor(record, groupBy);
    const existing = groups.get(key.id) ?? { label: key.label, actualSum: 0, targetSum: 0, count: 0 };
    existing.actualSum += record.actual;
    existing.targetSum += record.target;
    existing.count += 1;
    groups.set(key.id, existing);
  }

  return Array.from(groups.entries()).map(([id, group]) => ({
    id,
    label: group.label,
    actual: Math.round(group.actualSum / group.count),
    target: Math.round(group.targetSum / group.count),
  }));
}
