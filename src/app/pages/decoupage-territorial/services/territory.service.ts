import { Injectable } from '@angular/core';
import { forkJoin, firstValueFrom } from 'rxjs';
import { TerritorialProfile, TerritorialUnit, ValidationResult } from '../models/models';
import { normalizeName, arrondissementNumber } from './territorial-utils';
import { MOCK_UNITS, MOCK_PROFILE, MockUnit } from './mock-data';
import { TerritoryHttpService } from '../../../services/territory-http.service';
import { Country, City, Arrondissement, Sector, Quartier } from '../../../models/countries-org.model';

type Unit = TerritorialUnit;
type CityWithCountryReference = City & { countryId?: string };

@Injectable({ providedIn: 'root' })
export class TerritoryService {
  private store: MockUnit[] = MOCK_UNITS.map((u) => ({ ...u, ancestor_ids: [...u.ancestor_ids] }));
  private profile: TerritorialProfile = { ...MOCK_PROFILE };
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
        active: true,
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
    activeOnly?: boolean;
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
    if (params.activeOnly !== undefined) rows = rows.filter((u) => u.active === params.activeOnly);

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

  getApiProfile(countryCode: string): TerritorialProfile {
    const country = this.apiUnits.find((u) => u.type_code === 'COUNTRY' && u.country_code === countryCode);
    return {
      id: country?.id ?? 'api-profile',
      country_code: countryCode,
      country_name: country?.name ?? countryCode,
      types: [
        { code: 'COUNTRY', label: 'Pays', order: 0, optional: false },
        { code: 'CITY', label: 'Ville', order: 1, optional: false },
        { code: 'ARRONDISSEMENT', label: 'Arrondissement', order: 2, optional: true },
        { code: 'SECTOR', label: 'Secteur', order: 3, optional: true },
        { code: 'NEIGHBORHOOD', label: 'Quartier', order: 4, optional: true },
      ],
      allowed_relations: [
        { parent: 'COUNTRY', child: 'CITY' },
        { parent: 'CITY', child: 'ARRONDISSEMENT' },
        { parent: 'CITY', child: 'SECTOR' },
        { parent: 'CITY', child: 'NEIGHBORHOOD' },
        { parent: 'ARRONDISSEMENT', child: 'SECTOR' },
        { parent: 'ARRONDISSEMENT', child: 'NEIGHBORHOOD' },
        { parent: 'SECTOR', child: 'NEIGHBORHOOD' },
      ],
      active: true,
      created_at: country?.created_at ?? '',
      updated_at: country?.updated_at ?? '',
    };
  }

