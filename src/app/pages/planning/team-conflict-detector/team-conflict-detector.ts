import {
  Component, Input, Output, EventEmitter,
  signal, computed, OnChanges, SimpleChanges,
  ChangeDetectionStrategy, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TimelineModule } from 'primeng/timeline';
import { TooltipModule } from 'primeng/tooltip';
import { ChartModule } from 'primeng/chart';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { PlanningService } from '../services/planning.service';
import { TeamApi, ConflictResult, SuggestionResult } from '../models/planning.model';

// ── Types ──────────────────────────────────────────────────────
export type TeamStatus      = 'disponible' | 'en_service' | 'indisponible';
export type ConflictSeverity = 'critical' | 'warning' | 'info';
export type ConflictKind     = 'schedule' | 'vehicle' | 'overload' | 'maintenance';

export interface TeamConflict {
  kind:        ConflictKind;
  severity:    ConflictSeverity;
  message:     string;
  detail?:     string;
  suggestion?: string;
}

export interface AlertEvent {
  teamName: string;
  icon:     string;
  color:    string;
  title:    string;
  detail:   string;
  severity: ConflictSeverity;
}

export interface Assignment {
  planningId: string;
  label:      string;
  startTime:  string;
  endTime:    string;
  type:       string;
  zone?:      string;
  color:      string;
}

export type VehicleStatus = 'ok' | 'maintenance' | 'unavailable';

// ── UI team model (mapped from TeamApi) ─────────────────────────
interface UITeam {
  id:              string;
  name:            string;
  initials:        string;
  color:           string;          // couleur V2 de l'équipe
  membersCount:    number;
  supervisor:      string;
  status:          TeamStatus;
  vehicleStatus:   VehicleStatus;
  vehicle:         string;
  workloadPercent: number;
  successRate:     number;
  zones:           string[];
  assignments:     Assignment[];
  conflicts:       TeamConflict[];
  isSuggested:     boolean;
}

// ── Component ──────────────────────────────────────────────────
@Component({
  selector: 'app-team-conflict-detector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, TimelineModule, TooltipModule, ChartModule, TagModule, SkeletonModule],
  templateUrl: './team-conflict-detector.html',
  styleUrl:    './team-conflict-detector.scss',
})
export class TeamConflictDetectorComponent implements OnChanges {
  @Input() selectedDate:        Date | null = null;
  @Input() selectedTeamIds:     string[]    = [];
  @Input() newStartTime:        string      = '08:00';
  @Input() estimatedHouseholds: number      = 0;
  /**
   * Teams pre-loaded by the parent. Use a signal-backed setter so computed() is reactive
   * to changes on this @Input (plain @Input properties don't trigger signal computed).
   */
  @Input() set externalTeams(val: TeamApi[]) {
    this._externalTeamsSignal.set(val ?? []);
  }
  get externalTeams(): TeamApi[] { return this._externalTeamsSignal(); }

  @Output() teamsChange = new EventEmitter<string[]>();

  private svc = inject(PlanningService);

  // ── Internal signals ─────────────────────────────────────────
  private _externalTeamsSignal = signal<TeamApi[]>([]);

  date    = signal<Date | null>(null);
  teamIds = signal<string[]>([]);

  apiTeams           = signal<TeamApi[]>([]);
  apiConflicts       = signal<ConflictResult[]>([]);
  apiSuggestions     = signal<SuggestionResult[]>([]);
  isLoadingTeams     = signal(false);
  isCheckingConflicts = signal(false);

  // ── Timeline config ───────────────────────────────────────────
  readonly TL_START = 6;
  readonly TL_END   = 20;
  readonly TL_HOURS = Array.from({ length: this.TL_END - this.TL_START + 1 }, (_, i) => i + this.TL_START);

  // ── Computed – map API teams to UI model ──────────────────────
  allTeams = computed<UITeam[]>(() => {
    // Reactive to externalTeams (from parent signal) AND self-loaded apiTeams
    const external = this._externalTeamsSignal();
    const source   = external.length ? external : this.apiTeams();
    return source.map(t => this._mapTeam(t));
  });

  teamsEnriched = computed<UITeam[]>(() => {
    const ids      = this.teamIds();
    const apiCon   = this.apiConflicts();
    return this.allTeams().map(t => ({
      ...t,
      conflicts: ids.includes(t.id) ? this._mapApiConflicts(t.id, apiCon) : [],
    }));
  });

