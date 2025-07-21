import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { Agency, ServiceZone, WasteService, Employee } from '../models/agency.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AgencyService {
    private currentServiceZoneSubject = new BehaviorSubject<ServiceZone | null>(null);
       private currentcollectionneurSubject = new BehaviorSubject<ServiceZone | null>(null);
    public currentUser$ = this.currentServiceZoneSubject.asObservable();
    private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
    public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  private agencies: Agency[] = [
    {
      _id: '1',
      userId: 'user1',
      firstName: 'Jean',
      lastName: 'Dupont',
      agencyName: 'EcoCollect Pro',
      agencyDescription: 'Service de collecte écologique et professionnel',
      phone: '+33123456789',
      address: {
        street: 'Avenue des Champs',
        arrondissement: '8',
        sector: 'Centre',
        neighborhood: 'Champs-Élysées',
        city: 'Paris',
        postalCode: '75008',
        latitude: 48.8698,
        longitude: 2.3077
      },
      licenseNumber: 'LIC-001',
      members: [],
      serviceZones: [
        {
          id: '1',
          name: 'Zone Nord',
          description: 'Quartiers nord de la ville',
          boundaries: [
            { latitude: 48.8698, longitude: 2.3077 },
            { latitude: 48.8639, longitude: 2.2978 },
            { latitude: 48.8662, longitude: 2.3120 }
          ],
          neighborhoods: ['Champs-Élysées', 'Madeleine'],
          cities: ['Paris'],
          isActive: true
        }
      ],
      services: [
        {
          id: '1',
          name: 'Collecte Standard',
          description: 'Collecte hebdomadaire de déchets ménagers',
          wasteTypes: [],
          frequency: 'weekly' as any,
          price: 29.99,
          currency: 'EUR',
          isActive: true
        }
      ],
      employees: [],
      schedule: [],
      collectors: [],
      clients: [],
      rating: 4.5,
      totalClients: 1250,
      acceptTerms: true,
      receiveOffers: true,
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      __v: 0
    },
    {
      _id: '2',
      userId: 'user2',
      firstName: 'Marie',
      lastName: 'Martin',
      agencyName: 'GreenWaste Solutions',
      agencyDescription: 'Solutions durables pour la gestion des déchets',
      phone: '+33987654321',
      address: {
        street: 'Rue de la Paix',
        arrondissement: '5',
        sector: 'Sud',
        neighborhood: 'Quartier Latin',
        city: 'Paris',
        postalCode: '75005',
        latitude: 48.8499,
        longitude: 2.3447
      },
      licenseNumber: 'LIC-002',
      members: [],
      serviceZones: [
        {
          id: '2',
          name: 'Zone Sud',
          description: 'Quartiers sud de la ville',
          boundaries: [
            { latitude: 48.8499, longitude: 2.3447 },
            { latitude: 48.8439, longitude: 2.3378 },
            { latitude: 48.8462, longitude: 2.3520 }
          ],
          neighborhoods: ['Saint-Germain', 'Montparnasse'],
          cities: ['Paris'],
          isActive: true
        }
      ],
      services: [
        {
          id: '2',
          name: 'Collecte Premium',
          description: 'Collecte bi-hebdomadaire avec tri sélectif',
          wasteTypes: [],
          frequency: 'biweekly' as any,
          price: 45.99,
          currency: 'EUR',
          isActive: true
        }
      ],
      employees: [],
      schedule: [],
      collectors: [],
      clients: [],
      rating: 4.2,
      totalClients: 850,
      acceptTerms: true,
      receiveOffers: true,
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      __v: 0
    }
  ];

  constructor(private http: HttpClient) {}

  getAgencies(): Observable<Agency[]> {
    return of(this.agencies).pipe(delay(500));
  }

  getAgencyById(id: string): Observable<Agency | undefined> {
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
      __v: 0
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

  getAgencyEmployees(agencyId: string): Observable<Employee[]> {
    const agency = this.agencies.find(a => a._id === agencyId);
    return of(agency?.employees || []).pipe(delay(300));
  }

  addEmployee(agencyId: string, employee: Partial<Employee>): Observable<Employee> {
    const newEmployee: Employee = {
      id: Math.random().toString(36).substr(2, 9),
      userId: Math.random().toString(36).substr(2, 9),
       firstName: employee.firstName || '',
      lastName: employee.lastName || '',
      email: employee.email || '',
      phone: employee.phone || '',
      role: employee.role || 'collector' as any,
      zones: employee.zones || [],
      isActive: true,
      hiredAt: new Date()
    };

    const agency = this.agencies.find(a => a._id === agencyId);
    if (agency) {
      agency.employees.push(newEmployee);
    }

    return of(newEmployee).pipe(delay(1000));
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

  /**
   * Récupère toutes les agences depuis l'API backend
   */
  getAllAgenciesFromApi(): Observable<{ success: boolean; count: number; data: Agency[] }> {
    return this.http.get<{ success: boolean; count: number; data: Agency[] }>(`${environment.apiUrl}/agences/recuperation`);
  }

  /**
   * Récupère une agence spécifique depuis l'API backend
   */
  getAgencyByIdFromApi(id: string): Observable<{ success: boolean; data: Agency }> {
    return this.http.get<{ success: boolean; data: Agency }>(`${environment.apiUrl}/agences/recuperation/${id}`);
  }

  
    
    /**
     * la creation d une zone via l'API réelle
     */
    registerZone$(zonesData: any): Observable<{ success: boolean; zone?: ServiceZone; error?: string; message?: string }> {
      return this.http.post<any>(`${environment.apiUrl}/zones/register`, zonesData).pipe(
        map(response => {
          console.log("API > zones :", response)
          if (response && response.zone) {
            localStorage.setItem('currentagence', JSON.stringify(response.zone));
            this.currentServiceZoneSubject.next(response.zone);
            this.isAuthenticatedSubject.next(true);
            return { success: true, zone: response.zone, message: response.message };
          } else {
            return { success: false, error: response?.error || 'Erreur lors de la zone', message: response?.message };
          }
        })
      );
    }
    /**
     * la creation d un collectionneur via l'API réelle
     */
   registerCollectionneur$(collectionneurData: any): Observable<{ success: boolean; collectionneur?: Employee; error?: string; message?: string }> {
      return this.http.post<any>(`${environment.apiUrl}/agences/employés`, collectionneurData).pipe(
        map(response => {
          if (response && response.collectionneur) {
         localStorage.setItem('currentagence', JSON.stringify(response.zone));
            this.currentcollectionneurSubject.next(response.zone);
            this.isAuthenticatedSubject.next(true);
            return { success: true, collectionneur: response.collectionneur, message: response.message };
          } else {
            return { success: false, error: response?.error || 'Erreur lors de la zone', message: response?.message };
          }
        })
      );
    }
}