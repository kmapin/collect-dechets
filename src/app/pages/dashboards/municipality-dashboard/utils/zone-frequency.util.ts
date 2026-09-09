import type { CollectionFrequency, PlannedFrequency, ZoneFrequencyRecord, ZoneFrequencyIndicator } from '../mocks/municipality-mock.types';


export const FREQUENCY_WEIGHT: Record<CollectionFrequency, number> = {
  quotidien: 8,
  hebdomadaire: 4,
  bimensuel: 2,
  mensuel: 1,
  unique: 0.5,
  none: 0,
};

export type FrequencyStatus = 'insufficient' | 'adequate' | 'exceeds';


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
    const wasteType =
      zoneRecords.find((r) => r.plannedFrequency === plannedFrequency && r.actualFrequency === actualFrequency)
        ?.wasteType ?? zoneRecords[0].wasteType;

    const indicator: ZoneFrequencyIndicator = { zoneName, wasteType, plannedFrequency, actualFrequency, gap, status };
    return indicator;
  });

  return indicators.sort((a, b) => b.gap - a.gap);
}
