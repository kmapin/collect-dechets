import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TerritoryService } from '../services/territory.service';
import { TerritorialUnit, TerritorialProfile, TerritoryType } from '../models/models';
import { PageHeaderComponent } from '../../../shared/decoupage-territorial/page-header.component';
import { cleanCell, normalizeName } from '../services/territorial-utils';
import { Save, AlertTriangle } from 'lucide-angular';
import { IconComponent } from '../../../shared/decoupage-territorial/icon.component';

@Component({
  selector: 'app-unit-form',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent, IconComponent],
  templateUrl: './unit-form.component.html',
  styleUrl: './unit-form.component.scss',
})
export class UnitFormComponent implements OnInit {
  profile!: TerritorialProfile;
  editId: string | null = null;
  editUnit: TerritorialUnit | null = null;

  name = signal('');
  code = signal('');
  parentTypeCode = signal('COUNTRY');
  parentChain = signal<string[]>([]); // ids sélectionnés dans la cascade
  active = signal(true);

  error = signal<string | null>(null);
  saving = signal(false);
  icons = { Save, AlertTriangle };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public territory: TerritoryService
  ) {}

  async ngOnInit() {
    await this.territory.loadApiUnits();
    const profiles = this.territory.getApiProfiles();
    const country = profiles[0];
    if (!country) {
      this.profile = this.territory.getApiProfile('API');
    } else {
      this.profile = country;
    }
    const id = this.route.snapshot.paramMap.get('id');
    const typeCode = this.route.snapshot.queryParamMap.get('typeCode');
    const parentId = this.route.snapshot.queryParamMap.get('parentId');
    if (id) {
      this.editId = id;
      const unit = this.territory.getApiUnit(id);
      if (!unit) {
        this.error.set('Unité introuvable.');
        return;
      }
      this.editUnit = unit;
      this.name.set(unit.name);
      this.code.set(unit.code ?? '');
      this.active.set(unit.active);
      this.parentTypeCode.set(unit.type_code);
      this.parentChain.set([...unit.ancestor_ids, unit.parent_id ?? 'ROOT'].filter(Boolean));
      // Pré-remplir la cascade avec les ancêtres
      this.cascadeSelections = [...unit.ancestor_ids, ...(unit.parent_id ? [unit.parent_id] : [])];
      for (let i = 0; i < this.cascadeSelections.length; i++) {
        this.onCascadeChange(i, this.cascadeSelections[i], true);
      }
    } else if (parentId && typeCode) {
      // Création d'une subdivision depuis la fiche d'un parent
      const parent = this.territory.getApiUnit(parentId);
      if (parent) {
        this.parentTypeCode.set(typeCode);
        this.cascadeSelections = [...parent.ancestor_ids, parent.id];
        for (let i = 0; i < this.cascadeSelections.length; i++) {
          this.onCascadeChange(i, this.cascadeSelections[i], true);
        }
      }
    }
  }

  cascadeSelections: string[] = [];

  // Types territoriaux réellement pris en charge par l’API.
  get cascadeTypes(): TerritoryType[] {
    return [...this.profile.types]
      .filter((t) => t.code !== 'CUSTOM')
      .sort((a, b) => a.order - b.order);
  }

  // Le type sélectionné dans la cascade est celui correspondant au dernier niveau choisi
  get selectedType(): string {
    if (this.editId) return this.parentTypeCode();
    return this.parentTypeCode();
  }

  get selectedTypeLabel(): string {
    return this.profile.types.find((t) => t.code === this.selectedType)?.label ?? this.selectedType;
  }

  get parentCandidates(): TerritorialUnit[] {
    // Unités existantes dont le type autorise selectedType comme enfant
    const allowedParents = this.profile.allowed_relations
      .filter((r) => r.child === this.selectedType)
      .map((r) => r.parent);
    return this.territory
      .getApiUnits()
      .filter((u) => allowedParents.includes(u.type_code) && u.active);
  }

  get parentId(): string | null {
    return this.cascadeSelections[this.cascadeSelections.length - 1] ?? null;
  }

  onCascadeChange(index: number, value: string, skipReset = false) {
    this.cascadeSelections[index] = value;
    // Tronquer les niveaux suivants
    this.cascadeSelections = this.cascadeSelections.slice(0, index + 1);
    // Déterminer le type suivant
    if (!skipReset) {
      const parentUnit = this.parentId ? this.territory.getApiUnit(this.parentId) : null;
      if (parentUnit) {
        const nextTypes = this.profile.allowed_relations
          .filter((r) => r.parent === parentUnit.type_code)
          .map((r) => r.child);
        if (nextTypes.length === 1) {
          this.parentTypeCode.set(nextTypes[0]);
        } else if (nextTypes.length > 1) {
          // Garder le type courant s'il est autorisé, sinon le premier
          if (!nextTypes.includes(this.parentTypeCode())) {
            this.parentTypeCode.set(nextTypes[0]);
          }
        }
      } else {
        this.parentTypeCode.set('COUNTRY');
      }
    }
  }

  onParentTypeChange(value: string) {
    this.parentTypeCode.set(value);
    this.cascadeSelections = [];
  }

  onParentChange(value: string) {
    if (!value) {
      this.cascadeSelections = [];
      return;
    }
    const unit = this.territory.getApiUnit(value);
    if (unit) {
      this.cascadeSelections = [unit.id];
    }
  }

  get canSubmit(): boolean {
    if (!this.name().trim()) return false;
    if (this.selectedType !== 'COUNTRY' && !this.parentId) return false;
    return true;
  }

  async submit() {
    this.error.set(null);
    this.saving.set(true);

    const name = cleanCell(this.name());
    if (!name) {
      this.error.set('Le nom est obligatoire.');
      this.saving.set(false);
      return;
    }

    try {
      if (this.editId) {
        await this.territory.updateApiUnit(this.editId, this.selectedType as 'COUNTRY' | 'CITY' | 'ARRONDISSEMENT' | 'SECTOR' | 'NEIGHBORHOOD', {
          name,
          code: this.code() || null,
          parentId: this.selectedType === 'COUNTRY' ? null : this.parentId,
        });
        this.router.navigate(['/territorial/units', this.editId]);
      } else {
        const created = await this.territory.createApiUnit({
          typeCode: this.selectedType as 'COUNTRY' | 'CITY' | 'ARRONDISSEMENT' | 'SECTOR' | 'NEIGHBORHOOD',
          name,
          parentId: this.selectedType === 'COUNTRY' ? null : this.parentId,
          code: this.code() || null,
        });
        this.router.navigate(['/territorial/units', created.id]);
      }
    } catch (e: any) {
      this.error.set(e.message);
    } finally {
      this.saving.set(false);
    }
  }
}
