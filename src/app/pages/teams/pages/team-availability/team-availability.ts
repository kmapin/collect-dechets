import {
  Component, OnInit, OnDestroy, inject, signal, computed, effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventInput, EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import frLocale from '@fullcalendar/core/locales/fr';
import { TeamService } from '../../services/team.service';
import { Team, TeamStatus } from '../../models/team.model';

// ── Local types ──────────────────────────────────────────────────────
type AvailView = 'timeline' | 'calendar' | 'heatmap' | 'alertes';

interface TimeBlock {
  startH: number;
  endH:   number;
  status: TeamStatus | 'available';
  label:  string;
  zone?:  string;
}
interface TeamLine  { team: Team; blocks: TimeBlock[]; }
interface HeatCell  { day: number; hour: number; load: number; teams: number; }
interface ConflictAlert {
  id:       string;
  type:     'zone_overlap' | 'overload' | 'no_vehicle' | 'understaffed' | 'gap';
  severity: 'info' | 'warning' | 'critical';
  title:    string;
  desc:     string;
  teams:    string[];
  time:     string;
}

// ── Constants ────────────────────────────────────────────────────────
const H_START = 6;
const H_END   = 22;
const H_SPAN  = H_END - H_START;

const BLOCK_COLOR: Record<string, string> = {
  on_mission:  '#f59e0b',
  active:      '#16a34a',
  maintenance: '#ef4444',
  inactive:    '#94a3b8',
  available:   '#3b82f6',
};

const HEAT_DAYS  = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const HEAT_HOURS = Array.from({ length: H_SPAN }, (_, i) => i + H_START);

@Component({
  selector: 'app-team-availability',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatIconModule,
    TooltipModule, ToastModule, FullCalendarModule,
  ],
  providers: [MessageService],
  templateUrl: './team-availability.html',
  styleUrl:    './team-availability.scss',
})
export class TeamAvailability implements OnInit, OnDestroy {
  readonly router = inject(Router);
  readonly svc    = inject(TeamService);
  private  msg    = inject(MessageService);

  // ── View & time ───────────────────────────────────────────────────
  view        = signal<AvailView>('timeline');
  currentTime = signal(new Date());
  refreshing  = signal(false);

  // ── Filters ───────────────────────────────────────────────────────
  teamSearch    = signal('');
  statusFilter  = signal<TeamStatus | ''>('');
  zoneFilter    = signal('');
  vehicleFilter = signal<'all' | 'with' | 'without'>('all');
  selectedDate  = signal(new Date().toISOString().split('T')[0]);

  // ── Tooltip ───────────────────────────────────────────────────────
  tooltip = signal<{ block: TimeBlock; team: Team; x: number; y: number } | null>(null);

  // ── FullCalendar options ──────────────────────────────────────────
  calendarOpts = signal<CalendarOptions>({
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
    locale:  frLocale,
    initialView: 'timeGridWeek',
    headerToolbar: {
      left:   'prev,next today',
      center: 'title',
      right:  'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
    },
    slotMinTime: '06:00:00',
    slotMaxTime: '22:00:00',
    height:    540,
    allDaySlot: false,
    nowIndicator: true,
    slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
    eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
    events: [],
    eventClick: (info: EventClickArg) => this._onCalClick(info),
  });

  // ── Template constants ────────────────────────────────────────────
  readonly heatDays    = HEAT_DAYS;
  readonly heatHours   = HEAT_HOURS;
  readonly tlHours     = HEAT_HOURS;

  readonly views: { key: AvailView; label: string; icon: string }[] = [
    { key: 'timeline', label: 'Timeline',   icon: 'view_timeline'  },
    { key: 'calendar', label: 'Calendrier', icon: 'calendar_month' },
    { key: 'heatmap',  label: 'Heatmap',    icon: 'grid_on'        },
    { key: 'alertes',  label: 'Alertes',    icon: 'warning_amber'  },
  ];

  readonly statusOpts: { val: TeamStatus | ''; lbl: string; clr: string; ico: string }[] = [
    { val: '',            lbl: 'Tous',        clr: '#64748b', ico: 'circle'                },
    { val: 'active',      lbl: 'Disponible',  clr: '#16a34a', ico: 'check_circle'          },
    { val: 'on_mission',  lbl: 'En mission',  clr: '#f59e0b', ico: 'directions_run'        },
    { val: 'maintenance', lbl: 'Maintenance', clr: '#ef4444', ico: 'build'                 },
    { val: 'inactive',    lbl: 'Hors ligne',  clr: '#94a3b8', ico: 'radio_button_unchecked'},
  ];

