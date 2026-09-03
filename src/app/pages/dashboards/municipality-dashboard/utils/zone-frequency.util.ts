import type { CollectionFrequency, PlannedFrequency, ZoneFrequencyRecord, ZoneFrequencyIndicator } from '../mocks/municipality-mock.types';

/**
 * Canonical "collections per month" weight per frequency tier — lets planned
 * vs. actual (both enums) be compared/sorted numerically. Matches the real
 * backend's enum (`Planning.frequency`, see GET /municipality/zone-frequency):
 * 'quotidien' (daily) > 'hebdomadaire' (weekly) > 'bimensuel' (twice a month)
 * > 'mensuel' (monthly) > 'unique' (a one-time collection — less frequent than
 * a recurring monthly cadence, so weighted below it) > 'none' (zero real
 * activity in the window, only ever appears on the actual side). Same
 * geometric halving as before 'quotidien' was added (each tier = half the one
 * above), not a literal collections-per-month count.
 */
export const FREQUENCY_WEIGHT: Record<CollectionFrequency, number> = {
  quotidien: 8,
  hebdomadaire: 4,
  bimensuel: 2,
  mensuel: 1,
  unique: 0.5,
  none: 0,
};

export type FrequencyStatus = 'insufficient' | 'adequate' | 'exceeds';

/**
 * Compares planned vs. actual collection frequency for one record.
 * `gap` is positive when the zone is under-served (actual less frequent
 * than planned), zero when it exactly matches, negative when it's served
 * more often than planned.
 */
export function evaluateZoneFrequency(
  planned: PlannedFrequency,
  actual: CollectionFrequency
): { gap: number; status: FrequencyStatus } {
  const gap = FREQUENCY_WEIGHT[planned] - FREQUENCY_WEIGHT[actual];
  const status: FrequencyStatus = gap > 0 ? 'insufficient' : gap < 0 ? 'exceeds' : 'adequate';
  return { gap, status };
}

function mostCommon<T>(values: T[]): T {
  const counts = new Map<T, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  let best = values[0];
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Groups flat (zone × wasteType) records to one row per zone, using the
 * MODE (most common value) of planned/actual frequency across that zone's
 * waste types as the representative pair — not a worst-case pick. A zone
 * with 4 waste types, 3 on-target and 1 mildly under-served, should read
 * as broadly adequate; flagging it "insufficient" over a single off record
 * would make nearly every zone look non-compliant and dilute the signal
 * the whole feature exists to surface. This mirrors Prompt 09's averaging
 * philosophy (central tendency across a zone's records, not the extreme).
 *
 * Result is sorted by `gap` descending (most under-served first) — the
 * "sortable by gap" requirement's default order; callers may re-sort
 * (e.g. ascending, or by zone name) without needing to re-aggregate.
 */
export function aggregateZoneFrequencyRecords(records: ZoneFrequencyRecord[]): ZoneFrequencyIndicator[] {
  const byZone = new Map<string, ZoneFrequencyRecord[]>();
  for (const record of records) {
    const list = byZone.get(record.zoneName) ?? [];
    list.push(record);
    byZone.set(record.zoneName, list);
  }

  const indicators = Array.from(byZone.entries()).map(([zoneName, zoneRecords]) => {
    const plannedFrequency = mostCommon(zoneRecords.map((r) => r.plannedFrequency));
    const actualFrequency = mostCommon(zoneRecords.map((r) => r.actualFrequency));
    const { gap, status } = evaluateZoneFrequency(plannedFrequency, actualFrequency);
    // Representative waste type: one that actually matches the modal pair, else the first.
    const wasteType =
      zoneRecords.find((r) => r.plannedFrequency === plannedFrequency && r.actualFrequency === actualFrequency)
        ?.wasteType ?? zoneRecords[0].wasteType;

    const indicator: ZoneFrequencyIndicator = { zoneName, wasteType, plannedFrequency, actualFrequency, gap, status };
    return indicator;
  });

  return indicators.sort((a, b) => b.gap - a.gap);
}