  getApiProfiles(): TerritorialProfile[] {
    return this.apiUnits
      .filter((u) => u.type_code === 'COUNTRY')
      .map((u) => this.getApiProfile(u.country_code));
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
        item = await firstValueFrom(this.api.createNeighborhood({
          name: input.name,
          ...(parent?.type_code === 'SECTOR' ? { sectorId: parent.id } : {}),
          ...(parent?.type_code === 'ARRONDISSEMENT' ? { arrondissementId: parent.id } : {}),
          ...(parent?.type_code === 'CITY' ? { cityId: parent.id } : {}),
          ...coordinates,
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
          const parent = changes.parentId ? this.getApiUnit(changes.parentId) : null;
          await firstValueFrom(this.api.updateNeighborhood(id, {
            name: changes.name,
            ...(parent?.type_code === 'SECTOR' ? { sectorId: parent.id } : {}),
            ...(parent?.type_code === 'ARRONDISSEMENT' ? { arrondissementId: parent.id } : {}),
            ...(parent?.type_code === 'CITY' ? { cityId: parent.id } : {}),
            ...coordinates,
          }));
        }
        break;
    }
    await this.loadApiUnits();
    const updated = this.getApiUnit(id);
    if (!updated) throw new Error('L’unité modifiée ne figure pas dans la réponse de rechargement.');
    if (changes.parentId && updated.parent_id !== changes.parentId) {
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

  // ===== Profils =====

  getProfile(countryCode: string): TerritorialProfile | null {
    return this.profile.country_code === countryCode ? { ...this.profile } : null;
  }

  getProfiles(): TerritorialProfile[] {
    return [{ ...this.profile }];
  }

  // ===== Lecture =====

  listUnits(params: {
    search?: string;
    countryCode?: string;
    typeCode?: string;
    activeOnly?: boolean;
    parentId?: string | null;
    page?: number;
    pageSize?: number;
  }): { data: Unit[]; total: number } {
    let rows = this.store.filter((u) => u.country_code !== 'COUNTRY');
    rows = this.store.filter((u) => true);

    if (params.countryCode) rows = rows.filter((u) => u.country_code === params.countryCode);
    if (params.typeCode) rows = rows.filter((u) => u.type_code === params.typeCode);
    if (params.activeOnly !== undefined) rows = rows.filter((u) => u.active === params.activeOnly);
    if (params.parentId !== undefined) {
      rows = rows.filter((u) => u.parent_id === params.parentId);
    }
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
    const paged = rows.slice((page - 1) * pageSize, page * pageSize);

    return { data: paged.map((u) => ({ ...u })), total };
  }

  getUnit(id: string): Unit | null {
    const u = this.store.find((x) => x.id === id);
    return u ? { ...u, ancestor_ids: [...u.ancestor_ids] } : null;
  }

  getChildren(parentId: string): Unit[] {
    return this.sortTerritorial(this.store.filter((u) => u.parent_id === parentId));
  }

  getDescendants(rootId: string): Unit[] {
    return this.sortTerritorial(
      this.store.filter((u) => u.ancestor_ids.includes(rootId))
    );
  }

  getAncestors(ancestorIds: string[]): Unit[] {
    return this.store
      .filter((u) => ancestorIds.includes(u.id))
      .sort((a, b) => a.depth - b.depth);
  }

  private sortTerritorial(rows: Unit[]): Unit[] {
    return [...rows].sort((a, b) => {
      const na = arrondissementNumber(a.name);
      const nb = arrondissementNumber(b.name);
      if (na !== null && nb !== null) return na - nb;
      if (na !== null) return -1;
      if (nb !== null) return 1;
      return a.name.localeCompare(b.name, 'fr');
    });
  }

  countChildren(parentId: string): number {
    return this.store.filter((u) => u.parent_id === parentId).length;
  }

  // ===== Validation =====

  validateUnit(
    countryCode: string,
    typeCode: string,
    name: string,
    parentId: string | null,
    selfId: string | null = null
  ): ValidationResult {
    const normalized = normalizeName(name);

    if (typeCode === 'COUNTRY') {
      if (parentId) {
        return { ok: false, code: 'TERRITORIAL_PARENT_INVALID', message: 'Un pays ne peut pas avoir de parent.' };
      }
      const dup = this.store.find(
        (u) => u.type_code === 'COUNTRY' && u.normalized_name === normalized && u.id !== selfId
      );
      if (dup) {
        return { ok: false, code: 'TERRITORIAL_DUPLICATE', message: 'Un pays avec ce nom existe déjà.' };
      }
      return { ok: true, code: '', message: 'OK' };
    }

    if (!parentId) {
      return {
        ok: false,
        code: 'TERRITORIAL_PARENT_INVALID',
        message: 'Une unité territoriale (autre qu\'un pays) doit avoir un parent.',
      };
    }

    const parent = this.store.find((u) => u.id === parentId);
    if (!parent) {
      return { ok: false, code: 'TERRITORIAL_PARENT_INVALID', message: 'L\'unité parente n\'existe pas.' };
    }
    if (!parent.active) {
      return {
        ok: false,
        code: 'TERRITORIAL_UNIT_INACTIVE',
        message: 'Le parent est inactif. Impossible de créer un enfant sous un parent inactif.',
      };
    }

    const allowed = this.profile.allowed_relations.some(
      (r) => r.parent === parent.type_code && r.child === typeCode
    );
    if (!allowed) {
      const pl = this.labelOf(parent.type_code);
      const cl = this.labelOf(typeCode);
      return {
        ok: false,
        code: 'TERRITORIAL_INVALID_RELATION',
        message: `Relation interdite : ${pl} → ${cl}. Le profil territorial n'autorise pas ce rattachement.`,
      };
    }

    if (selfId) {
      if (parentId === selfId) {
        return { ok: false, code: 'TERRITORIAL_CYCLE_DETECTED', message: 'Une unité ne peut pas être son propre parent.' };
      }
      if (parent.ancestor_ids.includes(selfId)) {
        return {
          ok: false,
          code: 'TERRITORIAL_CYCLE_DETECTED',
          message: 'Le nouveau parent est un descendant de l\'unité : cycle détecté.',
        };
      }
    }

    const dup = this.store.find(
      (u) =>
        u.country_code === countryCode &&
        u.parent_id === parentId &&
        u.type_code === typeCode &&
        u.normalized_name === normalized &&
        u.id !== selfId
    );
    if (dup) {
      return {
        ok: false,
        code: 'TERRITORIAL_DUPLICATE',
        message: `Une unité du même type avec ce nom existe déjà sous ce parent${dup.active ? '' : ' (unité inactive)'}.`,
      };
    }

    return { ok: true, code: '', message: 'OK' };
  }

  labelOf(typeCode: string): string {
    return this.profile.types.find((t) => t.code === typeCode)?.label ?? typeCode;
  }

  // ===== Écriture =====

  createUnit(input: {
    countryCode: string;
    typeCode: string;
    name: string;
    parentId: string | null;
    code?: string | null;
    createdBy?: string;
  }): Unit {
    const now = new Date().toISOString();
    const parent = input.parentId ? this.getUnit(input.parentId) : null;
    const unit: MockUnit = {
      id: `unit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      country_code: input.countryCode,
      type_code: input.typeCode,
      name: input.name.trim(),
      normalized_name: normalizeName(input.name),
      parent_id: input.parentId,
      ancestor_ids: parent ? [...parent.ancestor_ids, parent.id] : [],
      depth: parent ? parent.depth + 1 : 0,
      code: input.code ?? null,
      active: true,
      sort_order: input.typeCode === 'ARRONDISSEMENT' ? arrondissementNumber(input.name) ?? 0 : 0,
      metadata: {},
      created_at: now,
      updated_at: now,
      created_by: input.createdBy ?? 'admin',
      updated_by: input.createdBy ?? 'admin',
    };
    this.store.push(unit);
    return { ...unit, ancestor_ids: [...unit.ancestor_ids] };
  }

  updateUnit(
    id: string,
    changes: { name?: string; code?: string | null; parentId?: string | null; active?: boolean }
  ): Unit {
    const unit = this.store.find((u) => u.id === id);
    if (!unit) throw new Error('Unité introuvable');

    if (changes.name !== undefined) {
      unit.name = changes.name.trim();
      unit.normalized_name = normalizeName(changes.name);
    }
    if (changes.code !== undefined) unit.code = changes.code;
    if (changes.active !== undefined) unit.active = changes.active;

    if (changes.parentId !== undefined && changes.parentId !== unit.parent_id) {
      const newParent = changes.parentId ? this.getUnit(changes.parentId) : null;
      if (unit.type_code !== 'COUNTRY' && !newParent) {
        throw new Error('Seul un pays peut être sans parent.');
      }
      unit.parent_id = newParent?.id ?? null;
      unit.ancestor_ids = newParent ? [...newParent.ancestor_ids, newParent.id] : [];
      unit.depth = newParent ? newParent.depth + 1 : 0;
      this.updateDescendantsDepth(unit);
    }

    unit.updated_at = new Date().toISOString();
    return { ...unit, ancestor_ids: [...unit.ancestor_ids] };
  }

  private updateDescendantsDepth(unit: MockUnit) {
    for (const u of this.store) {
      if (u.parent_id === unit.id) {
        u.ancestor_ids = [...unit.ancestor_ids, unit.id];
        u.depth = unit.depth + 1;
        this.updateDescendantsDepth(u);
      }
    }
  }

  setUnitActive(id: string, active: boolean): Unit {
    return this.updateUnit(id, { active });
  }

  // ===== Historique (mock en mémoire) =====

  auditLogs: {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    entity_name: string | null;
    details: Record<string, any>;
    created_at: string;
  }[] = [];

  logAudit(
    action: string,
    entityType: string,
    entityId: string | null,
    entityName: string | null,
    details: Record<string, any>
  ): void {
    this.auditLogs.unshift({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      details,
      created_at: new Date().toISOString(),
    });
    if (this.auditLogs.length > 200) this.auditLogs.pop();
  }

  getAuditLogs(limit = 100) {
    return this.auditLogs.slice(0, limit);
  }
}
