import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  Planning, PlanningStats, PlanningAlert,
  ZoneCoverage, PlanningFilter, PlanningType, PlanningStatus,
  PlanningV2Api, PlanningV2CreateBody, PlanningStatsApi,
  ZoneCoverageApi, ConflictCheckResponse, TeamApi,
  ApiListResponse, WASTE_TYPE_LABELS,
} from '../models/planning.model';

@Injectable({ providedIn: 'root' })
export class PlanningService {
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

  get managerId(): string {
    try {
      const raw = localStorage.getItem('currentUser');
      if (!raw) return '';
      const p = JSON.parse(raw);
      return p?.user?._id ?? p?.user?.id ?? '';
    } catch { return ''; }
  }

  // ── Internal state ────────────────────────────────────────────
  private _plannings  = signal<Planning[]>([]);
  private _teams      = signal<TeamApi[]>([]);
  private _alerts     = signal<PlanningAlert[]>([]);
  private _zones      = signal<ZoneCoverage[]>([]);
  private _statsApi   = signal<PlanningStatsApi | null>(null);
  private _loading    = signal(false);

  // ── Public read-only signals ──────────────────────────────────
  readonly plannings = this._plannings.asReadonly();
  readonly teams     = this._teams.asReadonly();
  readonly alerts    = this._alerts.asReadonly();
  readonly zones     = this._zones.asReadonly();
  readonly loading   = this._loading.asReadonly();

  // ── Computed dashboard stats ──────────────────────────────────
  readonly stats = computed<PlanningStats>(() => {
    const api = this._statsApi();
    if (api) {
      return {
        totalPlannings: api.totalPlannings,
        todayPlannings: api.todayPlannings,
        inProgress:     api.inProgress,
        completedToday: api.completedToday,
        availableTeams: this._teams().filter(t => t.status === 'active').length,
        executionRate:  api.executionRate,
      };
    }
    // Fallback: compute from local plannings list
    const all   = this._plannings();
    const total = all.length || 1;
    return {
      totalPlannings: all.length,
      todayPlannings: all.filter(p => p.status === 'en_cours' || p.status === 'planifie').length,
      inProgress:     all.filter(p => p.status === 'en_cours').length,
      completedToday: all.filter(p => p.status === 'termine').length,
      availableTeams: this._teams().filter(t => t.status === 'active').length,
      executionRate:  Math.round((all.filter(p => p.status === 'termine').length / total) * 100),
    };
  });

  readonly planningsByType = computed(() => {
    const all = this._plannings();
    return {
      individuel: all.filter(p => p.type === 'individuel').length,
      groupe:     all.filter(p => p.type === 'groupe').length,
      zone:       all.filter(p => p.type === 'zone').length,
      secteur:    all.filter(p => p.type === 'secteur').length,
    };
  });

  readonly planningsByStatus = computed(() => {
    const all = this._plannings();
    return {
      brouillon: all.filter(p => p.status === 'brouillon').length,
      planifie:  all.filter(p => p.status === 'planifie').length,
      en_cours:  all.filter(p => p.status === 'en_cours').length,
      termine:   all.filter(p => p.status === 'termine').length,
    };
  });

  readonly teamWorkload = computed(() =>
    this._teams().map(t => ({ name: t.name, value: t.collectors?.length ?? 0 }))
  );

  // ── Load methods ──────────────────────────────────────────────

  loadStats(): void {
    const agencyId = this.agencyId;
    const params = agencyId ? new HttpParams().set('agencyId', agencyId) : new HttpParams();
    this.http.get<{ success: boolean; data: PlanningStatsApi }>(
      `${this.api}/planning/v2/stats`, { params }
    ).pipe(
      catchError(() => of(null))
    ).subscribe(res => {
      if (res?.data) this._statsApi.set(res.data);
    });
  }

  loadZones(): void {
    const agencyId = this.agencyId;
    const params = agencyId ? new HttpParams().set('agencyId', agencyId) : new HttpParams();
    this.http.get<{ success: boolean; data: ZoneCoverageApi[] }>(
      `${this.api}/planning/v2/zone-coverage`, { params }
    ).pipe(
      catchError(() => of(null))
    ).subscribe(res => {
      if (res?.data) {
        this._zones.set(res.data.map(z => ({
          name:           z.quartierNom,
          lat:            z.lat,
          lng:            z.lng,
          planningsCount: z.planningsCount,
          teamsAssigned:  z.equipesAssigned,
          completionRate: z.completionRate,
          status:         (z.status as 'active' | 'pending' | 'inactive') ?? 'active',
        })));
      }
    });
  }

  loadTeams(): void {
    const agencyId = this.agencyId;
    if (!agencyId) return;
    this.http.get<{ success: boolean; count: number; data: TeamApi[] }>(
      `${this.api}/teams/agency/${agencyId}`
    ).pipe(
      catchError(() => of(null))
    ).subscribe(res => {
      if (res?.data) this._teams.set(res.data);
    });
  }

