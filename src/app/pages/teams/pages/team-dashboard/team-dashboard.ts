import {
  Component, OnInit, OnDestroy, AfterViewInit,
  inject, signal, computed, ViewChild, ElementRef, effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Chart, registerables } from 'chart.js';
import * as L from 'leaflet';
import { TeamService } from '../../services/team.service';
import { Team } from '../../models/team.model';

Chart.register(...registerables);

// ── Local types ──────────────────────────────────────────────
interface Activity {
  id: string;
  icon: string;
  color: string;
  title: string;
  sub: string;
  time: Date;
}
interface OpsAlert {
  id: string;
  sev: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  body: string;
  time: Date;
}
interface MaintAlert {
  id: string;
  kind: 'vehicle' | 'team';
  sev: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  due: string;
}

@Component({
  selector: 'app-team-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule, TooltipModule, ToastModule],
  providers: [MessageService],
  templateUrl: './team-dashboard.html',
  styleUrl: './team-dashboard.scss',
})
export class TeamDashboard implements OnInit, AfterViewInit, OnDestroy {
  readonly router = inject(Router);
  readonly svc    = inject(TeamService);
  private  msg    = inject(MessageService);

  // ── Chart canvas refs ─────────────────────────────────────
  @ViewChild('chartWeekly') chartWeeklyRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartPerf')   chartPerfRef!:   ElementRef<HTMLCanvasElement>;
  @ViewChild('chartExec')   chartExecRef!:   ElementRef<HTMLCanvasElement>;
  @ViewChild('chartZones')  chartZonesRef!:  ElementRef<HTMLCanvasElement>;

  // ── Reactive state ────────────────────────────────────────
  currentTime = signal(new Date());
  darkMode    = signal(false);
  activeTab   = signal<'activity' | 'notifs' | 'alerts'>('activity');

  /** Vrai tant que le premier chargement n'a pas ramené d'équipes. */
  isLoading = computed(() => this.svc.loading());
  /** Reflète l'appel réseau réel — le bouton "Actualiser" tourne exactement le temps de la requête. */
  refreshing = computed(() => this.svc.loading());

  activities  = signal<Activity[]>([]);
  notifs      = signal<OpsAlert[]>([]);
  maintAlerts = signal<MaintAlert[]>([]);

  // ── KPI metrics (100% dérivés des équipes/véhicules réels) ─
  kpis = computed(() => {
    const teams = this.svc.teams();
    const st    = this.svc.stats();
    const available = teams.filter(t =>
      t.status === 'active' && t.members.some(m => m.availability === 'disponible')
    ).length;
    const incidents = teams.filter(t => t.workload > 85).length + st.maintenance;
    const avgPerf   = teams.length
      ? Math.round(teams.reduce((s, t) => s + t.successRate, 0) / teams.length)
      : 0;
    return {
      total: st.total,
      active: st.active,
      onMission: st.onMission,
      maintenance: st.maintenance,
      inactive: st.inactive,
      available,
      vehicles: st.availableVehicles,
      incidents,
      avgPerf,
      avgWorkload: st.avgWorkload,
    };
  });

  coverage = computed(() => {
    const k = this.kpis();
    return k.total ? Math.round((k.active + k.onMission) / k.total * 100) : 0;
  });

  private _charts: Chart[] = [];
  private _map?: L.Map;
  private _markers = new Map<string, L.Marker>();
  private _clockTimer?: ReturnType<typeof setInterval>;
  private _viewReady   = false;
  private _initialized = false;

  constructor() {
    // Sync chart theme whenever darkMode flips
    effect(() => {
      const dark = this.darkMode();
      Chart.defaults.color       = dark ? '#94a3b8' : '#475569';
      Chart.defaults.borderColor = dark ? '#334155' : '#e2e8f0';
      this._charts.forEach(c => c.update());
    });

    // Se déclenche à l'arrivée réelle des données (chargement initial ou après
    // un refresh), et à chaque changement ultérieur du signal `teams` — construit
    // les données dérivées réelles, puis initialise (une fois) ou met à jour
    // carte/graphiques.
    effect(() => {
      const teams = this.svc.teams();
      if (teams.length === 0) return;
      this._buildDerivedData();
      if (!this._initialized) {
        if (this._viewReady) this._initializeVisuals();
      } else {
        this._refreshMapMarkers();
        this._updateCharts();
      }
    });
  }

