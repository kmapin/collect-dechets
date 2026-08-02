import type { MockWasteRecord } from '../mocks/municipality-mock.types';
import { comparePerformance, type PerformanceStatus } from './performance.util';

export interface VolumeAggregate {
  actualKg: number;
  targetKg: number;
  /** Actual as a percentage of target — 100 means exactly on target. */
  percentageOfTarget: number;
  status: PerformanceStatus;
}

/**
 * Sums actual (`weightKg`) vs. target (`targetWeightKg`) across an
 * already-filtered set of waste records — "Volume Global Collecté"
 * (Prompt 11). Deliberately reuses `comparePerformance()` from Prompt 09
 * rather than reimplementing under/on-target/over logic: expressing actual
 * as "% of target" turns this into exactly the same 100-is-the-target shape
 * comparePerformance() already handles, so the two features share one
 * tested comparison rule instead of two similar-but-separate ones.
 */
export function aggregateVolume(records: Pick<MockWasteRecord, 'weightKg' | 'targetWeightKg'>[]): VolumeAggregate {
  const actualKg = records.reduce((sum, record) => sum + record.weightKg, 0);
  const targetKg = records.reduce((sum, record) => sum + record.targetWeightKg, 0);
  const percentageOfTarget = targetKg > 0 ? Math.round((actualKg / targetKg) * 100) : 0;
  const status = comparePerformance(percentageOfTarget, 100);

  return { actualKg, targetKg, percentageOfTarget, status };
}
