import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { delay, map, tap, catchError } from 'rxjs/operators';
import { ClientUser, User, UserRole, RegisterUserData, RegisterResponse, UserAddress } from '../models/user.model';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Agency, Municipality } from '../models/agency.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<RegisterUserData | null>(null);
  private currentUserSubjectLocalStorage = new BehaviorSubject<RegisterUserData | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  // public ProfileCurrentUser$ = this.currentUserSubjectLocalStorage.asObservable();
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  currentUser: RegisterUserData | null = null;
  
  constructor(private http: HttpClient) {
    // Check for stored user on service initialization
    console.log('Checking for stored user on service initialization', this.isAuthenticated$ );
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      this.currentUserSubject.next(JSON.parse(storedUser)?.user);
      this.isAuthenticatedSubject.next(true);
    }
  }


  login(email: string, password: string): Observable<{ success: boolean; user?: RegisterUserData; error?: string }> {
    // Simulate API call
    return of({ success: true, user: this.mockUser(email) }).pipe(
      delay(1000),
      map(response => {
        if (response.success && response.user) {
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
          // this.currentUserSubjectLocalStorage.next(response.user);
          this.isAuthenticatedSubject.next(true);
        }
        return response;
      })
    );
  }
  //Login add
  loginUser(login: string, password: string): Observable<{ success: boolean; user?: User; error?: string; token?: string }> {
    // The backend error says "Email et mot de passe requis", so try {email, password}
    const requestBody = { login, password };
    console.log('[DEBUG] Sending login request with:', { login, password: '***' });
    console.log('[DEBUG] Request body:', requestBody);
    return this.http.post<any>(`${environment.apiUrl}/login`, requestBody).pipe(
      map((response: any) => {
        console.log("API > LoginUser Response:", response);
        console.log("API > Response type:", typeof response);
        console.log("API > Response keys:", response ? Object.keys(response) : 'null response');
        
        // Check different possible success indicators
        const hasToken = response && response.token;
        const hasUser = response && response.user;
        const isSuccess = response && (response.success === true || hasToken || hasUser);
        
        console.log('[DEBUG] Response analysis:', { hasToken, hasUser, isSuccess });
        
        if (isSuccess) {
          const user = response.user;
          const token = response.token;
          
          // Store data based on what we received
          const loginData = {
            ...(token && { token }),
            ...(user && { user })
          };
          
          localStorage.setItem('currentUser', JSON.stringify(loginData));
          if (token) {
            localStorage.setItem('authWasteToken', token);
          }
          
          this.currentUserSubject.next(user);
          this.isAuthenticatedSubject.next(true);
          
          return {
            success: true,
            user: user,
            token: token
          };
        } else {
          console.log('[DEBUG] Login failed, response:', response);
          return {
            success: false,
            error: response?.message || response?.error || 'Identifiants incorrects'
          };
        }
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Login Error:', error);
        let errorMessage = 'Erreur de connexion';
        
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.status === 401) {
          errorMessage = 'Email ou mot de passe incorrect';
        } else if (error.status === 404) {
          errorMessage = 'Utilisateur non trouvé';
        }
        
        return of({
          success: false,
          error: errorMessage
        });
      })
    );
  }

  register(userData: RegisterUserData): Observable<RegisterResponse> {

    if (!this.validateRegistrationData(userData)) {
      return of({ 
        success: false, 
        error: 'Données de registration invalides. Veuillez vérifier tous les champs requis.' 
      });
    }

  
    const registrationData = this.prepareRegistrationData(userData);
    console.log('[DEBUG] Final registration data being sent to backend:', registrationData);
    console.log('[DEBUG] Registration endpoint:', `${environment.apiUrl}/auth/register`);

    return this.http.post<any>(`${environment.apiUrl}/register`, registrationData).pipe(
      map(response => {
        console.log("API > Register Response:", response);
        
        if (response && (response.user || response.success)) {
          const user = response.user || response;
          this.currentUser$.subscribe((user: RegisterUserData | null) => {
            this.currentUser = user;
            console.log('[DEBUG] Connected currentUser:', this.currentUser);
            // if (!this.currentUser && this.currentUser===null ) {
            //   localStorage.setItem('currentUser', JSON.stringify({ user }));
            //   this.currentUserSubject.next(user);
            //   this.isAuthenticatedSubject.next(true);
            // }
          });
          return { 
            success: true, 
            user: user, 
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
        return of(this.handleRegistrationError(error.error));
      })
    );
  }


  /**
   * Vérifier si l'utilisateur a au moins un certain niveau de rôle
   */
  hasMinimumRole(minimumRole: UserRole): Observable<boolean> {
    const roleHierarchy: Record<UserRole, number> = {
      client: 1,
      manager: 2,
      collector: 3,
      municipality: 4,
      super_admin: 5,
    };

    return this.currentUser$.pipe(
      map(user => {
        if (!user) return false;
        return roleHierarchy[user.role as UserRole] >= roleHierarchy[minimumRole];
      })
    );
  }
  /**
   * Inscription d'un client via l'API réelle (méthode legacy - utilisez register() de préférence)
   */
  registerClient(userData: RegisterUserData): Observable<RegisterResponse> {
    // Delegate to the main register method
    return this.register(userData);
  }



  // ------------------------------------------------------------- Forgot password 

  forgotPassword$(email: string): Observable<{ success: boolean; message?: string; error?: string }> {
    const object = { 
      "email" : email
    };
    console.log('API > ForgotPassword:', object);
    return this.http.post<any>(`${environment.apiUrl}/forgot-password`, object).pipe(
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
    return this.http.post<any>(`${environment.apiUrl}/verify-reset-code`, { email, code }).pipe(
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
      tokenUrl: `${environment.apiUrl}/reset-password/${token}`
    });
    return this.http.post<any>(`${environment.apiUrl}/reset-password/${token}`, {
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
    return this.http.post<any>(`${environment.apiUrl}/register`, agencyData).pipe(
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
  getCurrentUser(): RegisterUserData |null {
    if(!this.isAuthenticatedSubject.value){ 
      return null
    }
    return this.currentUserSubject.value;
  }

  hasRole(role: UserRole): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  /**
   * Validates registration data before sending to backend
   */
  private validateRegistrationData(userData: RegisterUserData): boolean {
    if (!userData.firstName || !userData.lastName || !userData.email || 
        !userData.password || !userData.phone || !userData.role) {
      return false;
    }

    if (!userData.address || !userData.address.street || !userData.address.city || 
        !userData.address.neighborhood || !userData.address.arrondissement) {
      return false;
    }

    if (!userData.acceptTerms) {
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      return false;
    }

    return true;
  }

  /**
   * Prepares registration data in the format expected by the backend
   */
  public prepareRegistrationData(userData: RegisterUserData): any {
    console.log('[DEBUG] prepareRegistrationData called with:', userData);
    const baseData = {
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      password: userData.password,
      role: userData.role,
      phone: userData.phone,
      address: {
        street: userData.address.street || '',
        arrondissement: userData.address.arrondissement,
        sector: userData.address.sector,
        doorNumber: userData.address.doorNumber,
        doorColor: userData.address.doorColor,
        neighborhood: userData.address.neighborhood,
        city: userData.address.city,
        postalCode: userData.address.postalCode,
        longitude: userData.address.longitude,
        latitude: userData.address.latitude
      },
      acceptTerms: userData.acceptTerms,
      receiveOffers: userData.receiveOffers,
      ...(userData.agencyId && { agencyId: userData.agencyId }),
      ...(userData.nbGestionnaires && { nbGestionnaires: userData.nbGestionnaires }),
      ...(userData.isOwnerAgency !== undefined && { isOwnerAgency: userData.isOwnerAgency })
    };

    // Add agency-specific data if role is agency
    if (userData.role === 'manager') {
      console.log('[DEBUG] Agency role detected, agencyName:', userData.agencyName, 'agencyDescription:', userData.agencyDescription);
      const agencyData = 
      {
        ...baseData,
        // Try both formats to see which one the backend expects
        agencyName: userData.agencyName,
        agencyDescription: userData.agencyDescription,
        isOwnerAgency: userData.isOwnerAgency,
        agency: {
          name: userData.agency?.name || userData.agencyName,
          agencyDescription: userData.agencyDescription,
          zoneActivite: [],
          slogan: userData.slogan,
          gestionnaires: [],
          documents: [],
          status: userData.agency?.status,
          longitude: userData?.address.longitude || 0,
          latitude: userData?.address.latitude || 0
        }
      };
      console.log('[DEBUG] Final agency data:', agencyData);
      return agencyData;
    }

    // Add municipality-specific data if role is municipality
    // if (userData.role === 'municipality') {
    //   return {
    //     ...baseData,
    //     // commune: userData.commune
    //   };
    // }

    return baseData;
  }

  /**
   * Handles registration errors from the backend
   */
  private handleRegistrationError(error: HttpErrorResponse): RegisterResponse {
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

  private mockUser(email: string): RegisterUserData {
    // Mock user data for demonstration
    let role = UserRole.CLIENT;
    if (email.includes('manager')) role = UserRole.MANAGER;
    if (email.includes('collector')) role = UserRole.COLLECTOR;
    if (email.includes('municipality')) role = UserRole.MUNICIPALITY;

    return {
      firstName: 'John',
      lastName: 'Doe',
      email: email,
      phone: '+1234567890',
      role: role,
      address: {
        street: 'Rue Test',
        arrondissement: 'Test',
        sector: 'Test',
        doorNumber: '1',
        doorColor: 'Bleu',
        neighborhood: 'Test',
        city: 'Dakar',
        postalCode: '10000',
        longitude: -17.444,
        latitude: 14.692,
      },
      status: 'active',
      acceptTerms: true,
      receiveOffers: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Legacy fields for backwards compatibility
      // firstName: 'John',
      id: Math.random().toString(36).substr(2, 9),
      isActive: true
    };
  }
}