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
interface LiveNotif {
  id: string;
  sev: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  body: string;
  time: Date;
  read: boolean;
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
  refreshing  = signal(false);
  activeTab   = signal<'activity' | 'notifs' | 'alerts'>('activity');

  activities  = signal<Activity[]>([]);
  notifs      = signal<LiveNotif[]>([]);
  maintAlerts = signal<MaintAlert[]>([]);

  unreadCount = computed(() => this.notifs().filter(n => !n.read).length);

  // ── KPI metrics ───────────────────────────────────────────
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
  private _activityTimer?: ReturnType<typeof setInterval>;

  constructor() {
    // Sync chart theme whenever darkMode flips
    effect(() => {
      const dark = this.darkMode();
      Chart.defaults.color       = dark ? '#94a3b8' : '#475569';
      Chart.defaults.borderColor = dark ? '#334155' : '#e2e8f0';
      this._charts.forEach(c => c.update());
    });
  }

  ngOnInit(): void {
    this._generateMockData();
    this._clockTimer    = setInterval(() => this.currentTime.set(new Date()), 1_000);
    this._activityTimer = setInterval(() => this._pushLiveActivity(), 30_000);
  }

  ngAfterViewInit(): void {
    // defer to let the DOM settle (map div must exist)
    setTimeout(() => {
      this._initMap();
      this._initCharts();
    }, 80);
  }

  ngOnDestroy(): void {
    clearInterval(this._clockTimer);
    clearInterval(this._activityTimer);
    this._charts.forEach(c => c.destroy());
    this._map?.remove();
  }

  // ── Actions ───────────────────────────────────────────────
  refresh(): void {
    this.refreshing.set(true);
    setTimeout(() => {
      this._pushLiveActivity();
      this._charts.forEach(c => c.update());
      this.refreshing.set(false);
      this.msg.add({ severity: 'success', summary: 'Actualisé', detail: 'Données mises à jour' });
    }, 900);
  }

  toggleDark(): void { this.darkMode.update(d => !d); }

  markAllRead(): void {
    this.notifs.update(list => list.map(n => ({ ...n, read: true })));
  }

  dismissAlert(id: string): void {
    this.maintAlerts.update(list => list.filter(a => a.id !== id));
  }

  // ── Map ───────────────────────────────────────────────────
  private _initMap(): void {
    const el = document.getElementById('td-map');
    if (!el || this._map) return;

    this._map = L.map(el, {
      center:             [14.6937, -17.4441],
      zoom:               12,
      zoomControl:        true,
      attributionControl: false,
    });

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      { maxZoom: 19, subdomains: 'abcd' }
    ).addTo(this._map);