  selectedTeams  = computed<UITeam[]>(() => this.teamsEnriched().filter(t => this.teamIds().includes(t.id)));
  availableCount = computed<number>(() => this.allTeams().filter(t => t.status === 'disponible').length);
  inServiceCount = computed<number>(() => this.allTeams().filter(t => t.status === 'en_service').length);
  unavailCount   = computed<number>(() => this.allTeams().filter(t => t.status === 'indisponible').length);

  allConflicts  = computed<TeamConflict[]>(() => this.selectedTeams().flatMap(t => t.conflicts));
  criticalCount = computed<number>(() => this.allConflicts().filter(c => c.severity === 'critical').length);
  warningCount  = computed<number>(() => this.allConflicts().filter(c => c.severity === 'warning').length);

  suggestions = computed<string[]>(() => {
    const apiSug = this.apiSuggestions();
    if (apiSug.length) return apiSug.map(s => `${s.equipeName} est disponible (charge: ${s.workload}%)`);
    // Fallback local
    const out: string[] = [];
    const ids = this.teamIds();
    const free = this.teamsEnriched().find(t => !ids.includes(t.id) && t.status === 'disponible');
    if (this.criticalCount() > 0 && free) out.push(`${free.name} est libre — aucun conflit prévisible`);
    const overloaded = this.selectedTeams().filter(t => t.workloadPercent > 75);
    if (overloaded.length) out.push(`${overloaded[0].name} dépasse 75% de charge — envisager un remplacement`);
    return out;
  });

  alertEvents = computed<AlertEvent[]>(() => {
    const events: AlertEvent[] = [];
    for (const t of this.selectedTeams()) {
      for (const c of t.conflicts) {
        events.push({
          teamName: t.name,
          icon:     this._kindIcon(c.kind),
          color:    this._sevColor(c.severity),
          title:    c.message,
          detail:   c.detail ?? '',
          severity: c.severity,
        });
      }
    }
    for (const s of this.suggestions()) {
      events.push({ teamName: 'Suggestion', icon: 'lightbulb', color: '#3b82f6', title: s, detail: '', severity: 'info' });
    }
    return events;
  });

  countSuggested = computed<number>(() =>
    this.teamsEnriched().filter(t => t.isSuggested && t.status !== 'indisponible').length
  );

  estimatedDuration = computed<string>(() => {
    const n = this.teamIds().length || 1;
    const h = this.estimatedHouseholds;
    if (!h) return '--';
    const min = Math.ceil((h * 5) / n);
    const hh  = Math.floor(min / 60);
    const mm  = min % 60;
    return hh > 0 ? `${hh}h${String(mm).padStart(2, '0')}` : `${mm} min`;
  });

  workloadChartData = computed(() => ({
    labels: this.teamsEnriched().map(t => t.initials),
    datasets: [{
      label: 'Charge (%)',
      data:  this.teamsEnriched().map(t => t.workloadPercent),
      backgroundColor: this.teamsEnriched().map(t => this._loadColor(t.workloadPercent)),
      borderRadius: 8,
      borderSkipped: false,
    }],
  }));

