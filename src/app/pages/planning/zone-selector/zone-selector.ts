import {
  Component, OnInit, OnDestroy, AfterViewInit,
  Input, Output, EventEmitter,
  signal, computed, inject,
  ElementRef, ViewChild, NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TreeModule } from 'primeng/tree';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { TreeNode } from 'primeng/api';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import * as L from 'leaflet';
import { environment } from '../../../../environments/environment';
import { TerritoryItem } from '../models/planning.model';

// ── Types ──────────────────────────────────────────────────────
interface ZoneMeta {
  level: 'ville' | 'arrondissement' | 'secteur' | 'quartier';
  id: string;
  households: number;
  active: number;
  coords: [number, number];
  color: string;
}

export interface ZoneSelection {
  villeId?:          string;
  arrondissementId?: string;
  secteurId?:        string;
  quartierId?:       string;
  ville?:            string;
  arrondissement?:   string;
  secteur?:          string;
  quartier?:         string;
  label:             string;
  households:        number;
  active:            number;
}

// ── Component ─────────────────────────────────────────────────
@Component({
  selector: 'app-zone-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, TreeModule, TooltipModule, SkeletonModule],
  templateUrl: './zone-selector.html',
  styleUrl: './zone-selector.scss',
})
export class ZoneSelectorComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapEl') mapElRef!: ElementRef<HTMLDivElement>;

  /** 'zone' → jusqu'au quartier | 'secteur' → jusqu'au secteur */
  @Input() mode: 'zone' | 'secteur' = 'zone';
  @Output() selectionChange = new EventEmitter<ZoneSelection>();

  private http    = inject(HttpClient);
  private ngZone  = inject(NgZone);
  private api     = environment.apiUrl;
  private leafletMap!: L.Map;
  private circleMarkers = new Map<string, L.CircleMarker>();

  // ── State ────────────────────────────────────────────────────
  searchQuery   = signal('');
  activeOnly    = signal(false);
  selectedNode  = signal<TreeNode | null>(null);
  isLoading     = signal(true);
  rawTree       = signal<TreeNode[]>([]);

  // ── Filtered tree ─────────────────────────────────────────────
  filteredTree = computed<TreeNode[]>(() => {
    const q  = this.searchQuery().toLowerCase().trim();
    const ao = this.activeOnly();
    if (!q && !ao) return this.rawTree();
    return this._filterNodes(this.rawTree(), q, ao);
  });

  // ── Global stats ──────────────────────────────────────────────
  globalHouseholds = computed<number>(() => this._leafSum(this.rawTree(), 'households'));
  globalActive     = computed<number>(() => this._leafSum(this.rawTree(), 'active'));
  globalCoverage   = computed<number>(() => {
    const h = this.globalHouseholds(), a = this.globalActive();
    return h ? Math.round((a / h) * 100) : 0;
  });
  totalSecteurs = computed<number>(() => this._countByLevel(this.rawTree(), 'secteur'));

  // ── Selected zone stats ───────────────────────────────────────
  selHouseholds = computed<number>(() => this.selectedNode()?.data?.households ?? 0);
  selActive     = computed<number>(() => this.selectedNode()?.data?.active ?? 0);
  selCoverage   = computed<number>(() => {
    const h = this.selHouseholds(), a = this.selActive();
    return h ? Math.round((a / h) * 100) : 0;
  });
  selBreadcrumb = computed<string[]>(() => {
    const n = this.selectedNode();
    if (!n) return [];
    return this._breadcrumb(this.rawTree(), n.key ?? '', []);
  });

  // ── Lifecycle ────────────────────────────────────────────────
  ngOnInit(): void {
    this._loadTerritories();
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => this._initMap(), 200);
    });
  }

  ngOnDestroy(): void {
    if (this.leafletMap) this.leafletMap.remove();
  }

  // ── Load territory from API ───────────────────────────────────
  private _loadTerritories(): void {
    forkJoin({
      cities:         this.http.get<{ success?: boolean; data?: TerritoryItem[] }>(`${this.api}/territories/cities`).pipe(
                        map(r => (r as any)?.data ?? (Array.isArray(r) ? r : [])),
                        catchError(() => of([])),
                      ),
      arrondissements:this.http.get<{ success?: boolean; data?: TerritoryItem[] }>(`${this.api}/territories/arrondissements`).pipe(
                        map(r => (r as any)?.data ?? (Array.isArray(r) ? r : [])),
                        catchError(() => of([])),
                      ),
      sectors:        this.http.get<{ success?: boolean; data?: TerritoryItem[] }>(`${this.api}/territories/sectors`).pipe(
                        map(r => (r as any)?.data ?? (Array.isArray(r) ? r : [])),
                        catchError(() => of([])),
                      ),
      neighborhoods:  this.http.get<{ success?: boolean; data?: TerritoryItem[] }>(`${this.api}/territories/neighborhoods`).pipe(
                        map(r => (r as any)?.data ?? (Array.isArray(r) ? r : [])),
                        catchError(() => of([])),
                      ),
    }).subscribe(({ cities, arrondissements, sectors, neighborhoods }) => {
      const tree = this._buildTreeFromApi(
        cities as TerritoryItem[],
        arrondissements as TerritoryItem[],
        sectors as TerritoryItem[],
        neighborhoods as TerritoryItem[],
      );
      this.rawTree.set(tree);
      this.isLoading.set(false);
      // Re-plot markers after tree is built
      if (this.leafletMap) {
        this.ngZone.runOutsideAngular(() => this._plotAllMarkers(this.rawTree()));
      }
    });
  }

  private _buildTreeFromApi(
    cities: TerritoryItem[],
    arrondissements: TerritoryItem[],
    sectors: TerritoryItem[],
    neighborhoods: TerritoryItem[],
  ): TreeNode[] {
    const cityColors = ['#3b82f6', '#8b5cf6', '#16a34a', '#f59e0b', '#ef4444'];

    return cities.map((city, ci) => {
      const cityColor = cityColors[ci % cityColors.length];
      const cityArr   = arrondissements.filter(a => a.cityId === city._id);

      const arrNodes: TreeNode[] = cityArr.map((arr) => {
        const arrSectors = sectors.filter(s => s.arrondissementId === arr._id);

        const sectorNodes: TreeNode[] = arrSectors.map(sec => {
          const secNeighborhoods = this.mode === 'zone'
            ? neighborhoods.filter(n => n.sectorId === sec._id)
            : [];

          const neighborhoodNodes: TreeNode[] = secNeighborhoods.map(nbh => ({
            key:   `nbh-${nbh._id}`,
            label: nbh.name,
            leaf:  true,
            data: {
              level:      'quartier' as const,
              id:          nbh._id,
              households:  40,
              active:      15,
              coords:      [nbh.latitude ?? 12.3647, nbh.longitude ?? -1.5337] as [number, number],
              color:       '#f59e0b',
            } satisfies ZoneMeta,
          }));

          return {
            key:      `sec-${sec._id}`,
            label:    sec.name,
            leaf:     neighborhoodNodes.length === 0,
            children: neighborhoodNodes.length ? neighborhoodNodes : undefined,
            data: {
              level:      'secteur' as const,
              id:          sec._id,
              households:  neighborhoodNodes.reduce((s, n) => s + (n.data?.households ?? 0), 120),
              active:      neighborhoodNodes.reduce((s, n) => s + (n.data?.active ?? 0), 45),
              coords:      [sec.latitude ?? 12.3647, sec.longitude ?? -1.5337] as [number, number],
              color:       '#16a34a',
            } satisfies ZoneMeta,
          };
        });

        return {
          key:      `arr-${arr._id}`,
          label:    arr.name,
          children: sectorNodes,
          data: {
            level:      'arrondissement' as const,
            id:          arr._id,
            households:  sectorNodes.reduce((s, n) => s + (n.data?.households ?? 0), 0),
            active:      sectorNodes.reduce((s, n) => s + (n.data?.active ?? 0), 0),
            coords:      [arr.latitude ?? 12.3647, arr.longitude ?? -1.5337] as [number, number],
            color:       '#8b5cf6',
          } satisfies ZoneMeta,
        };
      });

      return {
        key:      `city-${city._id}`,
        label:    city.name,
        expanded: ci === 0,
        children: arrNodes,
        data: {
          level:      'ville' as const,
          id:          city._id,
          households:  arrNodes.reduce((s, n) => s + (n.data?.households ?? 0), 0),
          active:      arrNodes.reduce((s, n) => s + (n.data?.active ?? 0), 0),
          coords:      [city.latitude ?? 12.3647, city.longitude ?? -1.5337] as [number, number],
          color:       cityColor,
        } satisfies ZoneMeta,
      };
    });
  }

  // ── Interactions ──────────────────────────────────────────────
  onSearch(q: string): void { this.searchQuery.set(q); }

  toggleActiveFilter(): void { this.activeOnly.update(v => !v); }

  onNodeSelect(event: { node: TreeNode }): void {
    this.selectedNode.set(event.node);
    this._flyToNode(event.node);
    this._emitSelection(event.node);
  }

  onNodeUnselect(): void {
    this.selectedNode.set(null);
    this._resetMarkers();
    this.selectionChange.emit({ label: '', households: 0, active: 0 });
  }

  clearSelection(): void {
    this.selectedNode.set(null);
    this._resetMarkers();
    this.selectionChange.emit({ label: '', households: 0, active: 0 });
  }

  isSelected(key: string): boolean { return this.selectedNode()?.key === key; }

  // ── UI helpers ────────────────────────────────────────────────
  getLevelIcon(level: string): string {
    return ({ ville: 'location_city', arrondissement: 'account_balance', secteur: 'grid_view', quartier: 'home' } as Record<string, string>)[level] ?? 'place';
  }

  getLevelColor(level: string): string {
    return ({ ville: '#3b82f6', arrondissement: '#8b5cf6', secteur: '#16a34a', quartier: '#f59e0b' } as Record<string, string>)[level] ?? '#64748b';
  }

  getLevelLabel(level: string): string {
    return ({ ville: 'Ville', arrondissement: 'Arrondissement', secteur: 'Secteur', quartier: 'Quartier' } as Record<string, string>)[level] ?? level;
  }

  getRatePct(active: number, total: number): number {
    return total ? Math.round((active / total) * 100) : 0;
  }

  // ── Leaflet map ───────────────────────────────────────────────
  private _initMap(): void {
    if (!this.mapElRef?.nativeElement) return;

    this.leafletMap = L.map(this.mapElRef.nativeElement, {
      center: [12.3647, -1.5337],
      zoom: 12,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(this.leafletMap);

    if (this.rawTree().length) {
      this._plotAllMarkers(this.rawTree());
    }
  }

  private _plotAllMarkers(nodes: TreeNode[]): void {
    for (const node of nodes) {
      const meta = node.data as ZoneMeta;
      if (meta?.coords) {
        const m = L.circleMarker(meta.coords, this._markerStyle(meta, false))
          .addTo(this.leafletMap);

        m.bindTooltip(this._tooltipHtml(node), { direction: 'top', className: 'zs-tooltip' });

        m.on('click', () => {
          this.ngZone.run(() => {
            this.selectedNode.set(node);
            this._emitSelection(node);
          });
          this._highlightMarker(node.key ?? '');
        });

        this.circleMarkers.set(node.key ?? '', m);
      }
      if (node.children) this._plotAllMarkers(node.children);
    }
  }

  private _tooltipHtml(node: TreeNode): string {
    const d = node.data as ZoneMeta;
    const rate = this.getRatePct(d.active, d.households);
    return `<div class="zs-tt"><strong>${node.label}</strong><div>${d.households} ménages · ${d.active} actifs (${rate}%)</div></div>`;
  }

  private _markerRadius(meta: ZoneMeta): number {
    return ({ ville: 22, arrondissement: 16, secteur: 10, quartier: 6 } as Record<string, number>)[meta.level] ?? 8;
  }

  private _markerStyle(meta: ZoneMeta, selected: boolean): L.CircleMarkerOptions {
    return {
      radius:      this._markerRadius(meta),
      fillColor:   meta.color,
      color:       selected ? '#1e293b' : '#ffffff',
      weight:      selected ? 3 : 2,
      opacity:     1,
      fillOpacity: selected ? 0.9 : 0.55,
    };
  }

  private _flyToNode(node: TreeNode): void {
    const meta = node.data as ZoneMeta;
    if (!meta?.coords || !this.leafletMap) return;
    const zoom = ({ ville: 12, arrondissement: 13, secteur: 14, quartier: 15 } as Record<string, number>)[meta.level] ?? 13;
    this.leafletMap.flyTo(meta.coords, zoom, { duration: 0.7 });
    this._highlightMarker(node.key ?? '');
  }

  private _highlightMarker(key: string): void {
    this.circleMarkers.forEach((m, k) => {
      const node = this._findNode(this.rawTree(), k);
      if (!node) return;
      m.setStyle(this._markerStyle(node.data as ZoneMeta, k === key));
      if (k === key) m.bringToFront();
    });
  }

  private _resetMarkers(): void {
    this.circleMarkers.forEach((m, k) => {
      const node = this._findNode(this.rawTree(), k);
      if (node) m.setStyle(this._markerStyle(node.data as ZoneMeta, false));
    });
  }

  private _emitSelection(node: TreeNode): void {
    const meta = node.data as ZoneMeta;

    // Build selection with both names and IDs
    const sel: ZoneSelection = {
      label:      node.label ?? '',
      households: node.data?.households ?? 0,
      active:     node.data?.active ?? 0,
    };

    // Walk the ancestor chain to build full path with IDs
    const ancestors = this._ancestorNodes(this.rawTree(), node.key ?? '');
    for (const anc of ancestors) {
      const m = anc.data as ZoneMeta;
      switch (m?.level) {
        case 'ville':           sel.ville           = anc.label; sel.villeId           = m.id; break;
        case 'arrondissement':  sel.arrondissement  = anc.label; sel.arrondissementId  = m.id; break;
        case 'secteur':         sel.secteur         = anc.label; sel.secteurId         = m.id; break;
        case 'quartier':        sel.quartier        = anc.label; sel.quartierId        = m.id; break;
      }
    }
    // Also set the current node's level
    switch (meta?.level) {
      case 'ville':           sel.ville           = node.label; sel.villeId           = meta.id; break;
      case 'arrondissement':  sel.arrondissement  = node.label; sel.arrondissementId  = meta.id; break;
      case 'secteur':         sel.secteur         = node.label; sel.secteurId         = meta.id; break;
      case 'quartier':        sel.quartier        = node.label; sel.quartierId        = meta.id; break;
    }

    this.selectionChange.emit(sel);
  }

  // ── Tree helpers ──────────────────────────────────────────────
  private _findNode(nodes: TreeNode[], key: string): TreeNode | null {
    for (const n of nodes) {
      if (n.key === key) return n;
      if (n.children) { const f = this._findNode(n.children, key); if (f) return f; }
    }
    return null;
  }

  private _ancestorNodes(nodes: TreeNode[], key: string, path: TreeNode[] = []): TreeNode[] {
    for (const n of nodes) {
      if (n.key === key) return path;
      if (n.children && this._findNode(n.children, key)) return [...path, n];
    }
    return [];
  }

  private _breadcrumb(nodes: TreeNode[], key: string, path: string[]): string[] {
    for (const n of nodes) {
      if (n.key === key) return [...path, n.label ?? ''];
      if (n.children) {
        const r = this._breadcrumb(n.children, key, [...path, n.label ?? '']);
        if (r.length) return r;
      }
    }
    return [];
  }

  private _filterNodes(nodes: TreeNode[], q: string, ao: boolean): TreeNode[] {
    const out: TreeNode[] = [];
    for (const n of nodes) {
      const labelMatch  = !q || (n.label ?? '').toLowerCase().includes(q);
      const activeMatch = !ao || (n.data?.active ?? 0) > 0;
      const kids = n.children ? this._filterNodes(n.children, q, ao) : undefined;
      if ((labelMatch && activeMatch) || kids?.length) {
        out.push({ ...n, children: kids, expanded: !!(q || kids?.length) });
      }
    }
    return out;
  }

  private _leafSum(nodes: TreeNode[], field: 'households' | 'active'): number {
    return nodes.reduce((acc, n) => {
      if (n.leaf) return acc + (n.data?.[field] ?? 0);
      if (n.children) return acc + this._leafSum(n.children, field);
      return acc;
    }, 0);
  }

  private _countByLevel(nodes: TreeNode[], level: string): number {
    let cnt = 0;
    for (const n of nodes) {
      if (n.data?.level === level) cnt++;
      if (n.children) cnt += this._countByLevel(n.children, level);
    }
    return cnt;
  }
}
