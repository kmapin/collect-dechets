import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Country, City, Arrondissement, Sector, Quartier } from '../models/countries-org.model';

function normalizeId<T extends { _id?: string; id?: string }>(item: T): T {
  return item._id ? { ...item, id: item._id } : item;
}

@Injectable({ providedIn: 'root' })
export class TerritoryHttpService {
  private readonly api = `${environment.apiUrl}/territories`;

  constructor(private http: HttpClient) {}

  getCountries(): Observable<Country[]> {
    return this.http.get<Country[]>(`${this.api}/countries`).pipe(map((items) => items.map(normalizeId)));
  }

  getCountry(id: string): Observable<Country> {
    return this.http.get<Country>(`${this.api}/countries/${id}`).pipe(map(normalizeId));
  }

  createCountry(data: { name: string; code?: string; latitude?: number; longitude?: number }): Observable<Country> {
    return this.http.post<Country>(`${this.api}/countries`, data).pipe(map(normalizeId));
  }

  updateCountry(id: string, data: { name: string; code?: string; latitude?: number; longitude?: number }): Observable<Country> {
    return this.http.put<Country>(`${this.api}/countries/${id}`, data).pipe(map(normalizeId));
  }

  deleteCountry(id: string): Observable<Country> {
    return this.http.delete<Country>(`${this.api}/countries/${id}`);
  }

  getAllCities(): Observable<City[]> {
    return this.http.get<City[]>(`${this.api}/cities`).pipe(map((items) => items.map(normalizeId)));
  }

  getCity(id: string): Observable<City> {
    return this.http.get<City>(`${this.api}/cities/${id}`).pipe(map(normalizeId));
  }

  createCity(data: { name: string; countryId?: string; isArrondissement?: boolean; latitude?: number; longitude?: number }): Observable<City> {
    return this.http.post<City>(`${this.api}/cities`, data).pipe(map(normalizeId));
  }

  updateCity(id: string, data: { name: string; countryId?: string; isArrondissement?: boolean; latitude?: number; longitude?: number }): Observable<City> {
    return this.http.put<City>(`${this.api}/cities/${id}`, data).pipe(map(normalizeId));
  }

  deleteCity(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/cities/${id}`);
  }

  getArrondissementsByCity(cityId: string): Observable<Arrondissement[]> {
    return this.http.get<Arrondissement[]>(`${this.api}/arrondissements`, { params: { cityId } }).pipe(
      map((items) => items.map(normalizeId)),
    );
  }

  // Sans filtre — tous les arrondissements. Utilisé pour la page "Gestion des quartiers"
  // (résolution ville/arrondissement/secteur en une fois, plutôt qu'une cascade par ligne).
  getAllArrondissements(): Observable<Arrondissement[]> {
    return this.http.get<Arrondissement[]>(`${this.api}/arrondissements`).pipe(
      map((items) => items.map(normalizeId)),
    );
  }

  getArrondissement(id: string): Observable<Arrondissement> {
    return this.http.get<Arrondissement>(`${this.api}/arrondissements/${id}`).pipe(map(normalizeId));
  }

  createArrondissement(data: { name: string; cityId: string; latitude?: number; longitude?: number }): Observable<Arrondissement> {
    return this.http.post<Arrondissement>(`${this.api}/arrondissements`, data).pipe(map(normalizeId));
  }

  updateArrondissement(id: string, data: { name: string; cityId: string; latitude?: number; longitude?: number }): Observable<Arrondissement> {
    return this.http.put<Arrondissement>(`${this.api}/arrondissements/${id}`, data).pipe(map(normalizeId));
  }

  deleteArrondissement(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/arrondissements/${id}`);
  }

  getSectorsByArrondissement(arrondissementId: string): Observable<Sector[]> {
    return this.http.get<Sector[]>(`${this.api}/sectors`, { params: { arrondissementId } }).pipe(
      map((items) => items.map(normalizeId)),
    );
  }

  // Sans filtre — tous les secteurs (même raison que getAllArrondissements ci-dessus).
  getAllSectors(): Observable<Sector[]> {
    return this.http.get<Sector[]>(`${this.api}/sectors`).pipe(
      map((items) => items.map(normalizeId)),
    );
  }

  getSector(id: string): Observable<Sector> {
    return this.http.get<Sector>(`${this.api}/sectors/${id}`).pipe(map(normalizeId));
  }

  createSector(data: { name: string; arrondissementId?: string; cityId?: string; latitude?: number; longitude?: number }): Observable<Sector> {
    return this.http.post<Sector>(`${this.api}/sectors`, data).pipe(map(normalizeId));
  }

  updateSector(id: string, data: { name: string; arrondissementId?: string; cityId?: string; latitude?: number; longitude?: number }): Observable<Sector> {
    return this.http.put<Sector>(`${this.api}/sectors/${id}`, data).pipe(map(normalizeId));
  }

  deleteSector(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/sectors/${id}`);
  }

  getNeighborhoodsBySector(sectorId: string): Observable<Quartier[]> {
    return this.http.get<Quartier[]>(`${this.api}/neighborhoods`, { params: { sectorId } }).pipe(
      map((items) => items.map(normalizeId)),
    );
  }

  // Sans filtre — tous les quartiers, toutes hiérarchies confondues. Utilisé pour la
  // page "Gestion des quartiers" (liste complète) et pour résoudre les coordonnées
  // réelles d'un quartier par nom sur la carte "Couverture Territoriale"
  // (admin-dashboard.ts), qui n'a que le nom du quartier (Agency.zoneActivite), jamais
  // son id ni son secteur.
  getAllNeighborhoods(): Observable<Quartier[]> {
    return this.http.get<Quartier[]>(`${this.api}/neighborhoods`).pipe(
      map((items) => items.map(normalizeId)),
    );
  }

  getNeighborhood(id: string): Observable<Quartier> {
    return this.http.get<Quartier>(`${this.api}/neighborhoods/${id}`).pipe(map(normalizeId));
  }

  getCityFullDetails(id: string): Observable<{ city: City; arrondissements: Arrondissement[]; neighborhoods: Quartier[] }> {
    return this.http.get<{ city: City; arrondissements: Arrondissement[]; neighborhoods: Quartier[] }>(
      `${this.api}/cities/${id}/full-details`,
    );
  }

  getNeighborhoodFullDetails(id: string): Observable<{ neighborhood: Quartier; sector?: Sector; arrondissement?: Arrondissement; city?: City }> {
    return this.http.get<{ neighborhood: Quartier; sector?: Sector; arrondissement?: Arrondissement; city?: City }>(
      `${this.api}/neighborhoods/${id}/full-details`,
    );
  }

  /** `latitude`/`longitude` requis côté backend à la création (controllers/territory.controller.js). */
  createNeighborhood(data: { name: string; sectorId?: string; arrondissementId?: string; cityId?: string; latitude?: number; longitude?: number }): Observable<Quartier> {
    return this.http.post<Quartier>(`${this.api}/neighborhoods`, data).pipe(map(normalizeId));
  }

  updateNeighborhood(id: string, data: Partial<{ name: string; sectorId: string; arrondissementId: string; cityId: string; latitude: number; longitude: number }>): Observable<Quartier> {
    return this.http.put<Quartier>(`${this.api}/neighborhoods/${id}`, data).pipe(map(normalizeId));
  }

  deleteNeighborhood(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/neighborhoods/${id}`);
  }
}
