import { Component, ElementRef, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import * as L from 'leaflet';
import { API_UNIT_TYPE_CODES, TerritoryService } from '../services/territory.service';
import { TerritorialUnit, TYPE_LABELS } from '../models/models';
import { PageHeaderComponent } from '../../../shared/decoupage-territorial/page-header.component';
import { cleanCell, normalizeName } from '../services/territorial-utils';
import { Save, AlertTriangle, ChevronDown } from 'lucide-angular';
import { IconComponent } from '../../../shared/decoupage-territorial/icon.component';

@Component({
  selector: 'app-unit-form',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent, IconComponent],
  templateUrl: './unit-form.component.html',
  styleUrl: './unit-form.component.scss',
})
export class UnitFormComponent implements OnInit, OnDestroy {
  editId: string | null = null;
  editUnit: TerritorialUnit | null = null;

  name = signal('');
  code = signal('');
  latitude = signal<number | null>(null);
  longitude = signal<number | null>(null);
  parentSearch = signal('');
  parentDropdownOpen = signal(false);
  parentTypeCode = signal('COUNTRY');

  error = signal<string | null>(null);
  saving = signal(false);
  isLocating = signal(false);
  locationMessage = signal<string | null>(null);
  icons = { Save, AlertTriangle, ChevronDown };

  private readonly DEFAULT_MAP_CENTER: [number, number] = [12.3714, -1.5197];
  private unitMap?: L.Map;
  private unitMarker?: L.Marker;

  @ViewChild('unitMapEl') set unitMapEl(el: ElementRef<HTMLDivElement> | undefined) {
    if (el && !this.unitMap) this.initUnitMap(el.nativeElement);
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public territory: TerritoryService
  ) {}

  async ngOnInit() {
    try {
      await this.territory.loadApiUnits();
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Impossible de charger les données territoriales.');
      return;
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
      this.latitude.set(this.coordinateFrom(unit, 'latitude'));
      this.longitude.set(this.coordinateFrom(unit, 'longitude'));
      this.syncMapMarker(true);
      this.parentTypeCode.set(unit.type_code);
      this.cascadeSelections = unit.parent_id ? [unit.parent_id] : [];
    } else if (parentId && typeCode) {
      // Création d'une subdivision depuis la fiche d'un parent
      const parent = this.territory.getApiUnit(parentId);
      if (parent) {
        this.parentTypeCode.set(typeCode);
        this.cascadeSelections = [parent.id];
      }
    }
  }

  ngOnDestroy() {
    this.unitMap?.remove();
  }

  cascadeSelections: string[] = [];

  get cascadeTypes(): { code: string; label: string }[] {
    return API_UNIT_TYPE_CODES.map((code) => ({ code, label: TYPE_LABELS[code] ?? code }));
  }

  // Le type sélectionné dans la cascade est celui correspondant au dernier niveau choisi
  get selectedType(): string {
    if (this.editId) return this.parentTypeCode();
    return this.parentTypeCode();
  }

  get selectedTypeLabel(): string {
    return TYPE_LABELS[this.selectedType] ?? this.selectedType;
  }

  get parentCandidates(): TerritorialUnit[] {
    const supportedParentTypes = this.territory.getApiParentTypes(this.selectedType);
    return this.territory
      .getApiUnits()
      .filter((u) =>
        supportedParentTypes.includes(u.type_code)
        || u.id === this.parentId
        || u.id === this.editUnit?.parent_id,
      );
  }

  parentOptionLabel(unit: TerritorialUnit): string {
    return `${unit.name} (${TYPE_LABELS[unit.type_code] ?? unit.type_code})`;
  }

  get selectedParent(): TerritorialUnit | null {
    return this.parentId ? this.territory.getApiUnit(this.parentId) : null;
  }

  get filteredParentCandidates(): TerritorialUnit[] {
    const query = normalizeName(this.parentSearch().trim());
    return this.parentCandidates.filter((unit) =>
      !query
      || normalizeName(this.parentOptionLabel(unit)).includes(query),
    );
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
        const nextTypes = this.territory.getApiChildTypes(parentUnit.type_code);
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
    this.parentSearch.set('');
    this.parentDropdownOpen.set(false);
    this.cascadeSelections = [];
  }

  toggleParentDropdown() {
    const open = !this.parentDropdownOpen();
    this.parentDropdownOpen.set(open);
    this.parentSearch.set('');
  }

  onParentPickerFocusOut(event: FocusEvent) {
    const container = event.currentTarget as HTMLElement;
    const nextTarget = event.relatedTarget as Node | null;
    if (!nextTarget || !container.contains(nextTarget)) {
      this.parentDropdownOpen.set(false);
      this.parentSearch.set('');
    }
  }

  selectParent(unit: TerritorialUnit) {
    this.cascadeSelections = [unit.id];
    this.parentSearch.set('');
    this.parentDropdownOpen.set(false);
  }

  onParentSearchKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.parentDropdownOpen.set(false);
      this.parentSearch.set('');
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const candidates = this.filteredParentCandidates;
      if (candidates.length === 1) this.selectParent(candidates[0]);
    }
  }

  get canSubmit(): boolean {
    if (this.editId && !this.editUnit) return false;
    if (!this.name().trim()) return false;
    if (this.selectedType !== 'COUNTRY' && !this.parentId) return false;
    if (this.editId && !this.hasChanges) return false;
    return true;
  }

  get hasChanges(): boolean {
    const unit = this.editUnit;
    if (!unit) return false;
    if (cleanCell(this.name()) !== unit.name) return true;
    if (this.selectedType === 'COUNTRY' && (this.code() || null) !== unit.code) return true;
    if (this.selectedType !== 'COUNTRY' && this.parentId !== unit.parent_id) return true;
    return this.latitude() !== this.coordinateFrom(unit, 'latitude')
      || this.longitude() !== this.coordinateFrom(unit, 'longitude');
  }

  setCoordinate(field: 'latitude' | 'longitude', value: string) {
    const coordinate = value.trim() === '' ? null : Number(value);
    const validCoordinate = coordinate !== null && Number.isFinite(coordinate) ? coordinate : null;
    if (field === 'latitude') this.latitude.set(validCoordinate);
    else this.longitude.set(validCoordinate);
    this.syncMapMarker();
  }

  useMyLocation() {
    if (this.isLocating()) return;
    if (!navigator.geolocation) {
      this.locationMessage.set("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }
    if (!window.isSecureContext) {
      this.locationMessage.set(
        'La géolocalisation nécessite une connexion sécurisée (HTTPS). Vous pouvez choisir la position directement sur la carte.',
      );
      return;
    }

    this.locationMessage.set(null);
    this.isLocating.set(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.isLocating.set(false);
        this.applyMapPosition(position.coords.latitude, position.coords.longitude, true);
        this.locationMessage.set('Position détectée. Enregistrez le formulaire pour la conserver.');
      },
      (error) => {
        this.isLocating.set(false);
        const detail = error.code === error.PERMISSION_DENIED
          ? "Accès à la position refusé. Autorisez la géolocalisation ou choisissez un point sur la carte."
          : 'Impossible de déterminer votre position. Choisissez un point directement sur la carte.';
        this.locationMessage.set(detail);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
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

    const latitude = this.latitude();
    const longitude = this.longitude();
    if ((latitude === null) !== (longitude === null)) {
      this.error.set('Renseignez la latitude et la longitude ensemble.');
      this.saving.set(false);
      return;
    }
    if (this.selectedType === 'NEIGHBORHOOD' && (latitude === null || longitude === null)) {
      this.error.set('La latitude et la longitude sont obligatoires pour un quartier.');
      this.saving.set(false);
      return;
    }
    if (latitude !== null && (latitude < -90 || latitude > 90)) {
      this.error.set('La latitude doit être comprise entre -90 et 90.');
      this.saving.set(false);
      return;
    }
    if (longitude !== null && (longitude < -180 || longitude > 180)) {
      this.error.set('La longitude doit être comprise entre -180 et 180.');
      this.saving.set(false);
      return;
    }

    try {
      if (this.editId) {
        await this.territory.updateApiUnit(this.editId, this.selectedType as 'COUNTRY' | 'CITY' | 'ARRONDISSEMENT' | 'SECTOR' | 'NEIGHBORHOOD', {
          name,
          code: this.code() || null,
          parentId: this.selectedType === 'COUNTRY' ? null : this.parentId,
          latitude,
          longitude,
        });
        this.router.navigate(['/territorial/units', this.editId]);
      } else {
        const created = await this.territory.createApiUnit({
          typeCode: this.selectedType as 'COUNTRY' | 'CITY' | 'ARRONDISSEMENT' | 'SECTOR' | 'NEIGHBORHOOD',
          name,
          parentId: this.selectedType === 'COUNTRY' ? null : this.parentId,
          code: this.code() || null,
          latitude,
          longitude,
        });
        this.router.navigate(['/territorial/units', created.id]);
      }
    } catch (e: any) {
      this.error.set(e.message);
    } finally {
      this.saving.set(false);
    }
  }

  private coordinateFrom(unit: TerritorialUnit, field: 'latitude' | 'longitude'): number | null {
    const value = unit.metadata[field];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  private initUnitMap(container: HTMLDivElement) {
    const position = this.validCoordinatePair()
      ? [this.latitude()!, this.longitude()!] as [number, number]
      : this.DEFAULT_MAP_CENTER;
    this.unitMap = L.map(container, { center: position, zoom: 15, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(this.unitMap);

    if (this.validCoordinatePair()) this.syncMapMarker();
    this.unitMap.on('click', (event: L.LeafletMouseEvent) => {
      this.applyMapPosition(event.latlng.lat, event.latlng.lng);
    });
    setTimeout(() => this.unitMap?.invalidateSize(), 200);
  }

  private validCoordinatePair(): boolean {
    const latitude = this.latitude();
    const longitude = this.longitude();
    return latitude !== null
      && longitude !== null
      && latitude >= -90
      && latitude <= 90
      && longitude >= -180
      && longitude <= 180;
  }

  private syncMapMarker(center = false) {
    if (!this.unitMap) return;
    if (!this.validCoordinatePair()) {
      this.unitMarker?.remove();
      this.unitMarker = undefined;
      return;
    }

    const latitude = this.latitude()!;
    const longitude = this.longitude()!;
    if (!this.unitMarker) {
      const markerIcon = L.icon({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });
      this.unitMarker = L.marker([latitude, longitude], { draggable: true, icon: markerIcon })
        .addTo(this.unitMap)
        .on('dragend', () => {
          const position = this.unitMarker!.getLatLng();
          this.applyMapPosition(position.lat, position.lng);
        });
    } else {
      this.unitMarker.setLatLng([latitude, longitude]);
    }
    if (center) this.unitMap.setView([latitude, longitude], this.unitMap.getZoom());
  }

  private applyMapPosition(latitude: number, longitude: number, center = false) {
    this.latitude.set(latitude);
    this.longitude.set(longitude);
    this.locationMessage.set(null);
    this.syncMapMarker(center);
  }
}
