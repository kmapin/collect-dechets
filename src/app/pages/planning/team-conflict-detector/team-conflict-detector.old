import {
  Component, Input, Output, EventEmitter,
  signal, computed, OnChanges, SimpleChanges,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TimelineModule } from 'primeng/timeline';
import { TooltipModule } from 'primeng/tooltip';
import { ChartModule } from 'primeng/chart';
import { TagModule } from 'primeng/tag';

// ── Types ──────────────────────────────────────────────────────
export type TeamStatus     = 'disponible' | 'en_service' | 'indisponible';
export type VehicleStatus  = 'ok' | 'maintenance' | 'unavailable';
export type ConflictSeverity = 'critical' | 'warning' | 'info';
export type ConflictKind     = 'schedule' | 'vehicle' | 'overload' | 'maintenance';

export interface Assignment {
  planningId: string;
  label:      string;
  startTime:  string;
  endTime:    string;
  type:       string;
  zone?:      string;
  color:      string;
}

export interface TeamConflict {
  kind:       ConflictKind;
  severity:   ConflictSeverity;
  message:    string;
  detail?:    string;
  suggestion?: string;
}

export interface TeamData {
  id:               string;
  name:             string;
  initials:         string;
  membersCount:     number;
  vehicle:          string;
  vehicleCapacity:  string;
  status:           TeamStatus;
  vehicleStatus:    VehicleStatus;
  workloadPercent:  number;
  assignments:      Assignment[];
  conflicts:        TeamConflict[];
  isSuggested:      boolean;
}

export interface AlertEvent {
  teamName:  string;
  icon:      string;
  color:     string;
  title:     string;
  detail:    string;
  severity:  ConflictSeverity;
}

// ── Component ──────────────────────────────────────────────────
@Component({
  selector: 'app-team-conflict-detector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, TimelineModule, TooltipModule, ChartModule, TagModule],
  templateUrl: './team-conflict-detector.html',
  styleUrl:    './team-conflict-detector.scss',
})
export class TeamConflictDetectorComponent implements OnChanges {
  @Input() selectedDate:         Date | null = null;
  @Input() selectedTeamIds:      string[]    = [];
  @Input() newStartTime:         string      = '08:00';
  @Input() estimatedHouseholds:  number      = 0;

  @Output() teamsChange = new EventEmitter<string[]>();

  // ── Internal signals ─────────────────────────────────────────
  date    = signal<Date | null>(null);
  teamIds = signal<string[]>([]);

  // ── Timeline config ───────────────────────────────────────────
  readonly TL_START = 6;
  readonly TL_END   = 20;
  readonly TL_HOURS = Array.from({ length: this.TL_END - this.TL_START + 1 }, (_, i) => i + this.TL_START);

  // ── Static team data ──────────────────────────────────────────
  readonly allTeams: TeamData[] = this._buildTeams();

  // ── Computed ─────────────────────────────────────────────────
  teamsEnriched = computed<TeamData[]>(() => {
    const ids = this.teamIds();
    return this.allTeams.map(t => ({
      ...t,
      conflicts: ids.includes(t.id)
        ? this._detect(t, ids)
        : [],
    }));
  });

  selectedTeams   = computed<TeamData[]>(() => this.teamsEnriched().filter(t => this.teamIds().includes(t.id)));
  availableCount  = computed<number>(() => this.allTeams.filter(t => t.status === 'disponible' && t.vehicleStatus === 'ok').length);
  inServiceCount  = computed<number>(() => this.allTeams.filter(t => t.status === 'en_service').length);
  unavailCount    = computed<number>(() => this.allTeams.filter(t => t.status === 'indisponible' || t.vehicleStatus === 'unavailable').length);

