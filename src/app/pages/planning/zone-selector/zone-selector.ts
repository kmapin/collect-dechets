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
import { AuthService } from '../../../services/auth.service';
import { TerritoryItem } from '../models/planning.model';

// ── Types ──────────────────────────────────────────────────────
// Chantier "migrer le frontend / résoudre de vrais clients zone/secteur" — `households`/
// `active` étaient des constantes inventées (40/15 par quartier, 120/45 par secteur même
// sans quartier chargé) sans AUCUNE contrepartie côté backend (aucun modèle ne stocke de
// décompte de ménages) : retirées. Le seul nombre affiché désormais (`clientCount`, sur
// la sélection courante uniquement — jamais sur les 137 nœuds de l'arbre, qui coûterait
// 137 requêtes) vient de GET /planning/zone-client-count, un vrai comptage de clients
// réels + éligibles pour la géographie choisie.
interface ZoneMeta {
  level: 'ville' | 'arrondissement' | 'secteur' | 'quartier';
  id: string;
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
  /** null = en cours de chargement ou indisponible — jamais une estimation inventée. */
  clientCount:       number | null;
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
  private auth    = inject(AuthService);
  private api     = environment.apiUrl;
  private leafletMap!: L.Map;
  private circleMarkers = new Map<string, L.CircleMarker>();

  // ── State ────────────────────────────────────────────────────
  searchQuery   = signal('');
  selectedNode  = signal<TreeNode | null>(null);
  isLoading     = signal(true);
  loadError     = signal<string | null>(null);
  rawTree       = signal<TreeNode[]>([]);

