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

  // Sans filtre — toutes les villes réellement seedées (aujourd'hui, uniquement celles
  // du Burkina Faso). Les appelants qui migraient depuis CountriesOrgMockService
  // passaient un id de pays fictif ("1", l'id du mock) : un vrai `_id` Mongo ne
  // correspondant à rien, la requête filtrée renvoyait toujours 0 résultat (voire une
  // erreur de cast ObjectId). Même convention que ZoneSelectorComponent, qui charge déjà
  // toute la hiérarchie sans filtre par pays.
  getAllCities(): Observable<City[]> {
    return this.http.get<City[]>(`${this.api}/cities`).pipe(map((items) => items.map(normalizeId)));
  }

  getCitiesByCountry(countryId: string): Observable<City[]> {
    return this.http.get<City[]>(`${this.api}/cities`, { params: { countryId } }).pipe(
      map((items) => items.map(normalizeId)),
    );
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

  /** `latitude`/`longitude` requis côté backend à la création (controllers/territory.controller.js). */
  createNeighborhood(data: { name: string; code?: string; sectorId: string; latitude: number; longitude: number }): Observable<Quartier> {
    return this.http.post<Quartier>(`${this.api}/neighborhoods`, data).pipe(map(normalizeId));
  }

  /** `latitude`/`longitude` optionnels ici (une modification peut ne porter que sur le nom/code) — mais validés côté backend si fournis. */
  updateNeighborhood(id: string, data: Partial<{ name: string; code: string; sectorId: string; latitude: number; longitude: number }>): Observable<Quartier> {
    return this.http.put<Quartier>(`${this.api}/neighborhoods/${id}`, data).pipe(map(normalizeId));
  }

  deleteNeighborhood(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/neighborhoods/${id}`);
  }
}
