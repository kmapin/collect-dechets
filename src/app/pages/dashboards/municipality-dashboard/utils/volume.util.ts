import type { MonthlyTrendPoint } from '../mocks/municipality-mock.types';
import { comparePerformance, type PerformanceStatus } from './performance.util';


export interface VolumeAggregate {
  actualCollections: number;
  targetCollections: number;
  
  percentageOfTarget: number;
  status: PerformanceStatus;
}


export function aggregateVolume(points: Pick<MonthlyTrendPoint, 'totalCollections' | 'completedCollections'>[]): VolumeAggregate {
  const actualCollections = points.reduce((sum, point) => sum + point.completedCollections, 0);
  const targetCollections = points.reduce((sum, point) => sum + point.totalCollections, 0);
  const percentageOfTarget = targetCollections > 0 ? Math.round((actualCollections / targetCollections) * 100) : 0;
  const status = comparePerformance(percentageOfTarget, 100);

  return { actualCollections, targetCollections, percentageOfTarget, status };
}