  ngOnInit(): void {
    this.svc.loadTeams();
    this._clockTimer = setInterval(() => this.currentTime.set(new Date()), 1_000);
  }

  ngAfterViewInit(): void {
    this._viewReady = true;
    // Si les équipes étaient déjà en cache (page visitée après /teams/list par
    // exemple), l'effect ci-dessus a pu se déclencher avant que la vue soit prête.
    if (!this._initialized && this.svc.teams().length > 0) {
      this._initializeVisuals();
    }
  }

  ngOnDestroy(): void {
    clearInterval(this._clockTimer);
    this._charts.forEach(c => c.destroy());
    this._map?.remove();
  }

  private _initializeVisuals(): void {
    this._initialized = true;
    setTimeout(() => {
      this._initMap();
      this._initCharts();
    }, 80);
  }

  // ── Actions ───────────────────────────────────────────────
  refresh(): void {
    this.svc.loadTeams();
  }

  toggleDark(): void { this.darkMode.update(d => !d); }

  dismissNotif(id: string): void {
    this.notifs.update(list => list.filter(n => n.id !== id));
  }

  dismissAlert(id: string): void {
    this.maintAlerts.update(list => list.filter(a => a.id !== id));
  }

  // ── Map ───────────────────────────────────────────────────
  // Utilise les vraies coordonnées des zones assignées à l'équipe
  // (Neighbourhood.latitude/longitude côté backend, cf. team.zones[].lat/lng).
  // Une équipe sans zone géolocalisée n'affiche simplement aucun marqueur —
  // pas de position inventée.
  private _initMap(): void {
    const el = document.getElementById('td-map');
    if (!el || this._map) return;

    this._map = L.map(el, {
      center:             [12.3714, -1.5197], // Ouagadougou, utilisé seulement si aucune équipe n'a de position réelle
      zoom:               12,
      zoomControl:        true,
      attributionControl: false,
    });

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      { maxZoom: 19, subdomains: 'abcd' }
    ).addTo(this._map);

