import { Injectable } from '@angular/core';
import { forkJoin, firstValueFrom } from 'rxjs';
import { TerritorialUnit } from '../models/models';
import { normalizeName, arrondissementNumber } from './territorial-utils';
import { TerritoryHttpService } from '../../../services/territory-http.service';
import { Country, City, Arrondissement, Sector, Quartier } from '../../../models/countries-org.model';

type CityWithCountryReference = City & { countryId?: string };

export const API_UNIT_TYPE_CODES = [
  'COUNTRY',
  'CITY',
  'ARRONDISSEMENT',
  'SECTOR',
  'NEIGHBORHOOD',
] as const;

// These parent choices mirror the relation fields used by the existing territorial DTO operations.
const API_PARENT_TYPES: Record<string, readonly string[]> = {
  COUNTRY: [],
  CITY: ['COUNTRY'],
  ARRONDISSEMENT: ['CITY'],
  SECTOR: ['CITY', 'ARRONDISSEMENT'],
  NEIGHBORHOOD: ['CITY', 'ARRONDISSEMENT', 'SECTOR'],
};

@Injectable({ providedIn: 'root' })
export class TerritoryService {
  private apiUnits: TerritorialUnit[] = [];

  constructor(private api: TerritoryHttpService) {}

  async loadApiUnits(): Promise<TerritorialUnit[]> {
    const { countries, cities, arrondissements, sectors, neighborhoods } = await firstValueFrom(
      forkJoin({
        countries: this.api.getCountries(),
        cities: this.api.getAllCities(),
        arrondissements: this.api.getAllArrondissements(),
        sectors: this.api.getAllSectors(),
        neighborhoods: this.api.getAllNeighborhoods(),
      }),
    );

    const units: TerritorialUnit[] = [];
    const countriesById = new Map(countries.map((country) => [country.id, country]));
    const cityCountryIds = new Map(
      cities.map((city) => [city.id, (city as CityWithCountryReference).countryId]),
    );
    const arrondissementCountryIds = new Map(
      arrondissements.map((arrondissement) => [
        arrondissement.id,
        cityCountryIds.get(arrondissement.cityId ?? ''),
      ]),
    );
    const sectorCountryIds = new Map(
      sectors.map((sector) => [
        sector.id,
        sector.cityId
          ? cityCountryIds.get(sector.cityId)
          : arrondissementCountryIds.get(sector.arrondissementId ?? ''),
      ]),
    );
    const add = (
      item: Country | City | Arrondissement | Sector | Quartier,
      typeCode: string,
      parentId: string | null,
      ancestors: string[] = [],
      countryId?: string,
    ) => {
      const city = item as City;
      const country = item as Country;
      const associatedCountry = typeCode === 'COUNTRY'
        ? country
        : countriesById.get(countryId ?? '');
      units.push({
        id: item.id,
        country_code: associatedCountry?.code || associatedCountry?.name || '—',
        type_code: typeCode,
        name: item.name,
        normalized_name: normalizeName(item.name),
        parent_id: parentId,
        ancestor_ids: ancestors,
        depth: ancestors.length,
        code: typeCode === 'COUNTRY' ? country.code ?? null : null,
        sort_order: typeCode === 'ARRONDISSEMENT' ? arrondissementNumber(item.name) ?? 0 : 0,
        metadata: {
          latitude: item.latitude ?? null,
          longitude: item.longitude ?? null,
          country_name: associatedCountry?.name ?? '—',
          isArrondissement: 'isArrondissement' in city ? city.isArrondissement ?? false : false,
        },
        created_at: item.createdAt ?? '',
        updated_at: item.updatedAt ?? '',
        created_by: null,
        updated_by: null,
      });
    };

    countries.forEach((item) => add(item, 'COUNTRY', null));
    cities.forEach((item) => {
      const countryId = (item as CityWithCountryReference).countryId;
      add(item, 'CITY', countryId ?? null, countryId ? [countryId] : [], countryId);
    });
    arrondissements.forEach((item) => add(item, 'ARRONDISSEMENT', item.cityId ?? null,
      item.cityId ? [item.cityId] : [],
      arrondissementCountryIds.get(item.id)));
    sectors.forEach((item) => {
      const parentId = item.arrondissementId ?? item.cityId ?? null;
      add(item, 'SECTOR', parentId, parentId ? [parentId] : [], sectorCountryIds.get(item.id));
    });
    neighborhoods.forEach((item) => {
      const parentId = item.sectorId ?? item.arrondissementId ?? item.cityId ?? null;
      const countryId = item.cityId
        ? cityCountryIds.get(item.cityId)
        : item.arrondissementId
          ? arrondissementCountryIds.get(item.arrondissementId)
          : sectorCountryIds.get(item.sectorId ?? '');
      add(item, 'NEIGHBORHOOD', parentId, parentId ? [parentId] : [], countryId);
    });

    const unitsById = new Map(units.map((unit) => [unit.id, unit]));
    for (const unit of units) {
      const ancestors: string[] = [];
      const visited = new Set([unit.id]);
      let parentId = unit.parent_id;

      while (parentId && !visited.has(parentId)) {
        visited.add(parentId);
        const parent = unitsById.get(parentId);
        if (!parent) break;
        ancestors.unshift(parent.id);
        parentId = parent.parent_id;
      }

      unit.ancestor_ids = ancestors;
      unit.depth = ancestors.length;
    }

    this.apiUnits = units;
    return units;
  }

