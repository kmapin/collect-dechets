import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../../../../environments/environment';
import { Employee, EmployeeCreatePayload, EmployeeUpdatePayload, EmployeesListResult, EmployeeRole } from './employee.model';

/**
 * Service dédié à /api/agency/employees (routes/employeesAdministrationRoute.js) — un
 * nouveau service plutôt qu'une réutilisation d'AgencyService : les méthodes existantes
 * (addEmployeeToAgency -> POST /register, updateEmployee -> PUT /user/:id,
 * deleteEmployee$) ciblent les ANCIENS endpoints génériques (non gouvernés par
 * employees.*, forme de réponse différente — RegisterResponse vs {success,data,...}).
 * Les réutiliser ici aurait mélangé deux systèmes d'autorisation distincts. Même
 * raisonnement que administration-users.service.ts (session précédente) : un seul
 * consommateur, service plat, pas de couche contracts/tokens.
 */
@Injectable({ providedIn: 'root' })
export class EmployeeAdministrationService {
  private readonly baseUrl = `${environment.apiUrl}/agency/employees`;

  constructor(private http: HttpClient) {}

  list(params: {
    term?: string;
    role?: EmployeeRole | '';
    city?: string;
    arrondissement?: string;
    sector?: string;
    neighborhood?: string;
    status?: 'active' | 'inactive' | 'pending_activation' | '';
    page?: number;
    limit?: number;
  } = {}): Observable<EmployeesListResult> {
    let httpParams = new HttpParams();
    if (params.term) httpParams = httpParams.set('term', params.term);
    if (params.role) httpParams = httpParams.set('role', params.role);
    if (params.city) httpParams = httpParams.set('city', params.city);
    if (params.arrondissement) httpParams = httpParams.set('arrondissement', params.arrondissement);
    if (params.sector) httpParams = httpParams.set('sector', params.sector);
    if (params.neighborhood) httpParams = httpParams.set('neighborhood', params.neighborhood);
    if (params.status) httpParams = httpParams.set('status', params.status);
    httpParams = httpParams.set('page', String(params.page ?? 1));
    httpParams = httpParams.set('limit', String(params.limit ?? 10));

    return this.http
      .get<{ success: boolean; data: Employee[]; total: number; page: number; limit: number; totalPages: number }>(this.baseUrl, {
        params: httpParams,
      })
      .pipe(map((res) => ({ data: res.data, total: res.total, page: res.page, limit: res.limit, totalPages: res.totalPages })));
  }

  getById(id: string): Observable<Employee> {
    return this.http.get<{ success: boolean; data: Employee }>(`${this.baseUrl}/${id}`).pipe(map((res) => res.data));
  }

  create(payload: EmployeeCreatePayload): Observable<Employee> {
    return this.http.post<{ success: boolean; data: Employee; message: string }>(this.baseUrl, payload).pipe(map((res) => res.data));
  }

  update(id: string, payload: EmployeeUpdatePayload): Observable<Employee> {
    return this.http
      .put<{ success: boolean; data: Employee; message: string }>(`${this.baseUrl}/${id}`, payload)
      .pipe(map((res) => res.data));
  }

  remove(id: string): Observable<void> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/${id}`).pipe(map(() => undefined));
  }
}
