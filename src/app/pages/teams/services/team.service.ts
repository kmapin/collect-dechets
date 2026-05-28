import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  Team, TeamStats, TeamFilter,
  TeamMember, AvailableVehicle, AvailableZone,
  TeamApi, TeamCreateBody, CollectorUser, TeamStatsApi,
} from '../models/team.model';

// Default display colors cycled when API doesn't provide one
const TEAM_COLORS = ['#3b82f6','#16a34a','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#ec4899','#d97706'];

@Injectable({ providedIn: 'root' })
export class TeamService {
  private http = inject(HttpClient);
  private api  = environment.apiUrl;

  // ── Auth helpers ─────────────────────────────────────────────
  get agencyId(): string {
    try {
      const raw = localStorage.getItem('currentUser');
      if (!raw) return '';
      const p = JSON.parse(raw);
      return p?.user?.agencyId ?? p?.agencyId ?? '';
    } catch { return ''; }
  }

  get currentUserId(): string {
    try {
      const raw = localStorage.getItem('currentUser');
      if (!raw) return '';
      const p = JSON.parse(raw);
      return p?.user?._id ?? p?.user?.id ?? '';
    } catch { return ''; }
  }

  // ── Internal signals ─────────────────────────────────────────
  private _teams              = signal<Team[]>([]);
  private _collectors         = signal<CollectorUser[]>([]);
  private _availableVehicles  = signal<AvailableVehicle[]>(this._mockVehicles());
  private _availableZones     = signal<AvailableZone[]>(this._mockZones());
  private _loading            = signal(false);

  // ── Public read-only signals ──────────────────────────────────
  readonly teams             = this._teams.asReadonly();
  readonly collectors        = this._collectors.asReadonly();
  readonly availableVehicles = this._availableVehicles.asReadonly();
  readonly availableZones    = this._availableZones.asReadonly();
  readonly loading           = this._loading.asReadonly();

  // ── Computed dashboard stats ──────────────────────────────────
  readonly stats = computed<TeamStats>(() => {
    const all  = this._teams();
    const mems = all.reduce((s, t) => s + t.members.length, 0);
    const vehs = all.filter(t => t.vehicle && t.vehicle.status !== 'hors_service').length;
    const avg  = all.reduce((s, t) => s + t.workload, 0) / (all.length || 1);
    return {
      total:             all.length,
      active:            all.filter(t => t.status === 'active').length,
      onMission:         all.filter(t => t.status === 'on_mission').length,
      inactive:          all.filter(t => t.status === 'inactive').length,
      maintenance:       all.filter(t => t.status === 'maintenance').length,
      totalMembers:      mems,
      availableVehicles: vehs,
      avgWorkload:       Math.round(avg),
    };
  });

  // ── Load from API ─────────────────────────────────────────────

  loadTeams(): void {
    const agencyId = this.agencyId;
    if (!agencyId) return;
    this._loading.set(true);

    forkJoin({
      teams: this.http.get<{ success: boolean; count: number; data: TeamApi[] }>(
        `${this.api}/teams/agency/${agencyId}`
      ).pipe(map(r => r.data ?? []), catchError(() => of([]))),
      collectors: this.http.get<{ success: boolean; message: string; data: CollectorUser[] }>(
        `${this.api}/agency_employees/${agencyId}/collectors`
      ).pipe(map(r => r.data ?? []), catchError(() => of([]))),
    }).subscribe(({ teams, collectors }) => {
      this._collectors.set(collectors);
      this._teams.set(teams.map((t, i) => this._mapTeamApi(t, collectors, i)));
      this._loading.set(false);
    });
  }

  loadCollectors(): void {
    const agencyId = this.agencyId;
    if (!agencyId) return;
    this.http.get<{ data: CollectorUser[] }>(`${this.api}/agency_employees/${agencyId}/collectors`)
      .pipe(map(r => r.data ?? []), catchError(() => of([])))
      .subscribe(list => this._collectors.set(list));
  }

