import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  DEFAULT_SEED,
  MOCK_NETWORK_DELAY_MS,
  WASTE_TYPE_POOL,
  FULL_HISTORY_DAYS,
  ZONE_COORDINATES,
} from './municipality-mock.constants';
import {
  generateZones,
  generateCollectors,
  generateAgencyAudits,
  generateWasteRecords,
  generateWasteStatistics,
  generateMonthlyTrend,
  generateIncidents,
  generateGroupedZoneStatistics,
  generateMunicipalityStatistics,
  generatePerformanceOverview,
  generateAgencyPerformanceMetrics,
  generatePerformanceRecords,
  generateZoneFrequencyRecords,
} from './municipality-mock.generators';
import type {
  MunicipalityZone,
  MockCollector,
  MockWasteRecord,
  MonthlyTrendPoint,
  AgencyAudit,
  WasteStatistic,
  Incident,
  GroupedZoneStatistics,
  MunicipalityStatistics,
  PerformanceOverview,
  AgencyPerformanceMetrics,
  PerformanceRecord,
  ZoneFrequencyRecord,
} from './municipality-mock.types';

/**
 * Single entry point for every Municipality Dashboard mock fixture.
 *
 * In-memory only (no localStorage/sessionStorage) — fixtures are
 * regenerated from their seed on every app load/injection, per the
 * project's Angular conventions. Every method mirrors, in name and
 * return shape, a real (or planned) backend call so it can be swapped
 * for an HTTP call later without touching call sites beyond the
 * injected service — see the README in this folder for the mapping.
 */
@Injectable({ providedIn: 'root' })
export class MunicipalityMockDataService {
  getZones(): MunicipalityZone[] {
    return generateZones();
  }

  getCollectors(count = 24, seed: number = DEFAULT_SEED): MockCollector[] {
    return generateCollectors(count, seed);
  }

  getAgencyAudits(count = 15, seed: number = DEFAULT_SEED): AgencyAudit[] {
    return generateAgencyAudits(count, seed);
  }

  /**
   * Defaults to FULL_HISTORY_DAYS (not a smaller window) — this is the
   * shared full record set behind getWasteStatistics(), getMonthlyTrend(),
   * and Volume Global Collecté (Prompt 11); callers wanting a specific
   * recent window should filter the returned array by `scheduledDate`
   * rather than requesting a smaller `days` value here (see
   * generateWasteRecords()'s own comment for why a different `days` value
   * would desync "the same calendar day" between features).
   */
  getWasteRecords(days = FULL_HISTORY_DAYS, seed: number = DEFAULT_SEED): MockWasteRecord[] {
    return generateWasteRecords(days, seed);
  }

  /** Same data as getWasteRecords(), wrapped as an Observable — see getWasteStatistics$() for why. */
  getWasteRecords$(days = FULL_HISTORY_DAYS, seed: number = DEFAULT_SEED): Observable<MockWasteRecord[]> {
    return of(this.getWasteRecords(days, seed)).pipe(delay(MOCK_NETWORK_DELAY_MS));
  }

  getWasteStatistics(days = 30, seed: number = DEFAULT_SEED): WasteStatistic[] {
    return generateWasteStatistics(days, seed);
  }

  /**
   * Same data as getWasteStatistics(), wrapped as an Observable with a
   * simulated network delay so a real loading state is visible/testable —
   * mirrors the shape of a real HTTP call (`.subscribe({ next, error })`)
   * so swapping this for `this.http.get(...)` later is a body-only change.
   */
  getWasteStatistics$(days = 30, seed: number = DEFAULT_SEED): Observable<WasteStatistic[]> {
    return of(this.getWasteStatistics(days, seed)).pipe(delay(MOCK_NETWORK_DELAY_MS));
  }

  getMonthlyTrend(months = 12, seed: number = DEFAULT_SEED): MonthlyTrendPoint[] {
    return generateMonthlyTrend(months, seed);
  }

  /** Same data as getMonthlyTrend(), wrapped as an Observable — see getWasteStatistics$() for why. */
  getMonthlyTrend$(months = 12, seed: number = DEFAULT_SEED): Observable<MonthlyTrendPoint[]> {
    return of(this.getMonthlyTrend(months, seed)).pipe(delay(MOCK_NETWORK_DELAY_MS));
  }

  getIncidents(count = 20, seed: number = DEFAULT_SEED): Incident[] {
    return generateIncidents(count, seed);
  }

  getZoneStatistics(seed: number = DEFAULT_SEED): GroupedZoneStatistics[] {
    return generateGroupedZoneStatistics(seed);
  }

  getMunicipalityStatistics(seed: number = DEFAULT_SEED): MunicipalityStatistics {
    return generateMunicipalityStatistics(seed);
  }

  getPerformanceOverview(seed: number = DEFAULT_SEED): PerformanceOverview {
    return generatePerformanceOverview(seed);
  }

  getAgencyPerformanceMetrics(agencyId: string, seed: number = DEFAULT_SEED): AgencyPerformanceMetrics {
    return generateAgencyPerformanceMetrics(agencyId, seed);
  }

  /** Waste category labels — for populating the "Type de déchet" filter dropdown. */
  getWasteTypeLabels(): string[] {
    return WASTE_TYPE_POOL.map((w) => w.label);
  }

  getPerformanceRecords(seed: number = DEFAULT_SEED): PerformanceRecord[] {
    return generatePerformanceRecords(seed);
  }

  /** Same data as getPerformanceRecords(), wrapped as an Observable — see getWasteStatistics$() for why. */
  getPerformanceRecords$(seed: number = DEFAULT_SEED): Observable<PerformanceRecord[]> {
    return of(this.getPerformanceRecords(seed)).pipe(delay(MOCK_NETWORK_DELAY_MS));
  }

  getZoneFrequencyRecords(seed: number = DEFAULT_SEED): ZoneFrequencyRecord[] {
    return generateZoneFrequencyRecords(seed);
  }

  /** Same data as getZoneFrequencyRecords(), wrapped as an Observable — see getWasteStatistics$() for why. */
  getZoneFrequencyRecords$(seed: number = DEFAULT_SEED): Observable<ZoneFrequencyRecord[]> {
    return of(this.getZoneFrequencyRecords(seed)).pipe(delay(MOCK_NETWORK_DELAY_MS));
  }

  /**
   * Coverage Map (Prompt 13) — mock coordinates only, no real GPS data in
   * scope yet. Looks up by zone/city name so callers stay in sync with
   * whatever `zoneStatistics`/`MunicipalityZone` names are already on
   * screen, rather than a separate id scheme.
   */
  getZoneCoordinates(zoneName: string): [number, number] | null {
    return ZONE_COORDINATES[zoneName] ?? null;
  }
}