  loadPlannings(filter?: PlanningFilter): void {
    this._loading.set(true);
    const agencyId = this.agencyId;

    let params = new HttpParams();
    if (agencyId)       params = params.set('agencyId', agencyId);
    if (filter?.type && filter.type !== 'tous')
                        params = params.set('type', filter.type);
    if (filter?.status && filter.status !== 'tous')
                        params = params.set('planningStatus', filter.status);
    if (filter?.dateFrom) params = params.set('dateFrom', filter.dateFrom);
    if (filter?.dateTo)   params = params.set('dateTo',   filter.dateTo);
    if (filter?.search)   params = params.set('search',   filter.search);
    if (filter?.equipeId) params = params.set('equipeId', filter.equipeId);
    params = params.set('page',     String(filter?.page     ?? 1));
    params = params.set('pageSize', String(filter?.pageSize ?? 50));

    forkJoin([
      this.http.get<ApiListResponse<PlanningV2Api>>(`${this.api}/planning/v2`, { params }),
      this._teams().length
        ? of(this._teams())
        : this.http.get<{ data: TeamApi[] }>(`${this.api}/teams/agency/${agencyId}`).pipe(
            map(r => r.data ?? []),
            catchError(() => of([]))
          ),
    ]).pipe(
      catchError(() => of(null))
    ).subscribe(result => {
      this._loading.set(false);
      if (!result) return;
      const [res, teamsArr] = result;
      if (teamsArr.length && !this._teams().length) this._teams.set(teamsArr);
      if (res?.data) {
        this._plannings.set(res.data.map(p => this._mapPlanningV2(p, this._teams())));
      }
    });
  }

  // ── Queries ───────────────────────────────────────────────────

  getPlanning(id: string): Observable<Planning> {
    return forkJoin([
      this.http.get<{ success: boolean; data: PlanningV2Api }>(`${this.api}/planning/v2/${id}`),
      this._teams().length
        ? of(this._teams())
        : this.http.get<{ data: TeamApi[] }>(`${this.api}/teams/agency/${this.agencyId}`).pipe(
            map(r => r.data ?? []),
            catchError(() => of([]))
          ),
    ]).pipe(
      map(([res, teams]) => {
        if (teams.length && !this._teams().length) this._teams.set(teams);
        return this._mapPlanningV2(res.data, this._teams());
      })
    );
  }

