// ── Enums ───────────────────────────────────────────────────────
export type PlanningType     = 'individuel' | 'groupe' | 'zone' | 'secteur';
export type PlanningStatus   = 'brouillon' | 'planifie' | 'en_cours' | 'termine' | 'annule';
export type PlanningFrequency = 'unique' | 'hebdomadaire' | 'bimensuel' | 'mensuel';
export type WasteType        = 'menagers' | 'recyclables' | 'verts' | 'encombrants' | 'speciaux';

// ── API V2 — équipe peuplée (l'API renvoie parfois des objets, pas juste des IDs) ──
export interface EquipeRef {
  _id: string;
  name: string;
  status?: string;
}

// ── API V2 — territoire peuplé (idem) ──────────────────────────
export interface TerritoryRef {
  _id: string;
  name: string;
}

// ── API V2 — response ───────────────────────────────────────────
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
  // L'API peut renvoyer des IDs (string) ou des objets peuplés
  equipeIds: (string | EquipeRef)[];
  typeDechets: WasteType[];
  notes?: string;
  agencyId?: string;
  managerId?: string;
  clientId?: string;
  groupeId?: string;
  villeId?: string | TerritoryRef;
  arrondissementId?: string | TerritoryRef;
  secteurId?: string | TerritoryRef;
  quartierId?: string | TerritoryRef;
  createdAt: string;
  updatedAt: string;
}

// ── API V2 — create / update body ──────────────────────────────
export interface PlanningV2CreateBody {
  type: PlanningType;
  libelle: string;
  frequency?: PlanningFrequency;
  date: string;
  startTime: string;
  endTime?: string;
  typeDechets: WasteType[];
  equipeIds: string[];
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

// ── API V2 — stats ──────────────────────────────────────────────
export interface PlanningStatsApi {
  totalPlannings: number;
  todayPlannings: number;
  inProgress: number;
  completedToday: number;
  executionRate: number;
}

// ── API V2 — zone coverage ──────────────────────────────────────
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

// ── API V2 — conflict check ─────────────────────────────────────
export interface ConflictResult {
  equipeId: string;
  equipeName: string;
  conflictType: string;
  conflictingPlanningRef: string;
  message: string;
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
}

// ── Team API ────────────────────────────────────────────────────
export interface TeamApi {
  _id: string;
  name: string;
  agencyId: string;
  leaderId: string;
  collectors: string[];
  zones: string[];
  maxClientsPerDay: number;
  status: 'active' | 'inactive';
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Territory ───────────────────────────────────────────────────
export interface TerritoryItem {
  _id: string;
  name: string;
  cityId?: string;
  arrondissementId?: string;
  sectorId?: string;
  latitude?: number;
  longitude?: number;
}

// ── API paginated list wrapper ──────────────────────────────────
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

// ── UI Planning (mapped from PlanningV2Api) ─────────────────────
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
  // Scheduling
  date: string;
  startTime: string;
  endTime?: string;
  frequency: PlanningFrequency;
  // Teams
  teams: string[];       // names for display
  equipeIds: string[];   // IDs for API
  // Waste
  wasteTypes: string[];  // labels for display
  typeDechets: WasteType[]; // codes for API
  // Metrics
  clientsCount?: number;
  estimatedDuration?: number;
  notes?: string;
  // Meta
  agencyId?: string;
  managerId?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Dashboard Stats (UI) ────────────────────────────────────────
export interface PlanningStats {
  totalPlannings: number;
  todayPlannings: number;
  inProgress: number;
  completedToday: number;
  availableTeams: number;
  executionRate: number;
}

// ── Team (UI, for dashboard) ────────────────────────────────────
export interface PlanningTeam {
  id: string;
  name: string;
  membersCount: number;
  status: 'disponible' | 'en_service' | 'indisponible';
  currentZone?: string;
  collectionsToday: number;
  completionRate: number;
}

// ── Alert (UI, local only — no API equivalent) ──────────────────
export interface PlanningAlert {
  id: string;
  type: 'warning' | 'danger' | 'info' | 'success';
  title: string;
  message: string;
  time: string;
  planningRef?: string;
}

// ── Zone Coverage (UI, mapped from ZoneCoverageApi) ─────────────
export interface ZoneCoverage {
  name: string;
  lat: number;
  lng: number;
  planningsCount: number;
  teamsAssigned: number;
  completionRate: number;
  status: 'active' | 'pending' | 'inactive';
}

// ── Filter (matches API query params) ──────────────────────────
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

// ── Sidebar nav ─────────────────────────────────────────────────
export interface NavItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
}

// ── Waste type label map ────────────────────────────────────────
export const WASTE_TYPE_LABELS: Record<WasteType, string> = {
  menagers:    'Déchets ménagers',
  recyclables: 'Recyclables',
  verts:       'Déchets verts',
  encombrants: 'Encombrants',
  speciaux:    'Déchets spéciaux',
};
