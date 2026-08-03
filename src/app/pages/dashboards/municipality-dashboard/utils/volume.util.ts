import type { MonthlyTrendPoint } from '../mocks/municipality-mock.types';
import { comparePerformance, type PerformanceStatus } from './performance.util';

/**
 * "Volume Global Collecté" (Prompt 12, real backend). Originally conceived as actual vs.
 * target WEIGHT (kg) — redefined after confirming, yet again, that no real weight/mass
 * measurement exists anywhere in the backend schema (see EditRecap.md, Prompts 08/09/12).
 * Decided with the user (AskUserQuestion): reuse the real, already-loaded
 * `completedCollections`/`totalCollections` from `GET /municipality/monthly-trend`
 * (Prompt 09) instead of a weight-based summary — `totalCollections` (what was
 * scheduled) naturally serves as the "target", `completedCollections` (what was
 * actually achieved) as the "actual", with no invented objective needed.
 */
export interface VolumeAggregate {
  actualCollections: number;
  targetCollections: number;
  /** Actual as a percentage of target — 100 means exactly on target. */
  percentageOfTarget: number;
  status: PerformanceStatus;
}

/**
 * Sums actual (`completedCollections`) vs. target (`totalCollections`) across the
 * currently-loaded monthly trend points (already scoped to the selected Période — no
 * separate fetch/filtering needed, unlike the old per-zone/type/collector mock version:
 * `monthly-trend` is a platform-wide aggregate, not filterable by those dimensions).
 * Reuses `comparePerformance()` from Prompt 09 rather than reimplementing
 * under/on-target/over logic — same 100-is-the-target shape either way.
 */
export function aggregateVolume(points: Pick<MonthlyTrendPoint, 'totalCollections' | 'completedCollections'>[]): VolumeAggregate {
  const actualCollections = points.reduce((sum, point) => sum + point.completedCollections, 0);
  const targetCollections = points.reduce((sum, point) => sum + point.totalCollections, 0);
  const percentageOfTarget = targetCollections > 0 ? Math.round((actualCollections / targetCollections) * 100) : 0;
  const status = comparePerformance(percentageOfTarget, 100);

  return { actualCollections, targetCollections, percentageOfTarget, status };
}
