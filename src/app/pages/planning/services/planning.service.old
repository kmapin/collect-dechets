import { Injectable, signal, computed } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import {
  Planning, PlanningStats, PlanningTeam, PlanningAlert,
  ZoneCoverage, PlanningFilter, PlanningType, PlanningStatus
} from '../models/planning.model';

@Injectable({ providedIn: 'root' })
export class PlanningService {

  private _plannings = signal<Planning[]>(this._mockPlannings());
  private _teams = signal<PlanningTeam[]>(this._mockTeams());
  private _alerts = signal<PlanningAlert[]>(this._mockAlerts());
  private _zones = signal<ZoneCoverage[]>(this._mockZones());

  readonly plannings = this._plannings.asReadonly();
  readonly teams = this._teams.asReadonly();
  readonly alerts = this._alerts.asReadonly();
  readonly zones = this._zones.asReadonly();

  readonly stats = computed<PlanningStats>(() => {
    const all = this._plannings();
    const total = all.length || 1;
    return {
      totalPlannings: all.length,
      todayPlannings: all.filter(p => p.status === 'en_cours' || p.status === 'publie').length,
      inProgress: all.filter(p => p.status === 'en_cours').length,
      completedToday: all.filter(p => p.status === 'termine').length,
      availableTeams: this._teams().filter(t => t.status === 'disponible').length,
      executionRate: Math.round((all.filter(p => p.status === 'termine').length / total) * 100),
    };
  });

  readonly planningsByType = computed(() => {
    const all = this._plannings();
    return {
      individuel: all.filter(p => p.type === 'individuel').length,
      groupe: all.filter(p => p.type === 'groupe').length,
      zone: all.filter(p => p.type === 'zone').length,
      secteur: all.filter(p => p.type === 'secteur').length,
    };
  });

  readonly planningsByStatus = computed(() => {
    const all = this._plannings();
    return {
      brouillon: all.filter(p => p.status === 'brouillon').length,
      publie: all.filter(p => p.status === 'publie').length,
      en_cours: all.filter(p => p.status === 'en_cours').length,
      termine: all.filter(p => p.status === 'termine').length,
    };
  });

  readonly teamWorkload = computed(() =>
    this._teams().map(t => ({ name: t.name, value: t.collectionsToday }))
  );