  // ── Filtered tree ─────────────────────────────────────────────
  // Chantier "résoudre de vrais clients zone/secteur" — le filtre "Actifs uniquement"
  // reposait entièrement sur le champ `active` fictif, retiré : plus de second critère,
  // seulement la recherche par nom.
  filteredTree = computed<TreeNode[]>(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.rawTree();
    return this._filterNodes(this.rawTree(), q);
  });

  totalSecteurs = computed<number>(() => this._countByLevel(this.rawTree(), 'secteur'));

  // ── Comptage réel de clients pour la sélection courante ─────────
  // Chantier "résoudre de vrais clients zone/secteur" — un seul appel réseau, pour le
  // nœud sélectionné uniquement (jamais un total pré-calculé sur les 137 nœuds de
  // l'arbre). `null` = en cours de chargement ou indisponible, jamais une estimation.
  selClientCount        = signal<number | null>(null);
  selClientCountLoading = signal(false);
  selClientCountError   = signal<string | null>(null);

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
    this.isLoading.set(true);
    this.loadError.set(null);
    // Chaque flux dégrade individuellement vers [] pour ne pas bloquer les 3 autres
    // niveaux si un seul échoue, mais on garde trace de l'échec pour l'afficher —
    // avant ce chantier, ces `catchError` avalaient l'erreur sans jamais la montrer.
    let anyFailed = false;
    const onLevelError = () => { anyFailed = true; return of([]); };

    forkJoin({
      cities:         this.http.get<{ success?: boolean; data?: TerritoryItem[] }>(`${this.api}/territories/cities`).pipe(
                        map(r => (r as any)?.data ?? (Array.isArray(r) ? r : [])),
                        catchError(onLevelError),
                      ),
      arrondissements:this.http.get<{ success?: boolean; data?: TerritoryItem[] }>(`${this.api}/territories/arrondissements`).pipe(
                        map(r => (r as any)?.data ?? (Array.isArray(r) ? r : [])),
                        catchError(onLevelError),
                      ),
      sectors:        this.http.get<{ success?: boolean; data?: TerritoryItem[] }>(`${this.api}/territories/sectors`).pipe(
                        map(r => (r as any)?.data ?? (Array.isArray(r) ? r : [])),
                        catchError(onLevelError),
                      ),
      neighborhoods:  this.http.get<{ success?: boolean; data?: TerritoryItem[] }>(`${this.api}/territories/neighborhoods`).pipe(
                        map(r => (r as any)?.data ?? (Array.isArray(r) ? r : [])),
                        catchError(onLevelError),
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
      if (anyFailed) {
        this.loadError.set("Certaines géographies n'ont pas pu être chargées — la liste peut être incomplète.");
      }
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
              level:  'quartier' as const,
              id:      nbh._id,
              coords:  [nbh.latitude ?? 12.3647, nbh.longitude ?? -1.5337] as [number, number],
              color:   '#f59e0b',
            } satisfies ZoneMeta,
          }));

          return {
            key:      `sec-${sec._id}`,
            label:    sec.name,
            leaf:     neighborhoodNodes.length === 0,
            children: neighborhoodNodes.length ? neighborhoodNodes : undefined,
            data: {
              level:  'secteur' as const,
              id:      sec._id,
              coords:  [sec.latitude ?? 12.3647, sec.longitude ?? -1.5337] as [number, number],
              color:   '#16a34a',
            } satisfies ZoneMeta,
          };
        });

        return {
          key:      `arr-${arr._id}`,
          label:    arr.name,
          children: sectorNodes,
          data: {
            level:  'arrondissement' as const,
            id:      arr._id,
            coords:  [arr.latitude ?? 12.3647, arr.longitude ?? -1.5337] as [number, number],
            color:   '#8b5cf6',
          } satisfies ZoneMeta,
        };
      });

      return {
        key:      `city-${city._id}`,
        label:    city.name,
        expanded: ci === 0,
        children: arrNodes,
        data: {
          level:  'ville' as const,
          id:      city._id,
          coords:  [city.latitude ?? 12.3647, city.longitude ?? -1.5337] as [number, number],
          color:   cityColor,
        } satisfies ZoneMeta,
      };
    });
  }

  // ── Interactions ──────────────────────────────────────────────
  onSearch(q: string): void { this.searchQuery.set(q); }

  onNodeSelect(event: { node: TreeNode }): void {
    this.selectedNode.set(event.node);
    this._flyToNode(event.node);
    this._emitSelection(event.node);
  }

  onNodeUnselect(): void {
    this.selectedNode.set(null);
    this._resetMarkers();
    this._resetClientCount();
    this.selectionChange.emit({ label: '', clientCount: null });
  }

  clearSelection(): void {
    this.selectedNode.set(null);
    this._resetMarkers();
    this._resetClientCount();
    this.selectionChange.emit({ label: '', clientCount: null });
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
    // Plus de compteur ici (ni ménages ni actifs) — afficher un vrai nombre par survol
    // coûterait une requête par nœud (jusqu'à 137) ; le compte réel n'est chargé que
    // pour la sélection courante (voir selClientCount / _fetchClientCount).
    return `<div class="zs-tt"><strong>${node.label}</strong></div>`;
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

    // Build selection with names and IDs — clientCount part vient dans une 2e émission
    // une fois résolu (voir _fetchClientCount), jamais inventé ici.
    const sel: ZoneSelection = {
      label:       node.label ?? '',
      clientCount: null,
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
    this._fetchClientCount(sel);
  }

  /**
   * Chantier "résoudre de vrais clients zone/secteur" — un seul appel réseau pour la
   * sélection courante, réutilise GET /planning/zone-client-count (backend : agence +
   * rôle client + statut actif + correspondance géographique + éligibilité, la MÊME
   * résolution que la génération de Collecte au démarrage du planning). Ré-émet
   * `selectionChange` avec le compte réel une fois résolu — jamais une estimation.
   */
  private _fetchClientCount(sel: ZoneSelection): void {
    const agencyId = this.auth.getCurrentUser()?.agencyId;
    this.selClientCount.set(null);
    this.selClientCountError.set(null);
    if (!agencyId) return;

    this.selClientCountLoading.set(true);
    this.http.get<{ success?: boolean; data?: { count: number } }>(`${this.api}/planning/zone-client-count`, {
      params: {
        agencyId,
        ...(sel.villeId ? { villeId: sel.villeId } : {}),
        ...(sel.arrondissementId ? { arrondissementId: sel.arrondissementId } : {}),
        ...(sel.secteurId ? { secteurId: sel.secteurId } : {}),
        ...(sel.quartierId ? { quartierId: sel.quartierId } : {}),
      },
    }).pipe(
      catchError(() => of(null)),
    ).subscribe((res) => {
      this.selClientCountLoading.set(false);
      const count = res?.data?.count;
      if (typeof count === 'number') {
        this.selClientCount.set(count);
        this.selectionChange.emit({ ...sel, clientCount: count });
      } else {
        this.selClientCountError.set('Nombre de clients indisponible.');
        this.selectionChange.emit({ ...sel, clientCount: null });
      }
    });
  }

  private _resetClientCount(): void {
    this.selClientCount.set(null);
    this.selClientCountLoading.set(false);
    this.selClientCountError.set(null);
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

  private _filterNodes(nodes: TreeNode[], q: string): TreeNode[] {
    const out: TreeNode[] = [];
    for (const n of nodes) {
      const labelMatch = !q || (n.label ?? '').toLowerCase().includes(q);
      const kids = n.children ? this._filterNodes(n.children, q) : undefined;
      if (labelMatch || kids?.length) {
        out.push({ ...n, children: kids, expanded: !!(q || kids?.length) });
      }
    }
    return out;
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
