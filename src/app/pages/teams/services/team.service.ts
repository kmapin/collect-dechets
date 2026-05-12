import { Injectable, signal, computed } from '@angular/core';
import { Observable, of, delay, map } from 'rxjs';
import {
  Team, TeamStats, TeamFilter, TeamStatus,
  TeamMember, AvailableVehicle, AvailableZone,
} from '../models/team.model';

@Injectable({ providedIn: 'root' })
export class TeamService {

  private _teams           = signal<Team[]>(this._mockTeams());
  private _availableVehicles = signal<AvailableVehicle[]>(this._mockVehicles());
  private _availableZones    = signal<AvailableZone[]>(this._mockZones());

  readonly teams            = this._teams.asReadonly();
  readonly availableVehicles = this._availableVehicles.asReadonly();
  readonly availableZones    = this._availableZones.asReadonly();

  readonly stats = computed<TeamStats>(() => {
    const all  = this._teams();
    const mems = all.reduce((s, t) => s + t.members.length, 0);
    const vehs = all.filter(t => t.vehicle && t.vehicle.status !== 'hors_service').length;
    const avg  = all.reduce((s, t) => s + t.workload, 0) / (all.length || 1);
    return {
      total: all.length,
      active: all.filter(t => t.status === 'active').length,
      onMission: all.filter(t => t.status === 'on_mission').length,
      inactive: all.filter(t => t.status === 'inactive').length,
      maintenance: all.filter(t => t.status === 'maintenance').length,
      totalMembers: mems,
      availableVehicles: vehs,
      avgWorkload: Math.round(avg),
    };
  });

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

