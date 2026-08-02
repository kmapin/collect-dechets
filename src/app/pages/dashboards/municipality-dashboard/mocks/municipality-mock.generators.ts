/**
 * Pure, deterministic generator functions for the Municipality Dashboard mocks.
 *
 * Every function here takes its randomness as an explicit `seed` (or a
 * `RandomFn` derived from one) and returns a freshly-built array/object —
 * no module-level mutable state, no `Math.random()`, no reliance on
 * previous calls. Same seed + same params => same output, every time.
 */
import { CollectionStatus } from '../../../../models/collection.model';
import { UserRole } from '../../../../models/user.model';
import {
  createSeededRandom,
  pickOne,
  pickSome,
  pickWeighted,
  randomFloat,
  randomInt,
  chance,
  hashStringToSeed,
  type RandomFn,
} from './seeded-random';
import {
  DEFAULT_SEED,
  FULL_HISTORY_DAYS,
  MUNICIPALITY_ZONES,
  AGENCY_NAME_POOL,
  AGENCY_STATUS_POOL,
  AGENCY_ISSUE_POOL,
  COLLECTOR_FIRST_NAMES,
  COLLECTOR_LAST_NAMES,
  WASTE_TYPE_POOL,
  WASTE_TYPE_BASELINE_FREQUENCY,
  WASTE_TYPE_TARGET_WEIGHT_KG,
  INCIDENT_TYPE_POOL,
  INCIDENT_SEVERITY_POOL,
  INCIDENT_STATUS_POOL,
  INCIDENT_COMMENT_POOL,
} from './municipality-mock.constants';
import type {
  MunicipalityZone,
  MockCollector,
  MockWasteRecord,
  MonthlyTrendPoint,
  AgencyAudit,
  WasteStatistic,
  Incident,
  ZoneStatistic,
  GroupedZoneStatistics,
  MunicipalityStatistics,
  PerformanceOverview,
  AgencyPerformanceMetrics,
  PerformanceRecord,
  CollectionFrequency,
  ZoneFrequencyRecord,
} from './municipality-mock.types';

const FREQUENCY_TIERS: CollectionFrequency[] = ['daily', 'weekly', 'monthly'];

