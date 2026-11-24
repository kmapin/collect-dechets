import { Injectable } from '@angular/core';
import { TerritorialProfile, TerritorialUnit, ValidationResult } from '../models/models';
import { normalizeName, arrondissementNumber } from './territorial-utils';
import { MOCK_UNITS, MOCK_PROFILE, MockUnit } from './mock-data';

type Unit = TerritorialUnit;

@Injectable({ providedIn: 'root' })
export class TerritoryService {
  private store: MockUnit[] = MOCK_UNITS.map((u) => ({ ...u, ancestor_ids: [...u.ancestor_ids] }));
  private profile: TerritorialProfile = { ...MOCK_PROFILE };

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
