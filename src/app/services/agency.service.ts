import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, delay, map, tap } from 'rxjs/operators';
import { Agency, ServiceZone, WasteService, Employee, Employees, ServiceZones, CollectionSchedule, EmployeeRole, tarif, Tarif, PlanningResponse, PaginatedResponse } from '../models/agency.model';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AddEmployeeData, RegisterResponse, User } from '../models/user.model';
import { FilterParams } from '../models/filterParams.model';

// ================================
// INTERFACES POUR L'ANALYSE DES ZONES
// ================================

/**
 * Interface pour les statistiques détaillées d'une zone
 */
export interface ZoneAnalyticsResponse {
  success: boolean;
  data: ZoneStatistics[];
  message?: string;
}

/**
 * Interface pour les statistiques d'une zone spécifique
 */
export interface ZoneStatistics {
  zoneId: string;
  zoneName: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  clientStats: {
    totalClients: number;
    households: number;
    businesses: number;
    institutions: number;
  };
  workloadMetrics: {
    estimatedWorkHours: number;
    requiredTeamSize: number;
    requiredVehicles: number;
    capacityUsagePercentage: number;
  };
  growthMetrics: {
    monthlyGrowthRate: number;
    yearlyGrowthRate: number;
    newSubscriptionsThisMonth: number;
    churnRate: number;
  };
  revenueMetrics?: {
    monthlyRevenue: number;
    averageRevenuePerClient: number;
  };
}

/**
 * Interface pour les paramètres de filtrage des zones
 */
export interface ZoneAnalyticsFilters {
  agencyId: string;
  zoneIds?: string[];
  clientType?: 'household' | 'business' | 'institution' | 'all';
  period?: 'week' | 'month' | 'quarter' | 'year';
  includeInactive?: boolean;
}

/**
 * Interface pour les recommandations automatiques
 */
export interface ZoneRecommendationsResponse {
  success: boolean;
  data: ZoneRecommendation[];
  message?: string;
}

export interface ZoneRecommendation {
  id: string;
  zoneId: string;
  zoneName: string;
  type: 'capacity' | 'growth' | 'efficiency' | 'resource';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  suggestedActions: string[];
  estimatedImpact?: {
    efficiency?: number;
    cost?: number;
    revenue?: number;
  };
  createdAt: string;
}

/**
 * Interface pour les données de comparaison entre zones
 */
export interface ZoneComparisonResponse {
  success: boolean;
  data: ZoneComparison[];
  summary: {
    totalZones: number;
    bestPerformingZone: string;
    mostEfficient: string;
    needsAttention: string[];
  };
}

export interface ZoneComparison {
  zoneId: string;
  zoneName: string;
  performanceScore: number;
  efficiencyRating: 'excellent' | 'good' | 'fair' | 'poor';
  rank: number;
  strengths: string[];
  weaknesses: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AgencyService {
  private agencies: Agency[] = [
   
  ];
  private tariffs: Agency[] = [

  ];
  constructor(private http: HttpClient) { }

  getAgencies(): Observable<Agency[]> {
    return of(this.agencies).pipe(delay(500));
  }

  getAgencyById(id: string | null): Observable<Agency | undefined> {
    return of(this.agencies.find(agency => agency._id === id)).pipe(delay(300));
  }

  searchAgencies(query: string): Observable<Agency[]> {
    const filtered = this.agencies.filter(agency =>
      agency.name.toLowerCase().includes(query.toLowerCase()) ||
      agency.address.city.toLowerCase().includes(query.toLowerCase()) ||
      agency.address.neighborhood.toLowerCase().includes(query.toLowerCase())
    );
    return of(filtered).pipe(delay(500));
  }
 
  searchAgencie(params: {
      term?: string; city?: string; sector?: string; rating?: string;
      neighborhood?: string; service?: string,status?: string, limit?:number, getAll?:boolean}): Observable<Agency[]> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) httpParams = httpParams.set(key, value);
    });
    console.log("API > searchAgencie params:", params);
    return this.http.get<any>(`${environment.apiUrl}/agencies`, { params: httpParams }).pipe(
      map(response => {
        // response || [];
        console.log("API > searchAgencie :", response);
        return response || [];
      },
      )
    );
  }

  getAgenciesByZone(latitude: number, longitude: number): Observable<Agency[]> {
    // Simple distance calculation for demo
    const filtered = this.agencies.filter(agency => {
      const distance = Math.sqrt(
        Math.pow(agency.address.latitude! - latitude, 2) +
        Math.pow(agency.address.longitude! - longitude, 2)
      );
      return distance < 0.1; // Within ~10km
    });
    return of(filtered).pipe(delay(500));
  }

  createAgency(agency: Partial<Agency>): Observable<Agency> {
    const newAgency: Agency = {
      _id: Math.random().toString(36).substr(2, 9),
      userId: agency.userId || '',
      firstName: agency.firstName || '',
      lastName: agency.lastName || '',
      name: agency.name || '',
      agencyDescription: agency.agencyDescription || '',
      phone: agency.phone || '',
      address: agency.address || {} as any,
      licenseNumber: agency.licenseNumber || '',
      members: agency.members || [],
      serviceZones: agency.serviceZones || [],
      services: agency.services || [],
      employees: agency.employees || [],
      schedule: agency.schedule || [],
      collectors: agency.collectors || [],
      clients: agency.clients || [],
      rating: 0,
      totalClients: 0,
      acceptTerms: agency.acceptTerms || false,
      receiveOffers: agency.receiveOffers || false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      __v: 0,
      arrondissement: '',
      secteur: '',
      quartier: '',
      collections: 0,
      incidents: 0
    };

    this.agencies.push(newAgency);
    return of(newAgency).pipe(delay(1000));
  }

  updateAgency(id: string, updates: Partial<Agency>): Observable<Agency> {
    const index = this.agencies.findIndex(agency => agency._id === id);
    if (index !== -1) {
      this.agencies[index] = { ...this.agencies[index], ...updates, updatedAt: new Date().toISOString() };
      return of(this.agencies[index]).pipe(delay(800));
    }
    throw new Error('Agency not found');
  }

  deleteAgency1(id: string): Observable<boolean> {
    const index = this.agencies.findIndex(agency => agency._id === id);
    if (index !== -1) {
      this.agencies.splice(index, 1);
      return of(true).pipe(delay(500));
    }
    return of(false).pipe(delay(500));
  }

  getAllAgenciesFromApi(agenciesFilter?: FilterParams): Observable<any> {
    let httpParams = new HttpParams();
    httpParams = httpParams.append('status', agenciesFilter?.status || '');
    httpParams = httpParams.append('search', agenciesFilter?.search || '');
    httpParams = httpParams.append('page',   agenciesFilter?.page  ?? 1);
    httpParams = httpParams.append('limit',  agenciesFilter?.limit ?? 10);
    return this.http.get<any>(`${environment.apiUrl}/agencies`, { params: httpParams });
  }


  /**
   * Récupère une agence spécifique depuis l'API backend
   */
  getAgencyByIdFromApi(id: string | null): Observable<{ success: boolean; data: Agency }> {
    return this.http.get<{ success: boolean; data: Agency }>(`${environment.apiUrl}/agencies/${id}`);
  }

  getAgencyById1(id: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}/agencies/${id}`).pipe(
      map((response: any) => {
        console.log('API > getAgencyById:', response);
        return response;
      })
    );
  }

  deleteAgency(agencyId: string){
    return this.http.delete(`${environment.apiUrl}/agencies/${agencyId}`).pipe(
      map((response: any) => {
        console.log('API > deleteAgency:', response);
        return response;
      })
    );
  }
  getAgencyEmployees(agencyId: string): Observable<Employee[]> {
    const agency = this.agencies.find(a => a._id === agencyId);
    return of(agency?.employees || []).pipe(delay(300));
  }
  // From API 
  getAgencyAllEmployees(agencyId: string): Observable<Employees[]> {
    const agency = this.agencies.find(a => a._id === agencyId);
    return this.http.get<Employees[]>(`${environment.apiUrl}/agences/${agencyId}/employees`);

  }
  // recupereles employees en fonction de leur role
  getAgencyEmployeesByRole$(agencyId: string, role: EmployeeRole): Observable<Employees[]> {
    const agency = this.agencies.find(a => a._id === agencyId);
    return this.http.get<Employees[]>(`${environment.apiUrl}/agences/${agencyId}/employees/role/${role}`);

  }
  //recupere les zones d une agence
  getAgencyZones$(agencyId: string): Observable<ServiceZone[]> {
    return this.http.get<ServiceZone[]>(`${environment.apiUrl}/agencies/${agencyId}/zones`);
  }
   //recupere les zones d une agence
  getEmployeeAgency$(agencyId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/agency_employees/${agencyId}/employees`);
  }
