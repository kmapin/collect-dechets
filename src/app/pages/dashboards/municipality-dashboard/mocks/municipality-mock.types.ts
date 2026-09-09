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

export interface MunicipalityZone {
  id: string;
  name: string;
  cityName: string;
  countryName: string;
  quartiers: string[];
}

export type AgencyPerformanceMetrics = Pick<
  AgencyAudit,
  'completionRate' | 'rating' | 'revenue' | 'collectionsToday' | 'complianceScore' | 'issues'
>;

export interface MockCollector extends User {
  assignedZone: string;
  primaryWasteType: string;
}


export interface MonthlyTrendPoint {
  /** e.g. "2026-01" — sortable, locale-agnostic. */
  monthKey: string;
  /** e.g. "Jan 2026" — ready to display as an axis label. */
  label: string;
  totalCollections: number;
  completedCollections: number;
}

export interface PerformanceOverview {
  averageSatisfaction: number | null;
  complianceRate: number;
}

export type PerformanceGroupType = 'zone' | 'wasteType' | 'team';

export interface PerformanceRecord {
  id: string;
  zoneName: string;
  wasteType: string;
  teamId: string;
  teamName: string;
  /** 0–100, actual completion rate — real, computed from Collecte. */
  actual: number;
  /** 0–100, fixed policy target — never a measured value. */
  target: number;
}

export interface PerformanceIndicator {
  id: string;
  label: string;
  actual: number;
  target: number;
}

export type PlannedFrequency = 'unique' | 'quotidien' | 'hebdomadaire' | 'bimensuel' | 'mensuel';
export type CollectionFrequency = PlannedFrequency | 'none';

export interface ZoneFrequencyRecord {
  id: string;
  zoneId?: string;
  zoneName: string;
  wasteType: string;
  plannedFrequency: PlannedFrequency;
  actualFrequency: CollectionFrequency;
}

export interface ZoneFrequencyIndicator {
  zoneName: string;
  wasteType: string;
  plannedFrequency: PlannedFrequency;
  actualFrequency: CollectionFrequency;
  /** Positive = under-served (actual less frequent than planned), in "collections/month" units. */
  gap: number;
  status: 'insufficient' | 'adequate' | 'exceeds';
}
