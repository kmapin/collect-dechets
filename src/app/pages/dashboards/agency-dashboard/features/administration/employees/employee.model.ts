// Modèle dédié au CRUD Administration (GET/POST/PUT/DELETE /api/agency/employees) —
// délibérément PAS une réutilisation de models/agency.model.ts::Employee(s)/EmployeeRole :
// EmployeeRole y inclut 'admin' (absent de ALLOWED_EMPLOYEE_ROLES backend), et Employees
// mélange des champs financiers (financialRole/droitsFinance) hors sujet ici. Forme
// alignée exactement sur services/employeesAdministration.js (backend).

export type EmployeeRole = 'manager' | 'collector';

export const EMPLOYEE_ROLES: EmployeeRole[] = ['manager', 'collector'];

export interface EmployeeAddress {
  street?: string;
  arrondissement?: string;
  sector?: string;
  doorNumber?: string;
  doorColor?: string;
  neighborhood?: string;
  city?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
}

export type EmployeeStatus = 'active' | 'inactive' | 'pending_activation';

export interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  role: EmployeeRole;
  address?: EmployeeAddress;
  zones?: string[];
  status: EmployeeStatus;
  agencyId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmployeeCreatePayload {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  password: string;
  role: EmployeeRole;
  address: EmployeeAddress;
}

export type EmployeeUpdatePayload = Partial<Omit<EmployeeCreatePayload, 'password'>>;

export interface EmployeesListResult {
  data: Employee[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
