import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, delay, map, tap } from 'rxjs/operators';
import { Agency, ServiceZone, WasteService, Employee, Employees, ServiceZones, CollectionSchedule, EmployeeRole, tarif, Tariff } from '../models/agency.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AgencyService {
  private agencies: Agency[] = [
    // {
    //   _id: '1',
    //   userId: 'user1',
    //   firstName: 'Jean',
    //   lastName: 'Dupont',
    //   agencyName: 'EcoCollect Pro',
    //   agencyDescription: 'Service de collecte écologique et professionnel',
    //   phone: '+33123456789',
    //   address: {
    //     street: 'Avenue des Champs',
    //     arrondissement: '8',
    //     sector: 'Centre',
    //     neighborhood: 'Champs-Élysées',
    //     city: 'Paris',
    //     postalCode: '75008',
    //     latitude: 48.8698,
    //     longitude: 2.3077
    //   },
    //   licenseNumber: 'LIC-001',
    //   members: [],
    //   serviceZones: [
    //     {
    //       id: '1',
    //       name: 'Zone Nord',
    //       description: 'Quartiers nord de la ville',
    //       boundaries: [
    //         { latitude: 48.8698, longitude: 2.3077 },
    //         { latitude: 48.8639, longitude: 2.2978 },
    //         { latitude: 48.8662, longitude: 2.3120 }
    //       ],
    //       neighborhoods: ['Champs-Élysées', 'Madeleine'],
    //       cities: ['Paris'],
    //       isActive: true
    //     }
    //   ],
    //   services: [
    //     {
    //       id: '1',
    //       name: 'Collecte Standard',
    //       description: 'Collecte hebdomadaire de déchets ménagers',
    //       wasteTypes: [],
    //       frequency: 'weekly' as any,
    //       price: 29.99,
    //       currency: 'EUR',
    //       isActive: true
    //     }
    //   ],
    //   employees: [],
    //   schedule: [],
    //   collectors: [],
    //   clients: [],
    //   rating: 4.5,
    //   totalClients: 1250,
    //   acceptTerms: true,
    //   receiveOffers: true,
    //   isActive: true,
    //   createdAt: '2024-01-01T00:00:00.000Z',
    //   updatedAt: '2024-01-01T00:00:00.000Z',
    //   __v: 0
    // },
    // {
    //   _id: '2',
    //   userId: 'user2',
    //   firstName: 'Marie',
    //   lastName: 'Martin',
    //   agencyName: 'GreenWaste Solutions',
    //   agencyDescription: 'Solutions durables pour la gestion des déchets',
    //   phone: '+33987654321',
    //   address: {
    //     street: 'Rue de la Paix',
    //     arrondissement: '5',
    //     sector: 'Sud',
    //     neighborhood: 'Quartier Latin',
    //     city: 'Paris',
    //     postalCode: '75005',
    //     latitude: 48.8499,
    //     longitude: 2.3447
    //   },
    //   licenseNumber: 'LIC-002',
    //   members: [],
    //   serviceZones: [
    //     {
    //       id: '2',
    //       name: 'Zone Sud',
    //       description: 'Quartiers sud de la ville',
    //       boundaries: [
    //         { latitude: 48.8499, longitude: 2.3447 },
    //         { latitude: 48.8439, longitude: 2.3378 },
    //         { latitude: 48.8462, longitude: 2.3520 }
    //       ],
    //       neighborhoods: ['Saint-Germain', 'Montparnasse'],
    //       cities: ['Paris'],
    //       isActive: true
    //     }
    //   ],
    //   services: [
    //     {
    //       id: '2',
    //       name: 'Collecte Premium',
    //       description: 'Collecte bi-hebdomadaire avec tri sélectif',
    //       wasteTypes: [],
    //       frequency: 'biweekly' as any,
    //       price: 45.99,
    //       currency: 'EUR',
    //       isActive: true
    //     }
    //   ],
    //   employees: [],
    //   schedule: [],
    //   collectors: [],
    //   clients: [],
    //   rating: 4.2,
    //   totalClients: 850,
    //   acceptTerms: true,
    //   receiveOffers: true,
    //   isActive: true,
    //   createdAt: '2024-01-01T00:00:00.000Z',
    //   updatedAt: '2024-01-01T00:00:00.000Z',
    //   __v: 0
    // }
  ];
  private tariffs: Agency[] = [
 
  ];
  constructor(private http: HttpClient) { }

  getAgencies(): Observable<Agency[]> {
    return of(this.agencies).pipe(delay(500));
  }

  getAgencyById(id: string|null): Observable<Agency | undefined> {
    return of(this.agencies.find(agency => agency._id === id)).pipe(delay(300));
  }

  searchAgencies(query: string): Observable<Agency[]> {
    const filtered = this.agencies.filter(agency =>
      agency.agencyName.toLowerCase().includes(query.toLowerCase()) ||
      agency.address.city.toLowerCase().includes(query.toLowerCase()) ||
      agency.address.neighborhood.toLowerCase().includes(query.toLowerCase())
    );
    return of(filtered).pipe(delay(500));
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
      agencyName: agency.agencyName || '',
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

  deleteAgency(id: string): Observable<boolean> {
    const index = this.agencies.findIndex(agency => agency._id === id);
    if (index !== -1) {
      this.agencies.splice(index, 1);
      return of(true).pipe(delay(500));
    }
    return of(false).pipe(delay(500));
  }

  getAllAgenciesFromApi(): Observable<{ success: boolean; count: number; data: Agency[] }> {
    return this.http.get<{ success: boolean; count: number; data: Agency[] }>(`${environment.apiUrl}/agences/recuperation?limit=25`);
  }


  /**
   * Récupère une agence spécifique depuis l'API backend
   */
  getAgencyByIdFromApi(id: string|null): Observable<{ success: boolean; data: Agency }> {
    return this.http.get<{ success: boolean; data: Agency }>(`${environment.apiUrl}/agences/recuperation/${id}`);
  }

    getAgencyById1(id: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}/agences/recuperation/${id}`).pipe(
      map((response: any) => {
        console.log('API > getAgencyById:', response);
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
getAgencyEmployeesByRole$(agencyId: string, role:EmployeeRole): Observable<Employees[]> {
    const agency = this.agencies.find(a => a._id === agencyId);
  return this.http.get<Employees[]>(`${environment.apiUrl}/agences/${agencyId}/employees/role/${role}`);
 
}
//recupere les zones d une agence
getAgencyZones$(agencyId: string): Observable<ServiceZone[]> {
  return this.http.get<ServiceZone[]>(`${environment.apiUrl}/zones/agence/${agencyId}`);
}
//recupere des tarifs liee a une agence
getAgencyTariffs$(agencyId: string): Observable<WasteService[]> {
  return this.http.get<WasteService[]>(`${environment.apiUrl}/agences/${agencyId}/tarifs`);
}

//recuperation des signalement liee a une agence
getAgencyReports$(agencyId: string): Observable<any[]> {
  const url = `${environment.apiUrl}/agences/${agencyId}/clients/signalements`;
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
//recuperation des statistique liee a une agence 
getAgencyStats$(agencyId: string): Observable<any> {
  return this.http.get<any>(`${environment.apiUrl}/agences/${agencyId}/statistiques`).pipe(
    map((response) => { 
      console.log("Statistiques récupérées :", response);
      return response;
    }),
    catchError((error) => {
      console.error("Erreur lors de la récupération des statistiques :", error);
      return of({'totalClients':'undefind', 'totalCollections': 'undefind', 'totalIncidents': 'undefind' }); // Gérer l'erreur de manière appropriée
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
  getAgencyAllTarifs$(agencyId: string): Observable<Tariff[]> {
    const agency = this.agencies.find(a => a._id === agencyId);
    return this.http.get<Tariff[]>(`${environment.apiUrl}/agences/${agencyId}/tarif`);

  }
deleteEmployee$(employeeId: string): Observable<boolean> {
  return this.http.delete(`${environment.apiUrl}/agences/employees/${employeeId}`).pipe(
    map(() => {
      console.log(`Employé ${employeeId} supprimé avec succès`);
      return true;
    }),
    catchError(error => {
      console.error(`Erreur lors de la suppression de l'employé ${employeeId} :`, error);
      return of(false); // Retourne false en cas d'erreur
    })
  );
}

