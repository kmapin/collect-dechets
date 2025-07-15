import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Collection, CollectionStatus, CollectionRoute, CollectionReport } from '../models/collection.model';

@Injectable({
  providedIn: 'root'
})
export class CollectionService {
  private collections: Collection[] = [
    {
      id: '1',
      clientId: 'client1',
      agencyId: 'agency1',
      collectorId: 'collector1',
      scheduledDate: new Date('2024-01-15T09:00:00'),
      collectedDate: new Date('2024-01-15T09:30:00'),
      status: CollectionStatus.COMPLETED,
      address: {
        street: 'Rue des Roses',
        doorNumber: '15',
        doorColor: 'blue',
        neighborhood: 'Centre-ville',
        city: 'Paris',
        postalCode: '75001',
        latitude: 48.8566,
        longitude: 2.3522
      },
      wasteTypes: [
        {
          id: '1',
          name: 'Déchets ménagers',
          description: 'Déchets organiques et non recyclables',
          icon: 'delete',
          color: '#4caf50',
          instructions: ['Placer dans le bac vert', 'Fermer hermétiquement'],
          acceptedItems: ['Épluchures', 'Restes alimentaires', 'Papiers souillés'],
          rejectedItems: ['Verre', 'Métaux', 'Plastiques recyclables']
        }
      ],
      notes: 'Collecte effectuée sans problème',
      rating: 5,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      clientId: 'client2',
      agencyId: 'agency1',
      collectorId: 'collector1',
      scheduledDate: new Date('2024-01-15T10:00:00'),
      status: CollectionStatus.SCHEDULED,
      address: {
        street: 'Avenue de la Liberté',
        doorNumber: '32',
        doorColor: 'red',
        neighborhood: 'Quartier Latin',
        city: 'Paris',
        postalCode: '75005',
        latitude: 48.8499,
        longitude: 2.3447
      },
      wasteTypes: [
        {
          id: '2',
          name: 'Recyclables',
          description: 'Plastiques, papiers, cartons',
          icon: 'recycling',
          color: '#2196f3',
          instructions: ['Placer dans le bac jaune', 'Rincer les contenants'],
          acceptedItems: ['Bouteilles plastiques', 'Papiers', 'Cartons'],
          rejectedItems: ['Plastiques noirs', 'Papiers gras', 'Verre']
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  private routes: CollectionRoute[] = [
    {
      id: '1',
      collectorId: 'collector1',
      date: new Date('2024-01-15'),
      collections: this.collections,
      optimizedOrder: ['1', '2'],
      status: 'active' as any,
      startTime: new Date('2024-01-15T08:00:00'),
      totalDistance: 15.5,
      estimatedDuration: 240
    }
  ];

  private reports: CollectionReport[] = [
    {
      id: '1',
      collectionId: '1',
      clientId: 'client1',
      agencyId: 'agency1',
      reportType: 'missed_collection' as any,
      description: 'La collecte n\'a pas eu lieu à l\'heure prévue',
      status: 'open' as any,
      createdAt: new Date()
    }
  ];

  getCollections(): Observable<Collection[]> {
    return of(this.collections).pipe(delay(500));
  }

  getCollectionById(id: string): Observable<Collection | undefined> {
    return of(this.collections.find(collection => collection.id === id)).pipe(delay(300));
  }

  getCollectionsByClient(clientId: string): Observable<Collection[]> {
    return of(this.collections.filter(c => c.clientId === clientId)).pipe(delay(400));
  }

  getCollectionsByAgency(agencyId: string): Observable<Collection[]> {
    return of(this.collections.filter(c => c.agencyId === agencyId)).pipe(delay(400));
  }

  getCollectionsByCollector(collectorId: string): Observable<Collection[]> {
    return of(this.collections.filter(c => c.collectorId === collectorId)).pipe(delay(400));
  }

  createCollection(collection: Partial<Collection>): Observable<Collection> {
    const newCollection: Collection = {
      id: Math.random().toString(36).substr(2, 9),
      clientId: collection.clientId || '',
      agencyId: collection.agencyId || '',
      collectorId: collection.collectorId || '',
      scheduledDate: collection.scheduledDate || new Date(),
      status: CollectionStatus.SCHEDULED,
      address: collection.address || {} as any,
      wasteTypes: collection.wasteTypes || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.collections.push(newCollection);
    return of(newCollection).pipe(delay(1000));
  }

  updateCollection(id: string, updates: Partial<Collection>): Observable<Collection> {
    const index = this.collections.findIndex(c => c.id === id);
    if (index !== -1) {
      this.collections[index] = { ...this.collections[index], ...updates, updatedAt: new Date() };
      return of(this.collections[index]).pipe(delay(800));
    }
    throw new Error('Collection not found');
  }

  updateCollectionStatus(id: string, status: CollectionStatus): Observable<Collection> {
    return this.updateCollection(id, { status });
  }

  completeCollection(id: string, notes?: string, photos?: string[]): Observable<Collection> {
    return this.updateCollection(id, {
      status: CollectionStatus.COMPLETED,
      collectedDate: new Date(),
      notes,
      photos
    });
  }

  getCollectionRoutes(collectorId: string): Observable<CollectionRoute[]> {
    return of(this.routes.filter(r => r.collectorId === collectorId)).pipe(delay(400));
  }

  getTodayRoute(collectorId: string): Observable<CollectionRoute | undefined> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return of(this.routes.find(r => 
      r.collectorId === collectorId && 
      r.date.toDateString() === today.toDateString()
    )).pipe(delay(300));
  }

  optimizeRoute(routeId: string): Observable<CollectionRoute> {
    const route = this.routes.find(r => r.id === routeId);
    if (route) {
      // Simple optimization logic (in real app, use routing service)
      route.optimizedOrder = route.collections.map(c => c.id).sort();
      return of(route).pipe(delay(1000));
    }
    throw new Error('Route not found');
  }

  createReport(report: Partial<CollectionReport>): Observable<CollectionReport> {
    const newReport: CollectionReport = {
      id: Math.random().toString(36).substr(2, 9),
      collectionId: report.collectionId || '',
      clientId: report.clientId || '',
      agencyId: report.agencyId || '',
      reportType: report.reportType || 'other' as any,
      description: report.description || '',
      photos: report.photos || [],
      status: 'open' as any,
      createdAt: new Date()
    };

    this.reports.push(newReport);
    return of(newReport).pipe(delay(1000));
  }

  getReports(): Observable<CollectionReport[]> {
    return of(this.reports).pipe(delay(500));
  }

  getReportsByAgency(agencyId: string): Observable<CollectionReport[]> {
    return of(this.reports.filter(r => r.agencyId === agencyId)).pipe(delay(400));
  }

  updateReportStatus(id: string, status: any, resolution?: string): Observable<CollectionReport> {
    const index = this.reports.findIndex(r => r.id === id);
    if (index !== -1) {
      this.reports[index] = { 
        ...this.reports[index], 
        status, 
        resolution,
        resolvedAt: status === 'resolved' ? new Date() : undefined
      };
      return of(this.reports[index]).pipe(delay(800));
    }
    throw new Error('Report not found');
  }
}