  getApiUnits(): TerritorialUnit[] {
    return this.apiUnits.map((u) => ({ ...u, ancestor_ids: [...u.ancestor_ids] }));
  }

  apiListUnits(params: {
    search?: string;
    countryCode?: string;
    typeCode?: string;
    page?: number;
    pageSize?: number;
  } = {}): { data: TerritorialUnit[]; total: number } {
    let rows = this.getApiUnits();
    if (params.countryCode) rows = rows.filter((u) => u.country_code === params.countryCode);
    if (params.typeCode) rows = rows.filter((u) => u.type_code === params.typeCode);
    if (params.search) {
      const q = normalizeName(params.search);
      rows = rows.filter((u) => u.normalized_name.includes(q));
    }

    rows.sort((a, b) => {
      const na = arrondissementNumber(a.name);
      const nb = arrondissementNumber(b.name);
      if (na !== null && nb !== null) return na - nb;
      if (na !== null) return -1;
      if (nb !== null) return 1;
      return a.name.localeCompare(b.name, 'fr');
    });

    const total = rows.length;
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    return { data: rows.slice((page - 1) * pageSize, page * pageSize), total };
  }

  getApiUnit(id: string): TerritorialUnit | null {
    return this.apiUnits.find((u) => u.id === id) ?? null;
  }

  getApiChildren(parentId: string): TerritorialUnit[] {
    return this.apiUnits.filter((u) => u.parent_id === parentId);
  }

  getApiDescendants(rootId: string): TerritorialUnit[] {
    const result: TerritorialUnit[] = [];
    const visited = new Set<string>();

    const visitChildren = (parentId: string) => {
      for (const child of this.getApiChildren(parentId)) {
        if (visited.has(child.id)) continue;
        visited.add(child.id);
        result.push(child);
        visitChildren(child.id);
      }
    };

    visitChildren(rootId);
    return result;
  }

  getApiAncestors(unit: TerritorialUnit): TerritorialUnit[] {
    return unit.ancestor_ids
      .map((id) => this.getApiUnit(id))
      .filter((u): u is TerritorialUnit => u !== null)
      .sort((a, b) => a.depth - b.depth);
  }

  getApiParentTypes(typeCode: string): string[] {
    return [...(API_PARENT_TYPES[typeCode] ?? [])];
  }

  getApiChildTypes(typeCode: string): string[] {
    return API_UNIT_TYPE_CODES.filter((childType) =>
      API_PARENT_TYPES[childType].includes(typeCode),
    );
  }

  async createApiUnit(input: {
    typeCode: 'COUNTRY' | 'CITY' | 'ARRONDISSEMENT' | 'SECTOR' | 'NEIGHBORHOOD';
    name: string;
    code?: string | null;
    parentId?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  }): Promise<TerritorialUnit> {
    const coordinates = {
      ...(input.latitude != null ? { latitude: input.latitude } : {}),
      ...(input.longitude != null ? { longitude: input.longitude } : {}),
    };
    let item: Country | City | Arrondissement | Sector | Quartier;
    switch (input.typeCode) {
      case 'COUNTRY':
        item = await firstValueFrom(this.api.createCountry({ name: input.name, code: input.code ?? undefined, ...coordinates }));
        break;
      case 'CITY':
        {
          const parent = input.parentId ? this.getApiUnit(input.parentId) : null;
          if (parent?.type_code !== 'COUNTRY') {
            throw new Error('Un pays parent est obligatoire pour une ville.');
          }
          item = await firstValueFrom(this.api.createCity({
            name: input.name,
            countryId: parent.id,
            ...coordinates,
          }));
        }
        break;
      case 'ARRONDISSEMENT':
        if (!input.parentId) throw new Error('Une ville parente est obligatoire pour un arrondissement.');
        item = await firstValueFrom(this.api.createArrondissement({ name: input.name, cityId: input.parentId, ...coordinates }));
        break;
      case 'SECTOR':
        {
        const parent = input.parentId ? this.getApiUnit(input.parentId) : null;
        item = await firstValueFrom(this.api.createSector({
          name: input.name,
          ...(parent?.type_code === 'ARRONDISSEMENT' ? { arrondissementId: parent.id } : {}),
          ...(parent?.type_code === 'CITY' ? { cityId: parent.id } : {}),
          ...coordinates,
        }));
        }
        break;
      case 'NEIGHBORHOOD':
        {
        const parent = input.parentId ? this.getApiUnit(input.parentId) : null;
        if (input.latitude == null || input.longitude == null) {
          throw new Error('La latitude et la longitude sont obligatoires pour un quartier.');
        }
        item = await firstValueFrom(this.api.createNeighborhood({
          name: input.name,
          ...(parent?.type_code === 'SECTOR' ? { sectorId: parent.id } : {}),
          ...(parent?.type_code === 'ARRONDISSEMENT' ? { arrondissementId: parent.id } : {}),
          ...(parent?.type_code === 'CITY' ? { cityId: parent.id } : {}),
          latitude: input.latitude,
          longitude: input.longitude,
        }));
        }
        break;
    }
    await this.loadApiUnits();
    const created = this.getApiUnit(item.id);
    if (!created) throw new Error('L’unité a été créée mais ne figure pas dans la réponse de rechargement.');
    if (input.parentId && created.parent_id !== input.parentId) {
      throw new Error('L’API n’a pas confirmé le rattachement au parent sélectionné.');
    }
    return created;
  }