function shiftFrequency(freq: CollectionFrequency, steps: number): CollectionFrequency {
  const index = FREQUENCY_TIERS.indexOf(freq);
  const clamped = Math.min(FREQUENCY_TIERS.length - 1, Math.max(0, index + steps));
  return FREQUENCY_TIERS[clamped];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function generateZones(): MunicipalityZone[] {
  // Purely reused reference data — no randomness involved.
  return MUNICIPALITY_ZONES;
}

export function generateCollectors(count = 24, seed: number = DEFAULT_SEED): MockCollector[] {
  const random = createSeededRandom(seed + 1);
  const zones = generateZones();
  const now = new Date().toISOString();

  return Array.from({ length: count }, (_, index) => {
    const firstName = pickOne(random, COLLECTOR_FIRST_NAMES);
    const lastName = pickOne(random, COLLECTOR_LAST_NAMES);
    const zone = pickOne(random, zones);
    const id = `collector-${index + 1}-${slugify(firstName)}`;

    const collector: MockCollector = {
      _id: id,
      id,
      firstName,
      lastName,
      email: `${slugify(firstName)}.${slugify(lastName)}@collecte-dechets.bf`,
      role: UserRole.COLLECTOR,
      phone: `+226${randomInt(random, 70000000, 79999999)}`,
      address: {
        street: `Rue ${randomInt(random, 1, 40)}.${randomInt(random, 1, 20)}`,
        arrondissement: zone.name,
        sector: `Secteur ${randomInt(random, 1, 55)}`,
        doorNumber: `${randomInt(random, 1, 300)}`,
        doorColor: pickOne(random, ['Bleu', 'Vert', 'Rouge', 'Jaune']),
        neighborhood: pickOne(random, zone.quartiers),
        city: zone.cityName,
        postalCode: '01BP',
      },
      status: chance(random, 0.9) ? 'active' : 'inactive',
      acceptTerms: true,
      receiveOffers: chance(random, 0.5),
      createdAt: now,
      updatedAt: now,
      assignedZone: zone.name,
      primaryWasteType: pickWeighted(
        random,
        WASTE_TYPE_POOL,
        WASTE_TYPE_POOL.map((w) => w.baseSharePct)
      ).label,
    };
    return collector;
  });
}

export function generateAgencyAudits(count = 15, seed: number = DEFAULT_SEED): AgencyAudit[] {
  const random = createSeededRandom(seed + 2);
  const names = pickSome(random, AGENCY_NAME_POOL, Math.min(count, AGENCY_NAME_POOL.length));
  // If more agencies are requested than the name pool has, extend with numbered variants.
  while (names.length < count) {
    names.push(`${pickOne(random, AGENCY_NAME_POOL)} ${names.length + 1}`);
  }

  return names.slice(0, count).map((name, index) => {
    const status = pickOne(random, AGENCY_STATUS_POOL);
    const isActive = status === 'active';
    // Deliberately non-uniform: completion/rating/compliance vary per agency
    // so "top performing" vs "underperforming" comparisons are meaningful.
    const completionRate = isActive ? randomInt(random, 60, 98) : randomInt(random, 0, 55);
    const complianceScore = isActive ? randomInt(random, 65, 99) : randomInt(random, 40, 70);
    const rating = isActive ? randomFloat(random, 3.2, 4.9, 1) : randomFloat(random, 2.0, 3.5, 1);
    const clients = randomInt(random, 150, 3200);
    const collectors = randomInt(random, 2, 12);
    const zones = randomInt(random, 1, 5);
    const collectionsToday = isActive ? randomInt(random, 20, 160) : 0;
    const revenue = isActive ? randomInt(random, 8000, 42000) : randomInt(random, 0, 4000);
    const issues = complianceScore < 85 ? pickSome(random, AGENCY_ISSUE_POOL, randomInt(random, 1, 3)) : [];

    const agency: AgencyAudit = {
      id: `agency-${index + 1}-${slugify(name)}`,
      name,
      status,
      clients,
      collectors,
      zones,
      collectionsToday,
      completionRate,
      rating,
      revenue,
      lastAudit: new Date(Date.now() - randomInt(random, 1, 60) * 86_400_000),
      complianceScore,
      issues,
    };
    return agency;
  });
}

/**
 * Deterministic per-agency performance enrichment, keyed by the agency's
 * REAL id (not a generated one) — same id always yields the same numbers,
 * so refreshing the page or re-filtering the agency list doesn't reshuffle
 * who looks like a top/bottom performer.
 */
export function generateAgencyPerformanceMetrics(
  agencyId: string,
  seed: number = DEFAULT_SEED
): AgencyPerformanceMetrics {
  const random = createSeededRandom(hashStringToSeed(agencyId) ^ seed);

  // ~20% of agencies are genuine non-compliance outliers so "poor" compliance
  // badges are actually visible in the UI, not just theoretically possible.
  const isComplianceOutlier = chance(random, 0.2);
  const complianceScore = isComplianceOutlier ? randomInt(random, 40, 69) : randomInt(random, 70, 100);
  const completionRate = randomInt(random, 55, 98);
  const rating = randomFloat(random, 2.8, 4.9, 1);
  const revenue = randomInt(random, 15_000, 2_500_000);
  const collectionsToday = randomInt(random, 0, 40);
  const issues = complianceScore < 70 ? pickSome(random, AGENCY_ISSUE_POOL, randomInt(random, 1, 3)) : [];

  return { completionRate, rating, revenue, collectionsToday, complianceScore, issues };
}

/**
 * One "actual vs target" record per collector — the finest granularity
 * naturally available in the mock fixtures — tagged with its zone and
 * primary waste type so the Performance Indicators feature (Prompt 09)
 * can filter/group by any of the three dimensions from a single flat list,
 * instead of three separate per-entity `targetCompletionRate` fields that
 * couldn't be cross-filtered without re-joining them anyway.
 *
 * `target` varies mildly per collector (78–92, a plausible per-collector
 * negotiated objective) and `actual` is `target + delta` with a wide delta
 * spread (-35..+20) so under/on-target/over-target cases are all common —
 * never "actual ≈ target for everyone".
 */
export function generatePerformanceRecords(seed: number = DEFAULT_SEED): PerformanceRecord[] {
  const random = createSeededRandom(seed + 9);
  const collectors = generateCollectors(24, seed);

  return collectors.map((collector, index) => {
    const target = randomInt(random, 78, 92);
    const delta = randomInt(random, -35, 20);
    const actual = Math.min(100, Math.max(0, target + delta));

    const record: PerformanceRecord = {
      id: `perf-${index + 1}-${collector.id}`,
      zoneName: collector.assignedZone,
      wasteType: collector.primaryWasteType,
      collectorId: collector.id!,
      collectorName: `${collector.firstName} ${collector.lastName}`,
      actual,
      target,
    };
    return record;
  });
}

/**
 * One planned-vs-actual collection frequency record per (zone × waste type)
 * pair (12 zones × 4 waste types = 48 records) — "Fréquence de collecte par
 * zone" (Prompt 10). Planned frequency defaults to the waste type's realistic
 * municipal baseline (see WASTE_TYPE_BASELINE_FREQUENCY), with a ~15% chance
 * of a per-zone deviation so it isn't identical everywhere. Actual frequency
 * deliberately under-shoots planned ~35% of the time (matches roughly, most
 * of the time; occasionally exceeds) — genuine under-served zones exist,
 * never "actual ≈ planned for everyone".
 */
export function generateZoneFrequencyRecords(seed: number = DEFAULT_SEED): ZoneFrequencyRecord[] {
  const random = createSeededRandom(seed + 10);
  const zones = generateZones();
  const records: ZoneFrequencyRecord[] = [];

  for (const zone of zones) {
    for (const wasteType of WASTE_TYPE_POOL) {
      const baseline = WASTE_TYPE_BASELINE_FREQUENCY[wasteType.label] ?? 'weekly';
      const plannedFrequency = chance(random, 0.15) ? shiftFrequency(baseline, pickOne(random, [-1, 1])) : baseline;

      const roll = random();
      let actualFrequency: CollectionFrequency;
      if (roll < 0.35) {
        actualFrequency = shiftFrequency(plannedFrequency, randomInt(random, 1, 2)); // under-served
      } else if (roll < 0.85) {
        actualFrequency = plannedFrequency; // on target
      } else {
        actualFrequency = shiftFrequency(plannedFrequency, -1); // exceeds
      }

      records.push({
        id: `zf-${slugify(zone.name)}-${slugify(wasteType.label)}`,
        zoneName: zone.name,
        wasteType: wasteType.label,
        plannedFrequency,
        actualFrequency,
      });
    }
  }

  return records;
}

/**
 * The single shared record set behind the Waste Breakdown chart (07),
 * Collection Evolution chart (08), and Volume Global Collecté (11) — always
 * generate the FULL history (see FULL_HISTORY_DAYS) and have every feature
 * filter this same array down to its own window/scope, rather than each
 * calling this with its own `days` value (which would shift the PRNG stream
 * and desync what "the same calendar day" contains between features).
 */
export function generateWasteRecords(days = FULL_HISTORY_DAYS, seed: number = DEFAULT_SEED): MockWasteRecord[] {
  const random = createSeededRandom(seed + 3);
  const zones = generateZones();
  const agencies = generateAgencyAudits(15, seed);
  const collectors = generateCollectors(24, seed);
  const records: MockWasteRecord[] = [];

  // Persistent per-zone bias (some zones systematically over/under-collect
  // relative to target) rather than pure per-record noise: with hundreds of
  // records per zone, symmetric per-record noise alone averages out to ~100%
  // of target for every zone regardless of sample size (law of large
  // numbers), making the under/on-target/over distinction never actually
  // appear in aggregates. A persistent multiplier survives aggregation.
  const zoneBiasByName = new Map(
    zones.map((zone) => [zone.name, randomFloat(createSeededRandom(hashStringToSeed(zone.name)), 0.65, 1.35, 2)])
  );

  for (let dayOffset = days - 1; dayOffset >= 0; dayOffset--) {
    const dayDate = new Date(Date.now() - dayOffset * 86_400_000);
    const recordsPerDay = randomInt(random, 15, 40);

    for (let i = 0; i < recordsPerDay; i++) {
      const zone = pickOne(random, zones);
      const agency = pickOne(random, agencies);
      const collector = pickOne(random, collectors);
      const wasteType = pickWeighted(
        random,
        WASTE_TYPE_POOL,
        WASTE_TYPE_POOL.map((w) => w.baseSharePct)
      );
      const isCompleted = chance(random, 0.85);
      const scheduledDate = new Date(dayDate);
      const targetWeightKg = WASTE_TYPE_TARGET_WEIGHT_KG[wasteType.label] ?? 70;
      const zoneBias = zoneBiasByName.get(zone.name) ?? 1;

      records.push({
        id: `waste-${dayOffset}-${i}-${slugify(zone.name)}`,
        agencyId: agency.id,
        collectorId: collector.id!,
        scheduledDate,
        collectedDate: isCompleted ? scheduledDate : undefined,
        status: isCompleted ? CollectionStatus.COLLECTED : CollectionStatus.SCHEDULED,
        zoneName: zone.name,
        wasteTypeLabel: wasteType.label,
        weightKg: Math.max(5, targetWeightKg * zoneBias + randomFloat(random, -15, 15, 1)),
        targetWeightKg,
      });
    }
  }

  return records;
}

function filterRecordsWithinDays(records: MockWasteRecord[], days: number): MockWasteRecord[] {
  const cutoff = Date.now() - days * 86_400_000;
  return records.filter((record) => record.scheduledDate.getTime() >= cutoff);
}

export function generateWasteStatistics(days = 30, seed: number = DEFAULT_SEED): WasteStatistic[] {
  const random = createSeededRandom(seed + 4);
  const records = filterRecordsWithinDays(generateWasteRecords(FULL_HISTORY_DAYS, seed), days);
  const totalsByType = new Map<string, number>();

  for (const record of records) {
    totalsByType.set(record.wasteTypeLabel, (totalsByType.get(record.wasteTypeLabel) ?? 0) + record.weightKg);
  }

  const totalWeight = Array.from(totalsByType.values()).reduce((sum, value) => sum + value, 0) || 1;

  const stats = WASTE_TYPE_POOL.map((wasteType) => {
    const quantityKg = totalsByType.get(wasteType.label) ?? 0;
    const isAboveBaseline = quantityKg / totalWeight > wasteType.baseSharePct / 100;
    const stat: WasteStatistic = {
      type: wasteType.label,
      quantity: Math.round(quantityKg / 1000), // tonnes, matching the "{{ waste.quantity }}t" template
      percentage: Math.round((quantityKg / totalWeight) * 100),
      trend: isAboveBaseline ? 'up' : chance(random, 0.5) ? 'down' : 'stable',
      color: wasteType.color,
    };
    return stat;
  });

  // Independent per-category rounding can drift the sum by ±1-2 points;
  // correct it on the largest category so the legend/chart always reads 100%.
  const roundedTotal = stats.reduce((sum, s) => sum + s.percentage, 0);
  if (roundedTotal !== 100 && stats.length > 0) {
    const largest = stats.reduce((max, s) => (s.percentage > max.percentage ? s : max), stats[0]);
    largest.percentage += 100 - roundedTotal;
  }

  return stats;
}

/**
 * Derived from the SAME shared `generateWasteRecords()` full-history set
 * used by the waste-breakdown chart (07) and Volume Global Collecté (11) —
 * grouped by calendar month — instead of an independent random walk, so the
 * three features tell one consistent volume/collections story rather than
 * each showing a different number for "how much was collected."
 */
export function generateMonthlyTrend(months = 12, seed: number = DEFAULT_SEED): MonthlyTrendPoint[] {
  const records = generateWasteRecords(FULL_HISTORY_DAYS, seed);
  const points: MonthlyTrendPoint[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
    const label = monthDate.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });

    const monthRecords = records.filter(
      (record) =>
        record.scheduledDate.getFullYear() === monthDate.getFullYear() &&
        record.scheduledDate.getMonth() === monthDate.getMonth()
    );
    const completedRecords = monthRecords.filter((record) => record.status === CollectionStatus.COLLECTED);

    points.push({
      monthKey,
      label,
      totalCollections: monthRecords.length,
      completedCollections: completedRecords.length,
      totalWeightKg: Math.round(completedRecords.reduce((sum, record) => sum + record.weightKg, 0)),
    });
  }

  return points;
}