// updateEmployee$(employeeId: string, updatedData: any): Observable<any> {
//   return this.http.put<any>(
//     `${environment.apiUrl}/agences/employees/${employeeId}`,
//     updatedData
//   ).pipe(
//     tap((response) => console.log('Employé mis à jour :', response)),
//     catchError((error) => {
//       console.error("Erreur lors de la mise à jour :", error);
//       return throwError(() => error);
//     })
//   );
// }
 


//Activer ou desactiver une agence 
  activateAgency(id: string): Observable<any> {
    return this.http.patch(`${environment.apiUrl}/auth/agences/${id}/status`, {});
  }
  // addEmployee(agencyId: string, employee: Partial<Employee>): Observable<Employee> {
  //   const newEmployee: Employee = {
  //     id: Math.random().toString(36).substr(2, 9),
  //     userId: Math.random().toString(36).substr(2, 9),
  //      firstName: employee.firstName || '',
  //     lastName: employee.lastName || '',
  //     email: employee.email || '',
  //     phone: employee.phone || '',
  //     role: employee.role || 'collector' as any,
  //     zones: employee.zones || [],
  //     isActive: true,
  //     hiredAt: new Date()
  //   };

  private currentUserSubject = new BehaviorSubject<Employees | null>(null);
  getCurrentUser(): Employees | null {
    return this.currentUserSubject.value;
  }

  addEmployee(employee: Partial<Employees>): Observable<Employees | null> {
    const newEmployee: Employees = {
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

  updateEmployee(agencyId: string, employeeId: string, updates: Partial<Employee>): Observable<Employee> {
    const agency = this.agencies.find(a => a._id === agencyId);
    if (agency) {
      const index = agency.employees.findIndex(e => e.id === employeeId);
      if (index !== -1) {
        agency.employees[index] = { ...agency.employees[index], ...updates };
        return of(agency.employees[index]).pipe(delay(800));
      }
    }
    throw new Error('Employee not found');
  }

  deleteEmployee(agencyId: string, employeeId: string): Observable<boolean> {
    const agency = this.agencies.find(a => a._id === agencyId);
    if (agency) {
      const index = agency.employees.findIndex(e => e.id === employeeId);
      if (index !== -1) {
        agency.employees.splice(index, 1);
        return of(true).pipe(delay(500));
      }
    }
    return of(false).pipe(delay(500));
  }
  //ajouter un tarifs 
  addTariff(tariff: Partial<Tariff>): Observable<Tariff | null> {
const newTariff: Tariff = {
  agencyId: tariff.agencyId || '',
  type: tariff.type || 'standard',
  price: tariff.price || 0,
  description: tariff.description || '',
  nbPassages: tariff.nbPassages || 0,
  createdAt: new Date(),
  updatedAt: new Date()
};

  return this.http.post<Tariff>(`${environment.apiUrl}/agences/tarif`, newTariff).pipe(
    map((response: Tariff) => {
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
  return this.http.delete(`${environment.apiUrl}/agences/tarif/${tarifId}`).pipe(
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
    return this.http.post<CollectionSchedule>(`${environment.apiUrl}/zones/planification`, schedule).pipe(
      map((response: CollectionSchedule) => {
        console.log("API > planification enregistre :", response);
        return response;
      }),
      catchError(error => {
        console.error("Erreur lors de l'enregistrement de la planification:", error);
        return of(null); 
      })
    );

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
}