  readonly workloadChartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (c: any) => ` ${c.raw}% charge` } },
    },
    scales: {
      x: { max: 100, grid: { color: 'rgba(0,0,0,.05)' }, ticks: { callback: (v: any) => v + '%', font: { size: 10 } } },
      y: { grid: { display: false }, ticks: { font: { size: 10 } } },
    },
  };

  // ── Lifecycle ─────────────────────────────────────────────────
  ngOnChanges(c: SimpleChanges): void {
    if (c['selectedDate']) this.date.set(this.selectedDate);

    if (c['selectedTeamIds']) {
      const inc = this.selectedTeamIds ?? [];
      const cur = this.teamIds();
      if (inc.length !== cur.length || inc.some(id => !cur.includes(id))) {
        this.teamIds.set([...inc]);
        this._checkConflicts();
      }
    }

    if (c['selectedDate'] && this.teamIds().length) {
      this._checkConflicts();
    }

    // Load teams from API if parent provided none and we haven't loaded yet
    if (!this._externalTeamsSignal().length && !this.apiTeams().length) {
      this._loadTeams();
    }
  }

  // ── Init load ─────────────────────────────────────────────────
  private _loadTeams(): void {
    if (this.externalTeams.length) return;
    this.isLoadingTeams.set(true);
    this.svc.getTeamsForAgency().subscribe({
      next:  teams => { this.apiTeams.set(teams); this.isLoadingTeams.set(false); },
      error: ()    => this.isLoadingTeams.set(false),
    });
  }

  private _checkConflicts(): void {
    const ids  = this.teamIds();
    const date = this.selectedDate;
    if (!ids.length || !date) { this.apiConflicts.set([]); this.apiSuggestions.set([]); return; }

    const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    this.isCheckingConflicts.set(true);
    this.svc.checkConflicts(dateStr, ids).subscribe({
      next: res => {
        this.apiConflicts.set(res.conflicts ?? []);
        this.apiSuggestions.set(res.suggestions ?? []);
        this.isCheckingConflicts.set(false);
      },
      error: () => this.isCheckingConflicts.set(false),
    });
  }

  // ── Actions ───────────────────────────────────────────────────
  toggleTeam(id: string): void {
    const t = this.allTeams().find(x => x.id === id);
    if (!t || t.status === 'indisponible') return;
    // Une seule équipe possible : bascule entre sélectionné et aucun
    const next = this.teamIds().includes(id) ? [] : [id];
    this.teamIds.set(next);
    this.teamsChange.emit(next);
    this._checkConflicts();
  }

  applySuggested(): void {
    const firstId = this.apiSuggestions()[0]?.equipeId
      ?? this.teamsEnriched().find(t => t.isSuggested && t.status !== 'indisponible')?.id;
    const next = firstId ? [firstId] : [];
    this.teamIds.set(next);
    this.teamsChange.emit(next);
  }

  isSelected(id: string):    boolean { return this.teamIds().includes(id); }
  isCritical(id: string):    boolean { return this.teamsEnriched().find(t => t.id === id)?.conflicts.some(c => c.severity === 'critical') ?? false; }
  isWarning(id: string):     boolean { return this.teamsEnriched().find(t => t.id === id)?.conflicts.some(c => c.severity === 'warning') ?? false; }
  teamConflicts(id: string): TeamConflict[] { return this.teamsEnriched().find(t => t.id === id)?.conflicts ?? []; }

  // ── Timeline helpers ──────────────────────────────────────────
  getLeft(startTime: string): number {
    const [h, m] = startTime.split(':').map(Number);
    return Math.max(0, ((h + m / 60 - this.TL_START) / (this.TL_END - this.TL_START)) * 100);
  }

  getWidth(startTime: string, endTime: string): number {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const dur = (eh + em / 60) - (sh + sm / 60);
    return Math.max(1, (dur / (this.TL_END - this.TL_START)) * 100);
  }

  getNewPlanningLeft(): number  { return this.getLeft(this.newStartTime || '08:00'); }
  getNewPlanningWidth(): number {
    const n   = this.teamIds().length || 1;
    const h   = this.estimatedHouseholds;
    if (!h) return 3;
    const dur = Math.ceil((h * 5) / n) / 60;
    return (dur / (this.TL_END - this.TL_START)) * 100;
  }
  getNewPlanningEnd(): string {
    const [hh, mm] = (this.newStartTime || '08:00').split(':').map(Number);
    const n = this.teamIds().length || 1;
    const endMin = hh * 60 + mm + Math.ceil((this.estimatedHouseholds * 5) / n);
    const eh = Math.floor(endMin / 60) % 24;
    const em = endMin % 60;
    return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
  }

  formatHour(h: number): string { return `${String(h).padStart(2, '0')}h`; }

  // ── Style helpers ─────────────────────────────────────────────
  statusColor(s: TeamStatus):     string { return ({ disponible: '#16a34a', en_service: '#f59e0b', indisponible: '#ef4444' } as Record<string,string>)[s] ?? '#64748b'; }
  statusLabel(s: TeamStatus):     string { return ({ disponible: 'Disponible', en_service: 'En service', indisponible: 'Indisponible' } as Record<string,string>)[s] ?? s; }
  vehicleColor(s: VehicleStatus): string { return ({ ok: '#16a34a', maintenance: '#f59e0b', unavailable: '#ef4444' } as Record<string,string>)[s] ?? '#64748b'; }
  vehicleLabel(s: VehicleStatus): string { return ({ ok: 'Opérationnel', maintenance: 'Maintenance', unavailable: 'Panne' } as Record<string,string>)[s] ?? s; }
  sevLabel(s: ConflictSeverity):  string { return ({ critical: 'Critique', warning: 'Attention', info: 'Info' } as Record<string,string>)[s] ?? s; }
  sevColor(s: ConflictSeverity): string { return this._sevColor(s); }
  sevIcon(s: ConflictSeverity):  string { return ({ critical: 'error', warning: 'warning', info: 'info' } as Record<string,string>)[s] ?? 'info'; }
  kindIcon(k: ConflictKind):     string { return this._kindIcon(k); }
  loadColor(pct: number):        string { return this._loadColor(pct); }
  loadLabel(pct: number):        string {
    if (pct >= 80) return 'Surchargé';
    if (pct >= 50) return 'Chargé';
    return 'Disponible';
  }

  // ── Private helpers ───────────────────────────────────────────
  private _mapTeam(t: TeamApi): UITeam {
    const initials = t.name
      .split(' ')
      .map(w => w[0] ?? '')
      .join('')
      .toUpperCase()
      .slice(0, 2);

    // Nombre de membres : V2 utilise members[], V1 utilisait collectors[]
    const membersCount = t.members?.length ?? t.collectors?.length ?? 0;

    // Workload : V2 fournit la vraie valeur, V1 est estimée
    const workload = t.workload ?? Math.min(95, membersCount * 10);

    // Statut : V2 a 4 valeurs, on mappe vers l'enum UI du détecteur
    const statusMap: Record<string, TeamStatus> = {
      active:      'disponible',
      on_mission:  'en_service',
      inactive:    'indisponible',
      maintenance: 'indisponible',
    };
    const status: TeamStatus = statusMap[t.status] ?? 'disponible';

    // Véhicule : V2 peut populer vehicleId
    const vehicleRaw = t.vehicleId;
    let vehicleLabel = '—';
    let vehicleStatus: VehicleStatus = 'ok';
    if (vehicleRaw && typeof vehicleRaw === 'object') {
      vehicleLabel = (vehicleRaw as any).plate ?? '—';
      vehicleStatus = (vehicleRaw as any).status === 'maintenance' ? 'maintenance'
                    : (vehicleRaw as any).status === 'hors_service' ? 'unavailable'
                    : 'ok';
    } else if (typeof vehicleRaw === 'string' && vehicleRaw) {
      vehicleLabel = vehicleRaw;
    }

    return {
      id:              t._id,
      name:            t.name,
      initials,
      color:           t.color ?? '#3b82f6',
      supervisor:      t.supervisor ?? '',
      membersCount,
      status,
      vehicleStatus,
      vehicle:         vehicleLabel,
      workloadPercent: workload,
      successRate:     t.successRate ?? 0,
      zones:           t.zones ?? [],
      assignments:     [],
      conflicts:       [],
      isSuggested:     status === 'disponible' && workload < 60,
    };
  }

  private _mapApiConflicts(teamId: string, apiConflicts: ConflictResult[]): TeamConflict[] {
    return apiConflicts
      .filter(c => c.equipeId === teamId)
      .map(c => ({
        kind:       'schedule' as ConflictKind,
        severity:   'critical' as ConflictSeverity,
        message:    c.message,
        detail:     `Conflit avec ${c.conflictingPlanningRef}`,
        suggestion: 'Choisir une autre équipe ou changer la date',
      }));
  }

  private _sevColor(s: ConflictSeverity): string {
    return ({ critical: '#ef4444', warning: '#f59e0b', info: '#3b82f6' } as Record<string,string>)[s] ?? '#64748b';
  }

  private _kindIcon(k: ConflictKind): string {
    return ({ schedule: 'schedule', vehicle: 'local_shipping', overload: 'inventory', maintenance: 'build' } as Record<string,string>)[k] ?? 'warning';
  }

  private _loadColor(pct: number): string {
    if (pct >= 80) return '#ef4444';
    if (pct >= 50) return '#f59e0b';
    return '#16a34a';
  }
}
