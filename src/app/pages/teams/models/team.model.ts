// ── Local UI enums (2 extra statuses are UI-only, API only knows active/inactive) ──
export type TeamStatus       = 'active' | 'inactive' | 'on_mission' | 'maintenance';
export type MemberRole       = 'chef' | 'chauffeur' | 'agent' | 'assistant';
export type VehicleStatus    = 'disponible' | 'en_service' | 'maintenance' | 'hors_service';
export type VehicleType      = 'camion' | 'pickup' | 'moto' | 'tricycle';
export type MemberAvailability = 'disponible' | 'occupe' | 'absent';

// ── API V1 — Team response ──────────────────────────────────────
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

// ── API — Team create/update body ──────────────────────────────
export interface TeamCreateBody {
  name: string;
  agencyId: string;
  leaderId?: string;
  collectors: string[];
  zones: string[];
  maxClientsPerDay?: number;
  description?: string;
  status?: 'active' | 'inactive';
}

// ── API — Team stats (from /api/teams/{id}/stats) ─────────────
export interface TeamApiStats {
  activeClientGroups: number;
  totalClients: number;
  totalCollectors: number;
  zonesCount: number;
}

// ── API — Collector user (from /api/agency_employees/{id}/collectors) ─
export interface CollectorUser {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role?: string;
}

// ── Local UI models ────────────────────────────────────────────

export interface MemberPerformance {
  missionsCompleted: number;
  successRate: number;
  hoursWorked: number;
}

export interface TeamMember {
  id: string;
  name: string;
  phone: string;
  role: MemberRole;
  email?: string;
  availability: MemberAvailability;
  joinedAt: string;
  active?: boolean;
  vehicleId?: string;
  zoneId?: string;
  performance?: MemberPerformance;
}

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  type: VehicleType;
  capacityTons: number;
  status: VehicleStatus;
  lastMaintenance: string;
  fuelLevel: number;
  mileage: number;
}

export interface AssignedZone {
  id: string;
  name: string;
  ville: string;
  arrondissement?: string;
  householdsCount: number;
}

export interface Mission {
  id: string;
  reference: string;
  date: string;
  status: 'planifie' | 'en_cours' | 'termine' | 'annule';
  zone: string;
  householdsCollected: number;
  totalHouseholds: number;
  duration?: string;
}

// ── UI Team (mapped from TeamApi + local enrichment) ───────────
export interface Team {
  id: string;
  code: string;
  name: string;
  status: TeamStatus;
  color: string;
  description?: string;
  // API-sourced fields
  agencyId?: string;
  leaderId?: string;
  collectorIds?: string[];    // raw IDs from API
  maxClientsPerDay?: number;
  // UI-only / locally enriched
  members: TeamMember[];
  vehicle?: Vehicle;
  zones: AssignedZone[];
  workload: number;
  completedMissions: number;
  totalMissions: number;
  successRate: number;
  currentZone?: string;
  supervisor?: string;
  phone?: string;
  recentMissions: Mission[];
  createdAt: string;
  updatedAt: string;
}

// ── UI stats (computed locally from teams signal) ──────────────
export interface TeamStats {
  total: number;
  active: number;
  onMission: number;
  inactive: number;
  maintenance: number;
  totalMembers: number;
  availableVehicles: number;
  avgWorkload: number;
}

// ── API stats (from /api/teams/{id}/stats) ─────────────────────
export interface TeamStatsApi {
  teamId?: string;
  teamName?: string;
  collectorsCount?: number;
  clientGroups?: number;
  totalClients?: number;
  activePlannings?: number;
  collectesThisMonth?: number;
}

export interface TeamFilter {
  search: string;
  status: TeamStatus | '';
  hasVehicle: boolean | null;
  sortBy: 'name' | 'workload' | 'members' | 'missions';
  sortDir: 'asc' | 'desc';
}

export interface AvailableVehicle {
  id: string;
  plate: string;
  model: string;
  type: VehicleType;
  capacityTons: number;
  status: VehicleStatus;
}

export interface AvailableZone {
  id: string;
  name: string;
  ville: string;
  arrondissement?: string;
  householdsCount: number;
}

export interface TeamFormData {
  name: string;
  color: string;
  status: TeamStatus;
  description: string;
  supervisor: string;
  leaderId?: string;
  phone: string;
  vehicleId: string;
  zoneIds: string[];
  collectorIds?: string[];
  maxClientsPerDay?: number;
  members: Array<{ name: string; phone: string; role: MemberRole }>;
}
