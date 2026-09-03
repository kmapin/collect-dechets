import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Country, City, Arrondissement, Sector, Quartier } from '../models/countries-org.model';

// Chantier "unifier la géographie" — pendant réel (HTTP, backend) de
// CountriesOrgMockService (data/countries-org.mock.ts, en mémoire) : même hiérarchie
// Country -> City -> Arrondissement -> Sector -> Quartier, mêmes modèles TypeScript
// (models/countries-org.model.ts), mais lue depuis /api/territories/* au lieu d'un
// tableau statique — ajouter une ville/un pays devient une opération de données (seed
// ou back-office), plus un déploiement de code.
//
// Différence assumée avec CountriesOrgMockService : un vrai appel réseau est asynchrone
// (Observable), pas un tableau synchrone — les appelants devront s'adapter à l'async au
// moment de basculer dessus (délibérément hors périmètre de ce chantier, voir le rapport
// dans docs/).
//
// Le backend renvoie des documents Mongoose plats ({_id, name, code, countryId, ...},
// vérifié directement : `_id`, jamais `id` — Mongoose n'ajoute pas de virtuel `id` par
// défaut dans ce projet), pas la forme imbriquée du mock (`city.country`,
// `quartier.sector.arrondissement...`). `_normalizeId()` ci-dessous renomme `_id` en
// `id` pour rester compatible avec `Country`/`City`/`Arrondissement`/`Sector`/`Quartier`
// (mêmes interfaces que CountriesOrgMockService, `id: string`) sans toucher aux dizaines
// d'appelants déjà écrits contre ce contrat — jamais de `.country`/`.city`/
// `.arrondissement`/`.sector` imbriqué lu nulle part, seul le comptage plat ({_id, name,
// code}) est réellement utilisé pour peupler des sélecteurs en cascade.
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

  getSectorsByArrondissement(arrondissementId: string): Observable<Sector[]> {
    return this.http.get<Sector[]>(`${this.api}/sectors`, { params: { arrondissementId } }).pipe(
      map((items) => items.map(normalizeId)),
    );
  }

  getNeighborhoodsBySector(sectorId: string): Observable<Quartier[]> {
    return this.http.get<Quartier[]>(`${this.api}/neighborhoods`, { params: { sectorId } }).pipe(
      map((items) => items.map(normalizeId)),
    );
  }
}
