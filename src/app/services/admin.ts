import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, catchError, map, Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { Municipality } from '../models/agency.model';
import { RegisterResponse, RegisterUserData, User } from '../models/user.model';
import { FilterParams } from '../models/filterParams.model';

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

  /**
   * GET /statistics/collector/:collectorId (routes/globalStateRoutes.js, endpoint réel,
   * jamais appelé côté frontend jusqu'ici — chantier Rapports/Statistiques, item 3).
   */
  getCollectorStatistics(collectorId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/statistics/collector/${collectorId}`).pipe(
      map((response: any) => { console.log('API > getCollectorStatistics:', response); return response; }),
      catchError((err) => { console.error('getCollectorStatistics error:', err); throw err; })
    );
  }

  getGlobalUserStats(): Observable<any> {
    // Route backend montée avec un "S" majuscule (server.js) — Express est sensible à la
    // casse, `/state_agencies/...` (minuscule, ce que documentait le Swagger) faisait donc
    // 404 en silence à cause du catchError ci-dessous.
    return this.http.get<any>(`${environment.apiUrl}/State_agencies/stats/users`).pipe(
      map((res: any) => {
        console.log('API > getGlobalUserStats:', res);
        return res;
      }),
      catchError(() => of(null))
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
  // Signature publique inchangée (page/search) — admin-dashboard.ts a déjà une vraie UI de
  // pagination construite dessus (incidentsCurrentPage/incidentsItemsPerPage/...), pas de
  // raison de la casser. Le vrai bug (Prompt 03, BACKEND_INTEGRATION.md §0.5) était la
  // traduction interne : le backend réel (services/qrValidation.js::getAllCollectes)
  // attend `skip`/`term`, jamais `page`/`search` — silencieusement ignorés jusqu'ici,
  // donc `page` n'avait jamais d'effet (toujours les mêmes `skip=0` par défaut).
  getAllReports(params?: { page?: number; limit?: number; status?: string; severity?: string; search?: string; agencyId?: string; date?: string }) {
    const limit = params?.limit ?? 10;
    const page = params?.page ?? 1;
    let requestParams = new HttpParams()
      .append('skip', (page - 1) * limit)
      .append('limit', limit);
    if (params?.status   && params.status   !== 'all') requestParams = requestParams.append('status',   params.status);
    if (params?.severity && params.severity !== 'all') requestParams = requestParams.append('severity', params.severity);
    if (params?.search   && params.search.trim())      requestParams = requestParams.append('term',     params.search.trim());
    if (params?.agencyId && params.agencyId.trim())    requestParams = requestParams.append('agencyId', params.agencyId.trim());
    if (params?.date)                                   requestParams = requestParams.append('date',     params.date);

    return this.http.get(`${environment.apiUrl}/collecte/all`, { params: requestParams }).pipe(
      map((response: any) => {
        console.log('API > getAllReports:', response);
        return response;
      })
    );
  }

  /**
   * Signalements réels (modèle Signalement unifié, remplace la mutation
   * Collecte.status='Reported' — voir agency.service.ts::getAgencySignalements$,
   * même pattern). `agencyId` n'a de sens que pour un super_admin : le backend
   * (controllers/signalement.controller.js::listSignalements) le dérive de
   * l'agence du membre du personnel pour tout autre rôle et ignore ce
   * paramètre. Omis (ou vide) pour un super_admin → toutes agences confondues.
   */
  getAllSignalements(filters: { agencyId?: string; origine?: string; status?: string; clientId?: string; from?: string; to?: string } = {}): Observable<any[]> {
    let requestParams = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) requestParams = requestParams.set(key, value);
    });
    return this.http.get<{ success: boolean; data: any[] }>(`${environment.apiUrl}/signalements`, { params: requestParams }).pipe(
      map((response: any) => {
        console.log('API > getAllSignalements:', response);
        return response?.data ?? [];
      }),
      catchError((error) => {
        console.error('Erreur lors de la récupération des signalements :', error);
        return of([]);
      })
    );
  }

  /** Affecte un signalement (lié à une collecte OU indépendant) à une équipe — `id` est
   * toujours un Signalement._id, jamais un Collecte._id (un signalement indépendant n'a
   * pas de collecte à cibler, voir assignReportToTeam$ ci-dessus, désormais legacy). */
  assignSignalementToTeam(signalementId: string, teamId: string): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/signalements/${signalementId}/assign-team`, { teamId }).pipe(
      map((response: any) => { console.log('API > assignSignalementToTeam:', response); return response; }),
      catchError((err) => { console.error('assignSignalementToTeam error:', err); throw err; })
    );
  }

  /** Résout un signalement (lié à une collecte OU indépendant) — voir assignSignalementToTeam ci-dessus. */
  resolveSignalement(signalementId: string, resolutionComment?: string): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/signalements/${signalementId}/resolve`, { resolutionComment }).pipe(
      map((response: any) => { console.log('API > resolveSignalement:', response); return response; }),
      catchError((err) => { console.error('resolveSignalement error:', err); throw err; })
    );
  }

  // getAllStatisticCity() supprimée (Prompt 01, BACKEND_INTEGRATION.md §0.2) : appelait
  // `/auth/city/municipality`, une route confirmée inexistante nulle part dans le backend
  // (grep exhaustif de routes/*.js et de tout le repo backend). Les compteurs par ville
  // (agences/clients/collectes) sont déjà disponibles réellement dans la réponse de
  // getAllStatistics() (agenciesByCity/clientsByCity/collectionsByCity) — voir
  // MunicipalityDashboard.buildZoneStatisticsFromAdminStats().

  getUserById(id: string): Observable<any> {
    const url = `${environment.apiUrl}/user/${id}`;
    return this.http.get<any>(url);
  }

  toggleUserStatus(userId: string, status: 'active' | 'inactive'): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/users/agency/${userId}`, { status }).pipe(
      map((response: any) => {
        console.log('API > toggleUserStatus:', response);
        return response;
      })
    );
  }

  getUserActivity(userId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/user/${userId}/activity`).pipe(
      map((r: any) => r),
      catchError(() => of({ data: [] }))
    );
  }

  sendPasswordResetEmail(userId: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/user/${userId}/reset-password`, {}).pipe(
      map((response: any) => { console.log('API > sendPasswordResetEmail:', response); return response; })
    );
  }

  setNewPasswordAdmin(userId: string, newPassword: string): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/user/${userId}`, { password: newPassword }).pipe(
      map((response: any) => { console.log('API > setNewPasswordAdmin:', response); return response; })
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

  getZoneCoverage$(agencyId?: string): Observable<any> {
    let params = new HttpParams();
    if (agencyId) params = params.append('agencyId', agencyId);
    return this.http.get<any>(`${environment.apiUrl}/planning/zone-coverage`, { params }).pipe(
      map((res: any) => { console.log('API > getZoneCoverage:', res); return res; }),
      catchError(() => of({ success: false, data: [] }))
    );
  }

  /** Diffuse réellement une communication (persistance + notification temps réel) vers le personnel des agences sélectionnées — services/communication.js. */
  sendCommunication$(payload: { title: string; message: string; recipients: string[] }): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/communications/send`, payload);
  }

  /** Sans `agencyId`, renvoie les alertes non-classées de TOUTES les agences (services/planning.js::getPlanningAlerts) — utilisé pour le flux d'alertes transverse du dashboard super_admin. */
  getPlanningAlerts$(agencyId?: string): Observable<any> {
    let params = new HttpParams();
    if (agencyId) params = params.append('agencyId', agencyId);
    return this.http.get<any>(`${environment.apiUrl}/planning/alerts`, { params }).pipe(
      map((res: any) => { console.log('API > getPlanningAlerts:', res); return res; }),
      catchError(() => of({ success: false, data: [] }))
    );
  }

  getPlanningStats$(agencyId?: string): Observable<any> {
    let params = new HttpParams();
    if (agencyId) params = params.append('agencyId', agencyId);
    return this.http.get<any>(`${environment.apiUrl}/planning/stats`, { params }).pipe(
      map((res: any) => { console.log('API > getPlanningStats:', res); return res; }),
      catchError(() => of({ success: false, data: null }))
    );
  }

  resolveCollecte$(collecteId: string, resolvedBy: string, resolutionComment: string): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/collectes/${collecteId}/resolve`, { resolvedBy, resolutionComment }).pipe(
      map((res: any) => { console.log('API > resolveCollecte:', res); return res; }),
      catchError((err) => { console.error('resolveCollecte error:', err); throw err; })
    );
  }

  // PATCH /collectes/:id/assign-team (Prompt 06) — réservé manager/super_admin côté serveur.
  assignReportToTeam$(collecteId: string, teamId: string, assignedBy: string): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/collectes/${collecteId}/assign-team`, { teamId, assignedBy }).pipe(
      map((res: any) => { console.log('API > assignReportToTeam:', res); return res; }),
      catchError((err) => { console.error('assignReportToTeam error:', err); throw err; })
    );
  }

  /**
   * GET /municipality/performance-overview (Prompt 07). `complianceRate` est un vrai
   * agrégat (Collected / (total - Cancelled) toutes agences confondues) ; `averageSatisfaction`
   * reste toujours `null` côté serveur — aucune entité rating/review nulle part dans le
   * schéma, voir EditRecap.md.
   */
  getPerformanceOverview$(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/municipality/performance-overview`).pipe(
      map((res: any) => { console.log('API > getPerformanceOverview:', res); return res; }),
      catchError((err) => { console.error('getPerformanceOverview error:', err); throw err; })
    );
  }

  /**
   * GET /municipality/waste-statistics (Prompt 08). `quantity` est un COMPTE de
   * collectes par type de déchet, pas un poids en kg — aucune source de poids réelle
   * n'existe nulle part dans le schéma (voir EditRecap.md).
   */
  getWasteStatistics$(days: number): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/municipality/waste-statistics`, { params: { days } }).pipe(
      map((res: any) => { console.log('API > getWasteStatistics:', res); return res; }),
      catchError((err) => { console.error('getWasteStatistics error:', err); throw err; })
    );
  }

  /**
   * GET /municipality/monthly-trend (Prompt 09). Réutilise côté serveur exactement la
   * même base que getWasteStatistics$() — garanti de ne jamais diverger sur une fenêtre
   * qui se recoupe (exigence explicite du roadmap §3.4). Pas de `totalWeightKg` : aucune
   * source de poids réelle, voir EditRecap.md.
   */
  getMonthlyTrend$(months: number): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/municipality/monthly-trend`, { params: { months } }).pipe(
      map((res: any) => { console.log('API > getMonthlyTrend:', res); return res; }),
      catchError((err) => { console.error('getMonthlyTrend error:', err); throw err; })
    );
  }

  /**
   * GET /municipality/zone-frequency (Prompt 11). "Zone" bridges two different identity
   * systems server-side — Collecte has no zone field, so planned frequency comes from
   * Planning.quartierId -> Neighborhood.name while actual comes from
   * Collecte.clientId -> User.address.neighborhood, reconciled by name (see EditRecap.md).
   * `plannedFrequency`/`actualFrequency` use the real French enum
   * (unique|hebdomadaire|bimensuel|mensuel[|none]), not the mock's former English placeholders.
   */
  getZoneFrequency$(days: number): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/municipality/zone-frequency`, { params: { days } }).pipe(
      map((res: any) => { console.log('API > getZoneFrequency:', res); return res; }),
      catchError((err) => { console.error('getZoneFrequency error:', err); throw err; })
    );
  }

  /**
   * GET /finance/dashboard/kpi?agencyId=... — chantier Finance/Paiements, item 8. Réutilise
   * le MÊME endpoint que le dashboard financier agence (services/financeStats.js::
   * getDashboardKpi), pas un second calcul du taux de recouvrement côté admin.
   * `resolveAgency.js` autorise déjà l'override `?agencyId=` pour super_admin — aucun
   * changement backend nécessaire pour cet usage admin-wide.
   */
  getFinanceKpi$(agencyId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/finance/dashboard/kpi`, { params: { agencyId } }).pipe(
      catchError((err) => { console.error('getFinanceKpi error:', err); return of(null); })
    );
  }

  /**
   * GET /finance/platform-fees?agencyId=... (chantier Frais plateforme, Prompt F8) —
   * agrégation construite au Prompt F6/9 (FeeService.getPlatformFeesSummary), exposée
   * au Prompt F8. Même convention que getFinanceKpi$ ci-dessus : resolveAgency.js
   * autorise déjà l'override ?agencyId= pour super_admin, aucun changement backend
   * supplémentaire nécessaire pour cet usage admin-wide.
   */
  getPlatformFees$(agencyId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/finance/platform-fees`, { params: { agencyId } }).pipe(
      catchError((err) => { console.error('getPlatformFees error:', err); return of(null); })
    );
  }

  /**
   * GET /municipality/waste-records — table de faits paginée des collectes, déjà utilisée
   * par le dashboard municipal (Prompt 12). Réutilisée telle quelle pour la vue admin-wide
   * "Collectes effectuées" (`authMiddleware()` de cette route n'impose aucun rôle précis,
   * donc déjà accessible à super_admin sans aucun changement backend) — pas de deuxième
   * endpoint construit en parallèle.
   */
  getWasteRecords$(params: { from?: string; to?: string; days?: number; zoneId?: string; wasteType?: string; collectorId?: string; page?: number; limit?: number }): Observable<any> {
    const httpParams: any = {};
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') httpParams[key] = value;
    });
    return this.http.get<any>(`${environment.apiUrl}/municipality/waste-records`, { params: httpParams }).pipe(
      map((res: any) => { console.log('API > getWasteRecords:', res); return res; }),
      catchError((err) => { console.error('getWasteRecords error:', err); throw err; })
    );
  }

  /**
   * GET /territories/cities (Prompt 14) — real lat/lng per city. NOT wired into the
   * Coverage Map yet: verified against the live database that the real `City`
   * collection currently has only 6 documents and none with latitude/longitude
   * populated — migrating now would turn the map from "plausible mock markers" into
   * "no markers at all". Decided with the user to keep the map on mock coordinates
   * (`MunicipalityMockDataService.getZoneCoordinates()`) for now; this method is ready
   * to swap in once real city coordinate data exists — see EditRecapFront.md, Prompt 14.
   * NOT `GET /planning/zone-coverage`: confirmed (again — wrong twice already, see
   * EditRecap.md Prompts 07/11) that endpoint's real return shape is one aggregate
   * object, not a per-quartier array with lat/lng. Same request/response pattern
   * already used by `zone-selector.ts` for this same endpoint
   * (`{success?, data?: TerritoryItem[]}`), unauthenticated on the backend.
   */
  getCities$(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/territories/cities`).pipe(
      map((res: any) => { console.log('API > getCities:', res); return res; }),
      catchError((err) => { console.error('getCities error:', err); throw err; })
    );
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