/**
 * "Performance Globale" satisfaction/compliance pair — bounds are narrower
 * and independent from the agency-level ranges used in
 * `generateAgencyAudits()` because this card represents a municipality-wide
 * snapshot, not a single agency's score.
 */
export function generatePerformanceOverview(seed: number = DEFAULT_SEED): PerformanceOverview {
  const random = createSeededRandom(seed + 8);
  return {
    averageSatisfaction: randomFloat(random, 3.8, 4.6, 1),
    complianceRate: randomInt(random, 78, 96),
  };
}

export function generateIncidents(count = 20, seed: number = DEFAULT_SEED): Incident[] {
  const random = createSeededRandom(seed + 6);
  const agencies = generateAgencyAudits(15, seed);
  const collectors = generateCollectors(24, seed);

  return Array.from({ length: count }, (_, index) => {
    const agency = pickOne(random, agencies);
    const hasCollector = chance(random, 0.5);
    const collector = pickOne(random, collectors);
    const status = pickOne(random, INCIDENT_STATUS_POOL);

    const incident: Incident = {
      _id: `incident-${index + 1}`,
      agency: { _id: agency.id, name: agency.name },
      agencyId: { _id: agency.id, name: agency.name },
      clientId: {
        _id: `client-${index + 1}`,
        firstName: pickOne(random, COLLECTOR_FIRST_NAMES),
        lastName: pickOne(random, COLLECTOR_LAST_NAMES),
        email: `client${index + 1}@example.com`,
      },
      collectorId: hasCollector
        ? { _id: collector.id!, firstName: collector.firstName, lastName: collector.lastName, email: collector.email }
        : undefined,
      photos: [],
      agencyName: agency.name,
      type: pickOne(random, INCIDENT_TYPE_POOL),
      comment: pickOne(random, INCIDENT_COMMENT_POOL),
      description: pickOne(random, INCIDENT_COMMENT_POOL),
      severity: pickOne(random, INCIDENT_SEVERITY_POOL),
      date: new Date(Date.now() - randomInt(random, 0, 45) * 86_400_000),
      status,
      assignedTo: status !== 'open' ? `${collector.firstName} ${collector.lastName}` : undefined,
    };
    return incident;
  });
}

