import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  DEFAULT_SEED,
  MOCK_NETWORK_DELAY_MS,
  WASTE_TYPE_POOL,
  ZONE_COORDINATES,
} from './municipality-mock.constants';
import {
  generateZones,
  generateCollectors,
  generateAgencyAudits,
  generateGroupedZoneStatistics,
  generateAgencyPerformanceMetrics,
  generatePerformanceRecords,
} from './municipality-mock.generators';
import type {
  MunicipalityZone,
  MockCollector,
  AgencyAudit,
  GroupedZoneStatistics,
  AgencyPerformanceMetrics,
  PerformanceRecord,
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

  // getWasteRecords()/getWasteRecords$() supprimées (Prompt 12) : "Volume Global
  // Collecté" est désormais dérivé de GET /municipality/monthly-trend (réel, Prompt 09)
  // — voir MunicipalityDashboard.loadMonthlyTrend() / utils/volume.util.ts. GET
  // /municipality/waste-records (réel, Prompt 12) est la table de faits paginée
  // équivalente côté backend — plus aucun appelant mock.

  // getWasteStatistics()/getWasteStatistics$() supprimées (Prompt 08) : GET
  // /municipality/waste-statistics est maintenant réel (voir
  // MunicipalityDashboard.loadWasteStatistics()) — plus aucun appelant.

  // getMonthlyTrend()/getMonthlyTrend$() supprimées (Prompt 09) : GET
  // /municipality/monthly-trend est maintenant réel (voir
  // MunicipalityDashboard.loadMonthlyTrend()) — plus aucun appelant.

  // getIncidents() supprimée (Prompt 06) — plus aucun appelant réel, voir
  // municipality-mock.generators.ts (generateIncidents() supprimée pour la même raison).

  getZoneStatistics(seed: number = DEFAULT_SEED): GroupedZoneStatistics[] {
    return generateGroupedZoneStatistics(seed);
  }

  // getMunicipalityStatistics() supprimée (Prompt 01) : MunicipalityStatistics est
  // maintenant entièrement réel (GET /api/statistics, voir MunicipalityDashboard.
  // showAdminStatistics()) — cette méthode n'avait plus aucun appelant.

  // getPerformanceOverview() supprimée (Prompt 07) : GET /municipality/performance-overview
  // est maintenant réel (voir MunicipalityDashboard.loadPerformanceOverview()) — plus
  // aucun appelant.

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

  /** Same data as getPerformanceRecords(), wrapped as an Observable — see getWasteRecords$() for why. */
  getPerformanceRecords$(seed: number = DEFAULT_SEED): Observable<PerformanceRecord[]> {
    return of(this.getPerformanceRecords(seed)).pipe(delay(MOCK_NETWORK_DELAY_MS));
  }

  /**
   * Coverage Map — mock coordinates, kept on purpose (Prompt 14, decided with the
   * user): a real replacement (`Admin.getCities$()` -> GET /territories/cities) exists
   * and was verified against the live database, but the real `City` collection
   * currently has only 6 documents and none with latitude/longitude populated —
   * switching now would turn the map from "plausible markers" into "no markers at
   * all". Revisit once real city coordinate data exists — see EditRecapFront.md.
   */
  getZoneCoordinates(zoneName: string): [number, number] | null {
    return ZONE_COORDINATES[zoneName] ?? null;
  }
}