  async updateApiUnit(
    id: string,
    typeCode: 'COUNTRY' | 'CITY' | 'ARRONDISSEMENT' | 'SECTOR' | 'NEIGHBORHOOD',
    changes: { name: string; code?: string | null; parentId?: string | null; latitude?: number | null; longitude?: number | null },
  ): Promise<TerritorialUnit> {
    const currentUnit = this.getApiUnit(id);
    const parentIdChanged = changes.parentId !== undefined
      && changes.parentId !== currentUnit?.parent_id;
    const coordinates = {
      ...(changes.latitude != null ? { latitude: changes.latitude } : {}),
      ...(changes.longitude != null ? { longitude: changes.longitude } : {}),
    };
    switch (typeCode) {
      case 'COUNTRY':
        await firstValueFrom(this.api.updateCountry(id, { name: changes.name, code: changes.code ?? undefined, ...coordinates }));
        break;
      case 'CITY':
        {
          const parent = changes.parentId ? this.getApiUnit(changes.parentId) : null;
          if (parent?.type_code !== 'COUNTRY') {
            throw new Error('Un pays parent est obligatoire pour une ville.');
          }
          await firstValueFrom(this.api.updateCity(id, {
            name: changes.name,
            countryId: parent.id,
            ...coordinates,
          }));
        }
        break;
      case 'ARRONDISSEMENT':
        if (!changes.parentId) throw new Error('Une ville parente est obligatoire pour un arrondissement.');
        await firstValueFrom(this.api.updateArrondissement(id, { name: changes.name, cityId: changes.parentId, ...coordinates }));
        break;
      case 'SECTOR':
        {
          const parent = changes.parentId ? this.getApiUnit(changes.parentId) : null;
          await firstValueFrom(this.api.updateSector(id, {
            name: changes.name,
            ...(parent?.type_code === 'ARRONDISSEMENT' ? { arrondissementId: parent.id } : {}),
            ...(parent?.type_code === 'CITY' ? { cityId: parent.id } : {}),
            ...coordinates,
          }));
        }
        break;
      case 'NEIGHBORHOOD':
        {
          const parent = parentIdChanged && changes.parentId
            ? this.getApiUnit(changes.parentId)
            : null;
          await firstValueFrom(this.api.updateNeighborhood(id, {
            name: changes.name,
            ...(parentIdChanged && parent?.type_code === 'SECTOR' ? { sectorId: parent.id } : {}),
            ...(parentIdChanged && parent?.type_code === 'ARRONDISSEMENT' ? { arrondissementId: parent.id } : {}),
            ...(parentIdChanged && parent?.type_code === 'CITY' ? { cityId: parent.id } : {}),
            ...coordinates,
          }));
        }
        break;
    }
    await this.loadApiUnits();
    const updated = this.getApiUnit(id);
    if (!updated) throw new Error('L’unité modifiée ne figure pas dans la réponse de rechargement.');
    if (parentIdChanged && changes.parentId && updated.parent_id !== changes.parentId) {
      throw new Error('L’API n’a pas confirmé le rattachement au parent sélectionné.');
    }
    return updated;
  }

  async deleteApiUnit(
    id: string,
    typeCode: 'COUNTRY' | 'CITY' | 'ARRONDISSEMENT' | 'SECTOR' | 'NEIGHBORHOOD',
  ): Promise<void> {
    switch (typeCode) {
      case 'COUNTRY':
        await firstValueFrom(this.api.deleteCountry(id));
        break;
      case 'CITY':
        await firstValueFrom(this.api.deleteCity(id));
        break;
      case 'ARRONDISSEMENT':
        await firstValueFrom(this.api.deleteArrondissement(id));
        break;
      case 'SECTOR':
        await firstValueFrom(this.api.deleteSector(id));
        break;
      case 'NEIGHBORHOOD':
        await firstValueFrom(this.api.deleteNeighborhood(id));
        break;
    }
    await this.loadApiUnits();
  }

}