  getTeam(id: string): Observable<Team> {
    return forkJoin({
      team: this.http.get<{ success: boolean; data: TeamApi }>(`${this.api}/teams/${id}`)
              .pipe(map(r => r.data)),
      collectors: this._collectors().length
        ? of(this._collectors())
        : this.http.get<{ data: CollectorUser[] }>(`${this.api}/agency_employees/${this.agencyId}/collectors`)
            .pipe(map(r => r.data ?? []), catchError(() => of([]))),
    }).pipe(
      map(({ team, collectors }) => {
        if (!this._collectors().length) this._collectors.set(collectors);
        const idx = this._teams().findIndex(t => t.id === id);
        return this._mapTeamApi(team, collectors, idx >= 0 ? idx : 0);
      })
    );
  }

  // ── Queries ───────────────────────────────────────────────────

  getFiltered(f: TeamFilter): Team[] {
    let r = [...this._teams()];
    if (f.search) {
      const q = f.search.toLowerCase();
      r = r.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        (t.supervisor ?? '').toLowerCase().includes(q)
      );
    }
    if (f.status)              r = r.filter(t => t.status === f.status);
    if (f.hasVehicle === true)  r = r.filter(t => !!t.vehicle);
    if (f.hasVehicle === false) r = r.filter(t => !t.vehicle);
    r.sort((a, b) => {
      let c = 0;
      switch (f.sortBy) {
        case 'name':     c = a.name.localeCompare(b.name); break;
        case 'workload': c = a.workload - b.workload; break;
        case 'members':  c = a.members.length - b.members.length; break;
        case 'missions': c = a.completedMissions - b.completedMissions; break;
      }
      return f.sortDir === 'asc' ? c : -c;
    });
    return r;
  }

  getById(id: string): Team | undefined {
    return this._teams().find(t => t.id === id);
  }

  // ── CRUD ──────────────────────────────────────────────────────

  create(data: Partial<Team> & { name: string }): Observable<Team> {
    const body: TeamCreateBody = {
      name:            data.name,
      agencyId:        this.agencyId,
      leaderId:        data.leaderId ?? this.currentUserId,
      collectors:      data.collectorIds ?? data.members?.map(m => m.id) ?? [],
      zones:           data.zones?.map(z => z.name) ?? [],
      maxClientsPerDay:data.maxClientsPerDay ?? 50,
      description:     data.description,
      status:          (data.status === 'active' || data.status === 'inactive')
                       ? data.status : 'active',
    };
    return this.http.post<{ success: boolean; message: string; data: TeamApi }>(
      `${this.api}/teams`, body
    ).pipe(
      map(res => {
        const idx = this._teams().length;
        const team = this._mapTeamApi(res.data, this._collectors(), idx, data);
        this._teams.update(list => [team, ...list]);
        return team;
      })
    );
  }

  update(id: string, updates: Partial<Team>): Observable<Team> {
    const existing = this.getById(id);
    const body: Partial<TeamCreateBody> = {
      name:            updates.name            ?? existing?.name,
      description:     updates.description     ?? existing?.description,
      zones:           updates.zones?.map(z => z.name) ?? existing?.zones.map(z => z.name) ?? [],
      collectors:      updates.collectorIds    ?? updates.members?.map(m => m.id) ?? existing?.collectorIds ?? [],
      maxClientsPerDay:updates.maxClientsPerDay ?? existing?.maxClientsPerDay,
      status:          (updates.status === 'active' || updates.status === 'inactive')
                       ? updates.status : existing?.status === 'inactive' ? 'inactive' : 'active',
    };
    return this.http.put<{ success: boolean; data: TeamApi }>(
      `${this.api}/teams/${id}`, body
    ).pipe(
      map(res => {
        const idx = this._teams().findIndex(t => t.id === id);
        const team = this._mapTeamApi(res.data, this._collectors(), idx >= 0 ? idx : 0, updates);
        this._teams.update(list => list.map(t => t.id === id ? team : t));
        return team;
      })
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<{ success: boolean }>(`${this.api}/teams/${id}`).pipe(
      map(() => { this._teams.update(list => list.filter(t => t.id !== id)); })
    );
  }

  // ── Collector management (API) ────────────────────────────────

  addCollectors(teamId: string, collectorIds: string[]): Observable<Team> {
    return this.http.post<{ success: boolean; data: TeamApi }>(
      `${this.api}/teams/${teamId}/collectors`, { collectorIds }
    ).pipe(
      map(res => {
        const idx = this._teams().findIndex(t => t.id === teamId);
        const team = this._mapTeamApi(res.data, this._collectors(), idx >= 0 ? idx : 0);
        this._teams.update(list => list.map(t => t.id === teamId ? team : t));
        return team;
      })
    );
  }

  removeCollectors(teamId: string, collectorIds: string[]): Observable<Team> {
    return this.http.delete<{ success: boolean; data: TeamApi }>(
      `${this.api}/teams/${teamId}/collectors`, { body: { collectorIds } }
    ).pipe(
      map(res => {
        const idx = this._teams().findIndex(t => t.id === teamId);
        const team = this._mapTeamApi(res.data, this._collectors(), idx >= 0 ? idx : 0);
        this._teams.update(list => list.map(t => t.id === teamId ? team : t));
        return team;
      })
    );
  }

  getTeamStats(teamId: string): Observable<TeamStatsApi> {
    return this.http.get<{ success: boolean; data: TeamStatsApi }>(
      `${this.api}/teams/${teamId}/stats`
    ).pipe(
      map(r => r.data ?? {}),
      catchError(() => of({} as TeamStatsApi))
    );
  }

  // ── Local-only member operations (UI state only) ──────────────

  addMember(teamId: string, member: TeamMember): Observable<TeamMember> {
    const team = this.getById(teamId);
    if (!team) return of(member);
    const updated = { ...team, members: [...team.members, member] };
    this._teams.update(list => list.map(t => t.id === teamId ? updated : t));
    // Also sync to API if member has a real ID
    if (member.id && !member.id.startsWith('LOCAL-')) {
      this.addCollectors(teamId, [member.id]).subscribe();
    }
    return of(member);
  }

  updateMember(teamId: string, memberId: string, updates: Partial<TeamMember>): Observable<TeamMember> {
    const team = this.getById(teamId)!;
    const members = team.members.map(m => m.id === memberId ? { ...m, ...updates } : m);
    const updated  = members.find(m => m.id === memberId)!;
    this._teams.update(list => list.map(t => t.id === teamId ? { ...t, members } : t));
    return of(updated);
  }

  removeMember(teamId: string, memberId: string): Observable<void> {
    const team = this.getById(teamId)!;
    const members = team.members.filter(m => m.id !== memberId);
    this._teams.update(list => list.map(t => t.id === teamId ? { ...t, members } : t));
    // Sync to API
    this.removeCollectors(teamId, [memberId]).subscribe();
    return of(void 0);
  }

  reorderMembers(teamId: string, members: TeamMember[]): Observable<TeamMember[]> {
    this._teams.update(list => list.map(t => t.id === teamId ? { ...t, members } : t));
    return of(members);
  }

  toggleStatus(id: string): Observable<Team> {
    const t = this._teams().find(x => x.id === id);
    if (!t) return of({} as Team);
    const next: 'active' | 'inactive' = t.status === 'active' ? 'inactive' : 'active';
    return this.update(id, { status: next });
  }

  // ── Private — API→UI mapping ──────────────────────────────────

  private _mapTeamApi(
    api: TeamApi,
    allCollectors: CollectorUser[],
    colorIndex = 0,
    localOverrides: Partial<Team> = {}
  ): Team {
    // Build member objects from collector IDs
    const members: TeamMember[] = (api.collectors ?? []).map(colId => {
      const user = allCollectors.find(c => c._id === colId);
      return {
        id:           colId,
        name:         user ? `${user.firstName} ${user.lastName}`.trim() : colId,
        phone:        user?.phone ?? '',
        email:        user?.email,
        role:         'agent' as const,
        availability: 'disponible' as const,
        joinedAt:     api.createdAt?.split('T')[0] ?? '',
        active:       true,
      };
    });

    // If leader is in collector list, mark as chef
    if (api.leaderId) {
      const leaderMember = members.find(m => m.id === api.leaderId);
      if (leaderMember) leaderMember.role = 'chef';
    }

    const leaderUser = allCollectors.find(c => c._id === api.leaderId);
    const supervisorName = leaderUser
      ? `${leaderUser.firstName} ${leaderUser.lastName}`.trim()
      : localOverrides.supervisor ?? '';

    return {
      id:               api._id,
      code:             api._id.slice(-6).toUpperCase(),
      name:             api.name,
      status:           localOverrides.status ?? api.status,
      color:            localOverrides.color  ?? TEAM_COLORS[colorIndex % TEAM_COLORS.length],
      description:      api.description,
      agencyId:         api.agencyId,
      leaderId:         api.leaderId,
      collectorIds:     Array.isArray(api.collectors) ? api.collectors : [],
      maxClientsPerDay: api.maxClientsPerDay,
      members:          localOverrides.members ?? members,
      vehicle:          localOverrides.vehicle,                    // no API endpoint
      zones:            (api.zones ?? []).map((name, i) => ({
        id:             `zone-${api._id}-${i}`,
        name,
        ville:          '',
        householdsCount:0,
      })),
      workload:         localOverrides.workload ?? 0,
      completedMissions:localOverrides.completedMissions ?? 0,
      totalMissions:    localOverrides.totalMissions ?? 0,
      successRate:      localOverrides.successRate ?? 0,
      currentZone:      localOverrides.currentZone,
      supervisor:       supervisorName,
      phone:            localOverrides.phone,
      recentMissions:   localOverrides.recentMissions ?? [],
      createdAt:        api.createdAt,
      updatedAt:        api.updatedAt,
    };
  }

  // ── Mock-only: vehicles and zones (no API endpoint) ───────────
  private _mockVehicles(): AvailableVehicle[] {
    return [
      { id: 'VA1', plate: 'BF-1234-X', model: 'Mercedes Sprinter 2T', type: 'camion',   capacityTons: 2,   status: 'disponible' },
      { id: 'VA2', plate: 'BF-5678-Y', model: 'Toyota Dyna 3T',       type: 'camion',   capacityTons: 3,   status: 'disponible' },
      { id: 'VA3', plate: 'BF-9012-Z', model: 'Honda CB500',           type: 'moto',     capacityTons: 0.1, status: 'disponible' },
      { id: 'VA4', plate: 'BF-3344-W', model: 'Piaggio Porter 1.5T',  type: 'tricycle', capacityTons: 1.5, status: 'disponible' },
    ];
  }

  private _mockZones(): AvailableZone[] {
    return [
      { id: 'ZA1', name: 'Secteur 1 – Gounghin',    ville: 'Ouagadougou', arrondissement: 'Baskuy',   householdsCount: 340 },
      { id: 'ZA2', name: 'Secteur 2 – Pabré',        ville: 'Ouagadougou', arrondissement: 'Baskuy',   householdsCount: 260 },
      { id: 'ZA3', name: 'Secteur 8 – Hamdalaye',    ville: 'Ouagadougou', arrondissement: 'Bogodogo', householdsCount: 420 },
      { id: 'ZA4', name: 'Secteur 9 – Zone du bois', ville: 'Ouagadougou', arrondissement: 'Bogodogo', householdsCount: 310 },
      { id: 'ZA5', name: 'Secteur 5 – Zangouettin',  ville: 'Ouagadougou', arrondissement: 'Kouluba',  householdsCount: 280 },
      { id: 'ZA6', name: 'Secteur 12 – Paspanga',    ville: 'Ouagadougou', arrondissement: 'Kouluba',  householdsCount: 195 },
      { id: 'ZA7', name: 'Secteur 4 – Tounouma',     ville: 'Bobo-Dioulasso', householdsCount: 310 },
      { id: 'ZA8', name: 'Secteur 5 – Sarfalao',     ville: 'Bobo-Dioulasso', householdsCount: 275 },
    ];
  }
}