  // ── Computed ──────────────────────────────────────────────────────
  filteredTeams = computed(() => {
    let list = this.svc.teams();
    const q = this.teamSearch().toLowerCase().trim();
    if (q) list = list.filter(t => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q));
    const s = this.statusFilter();
    if (s) list = list.filter(t => t.status === s);
    const z = this.zoneFilter();
    if (z) list = list.filter(t => t.zones.some(zn => zn.ville === z));
    const v = this.vehicleFilter();
    if (v === 'with')    list = list.filter(t => !!t.vehicle);
    if (v === 'without') list = list.filter(t => !t.vehicle);
    return list;
  });

  statusCounts = computed(() => {
    const all     = this.svc.teams();
    const active  = all.filter(t => t.status === 'active').length;
    const mission = all.filter(t => t.status === 'on_mission').length;
    return {
      total:       all.length,
      active,
      on_mission:  mission,
      maintenance: all.filter(t => t.status === 'maintenance').length,
      inactive:    all.filter(t => t.status === 'inactive').length,
      coverage:    all.length ? Math.round((active + mission) / all.length * 100) : 0,
    };
  });

  allZones = computed(() => {
    const villes = new Set<string>();
    this.svc.teams().forEach(t => t.zones.forEach(z => villes.add(z.ville)));
    return [...villes].sort();
  });

  timeline = computed((): TeamLine[] =>
    this.filteredTeams().map(team => ({ team, blocks: this._buildBlocks(team) }))
  );

  nowLeft = computed(() => {
    const now = this.currentTime();
    const h = now.getHours() + now.getMinutes() / 60;
    if (h < H_START || h > H_END) return -1;
    return (h - H_START) / H_SPAN * 100;
  });

  heatGrid = computed((): HeatCell[][] => {
    const teams = this.filteredTeams();
    const n = Math.max(1, teams.length);
    return HEAT_HOURS.map(hour =>
      Array.from({ length: 7 }, (_, day) => {
        const active = this._teamsActiveAt(teams, day, hour);
        return { day, hour, load: Math.round(active / n * 100), teams: active };
      })
    );
  });

  conflicts = computed((): ConflictAlert[] => this._buildConflicts());

  conflictCounts = computed(() => ({
    critical: this.conflicts().filter(c => c.severity === 'critical').length,
    warning:  this.conflicts().filter(c => c.severity === 'warning').length,
    info:     this.conflicts().filter(c => c.severity === 'info').length,
    total:    this.conflicts().length,
  }));

  private _timer?: ReturnType<typeof setInterval>;

  constructor() {
    // Sync calendar events whenever filters change
    effect(() => {
      const events = this._buildCalendarEvents();
      this.calendarOpts.update(o => ({ ...o, events }));
    });
  }

  ngOnInit():    void { this._timer = setInterval(() => this.currentTime.set(new Date()), 30_000); }
  ngOnDestroy(): void { clearInterval(this._timer); }

  // ── Actions ───────────────────────────────────────────────────────
  setView(v: AvailView): void { this.view.set(v); }

  refresh(): void {
    this.refreshing.set(true);
    this.currentTime.set(new Date());
    setTimeout(() => this.refreshing.set(false), 800);
  }

  showTooltip(block: TimeBlock, team: Team, e: MouseEvent): void {
    this.tooltip.set({ block, team, x: e.clientX, y: e.clientY });
  }
  hideTooltip(): void { this.tooltip.set(null); }

  toggleStatus(s: TeamStatus | ''): void {
    this.statusFilter.set(this.statusFilter() === s ? '' : s);
  }

  // ── Timeline helpers ──────────────────────────────────────────────
  blockLeft(b: TimeBlock):  number { return (b.startH - H_START) / H_SPAN * 100; }
  blockWidth(b: TimeBlock): number { return (b.endH - b.startH)  / H_SPAN * 100; }
  blockColor(s: string):    string { return BLOCK_COLOR[s] ?? '#94a3b8'; }
  blockBg(s: string):       string { return (BLOCK_COLOR[s] ?? '#94a3b8') + '1e'; }
  isNowHour(h: number):    boolean { return this.currentTime().getHours() === h; }
  fmtH(h: number):          string { return `${String(h).padStart(2, '0')}h`; }

  // ── Heatmap helpers ───────────────────────────────────────────────
  heatColor(load: number): string {
    if (load === 0) return '#f8fafc';
    const t = load / 100;
    const r = Math.round(220 + (21  - 220) * t);
    const g = Math.round(252 + (128 - 252) * t);
    const b = Math.round(231 + (61  - 231) * t);
    return `rgb(${r},${g},${b})`;
  }
  heatFg(load: number):     string { return load > 55 ? '#fff' : '#0f172a'; }
  heatTip(c: HeatCell):     string {
    return `${HEAT_DAYS[c.day]} ${c.hour}h · ${c.teams} équipe(s) · ${c.load}%`;
  }

  // ── Alert helpers ─────────────────────────────────────────────────
  sevColor(s: string): string {
    return ({ critical:'#ef4444', warning:'#f59e0b', info:'#3b82f6' } as Record<string,string>)[s] ?? '#94a3b8';
  }
  sevIcon(s: string):  string {
    return ({ critical:'error', warning:'warning', info:'info' } as Record<string,string>)[s] ?? 'help';
  }
  sevLabel(s: string): string {
    return ({ critical:'Critique', warning:'Attention', info:'Info' } as Record<string,string>)[s] ?? s;
  }
  conflictIcon(t: string): string {
    return ({
      zone_overlap: 'location_on',
      overload:     'bolt',
      no_vehicle:   'local_shipping',
      understaffed: 'group',
      gap:          'schedule',
    } as Record<string,string>)[t] ?? 'report';
  }

  // ── Status helpers ────────────────────────────────────────────────
  statusColor(s: string): string {
    return ({ active:'#16a34a', inactive:'#94a3b8', on_mission:'#f59e0b', maintenance:'#ef4444' } as Record<string,string>)[s] ?? '#64748b';
  }
  statusLabel(s: string): string {
    return ({ active:'Disponible', inactive:'Hors ligne', on_mission:'En mission', maintenance:'Maintenance' } as Record<string,string>)[s] ?? s;
  }
  teamInitials(name: string): string {
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase();
  }

  // ── Private: data generation ──────────────────────────────────────
  private _buildBlocks(team: Team): TimeBlock[] {
    const seed = team.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
    const zone = team.zones[0]?.name?.split('–')[0]?.trim() ?? '';

    if (team.status === 'maintenance') return [{ startH: H_START, endH: H_END, status: 'maintenance', label: 'Maintenance' }];
    if (team.status === 'inactive')    return [{ startH: H_START, endH: H_END, status: 'inactive',    label: 'Hors service' }];

    const blocks: TimeBlock[] = [];

    if (team.status === 'on_mission') {
      const mS = H_START + (seed % 3);
      const mE = Math.min(mS + 3 + (seed % 5), 19);
      if (mS > H_START) blocks.push({ startH: H_START, endH: mS, status: 'active', label: 'Disponible' });
      blocks.push({ startH: mS, endH: mE, status: 'on_mission', label: zone || 'Mission en cours', zone });
      if (mE < H_END)   blocks.push({ startH: mE,    endH: H_END, status: 'active', label: 'Disponible' });
    } else {
      const hasPlanned = (seed % 3) !== 0;
      if (!hasPlanned) {
        blocks.push({ startH: H_START, endH: H_END, status: 'active', label: 'Disponible' });
      } else {
        const pS = H_START + 1 + (seed % 3);
        const pE = Math.min(pS + 4 + (seed % 4), 20);
        blocks.push({ startH: H_START, endH: pS, status: 'active', label: 'Disponible' });
        blocks.push({ startH: pS, endH: pE, status: 'on_mission', label: `Planifié – ${zone}`, zone });
        if (pE < H_END) blocks.push({ startH: pE, endH: H_END, status: 'active', label: 'Disponible' });
      }
    }
    return blocks;
  }

  private _teamsActiveAt(teams: Team[], day: number, hour: number): number {
    const base    = teams.filter(t => t.status === 'active' || t.status === 'on_mission').length;
    const rush    = (hour >= 7 && hour <= 10) || (hour >= 14 && hour <= 17) ? 1 : 0;
    const weekend = day >= 5 ? -Math.ceil(base * 0.55) : 0;
    const noon    = (hour >= 12 && hour <= 13) ? -1 : 0;
    return Math.max(0, Math.min(teams.length, base + rush + weekend + noon));
  }

  private _buildCalendarEvents(): EventInput[] {
    const events: EventInput[] = [];
    const today  = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    this.filteredTeams().forEach(team => {
      const seed   = team.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
      const blocks = this._buildBlocks(team);

      blocks.forEach(block => {
        if (block.status !== 'on_mission' && block.status !== 'maintenance') return;
        const days = block.status === 'maintenance'
          ? [0, 1, 2, 3, 4]
          : [0, 1, 2, 3, 4].filter((_, i) => (seed + i) % 3 !== 0);

        days.forEach(d => {
          const start = new Date(monday); start.setDate(monday.getDate() + d); start.setHours(block.startH, 0, 0, 0);
          const end   = new Date(start);  end.setHours(block.endH, 0, 0, 0);
          events.push({
            id: `${team.id}-${d}-${block.startH}`,
            title: team.name,
            start, end,
            backgroundColor: team.color + 'cc',
            borderColor:     team.color,
            textColor: '#fff',
            extendedProps: { team, block },
          });
        });
      });
    });
    return events;
  }

  private _buildConflicts(): ConflictAlert[] {
    const teams     = this.svc.teams();
    const conflicts: ConflictAlert[] = [];

    // Zone overlaps (two on_mission teams in same zone)
    const zoneMap = new Map<string, Team[]>();
    teams.filter(t => t.status === 'on_mission').forEach(t => {
      t.zones.forEach(z => {
        if (!zoneMap.has(z.id)) zoneMap.set(z.id, []);
        zoneMap.get(z.id)!.push(t);
      });
    });
    zoneMap.forEach(ts => {
      if (ts.length < 2) return;
      const zone = ts[0].zones[0]?.name?.split('–')[0]?.trim() ?? 'Zone';
      conflicts.push({ id: `zo-${ts.map(t => t.id).join('-')}`, type: 'zone_overlap', severity: 'warning',
        title: 'Chevauchement de zone',
        desc:  `${ts.length} équipes affectées simultanément sur ${zone}`,
        teams: ts.map(t => t.name), time: 'Maintenant' });
    });

    // Overload > 85%
    teams.filter(t => t.workload >= 85).forEach(t => {
      conflicts.push({ id: `ov-${t.id}`, type: 'overload',
        severity: t.workload >= 95 ? 'critical' : 'warning',
        title: 'Surcharge de travail',
        desc:  `${t.name} est à ${t.workload}% de charge (seuil critique : 85%)`,
        teams: [t.name], time: "Aujourd'hui" });
    });

    // Active/mission teams without vehicle
    teams.filter(t => (t.status === 'active' || t.status === 'on_mission') && !t.vehicle).forEach(t => {
      conflicts.push({ id: `nv-${t.id}`, type: 'no_vehicle', severity: 'warning',
        title: 'Aucun véhicule affecté',
        desc:  `${t.name} est opérationnelle sans véhicule assigné`,
        teams: [t.name], time: 'Maintenant' });
    });

    // Understaffed (< 2 members)
    teams.filter(t => t.status !== 'inactive' && t.members.length < 2).forEach(t => {
      conflicts.push({ id: `us-${t.id}`, type: 'understaffed', severity: 'info',
        title: 'Effectif insuffisant',
        desc:  `${t.name} n'a que ${t.members.length} membre(s) (minimum recommandé : 2)`,
        teams: [t.name], time: "Aujourd'hui" });
    });

    // City with no coverage
    const coveredCities = new Set(
      teams.filter(t => t.status === 'active' || t.status === 'on_mission')
           .flatMap(t => t.zones.map(z => z.ville))
    );
    const allCities = new Set(teams.flatMap(t => t.zones.map(z => z.ville)));
    allCities.forEach(city => {
      if (!coveredCities.has(city)) {
        conflicts.push({ id: `gap-${city}`, type: 'gap', severity: 'info',
          title: 'Zone non couverte',
          desc:  `Aucune équipe disponible sur ${city}`,
          teams: [], time: 'Maintenant' });
      }
    });

    return conflicts.sort((a, b) => {
      const o: Record<string, number> = { critical: 0, warning: 1, info: 2 };
      return o[a.severity] - o[b.severity];
    });
  }

  private _onCalClick(info: EventClickArg): void {
    const team  = info.event.extendedProps['team']  as Team;
    const block = info.event.extendedProps['block'] as TimeBlock;
    this.msg.add({ severity: 'info', summary: team.name,
      detail: `${block.label} · ${this.fmtH(block.startH)} – ${this.fmtH(block.endH)}` });
  }
}
