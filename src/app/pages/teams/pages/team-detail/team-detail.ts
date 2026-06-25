import {
  Component, OnInit, OnDestroy, signal, computed, inject,
  ViewChild, ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import * as L from 'leaflet';
import { TeamService } from '../../services/team.service';
import { TeamForm } from '../../components/team-form/team-form';
import { Team, TeamFormData, TeamStatus, TeamMember } from '../../models/team.model';

@Component({
  selector: 'app-team-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, ToastModule, TooltipModule, TeamForm],
  providers: [MessageService],
  templateUrl: './team-detail.html',
  styleUrl: './team-detail.scss',
})
export class TeamDetail implements OnInit, OnDestroy {
  @ViewChild('mapEl') mapElRef!: ElementRef<HTMLDivElement>;

  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  readonly svc   = inject(TeamService);
  private msg    = inject(MessageService);

  private leafletMap!: L.Map;

  isLoading   = signal(true);
  notFound    = signal(false);
  team        = signal<Team | null>(null);
  activeTab   = signal<'members' | 'vehicle' | 'zones' | 'missions'>('members');
  formOpen    = signal(false);
  showDelDlg  = signal(false);

  statusColor = computed(() => {
    const m: Record<string,string> = { active:'#16a34a', inactive:'#94a3b8', on_mission:'#f59e0b', maintenance:'#ef4444' };
    return m[this.team()?.status ?? ''] ?? '#64748b';
  });
  statusLabel = computed(() => {
    const m: Record<string,string> = { active:'Active', inactive:'Inactive', on_mission:'En mission', maintenance:'Maintenance' };
    return m[this.team()?.status ?? ''] ?? '—';
  });
  availableMembers = computed(() => this.team()?.members.filter(m => m.availability === 'disponible').length ?? 0);

  /** Véhicules non assignés + véhicule actuel de l'équipe (pour le formulaire d'édition). */
  vehiclesForForm = computed(() => {
    const unassigned = this.svc.unassignedVehicles();
    const current    = this.team()?.vehicle;
    if (!current) return unassigned;
    const alreadyIn  = unassigned.some(v => v.id === current.id);
    if (alreadyIn) return unassigned;
    return [
      { id: current.id, plate: current.plate, model: current.model, type: current.type, capacityTons: current.capacityTons, status: current.status },
      ...unassigned,
    ];
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';

    // Charge véhicules et zones pour le formulaire d'édition
    this.svc.loadUnassignedVehiclesFromApi();
    this.svc.loadAvailableZonesFromApi();

    // Check local cache first for instant display
    const cached = this.svc.getById(id);
    if (cached) {
      this.team.set(cached);
      setTimeout(() => {
        this.isLoading.set(false);
        if (this.mapElRef?.nativeElement) this._initMap();
      }, 300);
      return;
    }

    // Fallback: fetch from API V2 (includes recentMissions)
    this.svc.getTeamV2(id).subscribe({
      next: team => {
        this.team.set(team);
        setTimeout(() => {
          this.isLoading.set(false);
          if (this.mapElRef?.nativeElement) this._initMap();
        }, 300);
      },
      error: () => {
        this.notFound.set(true);
        this.isLoading.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    if (this.leafletMap) this.leafletMap.remove();
  }

  // ── Tab ───────────────────────────────────────────────────
  setTab(t: 'members' | 'vehicle' | 'zones' | 'missions'): void {
    this.activeTab.set(t);
    if (t === 'zones' && !this.leafletMap) {
      setTimeout(() => this._initMap(), 100);
    }
  }

  // ── Actions ───────────────────────────────────────────────
  statusMenuOpen = false;
  readonly allStatuses: { value: TeamStatus; label: string; icon: string; color: string }[] = [
    { value: 'active',      label: 'Active',       icon: 'check_circle',  color: '#16a34a' },
    { value: 'inactive',    label: 'Inactive',     icon: 'cancel',        color: '#94a3b8' },
    { value: 'on_mission',  label: 'En mission',   icon: 'send',          color: '#f59e0b' },
    { value: 'maintenance', label: 'Maintenance',  icon: 'build',         color: '#ef4444' },
  ];

  toggleStatus(): void {
    const t = this.team();
    if (!t) return;
    const next: TeamStatus = t.status === 'active' ? 'inactive' : 'active';
    this.changeStatus(next);
  }

  changeStatus(status: TeamStatus): void {
    const t = this.team();
    if (!t) return;
    this.statusMenuOpen = false;
    this.svc.changeStatus(t.id, status).subscribe({
      next: updated => {
        this.team.set(updated);
        const labels: Record<TeamStatus, string> = {
          active: 'activée', inactive: 'désactivée',
          on_mission: 'mise en mission', maintenance: 'mise en maintenance',
        };
        this.msg.add({ severity: 'info', summary: 'Statut', detail: `${updated.name} ${labels[updated.status]}` });
      },
      error: err => {
        const detail = err?.error?.error?.message ?? 'Impossible de modifier le statut';
        this.msg.add({ severity: 'error', summary: 'Erreur', detail });
      },
    });
  }

  onFormSave(data: TeamFormData): void {
    const t = this.team();
    if (!t) return;
    const vehicle = data.vehicleId
      ? this.svc.availableVehicles().find(v => v.id === data.vehicleId)
      : undefined;
    const zones = (data.zoneIds ?? [])
      .map(id => this.svc.availableZones().find(z => z.id === id))
      .filter(Boolean) as any[];
    const members: TeamMember[] = (data.members ?? []).map((m, i) => ({
      id:           m._id && !m._id.startsWith('LOCAL-') ? m._id : t.members[i]?.id ?? `LOCAL-${Date.now()}-${i}`,
      name:         m.name,
      phone:        m.phone,
      role:         m.role,
      availability: 'disponible' as const,
      joinedAt:     t.members[i]?.joinedAt ?? new Date().toISOString().split('T')[0],
    }));
    this.svc.updateV2(t.id, {
      name:        data.name,
      color:       data.color,
      status:      data.status as TeamStatus,
      description: data.description,
      supervisor:  data.supervisor,
      phone:       data.phone,
      members,
      zones,
      vehicle: vehicle
        ? { ...vehicle, lastMaintenance: t.vehicle?.lastMaintenance ?? '—', fuelLevel: t.vehicle?.fuelLevel ?? 80, mileage: t.vehicle?.mileage ?? 0 }
        : undefined,
    }).subscribe({
      next: updated => {
        this.team.set(updated);
        this.msg.add({ severity: 'success', summary: 'Sauvegardé', detail: `${updated.name} mis à jour` });
        this.formOpen.set(false);
      },
      error: err => {
        const detail = err?.error?.error?.message ?? 'Impossible de mettre à jour';
        this.msg.add({ severity: 'error', summary: 'Erreur', detail });
      },
    });
  }

  doDelete(): void {
    const t = this.team();
    if (!t) return;
    this.svc.delete(t.id).subscribe({
      next: () => {
        this.showDelDlg.set(false);
        this.router.navigate(['/teams/list']);
      },
      error: err => {
        const detail = err?.error?.error?.message ?? 'Impossible de supprimer';
        this.msg.add({ severity: 'error', summary: 'Erreur', detail });
      },
    });
  }

  // ── UI helpers ────────────────────────────────────────────
  roleLabel(r: string): string {
    return ({ manager:'Manager', collector:'Collecteur' } as Record<string,string>)[r] ?? r;
  }
  roleColor(r: string): string {
    return ({ manager:'#3b82f6', collector:'#16a34a' } as Record<string,string>)[r] ?? '#64748b';
  }
  availabilityColor(a: string): string {
    return ({ disponible:'#16a34a', occupe:'#f59e0b', absent:'#ef4444' } as Record<string,string>)[a] ?? '#94a3b8';
  }
  availabilityLabel(a: string): string {
    return ({ disponible:'Disponible', occupe:'Occupé', absent:'Absent' } as Record<string,string>)[a] ?? a;
  }
  vehicleStatusColor(s: string): string {
    return ({ disponible:'#16a34a', en_service:'#f59e0b', maintenance:'#ef4444', hors_service:'#94a3b8' } as Record<string,string>)[s] ?? '#64748b';
  }
  vehicleStatusLabel(s: string): string {
    return ({ disponible:'Disponible', en_service:'En service', maintenance:'Maintenance', hors_service:'Hors service' } as Record<string,string>)[s] ?? s;
  }
  missionStatusColor(s: string): string {
    return ({ brouillon:'#64748b', planifie:'#3b82f6', en_cours:'#f59e0b', termine:'#16a34a', annule:'#ef4444' } as Record<string,string>)[s] ?? '#94a3b8';
  }
  missionStatusLabel(s: string): string {
    return ({ brouillon:'Brouillon', planifie:'Planifié', en_cours:'En cours', termine:'Terminé', annule:'Annulé' } as Record<string,string>)[s] ?? s;
  }
  formatMissionDate(date: string): string {
    if (!date) return '—';
    const datePart = date.includes('T') ? date.split('T')[0] : date;
    const parts = datePart.split('-');
    if (parts.length !== 3) return date;
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  }
  formatMaintenance(val: string | null | undefined): string {
    if (!val) return 'Aucune révision';
    return val;
  }
  workloadColor(w: number): string {
    if (w >= 80) return '#ef4444';
    if (w >= 50) return '#f59e0b';
    return '#16a34a';
  }
  fuelColor(f: number): string {
    if (f <= 20) return '#ef4444';
    if (f <= 40) return '#f59e0b';
    return '#16a34a';
  }
  vehicleTypeLabel(t: string): string {
    return ({ camion:'Camion', pickup:'Pickup', moto:'Moto', tricycle:'Tricycle' } as Record<string,string>)[t] ?? t;
  }

  // ── Map ───────────────────────────────────────────────────
  private _initMap(): void {
    if (this.leafletMap || !this.mapElRef?.nativeElement) return;
    const t = this.team();
    const center: [number,number] = t?.zones[0]?.ville === 'Bobo-Dioulasso'
      ? [11.1777, -4.2985] : [12.3647, -1.5337];
    this.leafletMap = L.map(this.mapElRef.nativeElement, { center, zoom: 13 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19,
    }).addTo(this.leafletMap);

    (t?.zones ?? []).forEach((z, i) => {
      const offset: [number,number] = [center[0] + (i - 1) * 0.015, center[1] + (i % 2 === 0 ? 0.01 : -0.01)];
      L.circle(offset, { radius: 500, color: t?.color ?? '#3b82f6', fillColor: t?.color ?? '#3b82f6', fillOpacity: 0.1, weight: 2 })
        .bindTooltip(z.name).addTo(this.leafletMap);
      L.circleMarker(offset, { radius: 8, fillColor: t?.color ?? '#3b82f6', color: '#fff', weight: 2, fillOpacity: 1 })
        .bindTooltip(`${z.name} – ${z.householdsCount} ménages`).addTo(this.leafletMap);
    });

    if (t?.status === 'on_mission') {
      L.circleMarker([center[0] + 0.003, center[1] + 0.005], {
        radius: 10, fillColor: '#f59e0b', color: '#fff', weight: 2, fillOpacity: 1,
      }).bindTooltip(`${t.name} – position actuelle`).addTo(this.leafletMap);
    }
  }
}
