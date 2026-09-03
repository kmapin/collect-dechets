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

// MockWasteRecord supprimée (Prompt 12) : "Volume Global Collecté" est désormais dérivé
// de MonthlyTrendPoint (réel, GET /municipality/monthly-trend) — plus aucun appelant.
// GET /municipality/waste-records (réel, Prompt 12) est la table de faits paginée
// équivalente côté backend.

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
  /** `totalWeightKg` retiré (Prompt 09) : jamais lu nulle part (ni le graphique, ni
   * l'export PDF), et aucune source de poids réelle n'existe dans le schéma backend. */
}

/**
 * The "Performance Globale" satisfaction/compliance pair.
 * No equivalent exists anywhere in the real backend today (confirmed against
 * GET /api/statistics and the rest of the documented API, Prompt 01) — kept as its own
 * shape so a future dedicated endpoint (e.g. `/statistics/performance-overview`) has a
 * 1:1 contract to return, without overloading MunicipalityStatistics.
 */
export interface PerformanceOverview {
  /** 1–5 stars. Toujours `null` côté backend réel (Prompt 07) — aucune entité
   * rating/review/feedback n'existe nulle part dans le schéma actuel. */
  averageSatisfaction: number | null;
  /** 0–100. Agrégat réel (Collected / (total - Cancelled), toutes agences, Prompt 07). */
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
 * "Fréquence de collecte par zone" (Prompt 11, real backend — GET
 * /municipality/zone-frequency). Real enum values from `Planning.frequency`
 * (French terms, not the mock's former `daily|weekly|monthly` placeholders).
 * `PlannedFrequency` has no 'none' variant (a planning always has a
 * `frequency`); `actualFrequency` adds 'none' for zero real activity in the
 * window — see EditRecap.md/EditRecapFront.md for the zone-linkage decision
 * (Collecte has no zone field; actual frequency is computed via
 * Collecte.clientId -> User.address.neighborhood, planned via
 * Planning.quartierId -> Neighborhood.name, reconciled by name).
 */
export type PlannedFrequency = 'unique' | 'quotidien' | 'hebdomadaire' | 'bimensuel' | 'mensuel';
export type CollectionFrequency = PlannedFrequency | 'none';

/**
 * Planned vs. actual collection cadence for one zone × waste type pair.
 * Flat per-(zone, wasteType) fact, same rationale as `PerformanceRecord`
 * (Prompt 09) — filtering by zone AND waste type at once needs both
 * dimensions on the same record, not scattered across separate per-zone and
 * per-waste-type fields. `zoneId` mirrors the backend response but is
 * currently identical to `zoneName` (no stable id spans both zone-identity
 * systems the backend reconciles by name — see EditRecap.md, Prompt 11).
 */
export interface ZoneFrequencyRecord {
  id: string;
  zoneId?: string;
  zoneName: string;
  wasteType: string;
  plannedFrequency: PlannedFrequency;
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
  plannedFrequency: PlannedFrequency;
  actualFrequency: CollectionFrequency;
  /** Positive = under-served (actual less frequent than planned), in "collections/month" units. */
  gap: number;
  status: 'insufficient' | 'adequate' | 'exceeds';
}
