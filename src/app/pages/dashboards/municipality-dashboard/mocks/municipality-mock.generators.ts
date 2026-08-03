/**
 * Pure, deterministic generator functions for the Municipality Dashboard mocks.
 *
 * Every function here takes its randomness as an explicit `seed` (or a
 * `RandomFn` derived from one) and returns a freshly-built array/object —
 * no module-level mutable state, no `Math.random()`, no reliance on
 * previous calls. Same seed + same params => same output, every time.
 */
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
  MUNICIPALITY_ZONES,
  AGENCY_NAME_POOL,
  AGENCY_STATUS_POOL,
  AGENCY_ISSUE_POOL,
  COLLECTOR_FIRST_NAMES,
  COLLECTOR_LAST_NAMES,
  WASTE_TYPE_POOL,
} from './municipality-mock.constants';
import type {
  MunicipalityZone,
  MockCollector,
  AgencyAudit,
  ZoneStatistic,
  GroupedZoneStatistics,
  AgencyPerformanceMetrics,
  PerformanceRecord,
} from './municipality-mock.types';

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

// generateWasteRecords() supprimée (Prompt 12) : "Volume Global Collecté" était son
// dernier appelant réel (via MunicipalityMockDataService.getWasteRecords$()) — cette
// section est désormais dérivée de GET /municipality/monthly-trend (réel, Prompt 09),
// plus aucun appelant. GET /municipality/waste-records (réel, Prompt 12) la remplace
// aussi côté "table de faits" — voir services/municipality.service.js (backend).

// generateWasteStatistics() supprimée (Prompt 08) : GET /municipality/waste-statistics
// est maintenant réel (voir MunicipalityDashboard.loadWasteStatistics()) — plus aucun
// appelant.

// generateMonthlyTrend() supprimée (Prompt 09) : GET /municipality/monthly-trend est
// maintenant réel (voir MunicipalityDashboard.loadMonthlyTrend()) — plus aucun appelant.

// generatePerformanceOverview() supprimée (Prompt 07) : GET /municipality/performance-overview
// est maintenant réel — plus aucun appelant. Le générateur inventait
// `averageSatisfaction` (aléatoire, 3.8–4.6) alors qu'aucune entité rating/review
// n'existe nulle part dans le schéma backend réel — corrigé en `null` explicite plutôt
// que remplacé par un autre calcul fabriqué.

// generateIncidents() supprimée (Prompt 06) : plus aucun appelant réel
// (MunicipalityMockDataService.getIncidents() n'était appelée par aucun dashboard —
// this.incidents est chargé depuis loadAllSignalements(), le vrai
// GET /api/collecte/all, depuis le Prompt 03). Le générateur écrivait aussi `assignedTo`,
// un champ mock retiré de l'interface Incident réelle (Prompt 06, voir
// municipality-dashboard.ts) au profit du vrai `assignedTeamId`.

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

export type { RandomFn };
