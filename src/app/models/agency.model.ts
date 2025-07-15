export interface Agency {
  id: string;
  name: string;
  description: string;
  logo?: string;
  email: string;
  phone: string;
  address: Address;
  serviceZones: ServiceZone[];
  services: WasteService[];
  employees: Employee[];
  schedule: CollectionSchedule[];
  rating: number;
  totalClients: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceZone {
  id: string;
  name: string;
  description: string;
  boundaries: Coordinate[];
  neighborhoods: string[];
  cities: string[];
  isActive: boolean;
}

export interface WasteService {
  id: string;
  name: string;
  description: string;
  wasteTypes: WasteType[];
  frequency: CollectionFrequency;
  price: number;
  currency: string;
  isActive: boolean;
}

export interface Employee {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: EmployeeRole;
  zones: string[];
  isActive: boolean;
  hiredAt: Date;
  avatar?: string;
}

export enum EmployeeRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  COLLECTOR = 'collector'
}

export interface CollectionSchedule {
  id: string;
  zoneId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  collectorId: string;
  isActive: boolean;
}

export interface WasteType {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  instructions: string[];
  acceptedItems: string[];
  rejectedItems: string[];
}

export enum CollectionFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly'
}

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface Address {
  street: string;
  doorNumber: string;
  doorColor?: string;
  neighborhood: string;
  city: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
}