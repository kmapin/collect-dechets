export interface User {
  _id?: string;
  userId?: string;
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  role: UserRole;
  phone: string;
  address: UserAddress;
  status: 'active' | 'inactive' | 'pending';
  acceptTerms: boolean;
  receiveOffers: boolean;
  agencyId?: string;
  qrToken?: string;
  qrCode?: string;
  nbGestionnaires?: number;
  isOwnerAgency?: boolean;
  deletedate?: string;
  createdAt: string;
  updatedAt: string;
  agency?: UserAgency;
  // Legacy fields for backwards compatibility
  firstname?: string;
  lastname?: string;
  isActive?: boolean;
  avatar?: string;
  subscribedAgencyId?: string;
}

export interface UserAddress {
  street: string;
  arrondissement: string;
  sector: string;
  doorNumber: string;
  doorColor: string;
  neighborhood: string;
  city: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
}

export interface ClientAddress {
  street: string;
  doorNumber: string;
  doorColor?: string;
  neighborhood: string;
  city: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
  sector: string;
  arrondissement?: string;
}

export interface UserAgency {
  _id: string;
  name: string;
  agencyDescription: string;
  zoneActivite: string[];
  client: string;
  collector: string;
  slogan: string;
  gestionnaires: string[];
  owner: string;
  documents: string[];
  status: 'active' | 'inactive';
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  deletedate?: string;
  createdAt: string;
  updatedAt: string;
}

export enum UserRole {
  CLIENT = "client",
  MANAGER = "manager",
  COLLECTOR = "collector",
  MUNICIPALITY = "municipality",
  SUPER_ADMIN = "super_admin",
}

export interface ClientUser extends User {
  subscriptionId?: string;
  paymentMethod?: PaymentMethod;
}

export interface AgencyUser extends User {
  agencyId: string;
  isOwner: boolean;
}

export interface CollectorUser extends User {
  agencyId: string;
  employeeId: string;
  zones: string[];
}

export interface MunicipalityUser extends User {
  municipalityId: string;
  permissions: string[];
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

export interface PaymentMethod {
  id: string;
  type: "card" | "bank_transfer" | "mobile_money";
  isDefault: boolean;
  lastFour?: string;
  expiryDate?: string;
}

// Interface for user registration data
export interface RegisterUserData {
  _id ?: string;
  id?: string;
  userId?: string;
  subscribedAgencyId?: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  role?: UserRole | string;
  phone: string;
  address: UserAddress;
  acceptTerms: boolean;
  receiveOffers: boolean;
  agencyId?: string;
  status?: string;
  nbGestionnaires?: number;
  isOwnerAgency?: boolean;
  slogan?: string;
  longitude?: number;
  latitude?: number;
  // Agency-specific fields
  agencyName?: string;
  agencyDescription?: string;
  // Municipality-specific fields  
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
  avatar?: string;
  commune?: {
    name: string;
    region: string;
    province: string;
  };

  agency?: {
    _id?: string;
    name?: string;
    agencyDescription?: string;
    zoneActivite?: string[];
    client?: string;
    collector?: string;
    slogan?: string;
    gestionnaires?: string[];
    owner?: string;
    documents?: string[];
    status?: 'active' | 'inactive';
    longitude?: number;
    latitude?: number;
  };
}

// Interface for adding employee to agency
export interface AddEmployeeData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole; 
  phone: string;
  address: UserAddress;
  agencyId: string;
  isOwnerAgency?: boolean; 
}

// Interface for registration response from backend
export interface RegisterResponse {
  success: boolean;
  user?: User;
  message?: string;
  error?: string | { [key: string]: string[] };
}
