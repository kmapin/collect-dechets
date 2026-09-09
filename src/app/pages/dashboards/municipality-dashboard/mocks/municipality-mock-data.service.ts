import { Injectable } from '@angular/core';
import {
  DEFAULT_SEED,
  ZONE_COORDINATES,
} from './municipality-mock.constants';
import {
  generateZones,
  generateCollectors,
  generateAgencyAudits,
  generateGroupedZoneStatistics,
  generateAgencyPerformanceMetrics,
} from './municipality-mock.generators';
import type {
  MunicipalityZone,
  MockCollector,
  AgencyAudit,
  GroupedZoneStatistics,
  AgencyPerformanceMetrics,
} from './municipality-mock.types';

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





  getZoneStatistics(seed: number = DEFAULT_SEED): GroupedZoneStatistics[] {
    return generateGroupedZoneStatistics(seed);
  }



  getAgencyPerformanceMetrics(agencyId: string, seed: number = DEFAULT_SEED): AgencyPerformanceMetrics {
    return generateAgencyPerformanceMetrics(agencyId, seed);
  }


  getZoneCoordinates(zoneName: string): [number, number] | null {
    return ZONE_COORDINATES[zoneName] ?? null;
  }
}