  getRecentPlannings(limit = 6): Planning[] {
    return [...this._plannings()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  getFilteredPlannings(filter: PlanningFilter): Planning[] {
    return this._plannings().filter(p => {
      if (filter.type   && filter.type   !== 'tous' && p.type   !== filter.type)   return false;
      if (filter.status && filter.status !== 'tous' && p.status !== filter.status) return false;
      if (filter.search) {
        const q = filter.search.toLowerCase();
        if (!p.reference.toLowerCase().includes(q) && !p.libelle.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }

  getTeamsForAgency(): Observable<TeamApi[]> {
    const agencyId = this.agencyId;
    if (!agencyId) return of([]);
    return this.http.get<{ success: boolean; count: number; data: TeamApi[] }>(
      `${this.api}/teams/agency/${agencyId}`
    ).pipe(
      map(r => r.data ?? []),
      tap(teams => this._teams.set(teams)),
      catchError(() => of([]))
    );
  }

  getClientsForAgency(params?: { term?: string; page?: number; limit?: number }): Observable<any[]> {
    const agencyId = this.agencyId;
    if (!agencyId) return of([]);
    let httpParams = new HttpParams();
    if (params?.term)  httpParams = httpParams.set('term',  params.term);
    if (params?.page)  httpParams = httpParams.set('page',  String(params.page));
    if (params?.limit) httpParams = httpParams.set('limit', String(params.limit));
    return this.http.get<{ success: boolean; message: string; data: any[] }>(
      `${this.api}/agency_employees/${agencyId}/clients`, { params: httpParams }
    ).pipe(
      map(r => r.data ?? []),
      catchError(() => of([]))
    );
  }

  // ── CRUD ──────────────────────────────────────────────────────

  createPlanning(body: PlanningV2CreateBody): Observable<Planning> {
    return this.http.post<{ success: boolean; data: PlanningV2Api }>(
      `${this.api}/planning/v2`, body
    ).pipe(
      map(res => {
        const planning = this._mapPlanningV2(res.data, this._teams());
        this._plannings.update(list => [planning, ...list]);
        return planning;
      })
    );
  }

  updatePlanning(id: string, body: Partial<PlanningV2CreateBody>): Observable<Planning> {
    return this.http.put<{ success: boolean; data: PlanningV2Api }>(
      `${this.api}/planning/v2/${id}`, body
    ).pipe(
      map(res => {
        const planning = this._mapPlanningV2(res.data, this._teams());
        this._plannings.update(list => list.map(p => p.id === id ? planning : p));
        return planning;
      })
    );
  }

  deletePlanning(id: string): Observable<void> {
    return this.http.delete<{ success: boolean }>(
      `${this.api}/planning/v2/${id}`
    ).pipe(
      map(() => {
        this._plannings.update(list => list.filter(p => p.id !== id));
      })
    );
  }

  // ── Status transitions ────────────────────────────────────────

  publishPlanning(id: string): Observable<any> {
    return this.http.post<any>(`${this.api}/planning/v2/${id}/publish`, {}).pipe(
      tap(res => {
        if (res?.data?.planningStatus) {
          this._plannings.update(list =>
            list.map(p => p.id === id ? { ...p, status: res.data.planningStatus } : p)
          );
        }
      })
    );
  }

  startPlanning(id: string): Observable<any> {
    return this.http.post<any>(`${this.api}/planning/v2/${id}/start`, {}).pipe(
      tap(res => {
        if (res?.data?.planningStatus) {
          this._plannings.update(list =>
            list.map(p => p.id === id ? { ...p, status: res.data.planningStatus } : p)
          );
        }
      })
    );
  }

  completePlanning(id: string): Observable<any> {
    return this.http.post<any>(`${this.api}/planning/v2/${id}/complete`, {}).pipe(
      tap(res => {
        if (res?.data?.planningStatus) {
          this._plannings.update(list =>
            list.map(p => p.id === id ? { ...p, status: res.data.planningStatus } : p)
          );
        }
      })
    );
  }

  cancelPlanning(id: string): Observable<any> {
    return this.http.post<any>(`${this.api}/planning/v2/${id}/cancel`, {}).pipe(
      tap(res => {
        if (res?.data?.planningStatus) {
          this._plannings.update(list =>
            list.map(p => p.id === id ? { ...p, status: res.data.planningStatus } : p)
          );
        }
      })
    );
  }

  // ── Conflict check ────────────────────────────────────────────

  checkConflicts(
    date: string,
    equipeIds: string[],
    excludePlanningId?: string
  ): Observable<ConflictCheckResponse> {
    const body: any = { date, equipeIds };
    if (excludePlanningId) body.excludePlanningId = excludePlanningId;
    return this.http.post<{ success: boolean; data: ConflictCheckResponse }>(
      `${this.api}/planning/v2/check-conflicts`, body
    ).pipe(
      map(res => res.data ?? { conflicts: [], suggestions: [] }),
      catchError(() => of({ conflicts: [], suggestions: [] }))
    );
  }

  // ── Alerts (local, no API endpoint) ──────────────────────────

  dismissAlert(id: string): void {
    this._alerts.update(list => list.filter(a => a.id !== id));
  }

  // ── Private helpers ───────────────────────────────────────────

  private _mapPlanningV2(api: PlanningV2Api, teams: TeamApi[] = []): Planning {
    const rawEquipes = api.equipeIds ?? [];

    // L'API peut renvoyer des objets peuplés {_id, name} ou de simples strings
    const teamNames = rawEquipes.map(eq => {
      if (typeof eq === 'object' && eq !== null && 'name' in eq) {
        return (eq as any).name as string;          // déjà peuplé → nom direct
      }
      const id = typeof eq === 'string' ? eq : (eq as any)._id as string;
      const cached = teams.find(x => x._id === id);
      return cached?.name ?? id;                    // fallback: ID ou cache
    });

    // Extraire les IDs propres pour les appels API ultérieurs
    const equipeIds = rawEquipes.map(eq =>
      typeof eq === 'string' ? eq : (eq as any)._id as string
    );

    const wasteLabels = (api.typeDechets ?? []).map(t => WASTE_TYPE_LABELS[t] ?? t);

    return {
      id:               api._id,
      reference:        api.reference,
      type:             api.type,
      libelle:          api.libelle,
      status:           api.planningStatus,
      date:             api.date,
      startTime:        api.startTime,
      endTime:          api.endTime,
      frequency:        api.frequency,
      teams:            teamNames,
      equipeIds,
      wasteTypes:       wasteLabels,
      typeDechets:      api.typeDechets ?? [],
      clientsCount:     api.clientsCount,
      estimatedDuration:api.estimatedDuration,
      notes:            api.notes,
      // Territoire : l'API peut peupler ces champs (objet) ou laisser un ID (string)
      villeId:          this._refId(api.villeId),
      arrondissementId: this._refId(api.arrondissementId),
      secteurId:        this._refId(api.secteurId),
      quartierId:       this._refId(api.quartierId),
      // Noms affichables extraits des objets peuplés
      quartier:         this._refName(api.quartierId),
      secteur:          this._refName(api.secteurId),
      arrondissement:   this._refName(api.arrondissementId),
      ville:            this._refName(api.villeId),
      clientId:         api.clientId ?? undefined,
      groupeId:         api.groupeId ?? undefined,
      agencyId:         api.agencyId,
      managerId:        api.managerId,
      createdAt:        api.createdAt,
      updatedAt:        api.updatedAt,
    };
  }

  /** Extrait l'_id depuis un string ou un objet peuplé. */
  private _refId(val: string | { _id: string } | null | undefined): string | undefined {
    if (!val) return undefined;
    if (typeof val === 'string') return val;
    return (val as any)._id;
  }

  /** Extrait le nom depuis un objet peuplé (undefined si c'était un simple ID). */
  private _refName(val: string | { _id: string; name?: string } | null | undefined): string | undefined {
    if (!val || typeof val === 'string') return undefined;
    return (val as any).name;
  }
}
