// ── Local UI enums (2 extra statuses are UI-only, API only knows active/inactive) ──
export type TeamStatus       = 'active' | 'inactive' | 'on_mission' | 'maintenance';
export type MemberRole       = 'manager' | 'collector';
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
  lat?: number | null;
  lng?: number | null;
}

export interface Mission {
  id: string;
  reference: string;
  date: string;
  status: 'brouillon' | 'planifie' | 'en_cours' | 'termine' | 'annule';
  zone: string;
  householdsCollected: number;
  totalHouseholds: number;
  duration?: string;
}

// ── UI Team ────────────────────────────────────────────────────
export interface Team {
  id: string;
  code: string;
  name: string;
  status: TeamStatus;
  color: string;
  description?: string;
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
  phone: string;
  vehicleId: string;
  zoneIds: string[];
  members: Array<{ _id?: string; name: string; phone: string; role: MemberRole }>;
}

// ── API V2 types ───────────────────────────────────────────────

export interface TeamV2Member {
  _id?: string;
  id?: string;
  userId?: string | null;
  name: string;
  phone: string;
  role: 'manager' | 'collector';
  email?: string | null;
  availability?: MemberAvailability;
  joinedAt?: string;
  active?: boolean;
  vehicleId?: string | null;
  zoneId?: string | null;
  performance?: { missionsCompleted: number; successRate: number; hoursWorked: number };
}

export interface TeamV2Api {
  _id: string;
  code?: string;
  name: string;
  agencyId?: string;
  color?: string;
  status: TeamStatus;
  description?: string | null;
  supervisor?: string;
  phone?: string;
  vehicleId?: string | VehicleApi | null;  // peut être un objet peuplé par le backend
  zones?: any[];
  members: TeamV2Member[];
  workload?: number;
  completedMissions?: number;
  totalMissions?: number;
  successRate?: number;
  currentZone?: string | null;
  recentMissions?: Mission[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamV2CreateBody {
  agencyId: string;
  name: string;
  color?: string;
  status?: TeamStatus;
  description?: string;
  supervisor?: string;
  phone?: string;
  vehicleId?: string;
  zoneIds?: string[];
  members?: Array<{ userId?: string; name: string; phone: string; role: 'manager' | 'collector' }>;
}

export interface TeamV2MemberBody {
  userId?: string;
  name: string;
  phone: string;
  role: 'manager' | 'collector';
  email?: string;
}

export interface VehicleApi {
  _id: string;
  agencyId: string;
  plate: string;
  model: string;
  type: VehicleType;
  capacityTons?: number;
  status: VehicleStatus;
  fuelLevel?: number;
  mileage?: number;
  lastMaintenance?: string;
}

export interface AvailableZoneApi {
  _id?: string;
  id?: string;
  name: string;
  cityId?: string;
  ville?: string;
  arrondissementId?: string;
  arrondissement?: string;
  sectorId?: string;
  householdsCount?: number;
}
