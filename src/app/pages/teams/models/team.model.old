export type TeamStatus      = 'active' | 'inactive' | 'on_mission' | 'maintenance';
export type MemberRole      = 'chef' | 'chauffeur' | 'agent' | 'assistant';
export type VehicleStatus   = 'disponible' | 'en_service' | 'maintenance' | 'hors_service';
export type VehicleType     = 'camion' | 'pickup' | 'moto' | 'tricycle';
export type MemberAvailability = 'disponible' | 'occupe' | 'absent';

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
  members: Array<{ name: string; phone: string; role: MemberRole }>;
}
