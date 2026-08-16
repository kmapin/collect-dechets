import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  Planning, PlanningStats, PlanningAlert,
  ZoneCoverage, PlanningFilter,
  PlanningV2Api, PlanningV2CreateBody, PlanningStatsApi,
  ZoneCoverageApi, ConflictCheckResponse, TeamApi,
  ApiListResponse, WASTE_TYPE_LABELS, CollectionEvolutionDay,
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
  private _evolution  = signal<CollectionEvolutionDay[]>([]);
  private _loading    = signal(false);
  private _error      = signal<string | null>(null);

  // ── Public read-only signals ──────────────────────────────────
  readonly plannings = this._plannings.asReadonly();
  readonly teams     = this._teams.asReadonly();
  readonly alerts    = this._alerts.asReadonly();
  readonly zones     = this._zones.asReadonly();
  readonly evolution = this._evolution.asReadonly();
  readonly loading   = this._loading.asReadonly();
  readonly error     = this._error.asReadonly();

  clearError(): void { this._error.set(null); }

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
    this._teams().map(t => ({ name: t.name, value: t.members?.length ?? t.collectors?.length ?? 0 }))
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
      // Corrigé (usage réel, TypeError "res.data.map is not a function") :
      // le backend (`services/planning.js::getZoneCoverage`, voir son propre
      // commentaire "ATTENTION" détaillé) renvoie UN SEUL objet agrégat, pas
      // un tableau par quartier — un écart déjà documenté côté backend entre
      // l'implémentation réelle et ce que le Swagger/ce service attendent,
      // jamais corrigé. Le vrai correctif (réécrire `getZoneCoverage` pour
      // qu'elle renvoie vraiment un tableau par quartier avec coordonnées) est
      // un chantier séparé — celui-ci se contente d'arrêter le crash.
      if (Array.isArray(res?.data)) {
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

  loadEvolution(days = 7): void {
    const agencyId = this.agencyId;
    let params = agencyId ? new HttpParams().set('agencyId', agencyId) : new HttpParams();
    params = params.set('days', days);
    this.http.get<{ success: boolean; data: CollectionEvolutionDay[] }>(
      `${this.api}/planning/v2/evolution`, { params }
    ).pipe(
      catchError(() => of(null))
    ).subscribe(res => {
      if (res?.data) this._evolution.set(res.data);
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

    this._error.set(null);

    forkJoin([
      this.http.get<ApiListResponse<PlanningV2Api>>(`${this.api}/planning/v2`, { params }),
      this.getTeamsForAgency(),
    ]).subscribe({
      next: result => {
        this._loading.set(false);
        const [res] = result;
        if (res?.data) {
          this._plannings.set(res.data.map(p => this._mapPlanningV2(p, this._teams())));
        }
      },
      error: err => {
        this._loading.set(false);
        this._error.set(err?.error?.message ?? 'Impossible de charger les plannings');
      },
    });
  }

  // ── Queries ───────────────────────────────────────────────────

  getPlanning(id: string): Observable<Planning> {
    return forkJoin([
      this.http.get<{ success: boolean; data: PlanningV2Api }>(`${this.api}/planning/v2/${id}`),
      this.getTeamsForAgency(),
    ]).pipe(
      map(([res]) => this._mapPlanningV2(res.data, this._teams()))
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
    if (this._teams().length) return of(this._teams());
    return this.http.get<TeamApi[] | { data: TeamApi[] }>(
      `${this.api}/v2/teams/agency/${agencyId}`
    ).pipe(
      map(r => Array.isArray(r) ? r : ((r as any).data ?? [])),
      tap(teams => { if (teams.length) this._teams.set(teams); })
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
    return this.http.put<any>(`${this.api}/planning/v2/${id}`, body).pipe(
      map(res => {
        const api: PlanningV2Api = res?.data ?? res;
        const planning = this._mapPlanningV2(api, this._teams());
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

  // ── Client groups ─────────────────────────────────────────────

  getClientGroups(agencyId: string): Observable<any[]> {
    return this.http.get<any>(`${this.api}/client-groups/agency/${agencyId}`).pipe(
      map(res => res?.data ?? (Array.isArray(res) ? res : []))
    );
  }

  createClientGroup(body: { name: string; description?: string; agencyId: string; clientIds: string[] }): Observable<any> {
    return this.http.post<any>(`${this.api}/client-groups`, body).pipe(
      map(res => res?.data ?? res)
    );
  }

  deleteClientGroup(groupId: string): Observable<any> {
    return this.http.delete<any>(`${this.api}/client-groups/${groupId}`);
  }

  addClientsToGroup(groupId: string, clientIds: string[]): Observable<any> {
    return this.http.post<any>(`${this.api}/client-groups/${groupId}/clients`, { clientIds }).pipe(
      map(res => res?.data ?? res)
    );
  }

  removeClientsFromGroup(groupId: string, clientIds: string[]): Observable<any> {
    // DELETE avec corps de requête — HttpClient exige `{ body }` explicitement.
    return this.http.request<any>('DELETE', `${this.api}/client-groups/${groupId}/clients`, { body: { clientIds } }).pipe(
      map(res => res?.data ?? res)
    );
  }

  // ── Team ↔ Planning (read-modify-write) ──────────────────────

  addTeamToPlanning(planningId: string, teamId: string): Observable<Planning> {
    return this._setTeamOnPlanning(planningId, teamId);
  }

  removeTeamFromPlanning(planningId: string): Observable<Planning> {
    return this._setTeamOnPlanning(planningId, null);
  }

  private _setTeamOnPlanning(planningId: string, teamId: string | null): Observable<Planning> {
    return this.http.get<any>(`${this.api}/planning/v2/${planningId}`).pipe(
      switchMap(res => {
        const api: PlanningV2Api = res?.data ?? res;
        if (teamId && (api.teamId === teamId)) {
          return of(this._mapPlanningV2(api, this._teams()));
        }
        const body = this._buildUpdateBody(api, { teamId });
        return this.http.put<any>(`${this.api}/planning/v2/${planningId}`, body).pipe(
          map(r => {
            const updated: PlanningV2Api = r?.data ?? r;
            const p = this._mapPlanningV2(updated, this._teams());
            this._plannings.update(list => list.map(x => x.id === planningId ? p : x));
            return p;
          })
        );
      })
    );
  }

  // ── Conflict check ────────────────────────────────────────────

  checkConflicts(
    date: string,
    equipeIds: string[],
    excludePlanningId?: string,
    extra?: { type?: string; quartierId?: string; secteurId?: string; clientId?: string; groupeId?: string },
  ): Observable<ConflictCheckResponse> {
    const body: any = { date, equipeIds, ...extra };
    if (excludePlanningId) body.excludePlanningId = excludePlanningId;
    return this.http.post<{ success: boolean; data: ConflictCheckResponse }>(
      `${this.api}/planning/v2/check-conflicts`, body
    ).pipe(
      map(res => res.data ?? { conflicts: [], suggestions: [], hasBlockingConflict: false }),
      catchError(() => of({ conflicts: [], suggestions: [], hasBlockingConflict: false }))
    );
  }

  // ── Alerts (API réelle — module Teams & Planning) ─────────────

  loadAlerts(): void {
    const agencyId = this.agencyId;
    const params = agencyId ? new HttpParams().set('agencyId', agencyId) : new HttpParams();
    this.http.get<{ success: boolean; data: any[] }>(`${this.api}/planning/v2/alerts`, { params })
      .pipe(catchError(() => of(null)))
      .subscribe(res => {
        if (res?.data) {
          this._alerts.set(res.data.map(a => ({
            id:          a._id,
            type:        a.type,
            title:       a.title,
            message:     a.message,
            time:        new Date(a.createdAt).toLocaleString('fr-FR'),
            planningRef: a.planningRef,
          })));
        }
      });
  }

  dismissAlert(id: string): void {
    this._alerts.update(list => list.filter(a => a.id !== id));
    this.http.patch(`${this.api}/planning/v2/alerts/${id}/dismiss`, {})
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  // ── Exécution (Collecte directe — PlanningRound déprécié, Prompt 0) ────

  /** Statistiques du Planning calculées directement depuis ses Collecte — jamais saisies. */
  getPlanningStats(planningId: string): Observable<{ totalHouseholds: number; householdsCollected: number; completionRate: number }> {
    return this.http.get<{ success: boolean; data: { totalHouseholds: number; householdsCollected: number; completionRate: number } }>(
      `${this.api}/planning/v2/${planningId}/stats`
    ).pipe(map(res => res?.data ?? { totalHouseholds: 0, householdsCollected: 0, completionRate: 0 }), catchError(() => of({ totalHouseholds: 0, householdsCollected: 0, completionRate: 0 })));
  }

  /** Collecte d'un Planning — filtrable par statut. */
  getPlanningCollectes(planningId: string, filter: { status?: string } = {}): Observable<any[]> {
    let params = new HttpParams();
    if (filter.status) params = params.set('status', filter.status);
    return this.http.get<{ success: boolean; data: any[] }>(
      `${this.api}/planning/v2/${planningId}/collectes`, { params }
    ).pipe(map(res => res?.data ?? []), catchError(() => of([])));
  }

  /** Rattrapage (Prompt 0, étape 5) — pas de nouvelle entité, retente la Collecte existante. */
  retryCollecte(planningId: string, collecteId: string): Observable<any> {
    return this.http.post<any>(`${this.api}/planning/v2/${planningId}/collectes/${collecteId}/retry`, {});
  }

  /** Observation/motif d'absence sur UNE Collecte précise — jamais un compteur global. */
  setCollecteObservation(collecteId: string, body: { failureReason?: string; comment?: string }): Observable<any> {
    return this.http.patch<any>(`${this.api}/collectes/${collecteId}/observation`, body);
  }

  // ── Incidents (PlanningIncident — jamais alimenté par aucun code du
  //     produit ; conservé pour compat mais plus utilisé par planning-detail,
  //     voir getPlanningSignalements ci-dessous) ────────────────────

  getIncidents(planningId: string): Observable<any[]> {
    return this.http.get<{ success: boolean; data: any[] }>(
      `${this.api}/planning/v2/${planningId}/incidents`
    ).pipe(map(res => res?.data ?? []), catchError(() => of([])));
  }

  createIncident(planningId: string, body: FormData): Observable<any> {
    return this.http.post<any>(`${this.api}/planning/v2/${planningId}/incidents`, body);
  }

  resolveIncident(planningId: string, incidentId: string): Observable<any> {
    return this.http.patch<any>(`${this.api}/planning/v2/${planningId}/incidents/${incidentId}/resolve`, {});
  }

  /**
   * Vrais signalements liés à ce planning — remplace `getIncidents()`
   * ci-dessus (branché sur `PlanningIncident`, un modèle séparé jamais
   * alimenté par aucun code du produit) par le modèle `Signalement` unifié,
   * qui dénormalise déjà `planningId` précisément pour ce besoin.
   */
  getPlanningSignalements(planningId: string): Observable<any[]> {
    return this.http.get<{ success: boolean; data: any[] }>(
      `${environment.apiUrl}/signalements`,
      { params: { planningId } }
    ).pipe(map(res => res?.data ?? []), catchError(() => of([])));
  }

  resolvePlanningSignalement(signalementId: string, resolutionComment?: string): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/signalements/${signalementId}/resolve`, { resolutionComment });
  }

  // ── Notifications de planning ─────────────────────────────────

  getPlanningNotifications(planningId: string): Observable<any[]> {
    return this.http.get<{ success: boolean; data: any[] }>(
      `${this.api}/planning/v2/${planningId}/notifications`
    ).pipe(map(res => res?.data ?? []), catchError(() => of([])));
  }

  sendPlanningNotification(planningId: string, target: 'all' | 'teams' | 'clients' = 'all'): Observable<any> {
    return this.http.post<any>(`${this.api}/planning/v2/${planningId}/notifications/send`, { target });
  }

  // ── Private helpers ───────────────────────────────────────────

  private _mapPlanningV2(api: PlanningV2Api, teams: TeamApi[] = []): Planning {
    // Champ principal pour l'équipe; fallback sur equipeIds[0] pour les anciens enregistrements
    const legacyIds  = this._extractEquipeIds(api);
    const teamId   = api.teamId ?? (legacyIds.length ? legacyIds[0] : null) ?? null;
    const equipeIds  = teamId ? [teamId] : [];

    // Pas de repli sur l'ID Mongo brut : si l'équipe n'est pas (encore) résolue
    // localement, on laisse `teamName` vide plutôt que d'afficher un ID technique.
    const teamName = teamId
      ? teams.find(x => x._id === teamId)?.name
      : undefined;

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
      teamId,
      teams:            teamName ? [teamName] : [],
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
      clientId:         this._refId(api.clientId as any),
      groupeId:         this._refId(api.groupeId as any),
      clientName:       this._clientName(api.clientId),
      groupName:        this._refName(api.groupeId as any),
      agencyId:         api.agencyId,
      managerId:        api.managerId,
      publishedAt:      api.publishedAt ?? undefined,
      startedAt:        api.startedAt ?? undefined,
      completedAt:      api.completedAt ?? undefined,
      cancelledAt:      api.cancelledAt ?? undefined,
      createdAt:        api.createdAt,
      updatedAt:        api.updatedAt,
    };
  }

  private _extractEquipeIds(api: PlanningV2Api): string[] {
    return (api.equipeIds ?? []).map(eq =>
      typeof eq === 'string' ? eq : (eq as any)._id as string
    );
  }

  private _buildUpdateBody(api: PlanningV2Api, overrides: Partial<PlanningV2CreateBody> = {}): Partial<PlanningV2CreateBody> {
    const currentTeamId = api.teamId ?? this._extractEquipeIds(api)[0] ?? null;
    return {
      type:             api.type,
      libelle:          api.libelle,
      frequency:        api.frequency,
      date:             api.date,
      startTime:        api.startTime,
      endTime:          api.endTime ?? undefined,
      typeDechets:      api.typeDechets ?? [],
      teamId:         currentTeamId ?? undefined,
      equipeIds:      currentTeamId ? [currentTeamId] : undefined,
      clientId:         this._refId(api.clientId as any),
      groupeId:         this._refId(api.groupeId as any),
      villeId:          this._refId(api.villeId),
      arrondissementId: this._refId(api.arrondissementId),
      secteurId:        this._refId(api.secteurId),
      quartierId:       this._refId(api.quartierId),
      notes:            api.notes ?? undefined,
      ...overrides,
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

  /** Nom complet du client depuis un objet peuplé (undefined si c'était un simple ID). */
  private _clientName(val: string | { firstName?: string; lastName?: string } | null | undefined): string | undefined {
    if (!val || typeof val === 'string') return undefined;
    const full = `${val.firstName ?? ''} ${val.lastName ?? ''}`.trim();
    return full || undefined;
  }
}
