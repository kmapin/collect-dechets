export interface Agency {
  _id: string;
  userId: string;
  firstName: string;
  lastName: string;
  agencyName: string;
  arrondissement: string;
  secteur: string;
  quartier: string;
  collections: number;
  incidents: number;
  agencyDescription: string;
  phone: string;
  address: Address;
  licenseNumber: string;
  members: AgencyMember[];
  serviceZones: ServiceZone[];
  services: WasteService[];
  employees: Employee[];
  schedule: CollectionSchedule[];
  collectors: any[];
  clients: AgencyClient[];
  rating: number;
  totalClients: number;
  acceptTerms: boolean;
  receiveOffers: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
}
export interface Municipality {
  _id: string;
  userId: string;
  firstName: string;
  lastName: string;
  agencyName: string;
  arrondissement: string;
  secteur: string;
  quartier: string;
  collections: number;
  incidents: number;
  agencyDescription: string;
  phone: string;
  address: Address;
  licenseNumber: string;
  members: AgencyMember[];
  serviceZones: ServiceZone[];
  services: WasteService[];
  employees: Employee[];
  schedule: CollectionSchedule[];
  collectors: any[];
  clients: AgencyClient[];
  rating: number;
  totalClients: number;
  acceptTerms: boolean;
  receiveOffers: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
}
export interface AgencyMember {
  user: string;
  role: string;
  _id: string;
}

export interface AgencyClient {
  _id: string;
  userId: {
    _id: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: string;
  };
  firstName: string;
  lastName: string;
  phone: string;
  agencyId: string[];
  address: Address;
  subscriptionStatus: 'pending' | 'active' | 'inactive';
  acceptTerms: boolean;
  receiveOffers: boolean;
  subscriptionHistory: SubscriptionHistory[];
  paymentHistory: any[];
  nonPassageReports: any[];
  createdAt: string;
  subscribedAgencyId: string;
}

export interface SubscriptionHistory {
  date: string;
  status: string;
  offer: string;
  _id: string;
}

export interface ServiceZone {
  id: string;
  name: string;
  description: string;
  boundaries: Coordinate[];
  neighborhoods: string[];
  cities: string[];
  // assignedCollectors: string[];
  isActive: boolean;
}

export interface ServiceZones {
  // id: string;
  name: string;
  description: string;
  boundaries: Coordinate[];
  neighborhoods: string[];
  cities: string[];
  assignedCollectors: string[];
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

export interface tarif {
  id?: string;
  agencyId: string;
  type: string;
  description: string;
  price: number;
  nbPassages?: number;
  Active: boolean;
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

export interface Employees {
  // id: string;
  // userId: string;
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
export interface Tariff {
    agencyId: string;
  type: TariffType;       
  price: number;           
  description?: string;    
  nbPassages: number;     
  createdAt: Date;         
  updatedAt?: Date;        
}
export type TariffType = 'standard' | 'premium' | 'vip';
export enum  EmployeeRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  COLLECTOR = 'collector'
}

export interface CollectionSchedule {
  // id: string;
  zoneId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  collectorId: string;
  // isActive: boolean;
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
  doorNumber?: string;
  doorColor?: string;
  arrondissement: string;
  sector: string;
  neighborhood: string;
  city: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
}
export interface Statistics {
  totalEmployees: number;
  totalClients: number;
  totalZones: number;
  message?: string;
  success?: boolean;
}