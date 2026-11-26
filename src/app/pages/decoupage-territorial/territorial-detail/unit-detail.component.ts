import { Component, DestroyRef, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, map } from 'rxjs';
import * as L from 'leaflet';
import { TerritoryService } from '../services/territory.service';
import { TerritorialUnit, TYPE_LABELS } from '../models/models';
import { PageHeaderComponent } from '../../../shared/decoupage-territorial/page-header.component';
import { TypeBadgeComponent } from '../../../shared/decoupage-territorial/type-badge.component';
import { formatDate } from '../services/territorial-utils';
import { Pencil, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-angular';
import { IconComponent } from '../../../shared/decoupage-territorial/icon.component';

interface TreeNode {
  unit: TerritorialUnit;
  children: TreeNode[];
  expanded: boolean;
}

@Component({
  selector: 'app-unit-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent, TypeBadgeComponent, IconComponent],
  templateUrl: './unit-detail.component.html',
  styleUrl: './unit-detail.component.scss',
})
export class UnitDetailComponent implements OnInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private loadSequence = 0;
  private locationMap?: L.Map;
  private locationMarker?: L.Marker;
  private locationMapContainer?: HTMLDivElement;

  @ViewChild('unitLocationMap') set unitLocationMapEl(el: ElementRef<HTMLDivElement> | undefined) {
    if (el) {
      this.locationMapContainer = el.nativeElement;
      this.syncLocationMap(this.unit());
    } else {
      this.locationMapContainer = undefined;
      this.destroyLocationMap();
    }
  }

  unit = signal<TerritorialUnit | null>(null);
  ancestors = signal<TerritorialUnit[]>([]);
  tree = signal<TreeNode | null>(null);
  children = signal<TerritorialUnit[]>([]);
  loading = signal(true);
  actionError = signal<string | null>(null);
  TYPE_LABELS = TYPE_LABELS;
  icons = { Pencil, ChevronDown, ChevronRight, Plus, Trash2 };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public territory: TerritoryService
  ) {}

  ngOnInit() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id') ?? ''),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((id) => void this.load(id));
  }

  ngOnDestroy() {
    this.destroyLocationMap();
  }

  async load(id: string) {
    const sequence = ++this.loadSequence;
    this.loading.set(true);
    this.actionError.set(null);
    this.unit.set(null);
    this.ancestors.set([]);
    this.children.set([]);
    this.tree.set(null);

    try {
      await this.territory.loadApiUnits();
      if (sequence !== this.loadSequence) return;

      const unit = this.territory.getApiUnit(id);
      if (!unit) {
        return;
      }
      this.unit.set(unit);
      this.syncLocationMap(unit);
      this.ancestors.set(this.territory.getApiAncestors(unit));
      this.children.set(this.territory.getApiChildren(id));

      const descendants = this.territory.getApiDescendants(id);
      const root: TreeNode = { unit, children: [], expanded: true };
      const nodeMap = new Map<string, TreeNode>([[id, root]]);
      for (const d of descendants) {
        nodeMap.set(d.id, { unit: d, children: [], expanded: false });
      }
      for (const d of descendants) {
        const node = nodeMap.get(d.id)!;
        if (d.parent_id && nodeMap.has(d.parent_id)) {
          nodeMap.get(d.parent_id)!.children.push(node);
        }
      }
      this.tree.set(root);
    } catch (e: unknown) {
      if (sequence === this.loadSequence) {
        this.actionError.set(
          e instanceof Error ? e.message : 'Impossible de charger cette unité territoriale.',
        );
      }
    } finally {
      if (sequence === this.loadSequence) this.loading.set(false);
    }
  }

  toggle(node: TreeNode) {
    node.expanded = !node.expanded;
  }

  async deleteUnit() {
    const unit = this.unit();
    if (!unit) return;
    if (!window.confirm(`Supprimer « ${unit.name} » ? Cette action est irréversible.`)) return;

    this.actionError.set(null);
    try {
      await this.territory.deleteApiUnit(
        unit.id,
        unit.type_code as 'COUNTRY' | 'CITY' | 'ARRONDISSEMENT' | 'SECTOR' | 'NEIGHBORHOOD',
      );
      await this.router.navigate(['/territorial/units']);
    } catch (e: any) {
      this.actionError.set(e?.message || 'Impossible de supprimer cette unité territoriale.');
    }
  }

  allowedChildrenTypes(unit: TerritorialUnit): { code: string; label: string }[] {
    return this.territory.getApiChildTypes(unit.type_code)
      .map((code) => ({ code, label: TYPE_LABELS[code] ?? code }));
  }

  fmt = formatDate;

  coordinatesFor(unit: TerritorialUnit | null): { latitude: number; longitude: number } | null {
    if (!unit) return null;
    const latitude = unit.metadata['latitude'];
    const longitude = unit.metadata['longitude'];
    if (
      typeof latitude !== 'number'
      || !Number.isFinite(latitude)
      || latitude < -90
      || latitude > 90
      || typeof longitude !== 'number'
      || !Number.isFinite(longitude)
      || longitude < -180
      || longitude > 180
    ) {
      return null;
    }
    return { latitude, longitude };
  }

  googleMapsUrl(coordinates: { latitude: number; longitude: number }): string {
    return `https://www.google.com/maps/search/?api=1&query=${coordinates.latitude},${coordinates.longitude}`;
  }

  private syncLocationMap(unit: TerritorialUnit | null) {
    const coordinates = this.coordinatesFor(unit);
    if (!coordinates || !this.locationMapContainer) return;
    if (!this.locationMap) {
      this.initLocationMap(this.locationMapContainer, coordinates);
      return;
    }

    this.locationMarker?.setLatLng([coordinates.latitude, coordinates.longitude]);
    this.locationMap.setView(
      [coordinates.latitude, coordinates.longitude],
      this.locationMap.getZoom(),
    );
  }

  private initLocationMap(
    container: HTMLDivElement,
    coordinates: { latitude: number; longitude: number },
  ) {
    this.locationMap = L.map(container, {
      center: [coordinates.latitude, coordinates.longitude],
      zoom: 15,
      zoomControl: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(this.locationMap);
    const markerIcon = L.icon({
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
    this.locationMarker = L.marker(
      [coordinates.latitude, coordinates.longitude],
      { icon: markerIcon },
    ).addTo(this.locationMap);
    setTimeout(() => this.locationMap?.invalidateSize(), 200);
  }

  private destroyLocationMap() {
    this.locationMap?.remove();
    this.locationMap = undefined;
    this.locationMarker = undefined;
  }
}
