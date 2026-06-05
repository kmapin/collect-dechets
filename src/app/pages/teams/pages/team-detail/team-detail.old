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
import { Team, TeamFormData, TeamStatus } from '../../models/team.model';

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

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    const found = this.svc.getById(id);
    if (found) { this.team.set(found); }
    else { this.notFound.set(true); }
    setTimeout(() => {
      this.isLoading.set(false);
      if (!this.notFound() && this.mapElRef?.nativeElement) this._initMap();
    }, 300);
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
  toggleStatus(): void {
    const t = this.team();
    if (!t) return;
    this.svc.toggleStatus(t.id).subscribe(updated => {
      this.team.set(updated);
      const lbl = updated.status === 'active' ? 'activée' : 'désactivée';
      this.msg.add({ severity: 'info', summary: 'Statut', detail: `${updated.name} ${lbl}` });
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
    const members = (data.members ?? []).map((m, i) => ({
      id: t.members[i]?.id ?? `NEW-${Date.now()}-${i}`,
      name: m.name, phone: m.phone, role: m.role,
      availability: 'disponible' as const,
      joinedAt: t.members[i]?.joinedAt ?? new Date().toISOString().split('T')[0],
    }));
    this.svc.update(t.id, {
      name: data.name, color: data.color, status: data.status as TeamStatus,
      description: data.description, supervisor: data.supervisor, phone: data.phone,
      members, zones,
      vehicle: vehicle ? { ...vehicle, lastMaintenance: t.vehicle?.lastMaintenance ?? '—', fuelLevel: t.vehicle?.fuelLevel ?? 80, mileage: t.vehicle?.mileage ?? 0 } : undefined,
    }).subscribe(updated => {
      this.team.set(updated);
      this.msg.add({ severity: 'success', summary: 'Sauvegardé', detail: `${updated.name} mis à jour` });
      this.formOpen.set(false);
    });
  }

  doDelete(): void {
    const t = this.team();
    if (!t) return;
    this.svc.delete(t.id).subscribe(() => {
      this.showDelDlg.set(false);
      this.router.navigate(['/teams/list']);
    });
  }

  // ── UI helpers ────────────────────────────────────────────
  roleLabel(r: string): string {
    return ({ chef:'Chef d\'équipe', chauffeur:'Chauffeur', agent:'Agent', assistant:'Assistant' } as Record<string,string>)[r] ?? r;
  }
  roleColor(r: string): string {
    return ({ chef:'#3b82f6', chauffeur:'#f59e0b', agent:'#16a34a', assistant:'#8b5cf6' } as Record<string,string>)[r] ?? '#64748b';
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
    return ({ planifie:'#3b82f6', en_cours:'#f59e0b', termine:'#16a34a', annule:'#ef4444' } as Record<string,string>)[s] ?? '#94a3b8';
  }
  missionStatusLabel(s: string): string {
    return ({ planifie:'Planifié', en_cours:'En cours', termine:'Terminé', annule:'Annulé' } as Record<string,string>)[s] ?? s;
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
