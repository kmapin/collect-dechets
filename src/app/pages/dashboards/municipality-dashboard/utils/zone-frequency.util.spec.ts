import { evaluateZoneFrequency, aggregateZoneFrequencyRecords } from './zone-frequency.util';
import type { ZoneFrequencyRecord } from '../mocks/municipality-mock.types';

describe('zone-frequency.util - evaluateZoneFrequency', () => {
  it('flags a zone planned daily but only actually served weekly as insufficient', () => {
    const result = evaluateZoneFrequency('daily', 'weekly');
    expect(result.status).toBe('insufficient');
    expect(result.gap).toBe(30 - 4);
  });

  it('flags a zone planned weekly but only actually served monthly as insufficient', () => {
    const result = evaluateZoneFrequency('weekly', 'monthly');
    expect(result.status).toBe('insufficient');
    expect(result.gap).toBe(4 - 1);
  });

  it('marks a zone as adequate when actual matches planned', () => {
    expect(evaluateZoneFrequency('weekly', 'weekly')).toEqual({ gap: 0, status: 'adequate' });
  });

  it('marks a zone as exceeding when actual is more frequent than planned', () => {
    const result = evaluateZoneFrequency('monthly', 'daily');
    expect(result.status).toBe('exceeds');
    expect(result.gap).toBeLessThan(0);
  });
});

describe('zone-frequency.util - aggregateZoneFrequencyRecords', () => {
  function buildRecord(overrides: Partial<ZoneFrequencyRecord>): ZoneFrequencyRecord {
    return {
      id: 'zf-x',
      zoneName: 'Arrondissement 1',
      wasteType: 'Déchets ménagers',
      plannedFrequency: 'weekly',
      actualFrequency: 'weekly',
      ...overrides,
    };
  }

  it('does NOT flag a zone as insufficient over a single off waste type among otherwise on-target ones (mode wins, not worst-case)', () => {
    const records: ZoneFrequencyRecord[] = [
      buildRecord({ zoneName: 'Zone A', wasteType: 'Déchets ménagers', plannedFrequency: 'weekly', actualFrequency: 'weekly' }),
      buildRecord({ zoneName: 'Zone A', wasteType: 'Organiques', plannedFrequency: 'weekly', actualFrequency: 'weekly' }),
      buildRecord({ zoneName: 'Zone A', wasteType: 'Recyclables', plannedFrequency: 'weekly', actualFrequency: 'weekly' }),
      buildRecord({ zoneName: 'Zone A', wasteType: 'Verre', plannedFrequency: 'weekly', actualFrequency: 'monthly' }), // the one outlier
    ];

    const result = aggregateZoneFrequencyRecords(records);
    expect(result.length).toBe(1);
    expect(result[0].zoneName).toBe('Zone A');
    expect(result[0].status).toBe('adequate'); // 3/4 waste types on target — mode is weekly/weekly
    expect(result[0].gap).toBe(0);
  });

  it('flags a zone as insufficient when MOST of its waste types are under-served', () => {
    const records: ZoneFrequencyRecord[] = [
      buildRecord({ zoneName: 'Zone B', wasteType: 'Déchets ménagers', plannedFrequency: 'daily', actualFrequency: 'weekly' }),
      buildRecord({ zoneName: 'Zone B', wasteType: 'Organiques', plannedFrequency: 'daily', actualFrequency: 'weekly' }),
      buildRecord({ zoneName: 'Zone B', wasteType: 'Recyclables', plannedFrequency: 'daily', actualFrequency: 'weekly' }),
      buildRecord({ zoneName: 'Zone B', wasteType: 'Verre', plannedFrequency: 'daily', actualFrequency: 'daily' }),
    ];

    const result = aggregateZoneFrequencyRecords(records);
    expect(result[0].status).toBe('insufficient'); // mode of actual is weekly, planned is daily
    expect(result[0].actualFrequency).toBe('weekly');
    expect(result[0].gap).toBe(30 - 4);
  });

  it('deliberately includes at least one under-served zone alongside compliant ones', () => {
    const records: ZoneFrequencyRecord[] = [
      buildRecord({ zoneName: 'Zone Compliant', plannedFrequency: 'weekly', actualFrequency: 'weekly' }),
      buildRecord({ zoneName: 'Zone UnderServed', plannedFrequency: 'daily', actualFrequency: 'monthly' }),
    ];

    const result = aggregateZoneFrequencyRecords(records);
    const underServed = result.find((r) => r.zoneName === 'Zone UnderServed');
    const compliant = result.find((r) => r.zoneName === 'Zone Compliant');
    expect(underServed?.status).toBe('insufficient');
    expect(compliant?.status).toBe('adequate');
  });

  it('sorts by gap descending (worst zones first) by default', () => {
    const records: ZoneFrequencyRecord[] = [
      buildRecord({ zoneName: 'Zone Mild', plannedFrequency: 'weekly', actualFrequency: 'monthly' }), // gap 3
      buildRecord({ zoneName: 'Zone Severe', plannedFrequency: 'daily', actualFrequency: 'monthly' }), // gap 29
      buildRecord({ zoneName: 'Zone Fine', plannedFrequency: 'weekly', actualFrequency: 'weekly' }), // gap 0
    ];

    const result = aggregateZoneFrequencyRecords(records);
    expect(result.map((r) => r.zoneName)).toEqual(['Zone Severe', 'Zone Mild', 'Zone Fine']);
  });

  it('returns an empty array for empty input (no crash)', () => {
    expect(aggregateZoneFrequencyRecords([])).toEqual([]);
  });
});
