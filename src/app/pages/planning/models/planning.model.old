export type PlanningType = 'individuel' | 'groupe' | 'zone' | 'secteur';
export type PlanningStatus = 'brouillon' | 'publie' | 'en_cours' | 'termine' | 'annule';
export type PlanningFrequency = 'unique' | 'hebdomadaire' | 'bimensuel' | 'mensuel';

export interface Planning {
  id: string;
  reference: string;
  type: PlanningType;
  libelle: string;
  status: PlanningStatus;
  zone?: string;
  secteur?: string;
  quartier?: string;
  ville?: string;
  arrondissement?: string;
  clientId?: string;
  clientName?: string;
  groupName?: string;
  date: string;
  startTime: string;
  endTime?: string;
  teams: string[];
  wasteTypes: string[];
  frequency: PlanningFrequency;
  clientsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlanningStats {
  totalPlannings: number;
  todayPlannings: number;
  inProgress: number;
  completedToday: number;
  availableTeams: number;
  executionRate: number;
}

export interface PlanningTeam {
  id: string;
  name: string;
  membersCount: number;
  status: 'disponible' | 'en_service' | 'indisponible';
  currentZone?: string;
  collectionsToday: number;
  completionRate: number;
}

export interface PlanningAlert {
  id: string;
  type: 'warning' | 'danger' | 'info' | 'success';
  title: string;
  message: string;
  time: string;
  planningRef?: string;
}

export interface ZoneCoverage {
  name: string;
  lat: number;
  lng: number;
  planningsCount: number;
  teamsAssigned: number;
  completionRate: number;
  status: 'active' | 'pending' | 'inactive';
}

export interface PlanningFilter {
  type?: PlanningType | 'tous';
  zone?: string;
  status?: PlanningStatus | 'tous';
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface NavItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
}
