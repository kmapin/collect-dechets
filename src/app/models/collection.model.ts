export interface Collection {
  id: string;
  clientId: string;
  agencyId: string;
  collectorId: string;
  scheduledDate: Date;
  collectedDate?: Date;
  status: CollectionStatus;
  address: Address;
  wasteTypes: WasteType[];
  notes?: string;
  photos?: string[];
  rating?: number;
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum CollectionStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  MISSED = 'missed',
  CANCELLED = 'cancelled',
  REPORTED = 'reported'
}

export interface CollectionRoute {
  id: string;
  collectorId: string;
  date: Date;
  collections: Collection[];
  optimizedOrder: string[];
  status: RouteStatus;
  startTime?: Date;
  endTime?: Date;
  totalDistance?: number;
  estimatedDuration?: number;
}

export enum RouteStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface CollectionReport {
  id: string;
  collectionId: string;
  clientId: string;
  agencyId: string;
  reportType: ReportType;
  description: string;
  photos?: string[];
  status: ReportStatus;
  resolution?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

export enum ReportType {
  MISSED_COLLECTION = 'missed_collection',
  INCOMPLETE_COLLECTION = 'incomplete_collection',
  DAMAGE = 'damage',
  COMPLAINT = 'complaint',
  OTHER = 'other'
}

export enum ReportStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
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