    this.svc.teams().forEach(t => {
      const m = L.marker(this._latLng(t), { icon: this._divIcon(t.status), title: t.name })
        .addTo(this._map!)
        .bindPopup(this._popup(t), { className: 'td-leaflet-popup' });
      this._markers.set(t.id, m);
    });
  }

  private _latLng(team: Team): L.LatLngExpression {
    const seed = team.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
    return [14.6937 + ((seed % 100) - 50) / 500, -17.4441 + ((seed % 73) - 36) / 500];
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

  // ── Charts ────────────────────────────────────────────────
  private _initCharts(): void {
    const dark = this.darkMode();
    Chart.defaults.color       = dark ? '#94a3b8' : '#475569';
    Chart.defaults.borderColor = dark ? '#334155' : '#e2e8f0';
    this._charts = [
      this._weeklyChart(),
      this._perfChart(),
      this._execChart(),
      this._zonesChart(),
    ];
  }

  private _weeklyChart(): Chart {
    const teams = this.svc.teams();
    const seed  = (i: number, base = 0) => Math.min(100, Math.max(0, (teams[i % teams.length]?.workload ?? 50) + base));
    return new Chart(this.chartWeeklyRef.nativeElement, {
      type: 'bar',
      data: {
        labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
        datasets: [
          {
            label: 'En mission',
            data: [seed(0), seed(1, 5), seed(2), seed(3, 10), seed(4), seed(5, -15), seed(6, -25)],
            backgroundColor: '#16a34a55',
            borderColor: '#16a34a',
            borderWidth: 1.5,
            borderRadius: 4,
          },
          {
            label: 'Maintenance',
            data: [10, 8, 12, 5, 9, 14, 6],
            backgroundColor: '#ef444455',
            borderColor: '#ef4444',
            borderWidth: 1.5,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 10, font: { size: 11 } } } },
        scales: {
          x: { grid: { display: false } },
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
      const z = t.zones[0]?.name?.split('–')[0]?.trim() ?? 'Autre';
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

  // ── Mock data ─────────────────────────────────────────────
  private _generateMockData(): void {
    const teams = this.svc.teams();
    const now   = new Date();
    const ago   = (m: number) => new Date(now.getTime() - m * 60_000);

    this.activities.set([
      { id: 'a1', icon: 'play_circle',   color: '#16a34a', title: 'Tournée démarrée',       sub: teams[0]?.name ?? 'Équipe Alpha',   time: ago(4)  },
      { id: 'a2', icon: 'check_circle',  color: '#3b82f6', title: 'Collecte terminée',       sub: 'Zone Nord · 14 points',            time: ago(17) },
      { id: 'a3', icon: 'warning',       color: '#f59e0b', title: 'Incident signalé',        sub: teams[1]?.name ?? 'Équipe Bravo',   time: ago(31) },
      { id: 'a4', icon: 'local_shipping',color: '#8b5cf6', title: 'Véhicule déployé',        sub: 'AA-123-DK',                        time: ago(44) },
      { id: 'a5', icon: 'person_add',    color: '#16a34a', title: 'Membre rejoint',           sub: teams[2]?.name ?? 'Équipe Charlie', time: ago(61) },
      { id: 'a6', icon: 'build',         color: '#ef4444', title: 'Maintenance planifiée',   sub: teams[3]?.name ?? 'Équipe Delta',   time: ago(88) },
      { id: 'a7', icon: 'route',         color: '#06b6d4', title: 'Nouveau trajet assigné',  sub: teams[4]?.name ?? 'Équipe Echo',    time: ago(105)},
      { id: 'a8', icon: 'gps_fixed',     color: '#94a3b8', title: 'Position mise à jour',    sub: teams[0]?.name ?? 'Équipe Alpha',   time: ago(122)},
    ]);

    this.notifs.set([
      { id: 'n1', sev: 'critical', title: 'Surcharge critique',    body: `${teams[0]?.name ?? 'Équipe A'} dépasse 90% de capacité`,  time: ago(7),  read: false },
      { id: 'n2', sev: 'warning',  title: 'Retard mission',        body: 'Retard de 25 min · Zone Est',                             time: ago(21), read: false },
      { id: 'n3', sev: 'warning',  title: 'Carburant faible',      body: 'Véhicule AB-456-DK sous 20%',                            time: ago(38), read: false },
      { id: 'n4', sev: 'info',     title: 'Affectation modifiée',  body: `${teams[1]?.name ?? 'Équipe B'} → Secteur 4`,             time: ago(55), read: true  },
      { id: 'n5', sev: 'success',  title: 'Objectif matinal atteint', body: '100% de collectes effectuées avant 10h',               time: ago(72), read: true  },
      { id: 'n6', sev: 'info',     title: 'Rapport généré',        body: 'Rapport hebdomadaire disponible',                         time: ago(95), read: true  },
    ]);

    const veh = this.svc.availableVehicles();
    this.maintAlerts.set([
      { id: 'm1', kind: 'vehicle', sev: 'critical', title: 'Révision obligatoire',    detail: `${veh[0]?.plate ?? 'AA-001-DK'} · 120 000 km atteints`,   due: "Aujourd'hui" },
      { id: 'm2', kind: 'vehicle', sev: 'warning',  title: 'Contrôle technique',      detail: `${veh[1]?.plate ?? 'AB-789-DK'} · Échéance dans 3 jours`,  due: 'Dans 3j'    },
      { id: 'm3', kind: 'team',    sev: 'warning',  title: 'Formation requise',        detail: `${teams[1]?.name ?? 'Équipe B'} · Certification expirée`,  due: 'Dans 7j'    },
      { id: 'm4', kind: 'vehicle', sev: 'info',     title: 'Vidange planifiée',        detail: `${veh[2]?.plate ?? 'AC-234-DK'} · Kilométrage atteint`,    due: 'Dans 14j'   },
    ]);
  }

  private _pushLiveActivity(): void {
    const templates = [
      { icon: 'sync',         color: '#3b82f6', title: 'Rapport reçu'         },
      { icon: 'gps_fixed',    color: '#06b6d4', title: 'Position mise à jour' },
      { icon: 'route',        color: '#8b5cf6', title: 'Trajet recalculé'     },
      { icon: 'recycling',    color: '#16a34a', title: 'Collecte signalée'    },
      { icon: 'speed',        color: '#f59e0b', title: 'Alerte vitesse'       },
    ];
    const t   = templates[Math.floor(Math.random() * templates.length)];
    const teams = this.svc.teams();
    const team  = teams[Math.floor(Math.random() * teams.length)];
    this.activities.update(list => [
      { id: `a-${Date.now()}`, ...t, sub: team?.name ?? 'Équipe', time: new Date() },
      ...list,
    ].slice(0, 25));
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
    return t.zones[0]?.name?.split('–').at(0)?.trim() ?? '—';
  }
}
