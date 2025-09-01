import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map, tap } from 'rxjs/operators';
import { User, UserRole } from '../models/user.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Agency, Municipality } from '../models/agency.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient) {
    // Check for stored user on service initialization
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      this.currentUserSubject.next(JSON.parse(storedUser)?.user);
      this.isAuthenticatedSubject.next(true);
    }
  }

  login(email: string, password: string): Observable<{ success: boolean; user?: User; error?: string }> {
    // Simulate API call
    return of({ success: true, user: this.mockUser(email) }).pipe(
      delay(1000),
      map(response => {
        if (response.success && response.user) {
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
          this.isAuthenticatedSubject.next(true);
        }
        return response;
      })
    );
  }
  //Login add
  loginUser(email: string, password: string): Observable<{ success: boolean; user?: User; error?: string }> {
    return this.http.post<{ success: true, data: any }>(`${environment.apiUrl}/auth/login`, { email, password }).pipe(
      map((response: any) => {
        console.log("API > LoginUser :", response)
        if (response.user) {
          localStorage.setItem('currentUser', JSON.stringify(response));
          this.currentUserSubject.next(response?.user);
          this.isAuthenticatedSubject.next(true);
        }
        return response;
      })
    );
  }

  register(userData: any): Observable<{ success: boolean; user?: User; error?: string }> {
    if (userData.role === 'client') {
      return this.http.post<any>(`${environment.apiUrl}/auth/register/client`, userData).pipe(
        map(response => {
          if (response && response.user) {
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            this.currentUserSubject.next(response.user);
            this.isAuthenticatedSubject.next(true);
            return { success: true, user: response.user };
          } else {
            return { success: false, error: response?.error || 'Erreur lors de la création du compte' };
          }
        })
      );
    } else {
      // Simulate API call for other roles
      return of({ success: true, user: this.mockUser(userData.email) }).pipe(
        delay(1000),
        map(response => {
          if (response.success && response.user) {
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            this.currentUserSubject.next(response.user);
            this.isAuthenticatedSubject.next(true);
          }
          return response;
        })
      );
    }
  }

  /**
   * Inscription d'un client via l'API réelle
   */
  registerClient(userData: any): Observable<{ success: boolean; user?: User; error?: string; message?: string }> {
    return this.http.post<any>(`${environment.apiUrl}/auth/register`, userData).pipe(
      map(response => {
        console.log("API > ClientRegister :", response)
        if (response && response.user) {
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
          this.isAuthenticatedSubject.next(true);
          return { success: true, user: response.user, message: response.message };
        } else {
          return { success: false, error: response?.error || 'Erreur lors de la création du compte', message: response?.message };
        }
      })
    );
  }



  // ------------------------------------------------------------- Forgot password 

  forgotPassword$(email: string): Observable<{ success: boolean; message?: string; error?: string }> {
    return this.http.post<any>(`${environment.apiUrl}/auth/forgotPassword`, { email }).pipe(
      map(response => {
        console.log('API > ForgotPassword:', response);

        if (response?.success || response?.message) {
          return { success: true, message: response.message || 'Code envoyé avec succès' };
        } else {
          return { success: false, error: response?.error || 'Erreur lors de la réinitialisation du mot de passe' };
        }
      })
    );
  }


  // ------------------------------------------------------------- Verify code 


  verifyCode$(email: string, code: string): Observable<{ success: boolean; message?: string; error?: string; resetToken?: string }> {
    return this.http.post<any>(`${environment.apiUrl}/auth/verifyCode`, { email, code }).pipe(
      map(response => {
        console.log('API > VerifyCode:', response);
        if (response?.resetToken) {
          return {
            success: true,
            message: response.message,
            resetToken: response.resetToken
          };
        } else {
          return {
            success: false,
            error: response?.error || 'Code invalide'
          };
        }
      })
    );
  }


  // ------------------------------------------------------------- new password

  newPassword$(
    newPassword: string,
    confirmNewPassword: string,
    token: string
  ): Observable<{ success: boolean; message?: string; error?: string }> {

    console.log('Envoi à API :', {
      newPassword,
      confirmNewPassword,
      tokenUrl: `${environment.apiUrl}/auth/resetPassword/${token}`
    });
    return this.http.post<any>(`${environment.apiUrl}/auth/resetPassword/${token}`, {
      newPassword,
      confirmNewPassword
    }).pipe(
      tap(response => {
        console.log('Response de l`\'API:', response);
      }),
      map(response => {
        const parsed = {
          success: response?.success !== false,
          message: response?.message,
          error: response?.error
        };
        return parsed;
      })
    );
  }




  logout(): Observable<void> {
    return this.http.post(`${environment.apiUrl}/auth/logout`, {}).pipe(
      map((response: any) => {
        console.log("API > Logout :", response);
        if (response) {
          localStorage.removeItem('currentUser');
          localStorage.removeItem('userRole');
          this.currentUserSubject.next(null);
          this.isAuthenticatedSubject.next(false);
          return response;
        } else {
          return { success: false, error: response?.error };
        }

      })
    );
  }

  /**Update client */
  updateClient(userId: string, userData: any): Observable<any> {
    return this.http.put(`${environment.apiUrl}/profile/${userId}`, userData).pipe(
      map((response) => {
        console.log("API > UpdateClient :", response);
        return response;
      })
    );
  }


  /**
   * Inscription d'une agence via l'API réelle
   */
  registerAgency$(agencyData: any): Observable<{ success: boolean; agence?: Agency; error?: string; message?: string }> {
    return this.http.post<any>(`${environment.apiUrl}/auth/register`, agencyData).pipe(
      map(response => {
        console.log("API > agenceRegister :", response)
        if (response && response.agence) {
          localStorage.setItem('currentagence', JSON.stringify(response.agence));
          this.currentUserSubject.next(response.agence);
          this.isAuthenticatedSubject.next(true);
          return { success: true, agence: response.agence, message: response.message };
        } else {
          return { success: false, error: response?.error || 'Erreur lors de la création du compte', message: response?.message };
        }
      })
    );
  }


  /**
   * Abonnement d'un utilisateur à une agence
   */
  subscribeToAgency(userId: string, agencyId: string): Observable<any> {
    console.log('[DEBUG] Service > subscribeToAgency appelé avec:', { userId, agencyId });

    return this.http.post(`${environment.apiUrl}/clients/subscribe`, { agencyId }).pipe(
      map((response: any) => {
        console.log('[DEBUG] Service > Réponse API subscribeToAgency:', response);

        // Normaliser la réponse pour s'assurer qu'elle a la bonne structure
        if (response && typeof response === 'object') {
          return {
            success: response.success || response.status === 'success' || false,
            message: response.message || response.msg || '',
            error: response.error || '',
            data: response.data || response
          };
        }

        return response;
      })
    );
  }
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  hasRole(role: UserRole): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  private mockUser(email: string): User {
    // Mock user data for demonstration
    let role = UserRole.CLIENT;
    if (email.includes('agency')) role = UserRole.AGENCY;
    if (email.includes('collector')) role = UserRole.COLLECTOR;
    if (email.includes('municipality')) role = UserRole.MUNICIPALITY;

    return {
      id: Math.random().toString(36).substr(2, 9),
      email: email,
      firstName: 'John',
      firstname: 'John',
      lastname: 'Doe',
      lastName: 'Doe',
      phone: '+1234567890',
      role: role,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };
  }
}