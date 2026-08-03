import { evaluateZoneFrequency, aggregateZoneFrequencyRecords } from './zone-frequency.util';
import type { ZoneFrequencyRecord } from '../mocks/municipality-mock.types';

// Real backend enum (GET /municipality/zone-frequency, Prompt 11): 'hebdomadaire' (weekly)
// > 'bimensuel' (twice a month) > 'mensuel' (monthly) > 'unique' (one-time) > 'none' (actual
// side only, zero real activity) — replaces the mock's former daily/weekly/monthly placeholders.
describe('zone-frequency.util - evaluateZoneFrequency', () => {
  it('flags a zone planned hebdomadaire but only actually served bimensuel as insufficient', () => {
    const result = evaluateZoneFrequency('hebdomadaire', 'bimensuel');
    expect(result.status).toBe('insufficient');
    expect(result.gap).toBe(4 - 2);
  });

  it('flags a zone planned bimensuel but only actually served mensuel as insufficient', () => {
    const result = evaluateZoneFrequency('bimensuel', 'mensuel');
    expect(result.status).toBe('insufficient');
    expect(result.gap).toBe(2 - 1);
  });

  it('marks a zone as adequate when actual matches planned', () => {
    expect(evaluateZoneFrequency('bimensuel', 'bimensuel')).toEqual({ gap: 0, status: 'adequate' });
  });

  it('marks a zone as exceeding when actual is more frequent than planned', () => {
    const result = evaluateZoneFrequency('mensuel', 'hebdomadaire');
    expect(result.status).toBe('exceeds');
    expect(result.gap).toBeLessThan(0);
  });

  it('flags a zone as insufficient when actual is "none" (zero real activity in the window)', () => {
    const result = evaluateZoneFrequency('mensuel', 'none');
    expect(result.status).toBe('insufficient');
    expect(result.gap).toBe(1 - 0);
  });

  it('still flags "none" as insufficient even against the lightest planned frequency (unique)', () => {
    const result = evaluateZoneFrequency('unique', 'none');
    expect(result.status).toBe('insufficient');
    expect(result.gap).toBeGreaterThan(0);
  });
});

describe('zone-frequency.util - aggregateZoneFrequencyRecords', () => {
  function buildRecord(overrides: Partial<ZoneFrequencyRecord>): ZoneFrequencyRecord {
    return {
      id: 'zf-x',
      zoneName: 'Arrondissement 1',
      wasteType: 'menagers',
      plannedFrequency: 'bimensuel',
      actualFrequency: 'bimensuel',
      ...overrides,
    };
  }

  it('does NOT flag a zone as insufficient over a single off waste type among otherwise on-target ones (mode wins, not worst-case)', () => {
    const records: ZoneFrequencyRecord[] = [
      buildRecord({ zoneName: 'Zone A', wasteType: 'menagers', plannedFrequency: 'bimensuel', actualFrequency: 'bimensuel' }),
      buildRecord({ zoneName: 'Zone A', wasteType: 'verts', plannedFrequency: 'bimensuel', actualFrequency: 'bimensuel' }),
      buildRecord({ zoneName: 'Zone A', wasteType: 'recyclables', plannedFrequency: 'bimensuel', actualFrequency: 'bimensuel' }),
      buildRecord({ zoneName: 'Zone A', wasteType: 'speciaux', plannedFrequency: 'bimensuel', actualFrequency: 'mensuel' }), // the one outlier
    ];

    const result = aggregateZoneFrequencyRecords(records);
    expect(result.length).toBe(1);
    expect(result[0].zoneName).toBe('Zone A');
    expect(result[0].status).toBe('adequate'); // 3/4 waste types on target — mode is bimensuel/bimensuel
    expect(result[0].gap).toBe(0);
  });

  it('flags a zone as insufficient when MOST of its waste types are under-served', () => {
    const records: ZoneFrequencyRecord[] = [
      buildRecord({ zoneName: 'Zone B', wasteType: 'menagers', plannedFrequency: 'hebdomadaire', actualFrequency: 'bimensuel' }),
      buildRecord({ zoneName: 'Zone B', wasteType: 'verts', plannedFrequency: 'hebdomadaire', actualFrequency: 'bimensuel' }),
      buildRecord({ zoneName: 'Zone B', wasteType: 'recyclables', plannedFrequency: 'hebdomadaire', actualFrequency: 'bimensuel' }),
      buildRecord({ zoneName: 'Zone B', wasteType: 'speciaux', plannedFrequency: 'hebdomadaire', actualFrequency: 'hebdomadaire' }),
    ];

    const result = aggregateZoneFrequencyRecords(records);
    expect(result[0].status).toBe('insufficient'); // mode of actual is bimensuel, planned is hebdomadaire
    expect(result[0].actualFrequency).toBe('bimensuel');
    expect(result[0].gap).toBe(4 - 2);
  });

  it('deliberately includes at least one under-served zone alongside compliant ones', () => {
    const records: ZoneFrequencyRecord[] = [
      buildRecord({ zoneName: 'Zone Compliant', plannedFrequency: 'bimensuel', actualFrequency: 'bimensuel' }),
      buildRecord({ zoneName: 'Zone UnderServed', plannedFrequency: 'hebdomadaire', actualFrequency: 'mensuel' }),
    ];

    const result = aggregateZoneFrequencyRecords(records);
    const underServed = result.find((r) => r.zoneName === 'Zone UnderServed');
    const compliant = result.find((r) => r.zoneName === 'Zone Compliant');
    expect(underServed?.status).toBe('insufficient');
    expect(compliant?.status).toBe('adequate');
  });

  it('flags a zone as insufficient when its actual frequency is "none" (no matching real activity)', () => {
    const records: ZoneFrequencyRecord[] = [
      buildRecord({ zoneName: 'Zone NoActivity', plannedFrequency: 'mensuel', actualFrequency: 'none' }),
    ];

    const result = aggregateZoneFrequencyRecords(records);
    expect(result[0].status).toBe('insufficient');
    expect(result[0].actualFrequency).toBe('none');
  });

  it('sorts by gap descending (worst zones first) by default', () => {
    const records: ZoneFrequencyRecord[] = [
      buildRecord({ zoneName: 'Zone Mild', plannedFrequency: 'bimensuel', actualFrequency: 'mensuel' }), // gap 1
      buildRecord({ zoneName: 'Zone Severe', plannedFrequency: 'hebdomadaire', actualFrequency: 'none' }), // gap 4
      buildRecord({ zoneName: 'Zone Fine', plannedFrequency: 'bimensuel', actualFrequency: 'bimensuel' }), // gap 0
    ];

    const result = aggregateZoneFrequencyRecords(records);
    expect(result.map((r) => r.zoneName)).toEqual(['Zone Severe', 'Zone Mild', 'Zone Fine']);
  });

  it('returns an empty array for empty input (no crash)', () => {
    expect(aggregateZoneFrequencyRecords([])).toEqual([]);
  });
});
