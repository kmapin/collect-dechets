import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Municipality } from '../models/agency.model';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class Admin {

  constructor(private http: HttpClient) {}


    private currentUserSubject = new BehaviorSubject<User | null>(null);
    public currentUser$ = this.currentUserSubject.asObservable();
    private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
    public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  getAllStatistics() {
    return this.http.get(`${environment.apiUrl}/auth/statistics`).pipe(
      map((response: any) =>{
        console.log('API > getAllStatistics:', response);
        return response;
      })
    );

  }

  getAllEmployees(role: string) {
    return this.http.get(`${environment.apiUrl}/auth/employees/${role}`).pipe(
      map((response: any) =>{
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
      registerMunicipality$(municipalityData: any): Observable<{ success: boolean; municipality?:Municipality; error?: string; message?: string }> {
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
    return this.http.get(`${environment.apiUrl}/auth/municipality`).pipe(
      map((response: any) =>{
        console.log('API > getAllMunicipalities:', response);
        return response;
      })
    );
  }
}
