import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, catchError, map, Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { Municipality } from '../models/agency.model';
import { RegisterResponse, RegisterUserData, User } from '../models/user.model';
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
    return this.http.get(`${environment.apiUrl}/statistics`).pipe(
      map((response: any) => {
        console.log('API > getAllStatistics:', response);
        return response;
      })
    );

  }
  getAllUsers(fileterParams: FilterParams): Observable<any> {
    let requestParams = new HttpParams()
      .append('page',  fileterParams.page  ?? 1)
      .append('limit', fileterParams.limit ?? 10)
      .append('role',  fileterParams.role  ?? '')
      .append('term',  fileterParams.term  ?? '')
      .append('neighborhood', fileterParams.neighborhood ?? '');

    console.log('API > getAllUsers params:', requestParams);
    return this.http.get(`${environment.apiUrl}/users`, { params: requestParams }).pipe(
      map((response: any) => {
        console.log('API > getAllUsers response:', response);
        return response;
      })
    );
  }

  deleteUser(userId: string) {
    return this.http.delete(`${environment.apiUrl}/user/${userId}`).pipe(
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
    return this.http.get(`${environment.apiUrl}/collecte/all`).pipe(
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

  getUserById(id: string): Observable<any> {
    const url = `${environment.apiUrl}/user/${id}`;
    return this.http.get<any>(url);
  }

  toggleUserStatus(userId: string, status: 'active' | 'inactive'): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/user/${userId}`, { status }).pipe(
      map((response: any) => {
        console.log('API > toggleUserStatus:', response);
        return response;
      })
    );
  }

  updateUserProfile(userId: string, updates: Partial<RegisterUserData>): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/user/${userId}`, updates).pipe(
      map((response: any) => {
        console.log('API > updateUserProfile:', response);
        return response;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Update user profile error:', error);
        return of(this.handleRegistrationError(error));
      })
    );
  }


/**
   * Validates registration data before sending to backend
   */
  private validateRegistrationData(userData: any): boolean {
    if (!userData.ageny.name || !userData.ageny.agencyDescription || !userData.ageny.slogan) {
      return false;
    }

    if (!userData.address || !userData.address.street || !userData.address.city || 
        !userData.address.neighborhood || !userData.address.arrondissement) {
      return false;
    }
    return true;
  }
    /**
   * Handles registration errors from the backend
   */
  public handleRegistrationError(error: HttpErrorResponse): RegisterResponse {
    console.error('Registration error details:', error);

    let errorMessage = 'Erreur lors de la création du compte';
    let errorDetails: string | { [key: string]: string[] } = errorMessage;

    if (error.error) {
      // Handle validation errors (field-specific errors)
      if (error.error.errors && typeof error.error.errors === 'object') {
        errorDetails = error.error.errors;
        errorMessage = 'Erreurs de validation détectées';
      }
      // Handle single error message
      else if (error.error.message) {
        errorMessage = error.error.message;
        errorDetails = error.error.message;
      }
      // Handle error string
      else if (typeof error.error === 'string') {
        errorMessage = error.error;
        errorDetails = error.error;
      }
    }
    // Handle HTTP status errors
    else if (error.status) {
      switch (error.status) {
        case 400:
          errorMessage = 'Données invalides. Veuillez vérifier votre saisie.';
          break;
        case 409:
          errorMessage = 'Cet email est déjà utilisé.';
          break;
        case 422:
          errorMessage = 'Données non conformes. Veuillez corriger les erreurs.';
          break;
        case 500:
          errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
          break;
        default:
          errorMessage = `Erreur ${error.status}: ${error.statusText}`;
      }
      errorDetails = errorMessage;
    }

    return {
      success: false,
      error: errorDetails,
      message: errorMessage
    };
  }

  updateAgency(agencyId: string | null ,userData:any): Observable<any> {
  
      // if (!this.validateRegistrationData(userData)) {
      //   return of({ 
      //     success: false, 
      //     error: 'Données de registration invalides. Veuillez vérifier tous les champs requis.' 
      //   });
      // }
  
    
      // const registrationData = this.prepareRegistrationData(userData);
      const registrationData = userData;
      console.log('[DEBUG] Final registration data being sent to backend:', registrationData);
      console.log('[DEBUG] Registration endpoint:', `${environment.apiUrl}/agencies/${agencyId}`);
  
      return this.http.put<any>(`${environment.apiUrl}/agencies/${agencyId}`, registrationData).pipe(
        map(response => {
          console.log("API > Update Response:", response);
          
          if (response && (response.data || response.success)) {
            
            return { 
              success: true, 
              message: response.message || 'Compte créé avec succès' 
            };
          } else {
            return { 
              success: false, 
              error: response?.error || response?.message || 'Erreur lors de la création du compte' 
            };
          }
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('Registration Error:', error);
          return of(this.handleRegistrationError(error));
        })
      );
    }
  

}