    this._refreshMapMarkers();
  }

  private _refreshMapMarkers(): void {
    if (!this._map) return;
    this._markers.forEach(m => m.remove());
    this._markers.clear();

    const points: L.LatLngExpression[] = [];
    this.svc.teams().forEach(t => {
      const pos = this._teamLatLng(t);
      if (!pos) return;
      points.push(pos);
      const m = L.marker(pos, { icon: this._divIcon(t.status), title: t.name })
        .addTo(this._map!)
        .bindPopup(this._popup(t), { className: 'td-leaflet-popup' });
      this._markers.set(t.id, m);
    });

    if (points.length > 1) this._map.fitBounds(L.latLngBounds(points), { padding: [30, 30] });
  }

  /** Centroïde des zones réelles de l'équipe, ou null si aucune zone n'a de coordonnées connues. */
  private _teamLatLng(team: Team): L.LatLngExpression | null {
    const zones = team.zones.filter((z): z is typeof z & { lat: number; lng: number } =>
      z.lat != null && z.lng != null
    );
    if (!zones.length) return null;
    const lat = zones.reduce((s, z) => s + z.lat, 0) / zones.length;
    const lng = zones.reduce((s, z) => s + z.lng, 0) / zones.length;
    return [lat, lng];
  }

  private _divIcon(status: string): L.DivIcon {
    const clr  = this.statusColor(status);
    const pulse = status === 'on_mission' || status === 'active';
    return L.divIcon({
      html: `<div class="td-pin${pulse ? ' td-pin--pulse' : ''}" style="--pc:${clr}"></div>`,
      className: '',
      iconSize:   [20, 20],
      iconAnchor: [10, 10],
    });
  }

  private _popup(t: Team): string {
    const clr = this.statusColor(t.status);
    return `
      <div class="td-popup">
        <div class="tdp-name">${t.name}</div>
        <div class="tdp-status" style="color:${clr}">${this.statusLabel(t.status)}</div>
        <div class="tdp-meta">
          <span>${t.members.length} membres</span>
          <span>Perf ${t.successRate}%</span>
          <span>Charge ${t.workload}%</span>
        </div>
      </div>`;
  }

  // ── Charts (les 4 sont désormais calculés à partir de données réelles) ────
  private _initCharts(): void {
    const dark = this.darkMode();
    Chart.defaults.color       = dark ? '#94a3b8' : '#475569';
    Chart.defaults.borderColor = dark ? '#334155' : '#e2e8f0';
    this._charts = [
      this._workloadChart(),
      this._perfChart(),
      this._execChart(),
      this._zonesChart(),
    ];
  }

  /** Recrée les 4 graphiques (plus simple et plus sûr que de muter leurs datasets un par un). */
  private _updateCharts(): void {
    this._charts.forEach(c => c.destroy());
    this._initCharts();
  }

  /** Charge actuelle réelle par équipe (remplace l'ancienne tendance hebdomadaire fabriquée). */
  private _workloadChart(): Chart {
    const teams = this.svc.teams();
    return new Chart(this.chartWeeklyRef.nativeElement, {
      type: 'bar',
      data: {
        labels: teams.map(t => t.name.replace(/équipe\s*/i, '').trim().slice(0, 10)),
        datasets: [{
          label: 'Charge actuelle',
          data: teams.map(t => t.workload),
          backgroundColor: teams.map(t => this.workloadColor(t.workload) + '55'),
          borderColor:     teams.map(t => this.workloadColor(t.workload)),
          borderWidth: 1.5,
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          y: { max: 100, ticks: { callback: v => v + '%', font: { size: 10 } } },
        },
      },
    });
  }

  private _perfChart(): Chart {
    const teams = this.svc.teams().slice(0, 7);
    return new Chart(this.chartPerfRef.nativeElement, {
      type: 'bar',
      data: {
        labels: teams.map(t => t.name.replace(/équipe\s*/i, '').trim().slice(0, 10)),
        datasets: [{
          label: 'Taux réussite',
          data: teams.map(t => t.successRate),
          backgroundColor: teams.map(t => this.statusColor(t.status) + '55'),
          borderColor:     teams.map(t => this.statusColor(t.status)),
          borderWidth: 1.5,
          borderRadius: 4,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { max: 100, ticks: { callback: v => v + '%', font: { size: 10 } } },
          y: { grid: { display: false }, ticks: { font: { size: 10 } } },
        },
      },
    });
  }

  private _execChart(): Chart {
    const k    = this.kpis();
    const done = k.active + k.onMission;
    const rest = Math.max(k.total - done, 0);
    return new Chart(this.chartExecRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['En service', 'Hors service'],
        datasets: [{
          data: [done, rest],
          backgroundColor: ['#16a34a', '#1e293b'],
          borderColor:     ['#16a34a', '#334155'],
          borderWidth: 2,
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '74%',
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, padding: 10, font: { size: 11 } } },
          tooltip: { callbacks: { label: ctx => ` ${ctx.parsed} équipe(s)` } },
        },
      },
    });
  }

  private _zonesChart(): Chart {
    const zoneLoad: Record<string, number> = {};
    this.svc.teams().forEach(t => {
      const z = t.zones[0]?.name ?? 'Sans zone';
      zoneLoad[z] = (zoneLoad[z] ?? 0) + (t.workload > 65 ? 1 : 0);
    });
    const labels = Object.keys(zoneLoad).slice(0, 6);
    const data   = labels.map(l => zoneLoad[l]);
    const palette = ['#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#16a34a', '#ec4899'];
    return new Chart(this.chartZonesRef.nativeElement, {
      type: 'polarArea',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: palette.map(c => c + '88'),
          borderColor:     palette,
          borderWidth: 1.5,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { r: { ticks: { display: false }, grid: { color: '#33415566' } } },
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 10, padding: 8, font: { size: 10 } } },
        },
      },
    });
  }

  // ── Données dérivées réelles ────────────────────────────────
  // Il n'existe aucun journal d'événements côté backend pour les équipes : on ne
  // construit donc que ce que les données réelles permettent d'affirmer
  // honnêtement (dates de création/mise à jour, seuils sur l'état actuel).
  private _buildDerivedData(): void {
    const teams = this.svc.teams();

    // Activités récentes = faits réels horodatés (création / dernière modification).
    const events: Activity[] = [];
    teams.forEach(t => {
      events.push({
        id: `c-${t.id}`, icon: 'add_circle', color: '#3b82f6',
        title: 'Équipe créée', sub: t.name, time: new Date(t.createdAt),
      });
      if (t.updatedAt && t.updatedAt !== t.createdAt) {
        events.push({
          id: `u-${t.id}`, icon: 'verified', color: '#8b5cf6',
          title: 'Équipe mise à jour', sub: t.name, time: new Date(t.updatedAt),
        });
      }
    });
    events.sort((a, b) => b.time.getTime() - a.time.getTime());
    this.activities.set(events.slice(0, 15));

    // Alertes opérationnelles réelles, dérivées de l'état actuel des équipes.
    const ops: OpsAlert[] = [];
    teams.forEach(t => {
      if (t.workload > 85) {
        ops.push({
          id: `w-${t.id}`, sev: 'critical', title: 'Surcharge de travail',
          body: `${t.name} est à ${t.workload}% de charge`, time: new Date(t.updatedAt),
        });
      }
      if (t.status === 'maintenance') {
        ops.push({
          id: `m-${t.id}`, sev: 'warning', title: 'Équipe en maintenance',
          body: `${t.name} est indisponible (maintenance)`, time: new Date(t.updatedAt),
        });
      }
      if (t.members.length === 0) {
        ops.push({
          id: `e-${t.id}`, sev: 'info', title: 'Équipe sans membre',
          body: `${t.name} n'a aucun membre assigné`, time: new Date(t.updatedAt),
        });
      }
    });
    ops.sort((a, b) => b.time.getTime() - a.time.getTime());
    this.notifs.set(ops);

    // Alertes véhicules réelles (statut maintenance/hors service, carburant bas si connu).
    const veh: MaintAlert[] = [];
    this.svc.availableVehicles().forEach(v => {
      const lastRevision = v.lastMaintenance
        ? new Date(v.lastMaintenance).toLocaleDateString('fr-FR')
        : 'date inconnue';
      if (v.status === 'hors_service') {
        veh.push({ id: `vh-${v.id}`, kind: 'vehicle', sev: 'critical', title: 'Véhicule hors service', detail: `${v.plate} · ${v.model}`, due: `Révisé le ${lastRevision}` });
      } else if (v.status === 'maintenance') {
        veh.push({ id: `vm-${v.id}`, kind: 'vehicle', sev: 'warning', title: 'Véhicule en maintenance', detail: `${v.plate} · ${v.model}`, due: `Révisé le ${lastRevision}` });
      }
      if (v.fuelLevel != null && v.fuelLevel <= 20 && v.status !== 'hors_service') {
        veh.push({ id: `vf-${v.id}`, kind: 'vehicle', sev: 'warning', title: 'Carburant faible', detail: `${v.plate} · ${v.fuelLevel}% restant`, due: '—' });
      }
    });
    this.maintAlerts.set(veh);
  }

  // ── Template helpers ──────────────────────────────────────
  statusColor(s: string): string {
    return ({
      active: '#16a34a', on_mission: '#f59e0b',
      maintenance: '#ef4444', inactive: '#94a3b8',
    } as Record<string, string>)[s] ?? '#64748b';
  }

  statusLabel(s: string): string {
    return ({
      active: 'Active', on_mission: 'En mission',
      maintenance: 'Maintenance', inactive: 'Inactive',
    } as Record<string, string>)[s] ?? s;
  }

  sevColor(s: string): string {
    return ({ critical:'#ef4444', warning:'#f59e0b', info:'#3b82f6', success:'#16a34a' } as Record<string,string>)[s] ?? '#64748b';
  }

  sevIcon(s: string): string {
    return ({ critical:'error', warning:'warning_amber', info:'info', success:'check_circle' } as Record<string,string>)[s] ?? 'notifications';
  }

  sevLabel(s: string): string {
    return ({ critical:'Critique', warning:'Attention', info:'Info', success:'Succès' } as Record<string,string>)[s] ?? s;
  }

  timeAgo(d: Date): string {
    const diff = (Date.now() - d.getTime()) / 60_000;
    if (diff < 1)   return 'À l\'instant';
    if (diff < 60)  return `${Math.round(diff)}min`;
    if (diff < 1440) return `${Math.round(diff / 60)}h`;
    return `${Math.round(diff / 1440)}j`;
  }

  workloadColor(w: number): string {
    if (w >= 80) return '#ef4444';
    if (w >= 55) return '#f59e0b';
    return '#16a34a';
  }

  perfOffset(r: number): number { return 100.53 * (1 - r / 100); }

  primaryZone(t: Team): string {
    return t.zones[0]?.name ?? '—';
  }
}