  allConflicts = computed<TeamConflict[]>(() =>
    this.selectedTeams().flatMap(t => t.conflicts)
  );
  criticalCount = computed<number>(() => this.allConflicts().filter(c => c.severity === 'critical').length);
  warningCount  = computed<number>(() => this.allConflicts().filter(c => c.severity === 'warning').length);

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
    this.teamsEnriched().filter(t => t.isSuggested && t.status !== 'indisponible' && t.vehicleStatus === 'ok').length
  );

  suggestions = computed<string[]>(() => {
    const out: string[] = [];
    const ids = this.teamIds();
    if (this.criticalCount() > 0) {
      const free = this.teamsEnriched().find(t => !ids.includes(t.id) && t.status === 'disponible' && t.vehicleStatus === 'ok' && t.assignments.length === 0);
      if (free) out.push(`${free.name} est libre — aucun conflit prévisible`);
    }
    const overloaded = this.selectedTeams().filter(t => t.workloadPercent > 75);
    if (overloaded.length) out.push(`${overloaded[0].name} dépasse 75% de charge — envisager un remplacement`);
    const h = this.estimatedHouseholds;
    if (ids.length >= 2 && h > 0 && Math.ceil((h * 5) / ids.length) < 60) {
      out.push(`1 équipe suffit pour ${h} ménages (< 1h de collecte)`);
    }
    return out;
  });

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
      }
    }
  }

  // ── Actions ───────────────────────────────────────────────────
  toggleTeam(id: string): void {
    const t = this.allTeams.find(x => x.id === id);
    if (!t || t.status === 'indisponible' || t.vehicleStatus === 'unavailable') return;
    const cur  = this.teamIds();
    const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
    this.teamIds.set(next);
    this.teamsChange.emit(next);
  }

  applySuggested(): void {
    const ids = this.teamsEnriched()
      .filter(t => t.isSuggested && t.status !== 'indisponible' && t.vehicleStatus === 'ok')
      .map(t => t.id);
    this.teamIds.set(ids);
    this.teamsChange.emit(ids);
  }

  isSelected(id: string):   boolean { return this.teamIds().includes(id); }
  isCritical(id: string):   boolean { return this.teamsEnriched().find(t => t.id === id)?.conflicts.some(c => c.severity === 'critical') ?? false; }
  isWarning(id: string):    boolean { return this.teamsEnriched().find(t => t.id === id)?.conflicts.some(c => c.severity === 'warning') ?? false; }
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
  statusColor(s: TeamStatus):    string { return ({ disponible: '#16a34a', en_service: '#f59e0b', indisponible: '#ef4444' } as Record<string, string>)[s] ?? '#64748b'; }
  statusLabel(s: TeamStatus):    string { return ({ disponible: 'Disponible', en_service: 'En service', indisponible: 'Indisponible' } as Record<string, string>)[s] ?? s; }
  vehicleLabel(s: VehicleStatus): string { return ({ ok: 'Opérationnel', maintenance: 'Maintenance', unavailable: 'Panne' } as Record<string, string>)[s] ?? s; }
  vehicleColor(s: VehicleStatus): string { return ({ ok: '#16a34a', maintenance: '#f59e0b', unavailable: '#ef4444' } as Record<string, string>)[s] ?? '#64748b'; }
  sevLabel(s: ConflictSeverity):  string { return ({ critical: 'Critique', warning: 'Attention', info: 'Info' } as Record<string, string>)[s] ?? s; }
  sevColor(s: ConflictSeverity):  string { return this._sevColor(s); }
  sevIcon(s: ConflictSeverity):   string { return ({ critical: 'error', warning: 'warning', info: 'info' } as Record<string, string>)[s] ?? 'info'; }
  kindIcon(k: ConflictKind):      string { return this._kindIcon(k); }
  loadColor(pct: number):         string { return this._loadColor(pct); }
  loadLabel(pct: number):         string {
    if (pct >= 80) return 'Surchargé';
    if (pct >= 50) return 'Chargé';
    return 'Disponible';
  }

  // ── Private ───────────────────────────────────────────────────
  private _detect(team: TeamData, selIds: string[]): TeamConflict[] {
    const result: TeamConflict[] = [];
    const start = this.newStartTime || '08:00';
    const [nh] = start.split(':').map(Number);
    const n   = selIds.length || 1;
    const dur = this.estimatedHouseholds ? Math.ceil((this.estimatedHouseholds * 5) / n) / 60 : 1;
    const nEnd = nh + dur;

    for (const a of team.assignments) {
      const [sh] = a.startTime.split(':').map(Number);
      const [eh] = a.endTime.split(':').map(Number);
      if (nh < eh && nEnd > sh) {
        result.push({
          kind: 'schedule', severity: 'critical',
          message: `Conflit horaire avec "${a.label}"`,
          detail:  `Mission ${a.startTime}–${a.endTime}`,
          suggestion: 'Décaler l\'heure de départ ou choisir une autre équipe',
        });
      }
    }
    if (team.assignments.length >= 2) {
      result.push({
        kind: 'overload', severity: 'warning',
        message: `${team.assignments.length} missions déjà planifiées`,
        detail:  `Charge actuelle : ${team.workloadPercent}%`,
        suggestion: 'Utiliser une équipe moins chargée',
      });
    }
    if (team.vehicleStatus === 'maintenance') {
      result.push({
        kind: 'maintenance', severity: 'warning',
        message: `${team.vehicle.split('–')[0].trim()} en maintenance préventive`,
        detail:  'Retour prévu demain matin',
        suggestion: 'Vérifier la disponibilité avant affectation',
      });
    }
    if (team.vehicleStatus === 'unavailable') {
      result.push({
        kind: 'vehicle', severity: 'critical',
        message: `${team.vehicle.split('–')[0].trim()} — panne signalée`,
        detail:  'Véhicule hors service jusqu\'à réparation',
        suggestion: 'Affecter un véhicule de remplacement',
      });
    }
    return result;
  }

  private _sevColor(s: ConflictSeverity): string {
    return ({ critical: '#ef4444', warning: '#f59e0b', info: '#3b82f6' } as Record<string, string>)[s] ?? '#64748b';
  }

  private _kindIcon(k: ConflictKind): string {
    return ({ schedule: 'schedule', vehicle: 'local_shipping', overload: 'inventory', maintenance: 'build' } as Record<string, string>)[k] ?? 'warning';
  }

  private _loadColor(pct: number): string {
    if (pct >= 80) return '#ef4444';
    if (pct >= 50) return '#f59e0b';
    return '#16a34a';
  }

  private _buildTeams(): TeamData[] {
    return [
      {
        id: 'T1', name: 'Équipe Alpha', initials: 'α', membersCount: 4,
        vehicle: 'Camion 01 – 5T', vehicleCapacity: '5T', status: 'disponible', vehicleStatus: 'ok',
        workloadPercent: 35, isSuggested: true, conflicts: [],
        assignments: [
          { planningId: 'P101', label: 'Zone Baskuy',   startTime: '06:00', endTime: '09:30', type: 'zone', color: '#3b82f6' },
        ],
      },
      {
        id: 'T2', name: 'Équipe Bravo', initials: 'β', membersCount: 3,
        vehicle: 'Camion 02 – 3T', vehicleCapacity: '3T', status: 'disponible', vehicleStatus: 'ok',
        workloadPercent: 0, isSuggested: true, conflicts: [],
        assignments: [],
      },
      {
        id: 'T3', name: 'Équipe Charlie', initials: 'γ', membersCount: 4,
        vehicle: 'Camion 03 – 5T', vehicleCapacity: '5T', status: 'en_service', vehicleStatus: 'ok',
        workloadPercent: 78, isSuggested: false, conflicts: [],
        assignments: [
          { planningId: 'P102', label: 'Zone Bogodogo',      startTime: '07:00', endTime: '11:00', type: 'zone', color: '#8b5cf6' },
          { planningId: 'P103', label: 'Zone Nongremassom',  startTime: '13:00', endTime: '16:30', type: 'zone', color: '#8b5cf6' },
        ],
      },
      {
        id: 'T4', name: 'Équipe Delta', initials: 'δ', membersCount: 3,
        vehicle: 'Camion 04 – 3T', vehicleCapacity: '3T', status: 'indisponible', vehicleStatus: 'maintenance',
        workloadPercent: 0, isSuggested: false, conflicts: [],
        assignments: [],
      },
      {
        id: 'T5', name: 'Équipe Echo', initials: 'ε', membersCount: 5,
        vehicle: 'Camion 05 – 7T', vehicleCapacity: '7T', status: 'disponible', vehicleStatus: 'ok',
        workloadPercent: 45, isSuggested: true, conflicts: [],
        assignments: [
          { planningId: 'P104', label: 'Zone Boulmiougou', startTime: '06:00', endTime: '10:30', type: 'zone', color: '#16a34a' },
        ],
      },
      {
        id: 'T6', name: 'Équipe Foxtrot', initials: 'ζ', membersCount: 4,
        vehicle: 'Camion 06 – 5T', vehicleCapacity: '5T', status: 'disponible', vehicleStatus: 'unavailable',
        workloadPercent: 0, isSuggested: false, conflicts: [],
        assignments: [],
      },
    ];
  }
}
