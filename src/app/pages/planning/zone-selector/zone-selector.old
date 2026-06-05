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
import { TreeNode } from 'primeng/api';
import * as L from 'leaflet';

// ── Types ──────────────────────────────────────────────────────
interface ZoneMeta {
  level: 'ville' | 'arrondissement' | 'secteur' | 'quartier';
  households: number;
  active: number;
  coords: [number, number];
  color: string;
}

export interface ZoneSelection {
  ville?:          string;
  arrondissement?: string;
  secteur?:        string;
  quartier?:       string;
  label:           string;
  households:      number;
  active:          number;
}

// ── Component ─────────────────────────────────────────────────
@Component({
  selector: 'app-zone-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, TreeModule, TooltipModule],
  templateUrl: './zone-selector.html',
  styleUrl: './zone-selector.scss',
})
export class ZoneSelectorComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapEl') mapElRef!: ElementRef<HTMLDivElement>;

  /** 'zone' → jusqu'au quartier | 'secteur' → jusqu'au secteur */
  @Input() mode: 'zone' | 'secteur' = 'zone';
  @Output() selectionChange = new EventEmitter<ZoneSelection>();

  private ngZone = inject(NgZone);
  private leafletMap!: L.Map;
  private circleMarkers = new Map<string, L.CircleMarker>();

  // ── State ────────────────────────────────────────────────────
  searchQuery    = signal('');
  activeOnly     = signal(false);
  selectedNode   = signal<TreeNode | null>(null);
  expandedNodes  = signal<Record<string, boolean>>({ ouaga: true });

  // ── Raw tree ─────────────────────────────────────────────────
  readonly rawTree: TreeNode[] = this._buildTree();

  // ── Filtered tree ─────────────────────────────────────────────
  filteredTree = computed<TreeNode[]>(() => {
    const q  = this.searchQuery().toLowerCase().trim();
    const ao = this.activeOnly();
    if (!q && !ao) return this.rawTree;
    return this._filterNodes(this.rawTree, q, ao);
  });

  // ── Global stats (entire tree) ────────────────────────────────
  globalHouseholds  = computed<number>(() => this._leafSum(this.rawTree, 'households'));
  globalActive      = computed<number>(() => this._leafSum(this.rawTree, 'active'));
  globalCoverage    = computed<number>(() => {
    const h = this.globalHouseholds(), a = this.globalActive();
    return h ? Math.round((a / h) * 100) : 0;
  });
  totalSecteurs = computed<number>(() => this._countByLevel(this.rawTree, 'secteur'));

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
    return this._breadcrumb(this.rawTree, n.key ?? '', []);
  });

  // ── Lifecycle ────────────────────────────────────────────────
  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => this._initMap(), 100);
    });
  }

  ngOnDestroy(): void {
    if (this.leafletMap) this.leafletMap.remove();
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

    this._plotAllMarkers(this.rawTree);
  }

  private _plotAllMarkers(nodes: TreeNode[]): void {
    for (const node of nodes) {
      const meta = node.data as ZoneMeta;
      if (meta?.coords) {
        const r = this._markerRadius(meta);
        const m = L.circleMarker(meta.coords, this._markerStyle(meta, false))
          .addTo(this.leafletMap);

        m.bindTooltip(this._tooltipHtml(node), {
          direction: 'top',
          className: 'zs-tooltip',
        });

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
    return `<div class="zs-tt">
      <strong>${node.label}</strong>
      <div>${d.households} ménages · ${d.active} actifs (${rate}%)</div>
    </div>`;
  }

  private _markerRadius(meta: ZoneMeta): number {
    const r = { ville: 22, arrondissement: 16, secteur: 10, quartier: 6 };
    return r[meta.level] ?? 8;
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
    const zoom = { ville: 12, arrondissement: 13, secteur: 14, quartier: 15 };
    this.leafletMap.flyTo(meta.coords, zoom[meta.level] ?? 13, { duration: 0.7 });
    this._highlightMarker(node.key ?? '');
  }

  private _highlightMarker(key: string): void {
    this.circleMarkers.forEach((m, k) => {
      const node = this._findNode(this.rawTree, k);
      if (!node) return;
      m.setStyle(this._markerStyle(node.data as ZoneMeta, k === key));
      if (k === key) m.bringToFront();
    });
  }

  private _resetMarkers(): void {
    this.circleMarkers.forEach((m, k) => {
      const node = this._findNode(this.rawTree, k);
      if (node) m.setStyle(this._markerStyle(node.data as ZoneMeta, false));
    });
  }

  private _emitSelection(node: TreeNode): void {
    const bc = this._breadcrumb(this.rawTree, node.key ?? '', []);
    this.selectionChange.emit({
      ville:          bc[0],
      arrondissement: bc[1],
      secteur:        bc[2],
      quartier:       bc[3],
      label:          node.label ?? '',
      households:     node.data?.households ?? 0,
      active:         node.data?.active ?? 0,
    });
  }

  // ── Tree helpers ──────────────────────────────────────────────
  private _findNode(nodes: TreeNode[], key: string): TreeNode | null {
    for (const n of nodes) {
      if (n.key === key) return n;
      if (n.children) { const f = this._findNode(n.children, key); if (f) return f; }
    }
    return null;
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

  // ── Mock data ─────────────────────────────────────────────────
  private _buildTree(): TreeNode[] {
    const q = (key: string, label: string, coords: [number, number], h: number, a: number): TreeNode =>
      ({ key, label, data: { level: 'quartier', households: h, active: a, coords, color: '#f59e0b' }, leaf: true });

    const s = (key: string, label: string, coords: [number, number], h: number, a: number, children: TreeNode[]): TreeNode =>
      ({ key, label, data: { level: 'secteur', households: h, active: a, coords, color: '#16a34a' }, children });

    const arr = (key: string, label: string, coords: [number, number], h: number, a: number, children: TreeNode[]): TreeNode =>
      ({ key, label, data: { level: 'arrondissement', households: h, active: a, coords, color: '#8b5cf6' }, children });

    const vil = (key: string, label: string, coords: [number, number], h: number, a: number, children: TreeNode[]): TreeNode =>
      ({ key, label, data: { level: 'ville', households: h, active: a, coords, color: '#3b82f6' }, expanded: true, children });

    return [
      vil('ouaga', 'Ouagadougou', [12.3647, -1.5337], 850, 320, [
        arr('baskuy', 'Baskuy', [12.3700, -1.5200], 280, 110, [
          s('s1', 'Secteur 1', [12.3650, -1.5350], 110, 45, [
            q('wem', 'Wemtenga',  [12.3660, -1.5360], 38, 18),
            q('pis', 'Pissy',     [12.3640, -1.5340], 50, 20),
            q('gou', 'Gounghin',  [12.3630, -1.5320], 22,  7),
          ]),
          s('s2', 'Secteur 2', [12.3680, -1.5220], 90, 35, [
            q('tam', 'Tampouy',   [12.3700, -1.5230], 48, 22),
            q('non', 'Nonsin',    [12.3660, -1.5210], 42, 13),
          ]),
          s('s3', 'Secteur 3', [12.3720, -1.5180], 80, 30, [
            q('das', 'Dassasgho', [12.3520, -1.5180], 45, 18),
            q('way', 'Wayalghin', [12.3730, -1.5175], 32,  9),
            q('ben', 'Bendogo',   [12.3745, -1.5160], 28,  7),
          ]),
        ]),
        arr('bogodogo', 'Bogodogo', [12.3400, -1.5100], 240, 95, [
          s('s4', 'Secteur 4', [12.3550, -1.5300], 140, 55, [
            q('kar',  'Karpala',  [12.3560, -1.5280], 55, 22),
            q('gam',  'Gampèla',  [12.3550, -1.5310], 40, 15),
            q('nio1', 'Nioko 1',  [12.3540, -1.5295], 35, 14),
            q('nio2', 'Nioko 2',  [12.3545, -1.5270], 30, 11),
          ]),
          s('s7', 'Secteur 7', [12.3450, -1.5150], 118, 42, [
            q('zog', 'Zogona',   [12.3470, -1.5130], 42, 16),
            q('kou', 'Koulouba', [12.3455, -1.5165], 38, 14),
            q('bil', 'Bilbalgo', [12.3440, -1.5140], 38, 12),
          ]),
          s('s10', 'Secteur 10', [12.3380, -1.5050], 130, 50, [
            q('kos',   'Kossodo', [12.3380, -1.5060], 60, 25),
            q('tam2',  'Tampouy', [12.3390, -1.5040], 48, 18),
            q('nons2', 'Nonsin',  [12.3370, -1.5035], 22,  7),
          ]),
        ]),
        arr('boulmiougou', 'Boulmiougou', [12.3200, -1.5600], 200, 75, [
          s('s11', 'Secteur 11', [12.3200, -1.5600], 80, 30, [
            q('pis2', 'Pissy Sud',     [12.3205, -1.5610], 40, 16),
            q('gou2', 'Gounghin Nord', [12.3195, -1.5590], 40, 14),
          ]),
          s('s12', 'Secteur 12', [12.3220, -1.5580], 120, 45, [
            q('lar', 'Larguem', [12.3225, -1.5575], 60, 24),
            q('net', 'Nettali', [12.3215, -1.5585], 60, 21),
          ]),
        ]),
        arr('nongremassom', 'Nongremassom', [12.4000, -1.5500], 180, 60, [
          s('s14', 'Secteur 14', [12.4000, -1.5500], 90, 30, [
            q('wen', 'Wendkouni', [12.4010, -1.5510], 45, 16),
            q('lar2', 'Larlé',   [12.3990, -1.5490], 45, 14),
          ]),
          s('s15', 'Secteur 15', [12.4050, -1.5450], 90, 30, [
            q('nab', 'Nabitenga', [12.4060, -1.5460], 48, 17),
            q('kil', 'Kilwin',    [12.4040, -1.5440], 42, 13),
          ]),
        ]),
        arr('sign', 'Sig-Noghin', [12.3800, -1.4900], 150, 50, [
          s('s5', 'Secteur 5', [12.3800, -1.4900], 80, 28, [
            q('nab2', 'Nabitenga', [12.3810, -1.4910], 40, 15),
            q('kil2', 'Kilwin',    [12.3790, -1.4890], 40, 13),
          ]),
        ]),
      ]),
      vil('bobo', 'Bobo-Dioulasso', [11.1777, -4.2985], 420, 160, [
        arr('do', 'Do', [11.1900, -4.3000], 140, 55, [
          s('bs1', 'Secteur 1', [11.1900, -4.3000], 80, 32, [
            q('bdi', 'Bindougousso', [11.1910, -4.3010], 40, 16),
            q('san', 'Sankara',      [11.1890, -4.2990], 40, 16),
          ]),
          s('bs2', 'Secteur 2', [11.1920, -4.2950], 60, 23, [
            q('kou3', 'Koko',    [11.1930, -4.2940], 30, 12),
            q('yeg2', 'Yégueré', [11.1910, -4.2960], 30, 11),
          ]),
        ]),
        arr('dafra', 'Dafra', [11.1600, -4.3200], 160, 60, [
          s('bs3', 'Secteur 3', [11.1600, -4.3200], 90, 34, [
            q('yeg', 'Yéguéré',    [11.1610, -4.3210], 45, 18),
            q('bam', 'Bambarasso', [11.1590, -4.3190], 45, 16),
          ]),
          s('bs4', 'Secteur 4', [11.1580, -4.3220], 70, 26, [
            q('kaf', 'Kafolo', [11.1585, -4.3215], 35, 14),
            q('bar', 'Barani', [11.1575, -4.3225], 35, 12),
          ]),
        ]),
        arr('konsa', 'Konsa', [11.1850, -4.2850], 120, 45, [
          s('bs5', 'Secteur 5', [11.1850, -4.2850], 120, 45, [
            q('ton', 'Toni',    [11.1860, -4.2860], 60, 23),
            q('bom', 'Bomboro', [11.1840, -4.2840], 60, 22),
          ]),
        ]),
      ]),
      vil('koudougou', 'Koudougou', [12.2531, -2.3592], 180, 65, [
        arr('kdg1', 'Arrondissement 1', [12.2600, -2.3600], 100, 38, [
          s('ks1', 'Secteur 1', [12.2600, -2.3600], 60, 23, [
            q('ram', 'Ramnon',   [12.2610, -2.3610], 30, 12),
            q('sin', 'Singadin', [12.2590, -2.3590], 30, 11),
          ]),
          s('ks2', 'Secteur 2', [12.2550, -2.3580], 40, 15, [
            q('tag', 'Tagougou', [12.2560, -2.3585], 40, 15),
          ]),
        ]),
        arr('kdg2', 'Arrondissement 2', [12.2450, -2.3580], 80, 27, [
          s('ks3', 'Secteur 3', [12.2450, -2.3580], 80, 27, [
            q('nad', 'Nadomnoma', [12.2460, -2.3590], 40, 14),
            q('lil', 'Liliogo',   [12.2440, -2.3570], 40, 13),
          ]),
        ]),
      ]),
    ];
  }
}