  getRecentPlannings(limit = 6): Planning[] {
    return [...this._plannings()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  getFilteredPlannings(filter: PlanningFilter): Planning[] {
    return this._plannings().filter(p => {
      if (filter.type && filter.type !== 'tous' && p.type !== filter.type) return false;
      if (filter.status && filter.status !== 'tous' && p.status !== filter.status) return false;
      if (filter.search) {
        const q = filter.search.toLowerCase();
        if (!p.reference.toLowerCase().includes(q) && !p.libelle.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }

  createPlanning(data: Omit<Planning, 'id' | 'reference' | 'createdAt' | 'updatedAt'>): Observable<Planning> {
    const ref = `PL-${String(this._plannings().length + 1).padStart(3, '0')}`;
    const planning: Planning = {
      ...data,
      id: ref,
      reference: ref,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this._plannings.update(list => [planning, ...list]);
    return of(planning).pipe(delay(400));
  }

  updatePlanning(id: string, updates: Partial<Planning>): Observable<Planning> {
    let updated!: Planning;
    this._plannings.update(list =>
      list.map(p => {
        if (p.id === id) { updated = { ...p, ...updates, updatedAt: new Date().toISOString() }; return updated; }
        return p;
      })
    );
    return of(updated).pipe(delay(300));
  }

  deletePlanning(id: string): Observable<void> {
    this._plannings.update(list => list.filter(p => p.id !== id));
    return of(undefined).pipe(delay(300));
  }

  publishPlanning(id: string): Observable<Planning> {
    return this.updatePlanning(id, { status: 'publie' });
  }

  dismissAlert(id: string): void {
    this._alerts.update(list => list.filter(a => a.id !== id));
  }

  private _mockPlannings(): Planning[] {
    return [
      {
        id: 'PL-001', reference: 'PL-001', type: 'zone', libelle: 'Quartier Dassasgho',
        status: 'publie', zone: 'Ouaga / Kouluba / Sect 3 / Dassasgho',
        ville: 'Ouagadougou', arrondissement: 'Kouluba', secteur: 'Secteur 3', quartier: 'Dassasgho',
        date: '12/06/2025', startTime: '08:00', endTime: '12:00',
        teams: ['Equipe 1'], wasteTypes: ['Déchets ménagers'], frequency: 'hebdomadaire',
        clientsCount: 45, createdAt: new Date('2025-06-10').toISOString(), updatedAt: new Date().toISOString(),
      },
      {
        id: 'PL-002', reference: 'PL-002', type: 'groupe', libelle: 'Groupe Premium',
        status: 'en_cours', groupName: 'Groupe Premium',
        date: '12/06/2025', startTime: '08:00',
        teams: ['Equipe 2'], wasteTypes: ['Recyclables'], frequency: 'hebdomadaire',
        clientsCount: 12, createdAt: new Date('2025-06-11').toISOString(), updatedAt: new Date().toISOString(),
      },
      {
        id: 'PL-003', reference: 'PL-003', type: 'individuel', libelle: 'Client OUAGA-001',
        status: 'brouillon', clientId: 'OUAGA-001', clientName: 'Client OUAGA-001',
        date: '12/06/2025', startTime: '09:00',
        teams: ['Equipe 1'], wasteTypes: ['Déchets ménagers'], frequency: 'unique',
        createdAt: new Date('2025-06-11').toISOString(), updatedAt: new Date().toISOString(),
      },
      {
        id: 'PL-004', reference: 'PL-004', type: 'secteur', libelle: 'Secteur 10',
        status: 'publie', secteur: 'Secteur 10', zone: 'Ouaga / Bèoghin / Sect 10',
        date: '16/06/2025', startTime: '07:30', endTime: '11:30',
        teams: ['Equipe 1', 'Equipe 3'], wasteTypes: ['Déchets ménagers', 'Recyclables'], frequency: 'hebdomadaire',
        clientsCount: 78, createdAt: new Date('2025-06-09').toISOString(), updatedAt: new Date().toISOString(),
      },
      {
        id: 'PL-005', reference: 'PL-005', type: 'zone', libelle: 'Quartier Wayalghin',
        status: 'publie', zone: 'Ouaga / Kouluba / Sect 4 / Wayalghin',
        date: '15/06/2025', startTime: '08:00', endTime: '12:00',
        teams: ['Equipe 2'], wasteTypes: ['Déchets ménagers'], frequency: 'hebdomadaire',
        clientsCount: 32, createdAt: new Date('2025-06-09').toISOString(), updatedAt: new Date().toISOString(),
      },
      {
        id: 'PL-006', reference: 'PL-006', type: 'groupe', libelle: 'Groupe Commercial',
        status: 'brouillon', groupName: 'Groupe Commercial',
        date: '15/06/2025', startTime: '06:00',
        teams: ['Equipe 3'], wasteTypes: ['Déchets commerciaux'], frequency: 'unique',
        clientsCount: 8, createdAt: new Date('2025-06-08').toISOString(), updatedAt: new Date().toISOString(),
      },
    ];
  }

  private _mockTeams(): PlanningTeam[] {
    return [
      { id: 'T1', name: 'Equipe 1', membersCount: 4, status: 'en_service', currentZone: 'Dassasgho', collectionsToday: 12, completionRate: 75 },
      { id: 'T2', name: 'Equipe 2', membersCount: 3, status: 'disponible', collectionsToday: 8, completionRate: 100 },
      { id: 'T3', name: 'Equipe 3', membersCount: 4, status: 'disponible', collectionsToday: 5, completionRate: 60 },
      { id: 'T4', name: 'Equipe 4', membersCount: 3, status: 'indisponible', collectionsToday: 0, completionRate: 0 },
    ];
  }

  private _mockAlerts(): PlanningAlert[] {
    return [
      { id: 'A1', type: 'warning', title: 'Retard signalé', message: 'Equipe 1 accuse 30 min de retard sur PL-001', time: 'Il y a 15 min', planningRef: 'PL-001' },
      { id: 'A2', type: 'danger', title: 'Collecte manquée', message: 'PL-002 – Client non trouvé au domicile', time: 'Il y a 45 min', planningRef: 'PL-002' },
      { id: 'A3', type: 'info', title: 'Nouveau planning', message: 'PL-006 en attente de publication', time: 'Il y a 1h', planningRef: 'PL-006' },
      { id: 'A4', type: 'success', title: 'Tournée terminée', message: 'Equipe 2 a terminé sa tournée Wayalghin', time: 'Il y a 2h', planningRef: 'PL-005' },
    ];
  }

  private _mockZones(): ZoneCoverage[] {
    return [
      { name: 'Dassasgho',  lat: 12.3700, lng: -1.5150, planningsCount: 8,  teamsAssigned: 2, completionRate: 75, status: 'active' },
      { name: 'Wayalghin',  lat: 12.3800, lng: -1.5050, planningsCount: 5,  teamsAssigned: 1, completionRate: 60, status: 'active' },
      { name: 'Kouluba',    lat: 12.3600, lng: -1.5250, planningsCount: 6,  teamsAssigned: 2, completionRate: 85, status: 'active' },
      { name: 'Secteur 10', lat: 12.3900, lng: -1.5100, planningsCount: 4,  teamsAssigned: 3, completionRate: 40, status: 'pending' },
      { name: 'Bèoghin',   lat: 12.3550, lng: -1.5300, planningsCount: 3,  teamsAssigned: 1, completionRate: 90, status: 'active' },
    ];
  }
}
