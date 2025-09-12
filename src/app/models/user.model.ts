export interface User {
  _id?: string;
  id: string;
  email: string;
  firstName: string;
  firstname: string;
  lastName: string;
  lastname: string;
  phone: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  avatar?: string;
  subscribedAgencyId?: string;
  _id?: string
}

export enum UserRole {
  CLIENT = "client",
  AGENCY = "agency",
  COLLECTOR = "collector",
  MUNICIPALITY = "municipality",
  SUPER_ADMIN = "super_admin",
}

export interface ClientUser extends User {
  address: Address;
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
