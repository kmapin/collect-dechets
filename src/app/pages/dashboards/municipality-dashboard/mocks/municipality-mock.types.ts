/**
 * Type surface for the Municipality Dashboard mock layer.
 *
 * Interfaces already declared in `municipality-dashboard.ts` are re-exported
 * here as `import type` (erased at compile time) so this folder never pulls
 * the component class into its bundle and never risks a runtime circular
 * import (the component itself imports `MunicipalityMockDataService`).
 *
 * Only genuinely new shapes — that have no equivalent in the existing
 * dashboard/model files — are declared in this file.
 */
import type {
  MunicipalityStatistics,
  AgencyAudit,
  WasteStatistic,
  ZoneStatistic,
  GroupedZoneStatistics,
  Incident,
} from '../municipality-dashboard';
import type { Collection, CollectionStatus } from '../../../../models/collection.model';
import type { User } from '../../../../models/user.model';

export type {
  MunicipalityStatistics,
  AgencyAudit,
  WasteStatistic,
  ZoneStatistic,
  GroupedZoneStatistics,
  Incident,
};

/**
 * A municipal zone with its raw list of quartiers (neighborhoods).
 * New: nothing in the existing codebase models a zone as "name + id + quartier list" —
 * `ZoneStatistic` is the closest existing type, but it only carries aggregated
 * numbers (agencies/clients/collections counts), not the raw geography.
 */
export interface MunicipalityZone {
  id: string;
  name: string;
  cityName: string;
  countryName: string;
  quartiers: string[];
}

/**
 * The subset of `AgencyAudit` that is still mocked once the agency list
 * itself is real (name/status/clients/collectors/zones come straight from
 * `AgencyService.getAllAgenciesFromApi()`). Kept as a `Pick` rather than a
 * parallel type so enriching a real agency object is a plain object spread,
 * and so field names stay identical if a real per-agency performance
 * endpoint is added later.
 */
export type AgencyPerformanceMetrics = Pick<
  AgencyAudit,
  'completionRate' | 'rating' | 'revenue' | 'collectionsToday' | 'complianceScore' | 'issues'
>;

/**
 * A collector fixture. Reuses the real `User` model (with `role` fixed to
 * `'collector'`) instead of inventing a parallel "Collector" type, and only
 * adds the two fields (`assignedZone`, `primaryWasteType`) that `User` has
 * no place for. `primaryWasteType` backs the "Graphiques de performance"
 * feature (Prompt 09) so each collector fixture can be filtered/grouped by
 * waste type without a separate lookup table.
 */
export interface MockCollector extends User {
  assignedZone: string;
  primaryWasteType: string;
}

/**
 * A single waste-collection record.
 * Reuses `Collection`'s identity/date/status fields (same names) so a future
 * swap to a real `/collections` endpoint keeps field names stable. Adds
 * `zoneName`, `wasteTypeLabel` and `weightKg` because `Collection.wasteTypes`
 * models client-facing sorting guidance (icons, accepted items, ...), not the
 * lightweight "category + weight" pair analytics/charts need. `targetWeightKg`
 * (Prompt 11) is this record's planned/expected weight — see
 * `WASTE_TYPE_TARGET_WEIGHT_KG` — so "Volume Global Collecté" sums actual vs.
 * target from the same shared record set the waste-breakdown and
 * collection-evolution charts already use, not a disconnected number.
 */
export interface MockWasteRecord
  extends Pick<Collection, 'id' | 'agencyId' | 'collectorId' | 'scheduledDate' | 'collectedDate' | 'status'> {
  zoneName: string;
  wasteTypeLabel: string;
  weightKg: number;
  targetWeightKg: number;
}

export type { CollectionStatus };

/**
 * One month of aggregated collection activity.
 * New: no existing interface models a time series point — the dashboard's
 * "Évolution des Collectes" chart is currently a static placeholder with no
 * backing data shape at all.
 */
