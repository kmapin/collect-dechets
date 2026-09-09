//  Enums 
export type PlanningType = 'individuel' | 'groupe' | 'zone' | 'secteur';
export type PlanningStatus = 'brouillon' | 'planifie' | 'en_cours' | 'termine' | 'annule';

export type PlanningFrequency = 'unique' | 'quotidien' | 'hebdomadaire' | 'bimensuel' | 'mensuel';
export type WasteType = 'menagers' | 'recyclables' | 'verts' | 'encombrants' | 'speciaux';


export interface EquipeRef {
  _id: string;
  name: string;
  status?: string;
}


export interface TerritoryRef {
  _id: string;
  name: string;
}


export interface PopulatedClientRef {
  _id: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: {
    neighborhood?: string;
    sector?: string;
    arrondissement?: string;
    city?: string;
  };
}


export interface PlanningV2Api {
  _id: string;
  reference: string;
  type: PlanningType;
  libelle: string;
  planningStatus: PlanningStatus;
  frequency: PlanningFrequency;
  date: string;
  startTime: string;
  endTime?: string;
  clientsCount?: number;
  estimatedDuration?: number;
  teamId?: string | null;
  equipeIds?: (string | EquipeRef)[];
  typeDechets: WasteType[];
  notes?: string;
  agencyId?: string;
  managerId?: string;
  clientId?: string | PopulatedClientRef | null;
  groupeId?: string | { _id: string; name?: string; clients?: (string | PopulatedClientRef)[] } | null;
  villeId?: string | TerritoryRef;
  arrondissementId?: string | TerritoryRef;
  secteurId?: string | TerritoryRef;
  quartierId?: string | TerritoryRef;
  publishedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}


export interface PlanningV2CreateBody {
  type: PlanningType;
  libelle: string;
  frequency?: PlanningFrequency;
  date: string;
  startTime: string;
  endTime?: string;
  typeDechets: WasteType[];
  teamId?: string | null;
  equipeIds?: string[];
  agencyId: string;
  managerId?: string;
  clientId?: string;
  groupeId?: string;
  villeId?: string;
  arrondissementId?: string;
  secteurId?: string;
  quartierId?: string;
  notes?: string;
}


export interface PlanningStatsApi {
  totalPlannings: number;
  todayPlannings: number;
  inProgress: number;
  completedToday: number;
  executionRate: number;
}

export interface CollectionEvolutionDay {
  dayKey: string;
  label: string;
  totalPlannings: number;
  completedPlannings: number;
}


export interface ZoneCoverageApi {
  quartierId: string;
  quartierNom: string;
  lat: number;
  lng: number;
  planningsCount: number;
  equipesAssigned: number;
  completionRate: number;
  status: string;
}


export interface ConflictResult {
  equipeId?: string;
  equipeName?: string;
  conflictType: 'schedule' | 'schedule_week' | 'zone' | 'client' | 'group' | string;
  conflictingPlanningRef: string;
  message: string;
  blocking: boolean;
}

export interface SuggestionResult {
  equipeId: string;
  equipeName: string;
  workload: number;
  status: string;
}

export interface ConflictCheckResponse {
  conflicts: ConflictResult[];
  suggestions: SuggestionResult[];
  hasBlockingConflict?: boolean;
}


export interface TeamApiMember {
  _id?: string;
  name: string;
  phone: string;
  role: 'manager' | 'collector';
  availability?: 'disponible' | 'occupe' | 'absent';
  active?: boolean;
  vehicleId?: string | null;
}

export interface TeamApi {
  // Champs communs V1 & V2
  _id: string;
  name: string;
  agencyId?: string;
  status: 'active' | 'inactive' | 'on_mission' | 'maintenance';
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  // Champs V2
  code?: string;
  color?: string;
  supervisor?: string;
  phone?: string;
  vehicleId?: string | { _id: string; plate: string; model: string; status: string } | null;
  zones?: string[];
  members?: TeamApiMember[];
  workload?: number;
  completedMissions?: number;
  totalMissions?: number;
  successRate?: number;
  currentZone?: string | null;
  // Champs V1 (legacy, optionnels en V2)
  leaderId?: string;
  collectors?: string[];
  maxClientsPerDay?: number;
}

//  Territory
export interface TerritoryItem {
  _id: string;
  name: string;
  cityId?: string;
  arrondissementId?: string;
  sectorId?: string;
  latitude?: number;
  longitude?: number;
  
  code?: string;
}


export interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  meta?: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}


export interface Planning {
  id: string;
  reference: string;
  type: PlanningType;
  libelle: string;
  status: PlanningStatus;
  // Territory names (for display)
  zone?: string;
  ville?: string;
  arrondissement?: string;
  secteur?: string;
  quartier?: string;
  // Territory IDs (for API)
  villeId?: string;
  arrondissementId?: string;
  secteurId?: string;
  quartierId?: string;
  // Client / group
  clientId?: string;
  clientName?: string;
  groupeId?: string;
  groupName?: string;
  locationLabel: string;
  // Scheduling
  date: string;
  startTime: string;
  endTime?: string;
  frequency: PlanningFrequency;
  teamId?: string | null; 
  teams: string[];
  equipeIds: string[];
  // Waste
  wasteTypes: string[];
  typeDechets: WasteType[];
  // Metrics
  clientsCount?: number;
  estimatedDuration?: number;
  notes?: string;
  // Meta
  agencyId?: string;
  managerId?: string;
  publishedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
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
  status?: PlanningStatus | 'tous';
  dateFrom?: string;
  dateTo?: string;
  equipeId?: string;
  search?: string;
  agencyId?: string;
  page?: number;
  pageSize?: number;
}


export interface NavItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
}


export const WASTE_TYPE_LABELS: Record<WasteType, string> = {
  menagers: 'Déchets ménagers',
  recyclables: 'Recyclables',
  verts: 'Déchets verts',
  encombrants: 'Encombrants',
  speciaux: 'Déchets spéciaux',
};