// recuperation de la liste des collecteurs au niveau d une agence 
  getCollectorsAgency$(agencyId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/agency_employees/${agencyId}/collectors`);
  }

  //recuperation des signalement liee a une agence
  getAgencyReports$(agencyId: string): Observable<any[]> {
    const url = `${environment.apiUrl}/collectes/agency/${agencyId}/reporting-collectes`;
    return this.http.get<any[]>(url).pipe(
      map((response) => {
        console.log("Signalements récupérés :", response);
        return response;
      }),
      catchError((error) => {
        console.error("Erreur lors de la récupération des signalements :", error);
        return of(['Aucun signalement trouvé']);
      })
    );
  }
  getCompletedCollectes$(agencyId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/collectes/agency/${agencyId}/completed-collectes`).pipe(
      map((response) => { console.log(`[CompletedCollectes] ${agencyId}:`, response); return response; }),
      catchError(() => of(null))
    );
  }

  //recuperation des statistique liee a une agence
  getAgencyStats$(agencyId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/state_agencies/${agencyId}/stats`).pipe(
      map((response) => {
        console.log("Statistiques récupérées :", response);
        return response;
      }),
      catchError((error) => {
        console.error("Erreur lors de la récupération des statistiques :", error);
        return of({ 'totalClients': 'undefind', 'totalCollections': 'undefind', 'totalIncidents': 'undefind' });
      })
    );

  }

  //creation d un tarif 
  addTarif$(payload: tarif): Observable<tarif | null> {
    return this.http.post<tarif>(`${environment.apiUrl}/agences/tarif`, payload).pipe(
      map(response => {
        console.log("API > addTarif :", response);
        return response;
      }),
      catchError(error => {
        console.error("Erreur lors de la création du tarif :", error);
        return of(null);
      })
    );
  }
  //recuperation des tarifs liee a une agence
  getAgencyAllTarifs$(agencyId: string): Observable<Tarif[]> {
    const agency = this.agencies.find(a => a._id === agencyId);
    return this.http.get<Tarif[]>(`${environment.apiUrl}/pricing/${agencyId}`);
  
  }
  
  //delete d un tarif par une agence
  public deleteTarif$(Id: string, agencyId: string): Observable<any> {
    const url = `${environment.apiUrl}/pricing/${Id}`;
    const body = { agencyId }; // Inclure l'agencyId dans le body
    return this.http.delete<any>(url, { body }).pipe(
      tap(data => console.log('[API] deleteTarif$ > tap :', data)),
      // catchError(this.newGlobalErrorHandler) // Décommente si tu as un gestionnaire d'erreurs global
    );
  }

  deleteEmployee$(employeeId: string): Observable<boolean> {
    return this.http.delete(`${environment.apiUrl}/agences/employees/${employeeId}`).pipe(
      map(() => {
        console.log(`Employé ${employeeId} supprimé avec succès`);
        return true;
      }),
      catchError(error => {
        console.error(` Erreur lors de la suppression de l'employé ${employeeId} :`, error);
        return of(false); // Retourne false en cas d'erreur
      })

    );
  }
  //recupere les employees d une agence en fonction de leur role
  getEmployeesByAgencyAndRole$(agencyId: string, role: string): Observable<{ success: boolean; count: number; data: Employee[] }> {
    const url = `${environment.apiUrl}/agences/${agencyId}/employes/role/${role}`;
    const params = new HttpParams().set('role', role);

    return this.http.get<{ success: boolean; count: number; data: Employee[] }>(url, { params });
  }

  /**
   * Récupère les employés filtrés d'une agence via l'API backend
   * Utilise l'endpoint /api/agency_employees/{agencyId}/employees avec les paramètres de filtre
   */
  getFilteredEmployees(agencyId: string, filters?: {
    term?: string;
    city?: string;
    neighborhood?: string;
    arrondissement?: string;
    sector?: number;
    role?: string;
    limit?: number;
  }): Observable<{ success: boolean; count?: number; data?: {
    managers?: Employees[];
    collectors?: Employees[];
    gestionnaires?: Employees[];
    employees?: Employees[];
  } }> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.term) {
        params = params.set('term', filters.term);
      }
      if (filters.city) {
        params = params.set('city', filters.city);
      }
      if (filters.neighborhood) {
        params = params.set('neighborhood', filters.neighborhood);
      }
      if (filters.arrondissement) {
        params = params.set('arrondissement', filters.arrondissement);
      }
      if (filters.sector !== undefined && filters.sector !== null) {
        params = params.set('sector', filters.sector.toString());
      }
      if (filters.role) {
        params = params.set('role', filters.role);
      }
      if (filters.limit) {
        params = params.set('limit', filters.limit.toString());
      }
    }

    const url = `${environment.apiUrl}/agency_employees/${agencyId}/employees`;
    console.log('🔍 [DEBUG SERVICE] URL appelée:', url);
    console.log('🔍 [DEBUG SERVICE] Paramètres HttpParams:', params.toString());

    return this.http.get<{ success: boolean; count?: number; data?: {
      managers?: Employees[];
      collectors?: Employees[];
      gestionnaires?: Employees[];
      employees?: Employees[];
    } }>(
      url,
      { params }
    ).pipe(
      catchError(error => {
        console.error('Erreur lors de la récupération des employés filtrés:', error);
        return throwError(() => error);
      })
    );
  }


  


  //Activer ou desactiver une agence 
  activateAgency(id: string, status: string): Observable<any> {
    let queryParams = new HttpParams().append('action', status);
    return this.http.patch(`${environment.apiUrl}/agencies_validation/${id}/validate`, {}, { params: queryParams }).pipe();
  }

  deActivateAgency(id: string): Observable<any> {
    return this.http.put(`${environment.apiUrl}/agencies/${id}`, { status: 'inactive' }).pipe(
      map((response: any) => { console.log('API > deActivateAgency:', response); return response; }),
      catchError((err) => { console.error('deActivateAgency error:', err); return of(null); })
    );
  }
