import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import {
  Team, TeamStats, TeamFilter,
  TeamMember, AvailableVehicle, AvailableZone, AssignedZone, Vehicle,
  TeamApi, TeamCreateBody, CollectorUser, TeamStatsApi,
} from '../models/team.model';
import type {
  TeamV2Api, TeamV2CreateBody, TeamV2Member, TeamV2MemberBody,
  VehicleApi, AvailableZoneApi, MemberAvailability, MemberRole,
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
  private _teams               = signal<Team[]>([]);
  private _collectors          = signal<CollectorUser[]>([]);
  private _availableVehicles   = signal<AvailableVehicle[]>([]);
  private _unassignedVehicles  = signal<AvailableVehicle[]>([]);
  private _availableZones      = signal<AvailableZone[]>(this._mockZones());
  private _loading             = signal(false);
  private _error               = signal<string | null>(null);

  // ── Public read-only signals ──────────────────────────────────
  readonly teams              = this._teams.asReadonly();
  readonly collectors         = this._collectors.asReadonly();
  readonly availableVehicles  = this._availableVehicles.asReadonly();
  readonly unassignedVehicles = this._unassignedVehicles.asReadonly();
  readonly availableZones     = this._availableZones.asReadonly();
  readonly loading            = this._loading.asReadonly();
  readonly error              = this._error.asReadonly();

  clearError(): void { this._error.set(null); }

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

  loadCollectors(): void {
    const agencyId = this.agencyId;
    if (!agencyId) return;
    this.http.get<{ data: CollectorUser[] }>(`${this.api}/agency_employees/${agencyId}/collectors`)
      .pipe(map(r => r.data ?? []), catchError(() => of([])))
      .subscribe(list => this._collectors.set(list));
  }

  getTeam(id: string): Observable<Team> {
    return this.getTeamV2(id);
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
    const chefMember = data.members?.find(m => m.role === 'manager');
    const body: TeamCreateBody = {
      name:            data.name,
      agencyId:        this.agencyId,
      leaderId:        chefMember?.id ?? this.currentUserId,
      collectors:      data.members?.map(m => m.id).filter(id => !id.startsWith('LOCAL-')) ?? [],
      zones:           data.zones?.map(z => z.name) ?? [],
      maxClientsPerDay:50,
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
    const memberIds = (updates.members ?? existing?.members ?? [])
      .map(m => m.id).filter(mid => !mid.startsWith('LOCAL-'));
    const body: Partial<TeamCreateBody> = {
      name:            updates.name        ?? existing?.name,
      description:     updates.description ?? existing?.description,
      zones:           updates.zones?.map(z => z.name) ?? existing?.zones.map(z => z.name) ?? [],
      collectors:      memberIds,
      maxClientsPerDay:50,
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
    return this.http.delete<any>(`${this.api}/teams/${id}`).pipe(
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
    ).pipe(map(r => r.data ?? {}));
  }

  // ── Local-only member operations (UI state only) ──────────────

  addMember(teamId: string, member: TeamMember): Observable<TeamMember> {
    return this.addMemberV2(teamId, {
      name:  member.name,
      phone: member.phone || '—',
      role:  member.role,
    });
  }

  updateMember(teamId: string, memberId: string, updates: Partial<TeamMember>): Observable<TeamMember> {
    const team = this.getById(teamId)!;
    const members = team.members.map(m => m.id === memberId ? { ...m, ...updates } : m);
    const updated  = members.find(m => m.id === memberId)!;
    this._teams.update(list => list.map(t => t.id === teamId ? { ...t, members } : t));
    return of(updated);
  }

  removeMember(teamId: string, memberId: string): Observable<void> {
    return this.removeMemberV2(teamId, memberId);
  }

  reorderMembers(teamId: string, members: TeamMember[]): Observable<TeamMember[]> {
    this._teams.update(list => list.map(t => t.id === teamId ? { ...t, members } : t));
    return of(members);
  }

  toggleStatus(id: string): Observable<Team> {
    const t = this._teams().find(x => x.id === id);
    if (!t) return of({} as Team);
    const next: 'active' | 'inactive' = t.status === 'active' ? 'inactive' : 'active';
    return this.changeStatus(id, next);
  }

  // ── Private — API→UI mapping ──────────────────────────────────

  private _mapTeamApi(
    api: TeamApi,
    allCollectors: CollectorUser[],
    colorIndex = 0,
    localOverrides: Partial<Team> = {}
  ): Team {
    // Build member objects from collector IDs (API may return strings or populated objects)
    const members: TeamMember[] = (api.collectors ?? []).map((col: any) => {
      const isObj = col !== null && typeof col === 'object';
      const colId: string = isObj ? col._id : col;
      // Try the preloaded collectors list first, fall back to inline data if populated
      const user: CollectorUser | undefined =
        allCollectors.find(c => c._id === colId) ??
        (isObj ? col as CollectorUser : undefined);
      return {
        id:           colId,
        name:         user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || colId : colId,
        phone:        user?.phone ?? '',
        email:        user?.email,
        role:         'collector' as const,
        availability: 'disponible' as const,
        joinedAt:     api.createdAt?.split('T')[0] ?? '',
        active:       true,
      };
    });

    // If leader is in collector list, mark as chef
    if (api.leaderId) {
      const leaderMember = members.find(m => m.id === api.leaderId);
      if (leaderMember) leaderMember.role = 'manager';
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
      members:          localOverrides.members ?? members,
      vehicle:          localOverrides.vehicle,
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

  // ── V2 API ────────────────────────────────────────────────────

  loadTeams(): void {
    const agencyId = this.agencyId;
    if (!agencyId) return;
    this._loading.set(true);

    this._error.set(null);

    const collectors$ = this._collectors().length
      ? of(this._collectors())
      : this.http.get<{ data: CollectorUser[] }>(
          `${this.api}/agency_employees/${agencyId}/collectors`
        ).pipe(map(r => r.data ?? []), catchError(() => of([])));

    forkJoin({
      teams: this.http.get<TeamV2Api[] | { data: TeamV2Api[] }>(
        `${this.api}/teams/agency/${agencyId}`
      ).pipe(map(r => Array.isArray(r) ? r : ((r as any).data ?? []))),
      collectors: collectors$,
    }).subscribe({
      next: ({ teams, collectors }) => {
        if (!this._collectors().length) this._collectors.set(collectors);
        this._teams.set((teams as TeamV2Api[]).map((t: TeamV2Api, i: number) => this._mapTeamV2Api(t, i)));
        this._loading.set(false);
      },
      error: err => {
        this._loading.set(false);
        this._error.set(err?.error?.message ?? 'Impossible de charger les équipes');
      },
    });

    this.loadAvailableVehiclesFromApi();
    this.loadUnassignedVehiclesFromApi();
    this.loadAvailableZonesFromApi();
  }

  /** Statistiques globales des équipes depuis le serveur. */
  loadGlobalStats(): Observable<TeamStats> {
    const agencyId = this.agencyId;
    if (!agencyId) return of(this.stats());
    return this.http.get<{ data: TeamStats }>(`${this.api}/teams/stats/${agencyId}`).pipe(
      map(r => r.data ?? this.stats()),
      catchError(() => of(this.stats()))
    );
  }

  /** Charge tous les véhicules de l'agence depuis l'API (remplace le mock). */
  loadAvailableVehiclesFromApi(): void {
    const agencyId = this.agencyId;
    if (!agencyId) return;
    this.http.get<VehicleApi[] | { data: VehicleApi[] }>(`${this.api}/V2/vehicles/agency/${agencyId}`)
      .pipe(map(r => Array.isArray(r) ? r : ((r as any).data ?? [])), catchError(() => of(null)))
      .subscribe(list => {
        if (list !== null) {
          this._availableVehicles.set((list as VehicleApi[]).map((v: VehicleApi) => ({
            id:           v._id,
            plate:        v.plate,
            model:        v.model,
            type:         v.type,
            capacityTons: v.capacityTons ?? 0,
            status:       v.status,
          })));
        }
        // null = erreur réseau → on conserve le mock comme fallback
      });
  }

  /** Charge les véhicules NON assignés à une équipe (pour les formulaires d'assignation). */
  loadUnassignedVehiclesFromApi(): void {
    const agencyId = this.agencyId;
    if (!agencyId) return;
    this.http.get<VehicleApi[] | { data: VehicleApi[] }>(`${this.api}/teams/vehicles/available/${agencyId}`)
      .pipe(map(r => Array.isArray(r) ? r : ((r as any).data ?? [])), catchError(() => of([])))
      .subscribe(list =>
        this._unassignedVehicles.set((list as VehicleApi[]).map((v: VehicleApi) => ({
          id:           v._id,
          plate:        v.plate,
          model:        v.model,
          type:         v.type,
          capacityTons: v.capacityTons ?? 0,
          status:       v.status,
        })))
      );
  }

  /** Charge les zones disponibles depuis l'API (remplace le mock). */
  loadAvailableZonesFromApi(): void {
    this.http.get<{ data: AvailableZoneApi[] }>(`${this.api}/teams/zones/available`)
      .pipe(map(r => r.data ?? []), catchError(() => of([])))
      .subscribe(list => {
        if (list.length) {
          this._availableZones.set(list.map(z => ({
            id:             z._id ?? z.id ?? '',
            name:           z.name,
            ville:          z.cityId ?? z.ville ?? '',
            arrondissement: z.arrondissementId ?? z.arrondissement,
            householdsCount:z.householdsCount ?? 0,
          })));
        }
      });
  }

  /** Crée une équipe via l'API V2 (supporte color, supervisor, phone, vehicleId, zoneIds, members). */
  createV2(data: Partial<Team> & { name: string }): Observable<Team> {
    const body: TeamV2CreateBody = {
      agencyId:    this.agencyId,
      name:        data.name,
      color:       data.color,
      status:      data.status,
      description: data.description,
      supervisor:  data.supervisor,
      phone:       data.phone,
      vehicleId:   data.vehicle?.id || (data as any).vehicleId || undefined,
      zoneIds:     data.zones?.map(z => z.id) ?? (data as any).zoneIds ?? [],
      members:     (data.members ?? []).map(m => ({
        userId: m.id && !m.id.startsWith('LOCAL-') ? m.id : undefined,
        name:   m.name,
        phone:  m.phone || '—',
        role:   m.role,
      })),
    };
    return this.http.post<any>(`${this.api}/teams`, body).pipe(
      map(res => {
        const team = this._mapTeamV2Api(this._extractV2Team(res), this._teams().length, data);
        this._teams.update(list => [team, ...list]);
        return team;
      })
    );
  }

  /** Récupère une équipe via l'API V2 (avec recentMissions). */
  getTeamV2(id: string): Observable<Team> {
    return this.http.get<any>(`${this.api}/teams/${id}`).pipe(
      map(res => {
        const idx  = this._teams().findIndex(t => t.id === id);
        const team = this._mapTeamV2Api(this._extractV2Team(res), idx >= 0 ? idx : 0);
        this._teams.update(list => list.map(t => t.id === id ? team : t));
        return team;
      }),
      catchError(() => this.getTeam(id))
    );
  }

  /** Met à jour une équipe via l'API V2. */
  updateV2(id: string, data: Partial<Team>): Observable<Team> {
    const existing = this.getById(id);
    const body: Partial<TeamV2CreateBody> = {
      name:        data.name        ?? existing?.name,
      color:       data.color       ?? existing?.color,
      status:      data.status      ?? existing?.status,
      description: data.description ?? existing?.description,
      supervisor:  data.supervisor  ?? existing?.supervisor,
      phone:       data.phone       ?? existing?.phone,
      vehicleId:   data.vehicle?.id || (data as any).vehicleId || undefined,
      zoneIds:     data.zones?.map(z => z.id) ?? (data as any).zoneIds ?? existing?.zones.map(z => z.id),
      members:     (data.members ?? existing?.members ?? []).map(m => ({
        userId: m.id && !m.id.startsWith('LOCAL-') ? m.id : undefined,
        name:   m.name,
        phone:  m.phone || '—',
        role:   m.role,
      })),
    };
    return this.http.put<any>(`${this.api}/teams/${id}`, body).pipe(
      map(res => {
        const idx  = this._teams().findIndex(t => t.id === id);
        const team = this._mapTeamV2Api(this._extractV2Team(res), idx >= 0 ? idx : 0, data);
        this._teams.update(list => list.map(t => t.id === id ? team : t));
        return team;
      })
    );
  }

  /** Change le statut d'une équipe (supporte on_mission et maintenance). */
  changeStatus(id: string, status: Team['status']): Observable<Team> {
    return this.http.patch<any>(`${this.api}/teams/${id}/status`, { status }).pipe(
      map(res => {
        const idx  = this._teams().findIndex(t => t.id === id);
        const team = this._mapTeamV2Api(this._extractV2Team(res), idx >= 0 ? idx : 0);
        this._teams.update(list => list.map(t => t.id === id ? team : t));
        return team;
      })
    );
  }

  /** Ajoute un membre à une équipe via l'API V2. */
  addMemberV2(teamId: string, data: TeamV2MemberBody): Observable<TeamMember> {
    return this.http.post<{ message: string; team: TeamV2Api }>(`${this.api}/teams/${teamId}/members`, data).pipe(
      map(res => {
        const raw = res.team.members.find(m => m.phone === data.phone)
                 ?? res.team.members[res.team.members.length - 1];
        const member: TeamMember = {
          id:           raw._id ?? raw.id ?? `LOCAL-${Date.now()}`,
          name:         raw.name,
          phone:        raw.phone,
          email:        raw.email ?? undefined,
          role:         raw.role as MemberRole,
          availability: raw.availability ?? 'disponible',
          joinedAt:     raw.joinedAt ? new Date(raw.joinedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          active:       raw.active ?? true,
        };
        this._teams.update(list => list.map(t =>
          t.id === teamId ? { ...t, members: [...t.members, member] } : t
        ));
        return member;
      }),
      catchError((err: HttpErrorResponse) => {
        const message = err.status === 409
          ? 'Ce membre est déjà présent dans l\'équipe'
          : (err.error?.message ?? 'Impossible d\'ajouter le membre');
        return throwError(() => new Error(message));
      })
    );
  }

  /** Retire un membre d'une équipe via l'API V2. */
  removeMemberV2(teamId: string, memberId: string): Observable<void> {
    return this.http.delete<{ success: boolean }>(
      `${this.api}/teams/${teamId}/members/${memberId}`
    ).pipe(
      map(() => {
        this._teams.update(list => list.map(t =>
          t.id === teamId ? { ...t, members: t.members.filter(m => m.id !== memberId) } : t
        ));
      }),
      catchError((err: HttpErrorResponse) => {
        const message = err.status === 404
          ? 'Membre introuvable dans cette équipe'
          : (err.error?.message ?? 'Impossible de retirer le membre');
        return throwError(() => new Error(message));
      })
    );
  }

  /** Met à jour la disponibilité d'un membre via l'API V2. */
  updateMemberAvailability(teamId: string, memberId: string, availability: MemberAvailability): Observable<void> {
    return this.http.patch<{ success: boolean }>(
      `${this.api}/teams/${teamId}/members/${memberId}/availability`,
      { availability }
    ).pipe(
      map(() => {
        this._teams.update(list => list.map(t =>
          t.id === teamId
            ? { ...t, members: t.members.map(m => m.id === memberId ? { ...m, availability } : m) }
            : t
        ));
      })
    );
  }

  // ── Private — normalise les différents formats de réponse V2 ──
  // Backend peut retourner : { data }, { team }, { equipe } ou l'objet direct
  private _extractV2Team(res: any): TeamV2Api {
    return res?.team ?? res?.equipe ?? res?.data ?? res;
  }

  // ── Private — V2 API→UI mapping ───────────────────────────────

  private _mapTeamV2Api(
    api: TeamV2Api,
    colorIndex = 0,
    localOverrides: Partial<Team> = {}
  ): Team {
    const members: TeamMember[] = (api.members ?? []).map(m => ({
      id:           m._id ?? m.id ?? `LOCAL-${Math.random().toString(36).slice(2)}`,
      name:         m.name,
      phone:        m.phone,
      email:        m.email ?? undefined,
      role:         m.role as MemberRole,
      availability: m.availability ?? 'disponible',
      joinedAt:     m.joinedAt ? m.joinedAt.split('T')[0] : (api.createdAt?.split('T')[0] ?? ''),
      active:       m.active ?? true,
      vehicleId:    m.vehicleId ?? undefined,
      zoneId:       m.zoneId ?? undefined,
      performance:  m.performance,
    }));

    const zones: AssignedZone[] = (api.zones ?? []).map((z: any) =>
      typeof z === 'string'
        ? { id: z, name: z, ville: '', householdsCount: 0 }
        : { id: z._id ?? z.id ?? z, name: z.name ?? z, ville: z.ville ?? '', householdsCount: z.householdsCount ?? 0 }
    );

    // Extraire le véhicule si vehicleId est un objet peuplé par le backend
    const vehicleRaw = api.vehicleId;
    const vehicle: Vehicle | undefined = localOverrides.vehicle ??
      (vehicleRaw && typeof vehicleRaw === 'object'
        ? {
            id:              (vehicleRaw as VehicleApi)._id,
            plate:           (vehicleRaw as VehicleApi).plate,
            model:           (vehicleRaw as VehicleApi).model,
            type:            (vehicleRaw as VehicleApi).type,
            capacityTons:    (vehicleRaw as VehicleApi).capacityTons ?? 0,
            status:          (vehicleRaw as VehicleApi).status,
            fuelLevel:       (vehicleRaw as VehicleApi).fuelLevel ?? 0,
            mileage:         (vehicleRaw as VehicleApi).mileage ?? 0,
            lastMaintenance: (vehicleRaw as VehicleApi).lastMaintenance ?? '—',
          }
        : undefined);

    const rawMissions: any[] = api.recentMissions ?? [];
    // L'API ne renvoie pas toujours ces compteurs — on les déduit de recentMissions en fallback
    const derivedTotal     = rawMissions.length;
    const derivedCompleted = rawMissions.filter((m: any) => m.status === 'termine').length;

    return {
      id:               api._id,
      code:             api.code ?? api._id.slice(-6).toUpperCase(),
      name:             api.name,
      status:           api.status,
      color:            api.color ?? localOverrides.color ?? TEAM_COLORS[colorIndex % TEAM_COLORS.length],
      description:      api.description ?? undefined,
      supervisor:       api.supervisor ?? localOverrides.supervisor ?? '',
      phone:            api.phone ?? localOverrides.phone,
      members:          localOverrides.members ?? members,
      vehicle,
      zones,
      workload:         api.workload          ?? localOverrides.workload          ?? 0,
      completedMissions:api.completedMissions ?? localOverrides.completedMissions ?? derivedCompleted,
      totalMissions:    api.totalMissions     ?? localOverrides.totalMissions     ?? derivedTotal,
      successRate:      api.successRate       ?? localOverrides.successRate       ?? 0,
      currentZone:      api.currentZone       ?? localOverrides.currentZone,
      recentMissions:   rawMissions,
      createdAt:        api.createdAt,
      updatedAt:        api.updatedAt,
    };
  }

  // ── Mock-only: vehicles and zones (no API endpoint) ───────────
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
