import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Agency, ServiceZone, WasteService, Employee } from '../models/agency.model';

@Injectable({
  providedIn: 'root'
})
export class AgencyService {
  private agencies: Agency[] = [
    {
      id: '1',
      name: 'EcoClean Services',
      description: 'Service de collecte écologique professionnel',
      email: 'contact@ecoclean.com',
      phone: '+33123456789',
      address: {
        street: 'Avenue des Champs',
        doorNumber: '123',
        neighborhood: 'Centre-ville',
        city: 'Paris',
        postalCode: '75001',
        latitude: 48.8566,
        longitude: 2.3522
      },
      serviceZones: [
        {
          id: '1',
          name: 'Zone Nord',
          description: 'Quartiers nord de la ville',
          boundaries: [
            { latitude: 48.8566, longitude: 2.3522 },
            { latitude: 48.8606, longitude: 2.3376 },
            { latitude: 48.8629, longitude: 2.3417 }
          ],
          neighborhoods: ['Montmartre', 'Belleville'],
          cities: ['Paris'],
          isActive: true
        }
      ],
      services: [
        {
          id: '1',
          name: 'Collecte Standard',
          description: 'Collecte hebdomadaire des déchets ménagers',
          wasteTypes: [],
          frequency: 'weekly' as any,
          price: 25.99,
          currency: 'EUR',
          isActive: true
        }
      ],
      employees: [],
      schedule: [],
      rating: 4.5,
      totalClients: 1250,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      name: 'GreenWaste Solutions',
      description: 'Solutions durables pour la gestion des déchets',
      email: 'info@greenwaste.com',
      phone: '+33987654321',
      address: {
        street: 'Rue de la Paix',
        doorNumber: '456',
        neighborhood: 'Quartier Latin',
        city: 'Paris',
        postalCode: '75005',
        latitude: 48.8499,
        longitude: 2.3447
      },
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
      rating: 4.2,
      totalClients: 850,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  getAgencies(): Observable<Agency[]> {
    return of(this.agencies).pipe(delay(500));
  }

  getAgencyById(id: string): Observable<Agency | undefined> {
    return of(this.agencies.find(agency => agency.id === id)).pipe(delay(300));
  }

  searchAgencies(query: string): Observable<Agency[]> {
    const filtered = this.agencies.filter(agency =>
      agency.name.toLowerCase().includes(query.toLowerCase()) ||
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
      id: Math.random().toString(36).substr(2, 9),
      name: agency.name || '',
      description: agency.description || '',
      email: agency.email || '',
      phone: agency.phone || '',
      address: agency.address || {} as any,
      serviceZones: agency.serviceZones || [],
      services: agency.services || [],
      employees: agency.employees || [],
      schedule: agency.schedule || [],
      rating: 0,
      totalClients: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.agencies.push(newAgency);
    return of(newAgency).pipe(delay(1000));
  }

  updateAgency(id: string, updates: Partial<Agency>): Observable<Agency> {
    const index = this.agencies.findIndex(agency => agency.id === id);
    if (index !== -1) {
      this.agencies[index] = { ...this.agencies[index], ...updates, updatedAt: new Date() };
      return of(this.agencies[index]).pipe(delay(800));
    }
    throw new Error('Agency not found');
  }

  deleteAgency(id: string): Observable<boolean> {
    const index = this.agencies.findIndex(agency => agency.id === id);
    if (index !== -1) {
      this.agencies.splice(index, 1);
      return of(true).pipe(delay(500));
    }
    return of(false).pipe(delay(500));
  }

  getAgencyEmployees(agencyId: string): Observable<Employee[]> {
    const agency = this.agencies.find(a => a.id === agencyId);
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

    const agency = this.agencies.find(a => a.id === agencyId);
    if (agency) {
      agency.employees.push(newEmployee);
    }

    return of(newEmployee).pipe(delay(1000));
  }

  updateEmployee(agencyId: string, employeeId: string, updates: Partial<Employee>): Observable<Employee> {
    const agency = this.agencies.find(a => a.id === agencyId);
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
    const agency = this.agencies.find(a => a.id === agencyId);
    if (agency) {
      const index = agency.employees.findIndex(e => e.id === employeeId);
      if (index !== -1) {
        agency.employees.splice(index, 1);
        return of(true).pipe(delay(500));
      }
    }
    return of(false).pipe(delay(500));
  }
}