;

  private currentUserSubject = new BehaviorSubject<Employees | null>(null);
  getCurrentUser(): Employees | null {
    return this.currentUserSubject.value;
  }

  // Subscribe to an agency 
  subscribeToAgencyPlan(currentUser: string | undefined, tariffId: string | undefined, numberMonths: number) {
    console.log("API, SubcriptionPayload ==>", currentUser, tariffId, numberMonths);
    return this.http.post(`${environment.apiUrl}/subscription/subscribe/${currentUser}/pricing/${tariffId}/${numberMonths}`, {});
  }

  //Get user Subscription from an agency 
  getUserSubscription(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/subscription/client/${userId}`).pipe(
      map(response => {
        console.log("API- Get subscriptions==>", response);
        return response || [];
      })
    );
  }

  addEmployee(employee: Partial<Employees>): Observable<Employees | null> {
    const newEmployee: Employees = {
      _id: Math.random().toString(36).substr(2, 9),
      firstName: employee.firstName || '',
      lastName: employee.lastName || '',
      email: employee.email || '',
      phone: employee.phone || '',
      role: employee.role || 'collector' as any,
      zones: employee.zones || [],
      isActive: true,
      hiredAt: new Date()
    };
    return this.http.post<Employees>(`${environment.apiUrl}/agences/employees`, newEmployee).pipe(
      map((response: Employees) => {
        console.log("API > collectorRegister :", response);
        return response;
      }),
      catchError(error => {
        console.error("Erreur lors de l'ajout de l'employé :", error);
        return of(null);
      })
    );
  }

  // updateEmployee(agencyId: string, employeeId: string, updates: Partial<Employee>): Observable<Employee> {
  //   const agency = this.agencies.find(a => a._id === agencyId);
  //   if (agency) {
  //     const index = agency.employees.findIndex(e => e.id === employeeId);
  //     if (index !== -1) {
  //       agency.employees[index] = { ...agency.employees[index], ...updates };
  //       return of(agency.employees[index]).pipe(delay(800));
  //     }
  //   }
  //   throw new Error('Employee not found');
  // }

  //ajouter un tarifs 
  addTariff(tariff: Partial<Tarif>): Observable<Tarif | null> {
    const newTariff: Tarif = {
      agencyId: tariff.agencyId || '',
      planType: tariff.planType || 'standard',
      price: tariff.price || 0,
      description: tariff.description || '',
      numberOfPasses: tariff.numberOfPasses || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return this.http.post<Tarif>(`${environment.apiUrl}/pricing`, newTariff).pipe(
      map((response: Tarif) => {
        console.log("API > addTariff :", response);
        return response;
      }),
      catchError(error => {
        console.error("Erreur lors de l'ajout du tarif :", error);
        return of(null);
      })
    );
  }

  deleteTariff$(tarifId: string): Observable<boolean> {
    return this.http.delete(`${environment.apiUrl}/pricing/${tarifId}`).pipe(
      map(() => {
        console.log(`Tarif ${tarifId} supprimé avec succès`);
        return true;
      }),
      catchError(error => {
        console.error(`Erreur lors de la suppression du tarif ${tarifId} :`, error);
        return of(false);
      })
    );
  }

  // Mettre à jour un tarif existant
  updateTariff$(tarifId: string, tariffData: any): Observable<{
    success: boolean;
    data?: any;
    message?: string;
    error?: any;
  }> {
    const url = `${environment.apiUrl}/pricing/${tarifId}`;
    console.log('Mise à jour du tarif - URL:', url);
    console.log('Données envoyées:', tariffData);
    
    return this.http.put<any>(url, tariffData).pipe(
      map(response => {
        console.log("API > updateTariff$ :", response);
        return {
          success: true,
          data: response,
          message: 'Tarif mis à jour avec succès'
        };
      }),
      catchError(error => {
        console.error("Erreur lors de la mise à jour du tarif:", error);
        return throwError(() => ({
          success: false,
          error: error.error || error,
          message: error.error?.message || 'Erreur lors de la mise à jour du tarif'
        }));
      })
    );
  }




  // Zone side Api 
  getZones(agencyId: string): Observable<ServiceZones[]> {
    return this.http.get<ServiceZones[]>(`${environment.apiUrl}/agences/${agencyId}/zones`);
  }

  // saveZone(zone: ServiceZones): Observable<ServiceZones | null> {
  //   return this.http.post<ServiceZones>(`${environment.apiUrl}/zones/register`, zone).pipe(
  //     map((response: ServiceZones) => {
  //       console.log("API > saveZone :", response);
  //       return response;
  //     }),
  //     catchError(error => {
  //       console.error("Erreur lors de l'enregistrement de la zone :", error);
  //       return of(null); // Gérer l'erreur de manière appropriée
  //     })
  //   );
  // }
  // //ajouter une planification
  addSchedule$(schedule: CollectionSchedule): Observable<CollectionSchedule | null> {
    return this.http.post<CollectionSchedule>(`${environment.apiUrl}/planning/create`, schedule).pipe(
      map((response: CollectionSchedule) => {
        console.log("API > planification enregistre :", response);
        return response;
      }),
      catchError(error => {
        console.error("Erreur lors de l'enregistrement de la planification:", error);
        throw error; // Propager l'erreur pour une meilleure gestion
      })
    );
  }

  //modifier une planification
  updateSchedule$(id: string, schedule: Partial<CollectionSchedule>): Observable<CollectionSchedule> {
    return this.http.put<CollectionSchedule>(`${environment.apiUrl}/planning/update/${id}`, schedule).pipe(
      map((response: CollectionSchedule) => {
        console.log("API > planification mise à jour :", response);
        return response;
      }),
      catchError(error => {
        console.error("Erreur lors de la mise à jour de la planification:", error);
        throw error;
      })
    );
  }
  //recupere les planing d une agence
  getAllPlaningAgency$(agencyId: string): Observable<any> {
    const url = `${environment.apiUrl}/planning/agency/${agencyId}`;
    return this.http.get<any>(url);
  }

  //supprimer un  planing d une agence
  deletePlanning$(id: string): Observable<boolean> {
    return this.http.delete(`${environment.apiUrl}/planning/delete/${id}`).pipe(
      map(() => {
        console.log(`planning ${id} supprimé avec succès`);
        return true;
      }),
      catchError(error => {
        console.error(`Erreur lors de la suppression du planning ${id} :`, error);
        throw error; // Propager l'erreur pour une meilleure gestion
      })
    );
  }
  //recupere les plannings d un collecteur
  getPlaningCollectory$(collectorId: string): Observable<any[]> {
    const collector = this.agencies.find(a => a._id === collectorId);
    const url = `${environment.apiUrl}/planning/collector/${collectorId}`;
    console.log("URL de la requête :", url);
    return this.http.get<Tarif[]>(url);

  }
  //recupere les employees  d une agence en fonction de leur role 
  getEmployeesByRole(agencyId: string, role: string): Observable<Employee[] | null> {
    const url = `${environment.apiUrl}/agences/${agencyId}/employés/role/${role}`;

    return this.http.get<Employee[]>(url).pipe(
      map((response: Employee[]) => {
        console.log("API > getEmployeesByRole :", response);
        return response;
      }),
      catchError(error => {
        console.error("Erreur lors de la récupération des employés :", error);
        return of(null);
      })
    );
  }
  //recuperation des suggestion de recherche
  getSuggestions(query: string, limit: number = 5): Observable<any[]> {
    return this.http.get<any[]>(`/api/agences/suggestions`, {
      params: { q: query, limit: limit.toString() }
    });
  }

  resolveIncident$(incidentId: string, incidentStatus: any): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/reports/${incidentId}/status`, incidentStatus).pipe(
      map((response: any) => {
        console.log("API > resoledIncident :", response);
        return response;
      }),
      catchError(error => {
        console.error("Erreur lors de la résolution de l'incident :", error);
        return of(null);
      })
    );

  }
  assignReportToEmployee$(reportId: string, employeeId: string): Observable<any> {
    const payload = { employeeId };
    return this.http.put<any>(`${environment.apiUrl}/reports/${reportId}/assign`, payload).pipe(
      map((response: any) => {
        console.log("API > assignReportToEmployee :", response);
        return response;
      }),
      catchError(error => {
        console.error("Erreur lors de l'assignation du rapport :", error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Récupère toutes les agences depuis l'API backend
   */

  /**
   * Récupère toutes les agences depuis l'API backend
   */


  // getAgenceStats(): Observable<
  //   { agencies: number; clients: number; collections: number; coverage: number; incidents: number }[]
  // > {
  //   return this.http.get<
  //     { agencies: number; clients: number; collections: number; coverage: number; incidents: number }[]
  //   >(`${environment.apiUrl}/agences/stats`);
  // }

  getAgenceStats() {
    return [
      { agencies: 5, clients: 3200, collections: 145, coverage: 98, incidents: 2 },
      { agencies: 4, clients: 2800, collections: 125, coverage: 92, incidents: 3 },
      { agencies: 3, clients: 2100, collections: 95, coverage: 88, incidents: 1 },
      { agencies: 3, clients: 1800, collections: 85, coverage: 75, incidents: 2 },
      { agencies: 2, clients: 1500, collections: 75, coverage: 70, incidents: 0 },
      { agencies: 4, clients: 2400, collections: 105, coverage: 82, incidents: 1 },
      { agencies: 3, clients: 2000, collections: 90, coverage: 85, incidents: 2 },
      { agencies: 2, clients: 1700, collections: 80, coverage: 78, incidents: 1 },
      { agencies: 3, clients: 1800, collections: 83, coverage: 80, incidents: 0 },
      { agencies: 3, clients: 1900, collections: 88, coverage: 77, incidents: 2 },
      { agencies: 2, clients: 1400, collections: 70, coverage: 73, incidents: 0 },
      { agencies: 3, clients: 1600, collections: 76, coverage: 75, incidents: 1 },
    ];
  }
  //recupere les planing d une agence
  getAllzones$(agencyId: string): Observable<any> {
    const url = `${environment.apiUrl}/agencies/${agencyId}/zones`;
    return this.http.get<any>(url).pipe(
      catchError(error => {
        console.error("Erreur lors de la récupération des zones de l'agence:", error);
        return throwError(() => error);
      })
    );
  }
  updateEmployeeStatus$(employeeId: string): Observable<any> {
    const url = `${environment.apiUrl}/users/agency/${employeeId}`;
    return this.http.put<any>(url, {}).pipe(
      catchError((error) => {
        console.error("Erreur lors de la mise à jour du statut de l'employé:", error);
        return throwError(() => error);
      })
    );
  }
  updateEmployee$(id: string, employeeData: any): Observable<Employee> {
    const url = `${environment.apiUrl}/agences/employees/${id}`;
    return this.http.put<Employee>(url, employeeData).pipe(
      catchError((error) => {
        console.error("Erreur backend:", error);
        return throwError(() => error);
      })
    );
  }


  getClientById(id: string): Observable<any> {
    const url = `${environment.apiUrl}/clients/${id}`;
    return this.http.get<any>(url);
  }
  //recuperation  des collecte journalieres
  getAgencyAllCollectes$(agencyId: string): Observable<PaginatedResponse<any>> {
    const url = `${environment.apiUrl}/collectes/agency/${agencyId}/collectes`;

    return this.http.get<PaginatedResponse<any>>(url).pipe(
      map(response => {
        console.log("API- Get collectes==>", response);
        return response || [];
      }),
      catchError((error) => {
        console.error("Erreur backend lors de la récupération des collectes :", error);
        return throwError(() => error);
      })
    );
  }
  //recuperation l historique  des collecte pour une agence
  getAgencyAllHistoryCollectes$(agencyId: string): Observable<PaginatedResponse<any>> {
    const url = `${environment.apiUrl}/collecte/agency/${agencyId}`;

    return this.http.get<PaginatedResponse<any>>(url).pipe(
      map(response => {
        console.log("API- Get collectes==>", response);
        return response || [];
      }),
      catchError((error) => {
        console.error("Erreur backend lors de la récupération des collectes :", error);
        return throwError(() => error);
      })
    );
  }
  // Mise à jour des zones de service pour une agence
  updateAgencyZones$(agencyId: string, zoneData: { zones: string[] }): Observable<any> {
    const url = `${environment.apiUrl}/agencies/${agencyId}/zone`;

    return this.http.patch<any>(url, zoneData).pipe(
      map(response => {
        console.log("API - Zones mises à jour :", response);
        return response;
      }),
      catchError(error => {
        console.error("Erreur lors de la mise à jour des zones :", error);
        return throwError(() => error);
      })
    );
  }
  // recuperation des signalement liee a un collecteur d une agence 
  getCollectorById(collectorid: string): Observable<any> {
    // const url = `${environment.apiUrl}/rapports/collector/${collectorid}`;
    const url = `${environment.apiUrl}/collectes/collector/${collectorid}/reporting-collectes`;
    return this.http.get<any>(url);
  }

  updatePlanning$(id: string, planningData: any): Observable<{
    success: boolean;
    planning?: any;
    error?: any;
    message?: string
  }> {
    return this.http.put<any>(`${environment.apiUrl}/planning/update/${id}`, planningData).pipe(
      map(response => {
        console.log("API > updatePlanning :", response);
        if (response) {
          return { success: true, planning: response, message: 'Planning mis à jour avec succès' };
        } else {
          return { success: false, error: 'Aucune donnée reçue', message: 'Erreur lors de la mise à jour' };
        }
      }),
      catchError(error => {
        console.error("Erreur API updatePlanning :", error);
        return throwError(() => ({
          success: false,
          error: error.error || 'Une erreur est survenue',
          message: error.error?.message || error.message || 'Erreur inconnue'
        }));
      })
    );
  }

  updateTarif$(tarifId: string, tarifData: any): Observable<{
    success: boolean;
    tarif?: any;
    error?: any;
    message?: string
  }> {
    return this.http.put<any>(`${environment.apiUrl}/api/pricing/${tarifId}`, tarifData).pipe(
      map(response => {
        console.log("API > updateTarif :", response);
        if (response) {
          return { success: true, tarif: response, message: 'Tarif mis à jour avec succès' };
        } else {
          return { success: false, error: 'Aucune donnée reçue', message: 'Erreur lors de la mise à jour du tarif' };
        }
      }),
      catchError(error => {
        console.error("Erreur API updateTarif :", error);
        return throwError(() => ({
          success: false,
          error: error.error || 'Une erreur est survenue',
          message: error.error?.message || error.message || 'Erreur inconnue'
        }));
      })
    );
  }

  /**
   * Ajouter un employé à une agence
   * Utilise le même endpoint d'enregistrement mais avec l'agencyId obligatoire
   */
  addEmployeeToAgency(employeeData: AddEmployeeData): Observable<RegisterResponse> {
    console.log('[DEBUG] Adding employee to agency:', employeeData.agencyId);
    console.log('[DEBUG] Employee data:', { ...employeeData, password: '***' });
    
    // Validation : s'assurer que l'agencyId est présent
    if (!employeeData.agencyId) {
      return of({ 
        success: false, 
        error: 'L\'ID de l\'agence est requis pour ajouter un employé.' 
      });
    }

    // Calculer isOwnerAgency selon le rôle
    const isOwnerAgency = employeeData.role === 'collector';
    
    // Préparer les données selon le schéma Swagger
    const requestData = {
      firstName: employeeData.firstName,
      lastName: employeeData.lastName,
      email: employeeData.email,
      password: employeeData.password,
      role: employeeData.role,
      phone: employeeData.phone,
      address: employeeData.address,
      agencyId: employeeData.agencyId, // Obligatoire pour les employés d'agence
      isOwnerAgency: isOwnerAgency // false pour manager, true pour collector
    };

    return this.http.post<any>(`${environment.apiUrl}/register`, requestData).pipe(
      map(response => {
        console.log("API > Add Employee Response:", response);
        console.log("Response type:", typeof response);
        console.log("Response keys:", Object.keys(response || {}));
        
        if (response && (response.user || response.success)) {
          const user = response.user || response;
          return { 
            success: true, 
            user: user, 
            message: response.message || 'Employé ajouté avec succès' 
          };
        } else {
          // Extraire l'erreur exacte du backend
          let backendError = 'Erreur lors de l\'ajout de l\'employé';
          
          if (response?.error) {
            backendError = response.error;
          } else if (response?.message) {
            backendError = response.message;
          }
          
          console.log('Erreur backend extraite:', backendError);
          
          return { 
            success: false, 
            error: backendError,
            originalResponse: response // Garder la réponse originale pour debug
          };
        }
      }),
      catchError((error: any) => {
        console.error('Add Employee Error Details:', error);
        console.error('Error structure:', JSON.stringify(error, null, 2));
        
        let errorMessage = 'Erreur lors de l\'ajout de l\'employé';
        let detailedErrors = {};
        
        // Priorité 1: Message direct du backend
        if (error.error?.error) {
          errorMessage = error.error.error;
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        // Priorité 2: Gestion des erreurs de validation spécifiques
        if (error.error) {
          // Erreurs de validation détaillées
          if (error.error.errors) {
            detailedErrors = error.error.errors;
            console.log('Erreurs de validation détaillées:', detailedErrors);
          }
          
          // Erreurs MongoDB (duplicate key)
          if (error.error.code === 11000) {
            if (error.error.keyValue?.email) {
              errorMessage = `L'email ${error.error.keyValue.email} est déjà utilisé`;
            } else if (error.error.keyValue?.phone) {
              errorMessage = `Le téléphone ${error.error.keyValue.phone} est déjà utilisé`;
            } else {
              errorMessage = 'Cette information est déjà utilisée par un autre utilisateur';
            }
          }
        }
        
        console.log('Message d\'erreur final:', errorMessage);
        
        return of({
          success: false,
          error: errorMessage,
          detailedErrors: detailedErrors,
          statusCode: error.status
        });
      })
    );
  }

  /**
   * Mettre à jour un employé existant
   * Utilise le endpoint PUT /api/user/{id}
   */
  updateEmployee(employeeId: string, employeeData: Partial<AddEmployeeData>): Observable<RegisterResponse> {
    console.log('[DEBUG] Updating employee:', employeeId);
    console.log('[DEBUG] Employee data:', { ...employeeData, password: '***' });
    
    // Validation : s'assurer que l'employeeId est présent
    if (!employeeId) {
      return of({ 
        success: false, 
        error: 'L\'ID de l\'employé est requis pour la modification.' 
      });
    }

    // Calculer isOwnerAgency selon le rôle
    const isOwnerAgency = employeeData.role === 'collector';
    
    // Préparer les données
    const requestData: any = {
      firstName: employeeData.firstName,
      lastName: employeeData.lastName,
      email: employeeData.email,
      role: employeeData.role,
      phone: employeeData.phone,
      address: employeeData.address,
      agencyId: employeeData.agencyId,
      isOwnerAgency: isOwnerAgency 
    };

  
    if (employeeData.password) {
      requestData.password = employeeData.password;
    }

    return this.http.put<any>(`${environment.apiUrl}/user/${employeeId}`, requestData).pipe(
      map(response => {
        console.log("API > Update Employee Response:", response);
        console.log("Response type:", typeof response);
        console.log("Response keys:", Object.keys(response || {}));
        
        if (response && (response.user || response.success)) {
          const user = response.user || response;
          return { 
            success: true, 
            user: user, 
            message: response.message || 'Employé modifié avec succès' 
          };
        } else {
          // Extraire l'erreur exacte du backend
          let backendError = 'Erreur lors de la modification de l\'employé';
          
          if (response?.error) {
            backendError = response.error;
          } else if (response?.message) {
            backendError = response.message;
          }
          
          console.log('Erreur backend extraite:', backendError);
          
          return { 
            success: false, 
            error: backendError,
            originalResponse: response 
          };
        }
      }),
      catchError((error: any) => {
        console.error('Update Employee Error Details:', error);
        console.error('Error structure:', JSON.stringify(error, null, 2));
        
        let errorMessage = 'Erreur lors de la modification de l\'employé';
        let detailedErrors = {};
        
        // Priorité 1: Message direct du backend
        if (error.error?.error) {
          errorMessage = error.error.error;
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }
        
        // Priorité 2: Erreurs de validation détaillées
        if (error.error?.errors) {
          detailedErrors = error.error.errors;
          console.log('Erreurs de validation détaillées:', detailedErrors);
        } else if (error.error?.details) {
          detailedErrors = error.error.details;
          console.log('Erreurs détaillées from backend:', detailedErrors);
        }
        
        // Gestion spéciale pour les erreurs de doublon email
        if (error.status === 409 || error.status === 400) {
          if (typeof error.error?.error === 'string' && error.error.error.includes('email')) {
            if (error.error.error.includes('already exists') || error.error.error.includes('déjà utilisé')) {
              errorMessage = 'Cette information est déjà utilisée par un autre utilisateur';
            }
          }
        }
        
        console.log('Message d\'erreur final:', errorMessage);
        
        return of({
          success: false,
          error: errorMessage,
          detailedErrors: detailedErrors,
          statusCode: error.status
        });
      })
    );
  }

  /**
   * Supprimer un employé existant
   * Utilise le endpoint DELETE /api/user/{id}
   */
  deleteEmployee(Id: string): Observable<RegisterResponse> {
    console.log('[DEBUG] Deleting employee:',Id);
    
    // Validation : s'assurer que l'employeeId est présent
    if (!Id) {
      return of({ 
        success: false, 
        error: 'L\'ID de l\'employé est requis pour la suppression.' 
      });
    }

    // Effectuer la requête DELETE
    return this.http.delete<any>(`${environment.apiUrl}/user/${Id}`).pipe(
      map((response: any) => {
        console.log('[DEBUG] Delete Employee Response:', response);
        
        // Vérifier si la suppression a réussi
        if (response && (response.success === true || response.message)) {
          return { 
            success: true, 
            message: response.message || 'Employé supprimé avec succès' 
          };
        } else {
          // Extraire l'erreur exacte du backend
          let backendError = 'Erreur lors de la suppression de l\'employé';
          
          if (response?.error) {
            backendError = response.error;
          } else if (response?.message) {
            backendError = response.message;
          }
          
          console.log('Erreur backend extraite:', backendError);
          
          return { 
            success: false, 
            error: backendError,
            originalResponse: response 
          };
        }
      }),
      catchError((error: any) => {
        console.error('Delete Employee Error Details:', error);
        console.error('Error structure:', JSON.stringify(error, null, 2));
        
        let errorMessage = 'Erreur lors de la suppression de l\'employé';
        let detailedErrors = {};
        
        // Priorité 1: Message direct du backend
        if (error.error?.error) {
          errorMessage = error.error.error;
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }
        
        // Gestion spéciale pour les erreurs de suppression
        if (error.status === 404) {
          errorMessage = 'Employé non trouvé';
        } else if (error.status === 403) {
          errorMessage = 'Vous n\'avez pas l\'autorisation de supprimer cet employé';
        } else if (error.status === 409) {
          errorMessage = 'Impossible de supprimer cet employé car il est lié à des données';
        }
        
        console.log('Message d\'erreur final:', errorMessage);
        
        return of({
          success: false,
          error: errorMessage,
          detailedErrors: detailedErrors,
          statusCode: error.status
        });
      })
    );
  }

  // ================================
  // fonction pour les analyses
  // ================================

  /**
   
   * @param agencyId 
   * @param filters 
   */
  getZoneAnalytics$(agencyId: string, filters?: ZoneAnalyticsFilters): Observable<ZoneAnalyticsResponse> {
    let params = new HttpParams().set('agencyId', agencyId);
    
    if (filters) {
      if (filters.zoneIds && filters.zoneIds.length > 0) {
        params = params.set('zoneIds', filters.zoneIds.join(','));
      }
      if (filters.clientType && filters.clientType !== 'all') {
        params = params.set('clientType', filters.clientType);
      }
      if (filters.period) {
        params = params.set('period', filters.period);
      }
      if (filters.includeInactive !== undefined) {
        params = params.set('includeInactive', filters.includeInactive.toString());
      }
    }

    return this.http.get<ZoneAnalyticsResponse>(`${environment.apiUrl}/agences/${agencyId}/zones/analytics`, { params }).pipe(
      map(response => {
        console.log("API > getZoneAnalytics :", response);
        return response;
      }),
      catchError(error => {
        console.error("Erreur lors de la récupération des analytics de zones :", error);
        return of({
          success: false,
          data: [],
          message: 'Erreur lors du chargement des statistiques des zones'
        });
      })
    );
  }

  /**
   * Récupère les statistiques spécifiques d'une zone
   * @param agencyId 
   * @param zoneId 
   * @param period 
   */
  getZoneStatistics$(agencyId: string, zoneId: string, period?: string): Observable<{ success: boolean; data: ZoneStatistics; message?: string }> {
    let params = new HttpParams();
    if (period) {
      params = params.set('period', period);
    }

    return this.http.get<{ success: boolean; data: ZoneStatistics; message?: string }>(`${environment.apiUrl}/agences/${agencyId}/zones/${zoneId}/statistics`, { params }).pipe(
      map(response => {
        console.log("API > getZoneStatistics :", response);
        return response;
      }),
      catchError(error => {
        console.error("Erreur lors de la récupération des statistiques de la zone :", error);
        return of({
          success: false,
          data: {} as ZoneStatistics,
          message: 'Erreur lors du chargement des statistiques de la zone'
        });
      })
    );
  }

  /**
   * Récupère le nombre de clients par type dans une zone spécifique
   * @param agencyId 
   * @param zoneId 
   */
  getClientsByTypeInZone$(agencyId: string, zoneId: string): Observable<{
    success: boolean;
    data: {
      totalClients: number;
      households: number;
      businesses: number;
      institutions: number;
      distribution: {
        householdsPercentage: number;
        businessesPercentage: number;
        institutionsPercentage: number;
      };
    };
    message?: string;
  }> {
    return this.http.get<any>(`${environment.apiUrl}/agences/${agencyId}/zones/${zoneId}/clients/types`).pipe(
      map(response => {
        console.log("API > getClientsByTypeInZone :", response);
        return response;
      }),
      catchError(error => {
        console.error("Erreur lors de la récupération des types de clients :", error);
        return of({
          success: false,
          data: {
            totalClients: 0,
            households: 0,
            businesses: 0,
            institutions: 0,
            distribution: {
              householdsPercentage: 0,
              businessesPercentage: 0,
              institutionsPercentage: 0
            }
          },
          message: 'Erreur lors du chargement des types de clients'
        });
      })
    );
  }

  /**
   * Récupère les métriques de charge de travail pour une zone
   * @param agencyId 
   * @param zoneId 
   */
  getZoneWorkloadMetrics$(agencyId: string, zoneId: string): Observable<{
    success: boolean;
    data: {
      estimatedWorkHours: number;
      requiredTeamSize: number;
      requiredVehicles: number;
      capacityUsagePercentage: number;
      efficiency: 'optimal' | 'good' | 'overloaded' | 'underutilized';
      recommendations: string[];
    };
    message?: string;
  }> {
    return this.http.get<any>(`${environment.apiUrl}/agences/${agencyId}/zones/${zoneId}/workload`).pipe(
      map(response => {
        console.log("API > getZoneWorkloadMetrics :", response);
        return response;
      }),
      catchError(error => {
        console.error("Erreur lors de la récupération des métriques de charge :", error);
        return of({
          success: false,
          data: {
            estimatedWorkHours: 0,
            requiredTeamSize: 0,
            requiredVehicles: 0,
            capacityUsagePercentage: 0,
            efficiency: 'optimal' as const,
            recommendations: []
          },
          message: 'Erreur lors du chargement des métriques de charge'
        });
      })
    );
  }

  /**
   * Récupère l'évolution des abonnements dans une zone
   * @param agencyId 
   * @param zoneId 
   * @param period 
   */
  getSubscriptionEvolution$(agencyId: string, zoneId?: string, period: string = 'month'): Observable<{
    success: boolean;
    data: {
      zoneId?: string;
      zoneName?: string;
      period: string;
      currentSubscriptions: number;
      newSubscriptions: number;
      cancelledSubscriptions: number;
      growthRate: number;
      churnRate: number;
      evolution: Array<{
        date: string;
        subscriptions: number;
        newSubs: number;
        cancelled: number;
      }>;
    }[];
    message?: string;
  }> {
    let params = new HttpParams().set('period', period);
    
    const endpoint = zoneId 
      ? `${environment.apiUrl}/agences/${agencyId}/zones/${zoneId}/subscriptions/evolution`
      : `${environment.apiUrl}/agences/${agencyId}/subscriptions/evolution`;

    return this.http.get<any>(endpoint, { params }).pipe(
      map(response => {
        console.log("API > getSubscriptionEvolution :", response);
        return response;
      }),
      catchError(error => {
        console.error("Erreur lors de la récupération de l'évolution des abonnements :", error);
        return of({
          success: false,
          data: [],
          message: 'Erreur lors du chargement de l\'évolution des abonnements'
        });
      })
    );
  }

  /**
   * Récupère les recommandations automatiques pour l'optimisation des zones
   * @param agencyId
   * @param zoneId 
   */
  getZoneRecommendations$(agencyId: string, zoneId?: string): Observable<ZoneRecommendationsResponse> {
    const endpoint = zoneId 
      ? `${environment.apiUrl}/agences/${agencyId}/zones/${zoneId}/recommendations`
      : `${environment.apiUrl}/agences/${agencyId}/zones/recommendations`;

    return this.http.get<ZoneRecommendationsResponse>(endpoint).pipe(
      map(response => {
        console.log("API > getZoneRecommendations :", response);
        return response;
      }),
      catchError(error => {
        console.error("Erreur lors de la récupération des recommandations :", error);
        return of({
          success: false,
          data: [],
          message: 'Erreur lors du chargement des recommandations'
        });
      })
    );
  }

  /**
   * Compare les performances entre différentes zones
   * @param agencyId 
   * @param zoneIds
   */
  compareZonePerformance$(agencyId: string, zoneIds?: string[]): Observable<ZoneComparisonResponse> {
    let params = new HttpParams();
    if (zoneIds && zoneIds.length > 0) {
      params = params.set('zoneIds', zoneIds.join(','));
    }

    return this.http.get<ZoneComparisonResponse>(`${environment.apiUrl}/agences/${agencyId}/zones/comparison`, { params }).pipe(
      map(response => {
        console.log("API > compareZonePerformance :", response);
        return response;
      }),
      catchError(error => {
        console.error("Erreur lors de la comparaison des zones :", error);
        return of({
          success: false,
          data: [],
          summary: {
            totalZones: 0,
            bestPerformingZone: '',
            mostEfficient: '',
            needsAttention: []
          }
        });
      })
    );
  }

  /**
   * Optimise automatiquement les ressources d'une zone
   * @param agencyId 
   * @param zoneId 
   * @param optimizationType 
   */
  optimizeZoneResources$(
    agencyId: string, 
    zoneId: string, 
    optimizationType: 'team' | 'vehicles' | 'schedule' | 'all'
  ): Observable<{
    success: boolean;
    data: {
      optimizationType: string;
      currentState: any;
      optimizedState: any;
      expectedImprovements: {
        efficiency: number;
        costReduction: number;
        timeReduction: number;
      };
      implementationSteps: string[];
    };
    message?: string;
  }> {
    const payload = { optimizationType };

    return this.http.post<any>(`${environment.apiUrl}/agences/${agencyId}/zones/${zoneId}/optimize`, payload).pipe(
      map(response => {
        console.log("API > optimizeZoneResources :", response);
        return response;
      }),
      catchError(error => {
        console.error("Erreur lors de l'optimisation de la zone :", error);
        return of({
          success: false,
          data: {
            optimizationType,
            currentState: {},
            optimizedState: {},
            expectedImprovements: {
              efficiency: 0,
              costReduction: 0,
              timeReduction: 0
            },
            implementationSteps: []
          },
          message: 'Erreur lors de l\'optimisation de la zone'
        });
      })
    );
  }

  /**
   * Génère un rapport détaillé pour une zone
   * @param agencyId 
   * @param zoneId 
   * @param reportType 
   * @param period 
   */
  generateZoneReport$(
    agencyId: string, 
    zoneId: string, 
    reportType: 'performance' | 'financial' | 'operational' | 'complete',
    period: string = 'month'
  ): Observable<{
    success: boolean;
    data: {
      reportId: string;
      reportType: string;
      period: string;
      generatedAt: string;
      downloadUrl?: string;
      summary: any;
      details: any;
    };
    message?: string;
  }> {
    const payload = { reportType, period };

    return this.http.post<any>(`${environment.apiUrl}/agences/${agencyId}/zones/${zoneId}/reports`, payload).pipe(
      map(response => {
        console.log("API > generateZoneReport :", response);
        return response;
      }),
      catchError(error => {
        console.error("Erreur lors de la génération du rapport :", error);
        return of({
          success: false,
          data: {
            reportId: '',
            reportType,
            period,
            generatedAt: new Date().toISOString(),
            summary: {},
            details: {}
          },
          message: 'Erreur lors de la génération du rapport'
        });
      })
    );
  }
  
  //Choisir les agences par hasard

  public getRandomAgencies(list: any[]): any[] {
    const shuffled = [...list];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, Math.min(4, shuffled.length));
  }
}