  create(data: Partial<Team>): Observable<Team> {
    const n = this._teams().length + 1;
    const team: Team = {
      name: '', status: 'active', color: '#3b82f6',
      members: [], zones: [], workload: 0,
      completedMissions: 0, totalMissions: 0, successRate: 0, recentMissions: [],
      ...data,
      id: `EQ-${String(n).padStart(3, '0')}`,
      code: `EQ-${String(n).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this._teams.update(list => [team, ...list]);
    return of(team).pipe(delay(400));
  }

  update(id: string, updates: Partial<Team>): Observable<Team> {
    let updated!: Team;
    this._teams.update(list =>
      list.map(t => {
        if (t.id !== id) return t;
        updated = { ...t, ...updates, updatedAt: new Date().toISOString() };
        return updated;
      })
    );
    return of(updated).pipe(delay(300));
  }

  delete(id: string): Observable<void> {
    this._teams.update(list => list.filter(t => t.id !== id));
    return of(undefined).pipe(delay(300));
  }

  addMember(teamId: string, member: TeamMember): Observable<TeamMember> {
    const team = this.getById(teamId);
    if (!team) return of(member);
    return this.update(teamId, { members: [...team.members, member] }).pipe(map(() => member));
  }

  updateMember(teamId: string, memberId: string, updates: Partial<TeamMember>): Observable<TeamMember> {
    const team = this.getById(teamId)!;
    const members = team.members.map(m => m.id === memberId ? { ...m, ...updates } : m);
    const updated = members.find(m => m.id === memberId)!;
    return this.update(teamId, { members }).pipe(map(() => updated));
  }

  removeMember(teamId: string, memberId: string): Observable<void> {
    const team = this.getById(teamId)!;
    return this.update(teamId, { members: team.members.filter(m => m.id !== memberId) }).pipe(map(() => void 0));
  }

  reorderMembers(teamId: string, members: TeamMember[]): Observable<TeamMember[]> {
    return this.update(teamId, { members }).pipe(map(() => members));
  }

  toggleStatus(id: string): Observable<Team> {
    const t = this._teams().find(x => x.id === id);
    if (!t) return of({} as Team);
    const next: TeamStatus = t.status === 'active' ? 'inactive'
                           : t.status === 'inactive' ? 'active' : t.status;
    return this.update(id, { status: next });
  }

  // ── Mock data ──────────────────────────────────────────────
  private _mockTeams(): Team[] {
    const now = new Date().toISOString();
    return [
      {
        id: 'EQ-001', code: 'EQ-001', name: 'Équipe Alpha',
        status: 'on_mission', color: '#3b82f6',
        description: 'Équipe principale – zone Baskuy nord',
        supervisor: 'Moussa Kaboré', phone: '+226 70 00 00 01',
        workload: 75, completedMissions: 124, totalMissions: 130, successRate: 95,
        currentZone: 'Secteur 3 – Dassasgho',
        members: [
          { id: 'M1', name: 'Adama Ouédraogo',     phone: '+226 70 11 11 01', role: 'chef',     availability: 'occupe',    joinedAt: '2024-01-15' },
          { id: 'M2', name: 'Issouf Diallo',        phone: '+226 70 11 11 02', role: 'chauffeur', availability: 'occupe',    joinedAt: '2024-02-01' },
          { id: 'M3', name: 'Jean-Baptiste Compaoré', phone: '+226 70 11 11 03', role: 'agent', availability: 'occupe',    joinedAt: '2024-03-10' },
          { id: 'M4', name: 'Aminata Sawadogo',     phone: '+226 70 11 11 04', role: 'agent',     availability: 'occupe',    joinedAt: '2024-04-20' },
        ],
        vehicle: { id: 'V1', plate: 'BF-4521-A', model: 'Mercedes Actros 5T', type: 'camion', capacityTons: 5, status: 'en_service', lastMaintenance: '15/03/2025', fuelLevel: 62, mileage: 18450 },
        zones: [
          { id: 'Z1', name: 'Secteur 3 – Dassasgho', ville: 'Ouagadougou', arrondissement: 'Baskuy', householdsCount: 450 },
          { id: 'Z2', name: 'Secteur 4 – Wayalghin', ville: 'Ouagadougou', arrondissement: 'Baskuy', householdsCount: 320 },
        ],
        recentMissions: [
          { id: 'RM1', reference: 'PL-2025-031', date: '10/05/2025', status: 'termine', zone: 'Secteur 3', householdsCollected: 45, totalHouseholds: 45, duration: '3h20' },
          { id: 'RM2', reference: 'PL-2025-025', date: '03/05/2025', status: 'termine', zone: 'Secteur 4', householdsCollected: 30, totalHouseholds: 32, duration: '2h45' },
          { id: 'RM3', reference: 'PL-2025-019', date: '26/04/2025', status: 'termine', zone: 'Secteur 3', householdsCollected: 44, totalHouseholds: 45, duration: '3h10' },
        ],
        createdAt: new Date('2024-01-10').toISOString(), updatedAt: now,
      },
      {
        id: 'EQ-002', code: 'EQ-002', name: 'Équipe Bravo',
        status: 'active', color: '#16a34a',
        description: 'Équipe spécialisée collecte commerciale',
        supervisor: 'Fatimata Traoré', phone: '+226 70 00 00 02',
        workload: 40, completedMissions: 89, totalMissions: 95, successRate: 94,
        members: [
          { id: 'M5', name: 'Ibrahim Zongo',  phone: '+226 70 22 22 01', role: 'chef',     availability: 'disponible', joinedAt: '2024-02-01' },
          { id: 'M6', name: 'Paul Nikiéma',   phone: '+226 70 22 22 02', role: 'chauffeur', availability: 'disponible', joinedAt: '2024-03-15' },
          { id: 'M7', name: 'Marie Kaboré',   phone: '+226 70 22 22 03', role: 'agent',     availability: 'disponible', joinedAt: '2024-05-01' },
        ],
        vehicle: { id: 'V2', plate: 'BF-3891-B', model: 'Toyota Hilux 3T', type: 'camion', capacityTons: 3, status: 'disponible', lastMaintenance: '20/04/2025', fuelLevel: 88, mileage: 9800 },
        zones: [
          { id: 'Z3', name: 'Secteur 15 – Wemtenga', ville: 'Ouagadougou', arrondissement: 'Bogodogo', householdsCount: 280 },
        ],
        recentMissions: [
          { id: 'RM4', reference: 'PL-2025-030', date: '09/05/2025', status: 'termine', zone: 'Wemtenga', householdsCollected: 28, totalHouseholds: 28, duration: '2h00' },
          { id: 'RM5', reference: 'PL-2025-024', date: '02/05/2025', status: 'termine', zone: 'Wemtenga', householdsCollected: 27, totalHouseholds: 28, duration: '2h15' },
        ],
        createdAt: new Date('2024-02-01').toISOString(), updatedAt: now,
      },
      {
        id: 'EQ-003', code: 'EQ-003', name: 'Équipe Charlie',
        status: 'maintenance', color: '#f59e0b',
        description: 'Véhicule en révision – reprise lundi',
        supervisor: 'Sylvain Ouédraogo', phone: '+226 70 00 00 03',
        workload: 0, completedMissions: 67, totalMissions: 72, successRate: 93,
        members: [
          { id: 'M8',  name: 'Rasmané Sawadogo', phone: '+226 70 33 33 01', role: 'chef',     availability: 'absent', joinedAt: '2024-03-01' },
          { id: 'M9',  name: 'Désiré Kyelem',    phone: '+226 70 33 33 02', role: 'chauffeur', availability: 'absent', joinedAt: '2024-04-01' },
          { id: 'M10', name: 'Seydou Compaoré',  phone: '+226 70 33 33 03', role: 'agent',     availability: 'absent', joinedAt: '2024-04-15' },
          { id: 'M11', name: 'Aïssata Barry',    phone: '+226 70 33 33 04', role: 'assistant', availability: 'absent', joinedAt: '2024-05-20' },
        ],
        vehicle: { id: 'V3', plate: 'BF-2244-C', model: 'MAN TGS 7T', type: 'camion', capacityTons: 7, status: 'maintenance', lastMaintenance: '11/05/2025', fuelLevel: 30, mileage: 34200 },
        zones: [
          { id: 'Z4', name: 'Secteur 6 – Cissin',  ville: 'Ouagadougou', arrondissement: 'Nongremassom', householdsCount: 520 },
          { id: 'Z5', name: 'Secteur 7 – Karpala', ville: 'Ouagadougou', arrondissement: 'Nongremassom', householdsCount: 410 },
        ],
        recentMissions: [
          { id: 'RM6', reference: 'PL-2025-027', date: '07/05/2025', status: 'termine', zone: 'Cissin', householdsCollected: 52, totalHouseholds: 52, duration: '4h00' },
        ],
        createdAt: new Date('2024-03-01').toISOString(), updatedAt: now,
      },
      {
        id: 'EQ-004', code: 'EQ-004', name: 'Équipe Delta',
        status: 'inactive', color: '#8b5cf6',
        description: 'Équipe temporairement suspendue – en attente de réaffectation',
        supervisor: 'Odette Guigma', phone: '+226 70 00 00 04',
        workload: 0, completedMissions: 15, totalMissions: 18, successRate: 83,
        members: [
          { id: 'M12', name: 'Théophile Nana',   phone: '+226 70 44 44 01', role: 'chef',  availability: 'absent', joinedAt: '2024-07-01' },
          { id: 'M13', name: 'Roger Sawadogo',   phone: '+226 70 44 44 02', role: 'agent', availability: 'absent', joinedAt: '2024-07-15' },
        ],
        zones: [], recentMissions: [],
        createdAt: new Date('2024-07-01').toISOString(), updatedAt: now,
      },
      {
        id: 'EQ-005', code: 'EQ-005', name: 'Équipe Echo',
        status: 'active', color: '#ef4444',
        description: 'Équipe Bobo-Dioulasso – secteur nord-ouest',
        supervisor: 'Karim Coulibaly', phone: '+226 70 00 00 05',
        workload: 55, completedMissions: 201, totalMissions: 210, successRate: 96,
        members: [
          { id: 'M14', name: 'Lassina Konaté',      phone: '+226 70 55 55 01', role: 'chef',      availability: 'disponible', joinedAt: '2023-11-01' },
          { id: 'M15', name: 'Salif Ouattara',       phone: '+226 70 55 55 02', role: 'chauffeur', availability: 'disponible', joinedAt: '2023-11-15' },
          { id: 'M16', name: 'Aminata Coulibaly',    phone: '+226 70 55 55 03', role: 'agent',     availability: 'disponible', joinedAt: '2023-12-01' },
          { id: 'M17', name: 'Brahima Sanou',        phone: '+226 70 55 55 04', role: 'agent',     availability: 'disponible', joinedAt: '2024-01-10' },
          { id: 'M18', name: 'Mariam Dao',           phone: '+226 70 55 55 05', role: 'assistant', availability: 'disponible', joinedAt: '2024-02-20' },
        ],
        vehicle: { id: 'V4', plate: 'BF-1122-E', model: 'Isuzu NPR 4T', type: 'camion', capacityTons: 4, status: 'disponible', lastMaintenance: '01/04/2025', fuelLevel: 95, mileage: 21000 },
        zones: [
          { id: 'Z6', name: 'Secteur 1 – Bindougousso', ville: 'Bobo-Dioulasso', householdsCount: 380 },
          { id: 'Z7', name: 'Secteur 2 – Koko',          ville: 'Bobo-Dioulasso', householdsCount: 290 },
          { id: 'Z8', name: 'Secteur 3 – Tounouma',      ville: 'Bobo-Dioulasso', householdsCount: 340 },
        ],
        recentMissions: [
          { id: 'RM7', reference: 'PL-2025-029', date: '08/05/2025', status: 'termine', zone: 'Bindougousso', householdsCollected: 38, totalHouseholds: 38, duration: '3h00' },
          { id: 'RM8', reference: 'PL-2025-023', date: '01/05/2025', status: 'termine', zone: 'Koko', householdsCollected: 29, totalHouseholds: 29, duration: '2h30' },
        ],
        createdAt: new Date('2023-11-01').toISOString(), updatedAt: now,
      },
      {
        id: 'EQ-006', code: 'EQ-006', name: 'Équipe Foxtrot',
        status: 'on_mission', color: '#06b6d4',
        description: 'Équipe rapide – motos et tricycles – zones étroites',
        supervisor: 'Brice Tapsoba', phone: '+226 70 00 00 06',
        workload: 90, completedMissions: 312, totalMissions: 315, successRate: 99,
        currentZone: 'Secteur 11 – Niogsin',
        members: [
          { id: 'M19', name: 'Gilles Ouédraogo', phone: '+226 70 66 66 01', role: 'chef',      availability: 'occupe', joinedAt: '2023-06-01' },
          { id: 'M20', name: 'Patrick Tapsoba',  phone: '+226 70 66 66 02', role: 'chauffeur', availability: 'occupe', joinedAt: '2023-07-01' },
          { id: 'M21', name: 'Bernard Nikiéma',  phone: '+226 70 66 66 03', role: 'agent',     availability: 'occupe', joinedAt: '2023-08-01' },
        ],
        vehicle: { id: 'V5', plate: 'BF-6677-F', model: 'Piaggio Porter 2T', type: 'tricycle', capacityTons: 2, status: 'en_service', lastMaintenance: '10/04/2025', fuelLevel: 45, mileage: 8900 },
        zones: [
          { id: 'Z9', name: 'Secteur 11 – Niogsin', ville: 'Ouagadougou', arrondissement: 'Kouluba', householdsCount: 220 },
        ],
        recentMissions: [
          { id: 'RM9',  reference: 'PL-2025-032', date: '11/05/2025', status: 'en_cours', zone: 'Niogsin', householdsCollected: 15, totalHouseholds: 22 },
          { id: 'RM10', reference: 'PL-2025-026', date: '04/05/2025', status: 'termine',  zone: 'Niogsin', householdsCollected: 22, totalHouseholds: 22, duration: '1h45' },
        ],
        createdAt: new Date('2023-06-01').toISOString(), updatedAt: now,
      },
      {
        id: 'EQ-007', code: 'EQ-007', name: 'Équipe Golf',
        status: 'active', color: '#ec4899',
        description: 'Nouvelle équipe – zone en expansion – Signongin',
        supervisor: 'Diane Sébogo', phone: '+226 70 00 00 07',
        workload: 25, completedMissions: 8, totalMissions: 9, successRate: 89,
        members: [
          { id: 'M22', name: 'Théodore Ilboudo',         phone: '+226 70 77 77 01', role: 'chef',      availability: 'disponible', joinedAt: '2025-01-10' },
          { id: 'M23', name: 'Abdoulaye Tiendrebéogo',   phone: '+226 70 77 77 02', role: 'chauffeur', availability: 'disponible', joinedAt: '2025-01-20' },
          { id: 'M24', name: 'Christelle Bamouni',       phone: '+226 70 77 77 03', role: 'agent',     availability: 'disponible', joinedAt: '2025-02-01' },
        ],
        vehicle: { id: 'V6', plate: 'BF-5533-G', model: 'Mitsubishi Canter 3.5T', type: 'camion', capacityTons: 3.5, status: 'disponible', lastMaintenance: '05/05/2025', fuelLevel: 100, mileage: 2100 },
        zones: [
          { id: 'Z10', name: 'Secteur 20 – Pissy', ville: 'Ouagadougou', arrondissement: 'Signongin', householdsCount: 180 },
        ],
        recentMissions: [
          { id: 'RM11', reference: 'PL-2025-028', date: '07/05/2025', status: 'termine', zone: 'Pissy', householdsCollected: 18, totalHouseholds: 18, duration: '1h30' },
        ],
        createdAt: new Date('2025-01-10').toISOString(), updatedAt: now,
      },
      {
        id: 'EQ-008', code: 'EQ-008', name: 'Équipe Hotel',
        status: 'active', color: '#d97706',
        description: 'Équipe dédiée marchés et zones commerciales',
        supervisor: 'Omar Nana', phone: '+226 70 00 00 08',
        workload: 60, completedMissions: 156, totalMissions: 161, successRate: 97,
        members: [
          { id: 'M25', name: 'Mamadou Sow',          phone: '+226 70 88 88 01', role: 'chef',      availability: 'disponible', joinedAt: '2023-09-01' },
          { id: 'M26', name: 'Alassane Coulibaly',   phone: '+226 70 88 88 02', role: 'chauffeur', availability: 'disponible', joinedAt: '2023-09-15' },
          { id: 'M27', name: 'Julien Compaoré',      phone: '+226 70 88 88 03', role: 'agent',     availability: 'disponible', joinedAt: '2023-10-01' },
          { id: 'M28', name: 'Nafissatou Kinda',     phone: '+226 70 88 88 04', role: 'agent',     availability: 'disponible', joinedAt: '2024-01-05' },
          { id: 'M29', name: 'Denis Sawadogo',       phone: '+226 70 88 88 05', role: 'assistant', availability: 'disponible', joinedAt: '2024-03-01' },
        ],
        vehicle: { id: 'V7', plate: 'BF-9900-H', model: 'Hino 500 7T', type: 'camion', capacityTons: 7, status: 'disponible', lastMaintenance: '25/04/2025', fuelLevel: 72, mileage: 28600 },
        zones: [
          { id: 'Z11', name: 'Grand Marché Baskuy',       ville: 'Ouagadougou', arrondissement: 'Baskuy',   householdsCount: 0 },
          { id: 'Z12', name: 'Marché Sankar-Yaaré',       ville: 'Ouagadougou', arrondissement: 'Bogodogo', householdsCount: 0 },
          { id: 'Z13', name: 'Zone Commerciale Koulouba', ville: 'Ouagadougou', arrondissement: 'Baskuy',   householdsCount: 0 },
        ],
        recentMissions: [
          { id: 'RM12', reference: 'PL-2025-033', date: '10/05/2025', status: 'termine', zone: 'Grand Marché', householdsCollected: 0, totalHouseholds: 0, duration: '2h00' },
        ],
        createdAt: new Date('2023-09-01').toISOString(), updatedAt: now,
      },
    ];
  }

  private _mockVehicles(): AvailableVehicle[] {
    return [
      { id: 'VA1', plate: 'BF-1234-X', model: 'Mercedes Sprinter 2T', type: 'camion',   capacityTons: 2,   status: 'disponible' },
      { id: 'VA2', plate: 'BF-5678-Y', model: 'Toyota Dyna 3T',        type: 'camion',   capacityTons: 3,   status: 'disponible' },
      { id: 'VA3', plate: 'BF-9012-Z', model: 'Honda CB500',            type: 'moto',     capacityTons: 0.1, status: 'disponible' },
      { id: 'VA4', plate: 'BF-3344-W', model: 'Piaggio Porter 1.5T',   type: 'tricycle', capacityTons: 1.5, status: 'disponible' },
    ];
  }

  private _mockZones(): AvailableZone[] {
    return [
      { id: 'ZA1', name: 'Secteur 1 – Gounghin',    ville: 'Ouagadougou', arrondissement: 'Baskuy',     householdsCount: 340 },
      { id: 'ZA2', name: 'Secteur 2 – Pabré',        ville: 'Ouagadougou', arrondissement: 'Baskuy',     householdsCount: 260 },
      { id: 'ZA3', name: 'Secteur 8 – Hamdalaye',    ville: 'Ouagadougou', arrondissement: 'Bogodogo',   householdsCount: 420 },
      { id: 'ZA4', name: 'Secteur 9 – Zone du bois', ville: 'Ouagadougou', arrondissement: 'Bogodogo',   householdsCount: 310 },
      { id: 'ZA5', name: 'Secteur 5 – Zangouettin',  ville: 'Ouagadougou', arrondissement: 'Kouluba',    householdsCount: 280 },
      { id: 'ZA6', name: 'Secteur 12 – Paspanga',    ville: 'Ouagadougou', arrondissement: 'Kouluba',    householdsCount: 195 },
      { id: 'ZA7', name: 'Secteur 4 – Tounouma',     ville: 'Bobo-Dioulasso', householdsCount: 310 },
      { id: 'ZA8', name: 'Secteur 5 – Sarfalao',     ville: 'Bobo-Dioulasso', householdsCount: 275 },
    ];
  }
}