export function generateGroupedZoneStatistics(seed: number = DEFAULT_SEED): GroupedZoneStatistics[] {
  const random = createSeededRandom(seed + 7);
  const zones = generateZones();

  const cities: ZoneStatistic[] = zones.map((zone) => {
    const stat: ZoneStatistic = {
      cities: [],
      country: zone.countryName,
      name: zone.name,
      agencies: randomInt(random, 1, 5),
      clients: randomInt(random, 400, 3200),
      collections: randomInt(random, 60, 260),
      coverage: randomInt(random, 55, 99),
      incidents: randomInt(random, 0, 6),
    };
    return stat;
  });

  return [
    {
      country: zones[0]?.countryName ?? 'Burkina Faso',
      cities,
    },
  ];
}

export function generateMunicipalityStatistics(seed: number = DEFAULT_SEED): MunicipalityStatistics {
  const agencies = generateAgencyAudits(15, seed);
  const incidents = generateIncidents(20, seed);
  const collectors = generateCollectors(24, seed);
  const monthly = generateMonthlyTrend(1, seed)[0];

  const activeAgencies = agencies.filter((a) => a.status === 'active').length;
  const totalClients = agencies.reduce((sum, a) => sum + a.clients, 0);
  const totalRevenue = agencies.reduce((sum, a) => sum + a.revenue, 0);
  const averageRating = agencies.reduce((sum, a) => sum + a.rating, 0) / (agencies.length || 1);
  const averageCompliance = agencies.reduce((sum, a) => sum + a.complianceScore, 0) / (agencies.length || 1);
  const pending = incidents.filter((i) => i.status === 'open' || i.status === 'pending').length;
  const resolved = incidents.filter((i) => i.status === 'resolved').length;

  const stats: MunicipalityStatistics = {
    totalAgencies: agencies.length,
    activeAgencies,
    totalClients,
    totalCollectors: collectors.length,
    todayCollections: monthly.totalCollections,
    reportsFromClients: {
      total: incidents.length,
      resolved,
      pending,
    },
    completeCollections: monthly.completedCollections,
    totalRevenue,
    averageRating: Math.round(averageRating * 10) / 10,
    pendingReports: pending,
    complianceRate: Math.round(averageCompliance),
  };
  return stats;
}

export type { RandomFn };