export interface MonthlyTrendPoint {
  /** e.g. "2026-01" — sortable, locale-agnostic. */
  monthKey: string;
  /** e.g. "Jan 2026" — ready to display as an axis label. */
  label: string;
  totalCollections: number;
  completedCollections: number;
  totalWeightKg: number;
}

/**
 * The "Performance Globale" satisfaction/compliance pair.
 * New: `MunicipalityStatistics.averageRating`/`complianceRate` are the closest
 * existing fields, but they're bundled inside the full aggregated-stats object
 * (derived from ALL agencies) rather than the standalone, narrower-ranged pair
 * this one dashboard card needs — kept separate so a future dedicated endpoint
 * (e.g. a `/statistics/performance-overview`) has a 1:1 shape to return.
 */
export interface PerformanceOverview {
  /** 1–5 stars. */
  averageSatisfaction: number;
  /** 0–100. */
  complianceRate: number;
}

/**
 * "Graphiques de performance" (Prompt 09) — how the bar chart's entries can
 * be grouped. `zone`/`collector` map onto existing geography/collector
 * fixtures; `wasteType` maps onto `WASTE_TYPE_POOL`.
 */
export type PerformanceGroupType = 'zone' | 'wasteType' | 'collector';

/**
 * One collector's actual-vs-target completion rate, tagged with every
 * dimension (zone, waste type, collector) the feature can filter/group by.
 * New: this is a flat "fact" per collector rather than a `targetCompletionRate`
 * field bolted onto `ZoneStatistic`/`AgencyAudit`/`MockCollector` individually —
 * grouping by zone/wasteType/collector and filtering by any of the three at
 * once requires a single record carrying all three dimensions together;
 * scattering the target field across three separate per-entity types would
 * make cross-dimension filtering (e.g. "collector X's zone Y performance for
 * waste type Z") impossible without re-joining them anyway.
 */
export interface PerformanceRecord {
  id: string;
  zoneName: string;
  wasteType: string;
  collectorId: string;
  collectorName: string;
  /** 0–100, actual completion rate. */
  actual: number;
  /** 0–100, target/objective completion rate. */
  target: number;
}

/**
 * One bar-chart entry after grouping+averaging `PerformanceRecord[]` by a
 * `PerformanceGroupType` — e.g. one entry per zone, with `actual`/`target`
 * averaged across every record in that zone.
 */
export interface PerformanceIndicator {
  id: string;
  label: string;
  actual: number;
  target: number;
}

/**
 * "Fréquence de collecte par zone" (Prompt 10). New: no existing model
 * represents "how often is this collected" as a category — `ZoneStatistic`
 * only carries a `coverage` percentage, a different metric (geographic
 * service reach, not collection cadence).
 */
export type CollectionFrequency = 'daily' | 'weekly' | 'monthly';

/**
 * Planned vs. actual collection cadence for one zone × waste type pair.
 * New: flat per-(zone, wasteType) fact, same rationale as `PerformanceRecord`
 * (Prompt 09) — filtering by zone AND waste type at once needs both
 * dimensions on the same record, not scattered across separate per-zone and
 * per-waste-type fields.
 */
export interface ZoneFrequencyRecord {
  id: string;
  zoneName: string;
  wasteType: string;
  plannedFrequency: CollectionFrequency;
  actualFrequency: CollectionFrequency;
}

/**
 * One table row after aggregating `ZoneFrequencyRecord[]` to one entry per
 * zone — see `aggregateZoneFrequencyRecords()` for how the representative
 * waste type/planned/actual triple is chosen (worst-gap-first).
 */
export interface ZoneFrequencyIndicator {
  zoneName: string;
  wasteType: string;
  plannedFrequency: CollectionFrequency;
  actualFrequency: CollectionFrequency;
  /** Positive = under-served (actual less frequent than planned), in "collections/month" units. */
  gap: number;
  status: 'insufficient' | 'adequate' | 'exceeds';
}
