import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Municipality } from '../models/agency.model';
import { User } from '../models/user.model';
import { FilterParams } from '../models/filterParams.model';

interface MunicipalityStatistics {
  totalAgencies: number;
  totalClients: number;
  // totalCollectors: number;
  // todayCollections: number;
  // activeAgencies: number;
}

@Injectable({
  providedIn: 'root'
})
export class Admin {

  constructor(private http: HttpClient) { }


  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  getAllStatistics() {
    return this.http.get(`${environment.apiUrl}/auth/statistics`).pipe(
      map((response: any) => {
        console.log('API > getAllStatistics:', response);
        return response;
      })
    );

  }
    getAllUsers(fileterParams: FilterParams): Observable<any> {
    let requestParams = new HttpParams()
    .append('role', fileterParams.role)
    .append('neighborhood', fileterParams.neighborhood);
    console.log('API > getAllUsers params:', requestParams);
    return this.http.get(`${environment.apiUrl}/users`, { params: requestParams }).pipe(
      map((response: any) => {
        console.log('API > getAllClients:', response);
        return response;
      })
    );
  }
  getAllEmployees() {
    let requestParams = new HttpParams().append('role', 'collector');
    return this.http.get(`${environment.apiUrl}/users`, { params: requestParams }).pipe(
      map((response: any) => {
        console.log('API > getAllEmployees:', response);
        return response;
      })
    );
  }

  // --------------------------- webService partagé ------------------------------//
  private userRole: string = '';



  setData(userRole: string) {
    this.userRole = userRole;
    localStorage.setItem('userRole', userRole);
  }

  getData() {
    return {
      userRole: this.userRole,
    };
  }

  cleanData() {
    this.userRole = '';
  }

  /**
 * Inscription d'une mairie via l'API réelle
 */
  registerMunicipality$(municipalityData: any): Observable<{ success: boolean; municipality?: Municipality; error?: string; message?: string }> {
    return this.http.post<any>(`${environment.apiUrl}/auth/municipality`, municipalityData).pipe(
      map(response => {
        console.log("API > municipalityRegister :", response)
        if (response && response.municipality) {
          localStorage.setItem('currentmunicipality', JSON.stringify(response.municipality));
          this.currentUserSubject.next(response.municipality);
          this.isAuthenticatedSubject.next(true);
          return { success: true, municipality: response.municipality, message: response.message };
        } else {
          return { success: false, error: response?.error || 'Erreur lors de la création du compte', message: response?.message };
        }
      })
    );
  }



  getAllMunicipalities() {
    let requestParams = new HttpParams().append('role', 'municipality');
    return this.http.get(`${environment.apiUrl}/users`,{params: requestParams}).pipe(
      map((response: any) => {
        console.log('API > getAllMunicipalities:', response);
        return response;
      })
    );
  }


  /**Tous les signalement sur la plateforme */

  getAllReports() {
    return this.http.get(`${environment.apiUrl}/reports/all`).pipe(
      map((response: any) => {
        console.log('API > getAllReports:', response);
        return response;
      })
    );
  }

// Les statistiques d'une ville
 getAllStatisticCity(): Observable<MunicipalityStatistics[]> {
  return this.http.get<MunicipalityStatistics[]>(
    `${environment.apiUrl}/auth/city/municipality`,
  );
}

  getClientById(id: string): Observable<any> {
    const url = `${environment.apiUrl}/clients/${id}`;
    return this.http.get<any>(url);
  }

}
