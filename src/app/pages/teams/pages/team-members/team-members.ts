import {
  Component, OnInit, inject, signal, computed, HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TeamService } from '../../services/team.service';
import { Team, TeamMember, MemberRole, MemberAvailability } from '../../models/team.model';

// ── Local types ──────────────────────────────────────────────────
interface RichMember extends TeamMember {
  active: boolean;
  performance: { missionsCompleted: number; successRate: number; hoursWorked: number };
}

const ROLES: { value: MemberRole; label: string; icon: string; color: string }[] = [
  { value: 'chef',      label: 'Superviseur terrain', icon: 'manage_accounts', color: '#3b82f6' },
  { value: 'chauffeur', label: 'Chauffeur',            icon: 'drive_eta',       color: '#f59e0b' },
  { value: 'agent',     label: 'Collecteur',           icon: 'recycling',       color: '#16a34a' },
  { value: 'assistant', label: 'Assistant',            icon: 'support_agent',   color: '#8b5cf6' },
];

const AVAILS: { value: MemberAvailability; label: string; icon: string; color: string }[] = [
  { value: 'disponible', label: 'Disponible', icon: 'check_circle', color: '#16a34a' },
  { value: 'occupe',     label: 'En mission', icon: 'pending',      color: '#f59e0b' },
  { value: 'absent',     label: 'Absent',     icon: 'cancel',       color: '#ef4444' },
];

@Component({
  selector: 'app-team-members',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, MatIconModule,
    DragDropModule, TooltipModule, ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './team-members.html',
  styleUrl:    './team-members.scss',
})
export class TeamMembers implements OnInit {
  readonly router = inject(Router);
  private  route  = inject(ActivatedRoute);
  readonly svc    = inject(TeamService);
  private  msg    = inject(MessageService);
  private  fb     = inject(FormBuilder);

  // ── State ─────────────────────────────────────────────────────
  team    = signal<Team | null>(null);
  members = signal<RichMember[]>([]);

  search      = signal('');
  roleFilter  = signal<MemberRole | ''>('');
  availFilter = signal<MemberAvailability | ''>('');
  activeOnly  = signal(false);

  addOpen       = signal(false);
  roleMenuId    = signal<string | null>(null);
  vehicleTarget = signal<RichMember | null>(null);
  deleteTarget  = signal<RichMember | null>(null);
  saving        = signal(false);

  readonly allRoles  = ROLES;
  readonly allAvails = AVAILS;

  addForm = this.fb.group({
    name:         ['', [Validators.required, Validators.minLength(2)]],
    phone:        ['', Validators.required],
    role:         ['agent' as MemberRole, Validators.required],
    availability: ['disponible' as MemberAvailability],
    zoneId:       [''],
    vehicleId:    [''],
  });

  // ── Computed ──────────────────────────────────────────────────
  canDragDrop = computed(() =>
    !this.search() && !this.roleFilter() && !this.availFilter() && !this.activeOnly()
  );

  filteredMembers = computed(() => {
    let list = this.members();
    const q = this.search().toLowerCase().trim();
    if (q) list = list.filter(m => m.name.toLowerCase().includes(q) || m.phone.includes(q));
    const r = this.roleFilter();
    if (r) list = list.filter(m => m.role === r);
    const a = this.availFilter();
    if (a) list = list.filter(m => m.availability === a);
    if (this.activeOnly()) list = list.filter(m => m.active);
    return list;
  });

  stats = computed(() => {
    const all = this.members();
    const n = all.length || 1;
    return {
      total:       all.length,
      disponible:  all.filter(m => m.availability === 'disponible').length,
      occupe:      all.filter(m => m.availability === 'occupe').length,
      absent:      all.filter(m => m.availability === 'absent').length,
      activeCount: all.filter(m => m.active).length,
      avgRate:     Math.round(all.reduce((s, m) => s + m.performance.successRate, 0) / n),
    };
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/teams/list']); return; }
    const team = this.svc.getById(id);
    if (!team) { this.router.navigate(['/teams/list']); return; }
    this.team.set(team);
    this.members.set(team.members.map(m => this._enrich(m)));
  }

  @HostListener('document:click')
  onDocClick(): void { this.roleMenuId.set(null); }

  // ── Drag & Drop ───────────────────────────────────────────────
  onDrop(event: CdkDragDrop<RichMember[]>): void {
    if (!this.canDragDrop()) return;
    const list = [...this.members()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    this.members.set(list);
    this.svc.reorderMembers(this.team()!.id, list).subscribe();
  }

  // ── Role menu ─────────────────────────────────────────────────
  toggleRoleMenu(id: string, e: MouseEvent): void {
    e.stopPropagation();
    this.roleMenuId.update(cur => cur === id ? null : id);
  }

  setRole(m: RichMember, role: MemberRole, e: MouseEvent): void {
    e.stopPropagation();
    this._patch(m.id, { role });
    this.roleMenuId.set(null);
    this.msg.add({ severity: 'success', summary: 'Rôle modifié', detail: `${m.name} → ${this.roleMeta(role).label}` });
  }

  // ── Availability ──────────────────────────────────────────────
  setAvail(m: RichMember, availability: MemberAvailability): void {
    this._patch(m.id, { availability });
  }

  // ── Active toggle ─────────────────────────────────────────────
  toggleActive(m: RichMember): void {
    this._patch(m.id, { active: !m.active });
  }

  // ── Vehicle ───────────────────────────────────────────────────
  assignVehicle(vehicleId: string): void {
    const m = this.vehicleTarget();
    if (!m) return;
    this._patch(m.id, { vehicleId: vehicleId || undefined });
    const plate = vehicleId
      ? (this.svc.availableVehicles().find(v => v.id === vehicleId)?.plate
        ?? this.team()?.vehicle?.plate ?? vehicleId)
      : 'aucun';
    this.msg.add({ severity: 'success', summary: 'Véhicule affecté', detail: `${m.name} → ${plate}` });
    this.vehicleTarget.set(null);
  }

  // ── Add member ────────────────────────────────────────────────
  submitAdd(): void {
    if (this.addForm.invalid || this.saving()) return;
    this.saving.set(true);
    const v = this.addForm.getRawValue();
    const nm: TeamMember = {
      id: `M-${Date.now()}`,
      name: v.name!.trim(), phone: v.phone!.trim(),
      role: v.role as MemberRole,
      availability: v.availability as MemberAvailability,
      active: true,
      zoneId:    v.zoneId    || undefined,
      vehicleId: v.vehicleId || undefined,
      joinedAt: new Date().toISOString().split('T')[0],
      performance: { missionsCompleted: 0, successRate: 0, hoursWorked: 0 },
    };
    this.svc.addMember(this.team()!.id, nm).subscribe(added => {
      this.members.update(list => [...list, this._enrich(added)]);
      this.msg.add({ severity: 'success', summary: 'Membre ajouté', detail: added.name });
      this.addOpen.set(false);
      this.addForm.reset({ role: 'agent', availability: 'disponible' });
      this.saving.set(false);
    });
  }

  // ── Delete ────────────────────────────────────────────────────
  doDelete(): void {
    const m = this.deleteTarget();
    if (!m) return;
    this.svc.removeMember(this.team()!.id, m.id).subscribe(() => {
      this.members.update(list => list.filter(x => x.id !== m.id));
      this.msg.add({ severity: 'warn', summary: 'Retiré', detail: `${m.name} retiré de l'équipe` });
      this.deleteTarget.set(null);
    });
  }

  clearFilters(): void {
    this.search.set(''); this.roleFilter.set('');
    this.availFilter.set(''); this.activeOnly.set(false);
  }

  // ── Display helpers ───────────────────────────────────────────
  initials(name: string): string {
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase();
  }
  roleMeta(r: MemberRole) { return ROLES.find(x => x.value === r) ?? ROLES[2]; }
  availMeta(a: string)    { return AVAILS.find(x => x.value === a) ?? AVAILS[0]; }

  availColor(a: string): string {
    return ({ disponible: '#16a34a', occupe: '#f59e0b', absent: '#ef4444' } as Record<string, string>)[a] ?? '#94a3b8';
  }
  availLabel(a: string): string {
    return ({ disponible: 'Disponible', occupe: 'En mission', absent: 'Absent' } as Record<string, string>)[a] ?? a;
  }
  vhStatusColor(s: string): string {
    return ({ disponible: '#16a34a', en_service: '#f59e0b', maintenance: '#ef4444', hors_service: '#94a3b8' } as Record<string, string>)[s] ?? '#64748b';
  }
  vhStatusLabel(s: string): string {
    return ({ disponible: 'Disponible', en_service: 'En service', maintenance: 'Maintenance', hors_service: 'Hors service' } as Record<string, string>)[s] ?? s;
  }
  teamStatusColor(s: string): string {
    return ({ active: '#16a34a', inactive: '#94a3b8', on_mission: '#f59e0b', maintenance: '#ef4444' } as Record<string, string>)[s] ?? '#64748b';
  }
  teamStatusLabel(s: string): string {
    return ({ active: 'Active', inactive: 'Inactive', on_mission: 'En mission', maintenance: 'Maintenance' } as Record<string, string>)[s] ?? s;
  }
  perfColor(r: number): string { return r >= 85 ? '#16a34a' : r >= 65 ? '#f59e0b' : '#ef4444'; }
  perfOffset(r: number): number { return 100.53 * (1 - r / 100); }

  memberZone(m: RichMember): string {
    if (m.zoneId) return this.svc.availableZones().find(z => z.id === m.zoneId)?.name?.split('–')[0]?.trim() ?? '—';
    return this.team()?.zones[0]?.name?.split('–')[0]?.trim() ?? '—';
  }
  memberVehicle(m: RichMember): string {
    if (m.vehicleId) return this.svc.availableVehicles().find(v => v.id === m.vehicleId)?.plate ?? '—';
    if (m.role === 'chauffeur' && this.team()?.vehicle) return this.team()!.vehicle!.plate;
    return '';
  }

  private _enrich(m: TeamMember): RichMember {
    const seed = m.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
    return {
      ...m,
      active: m.active ?? true,
      performance: m.performance ?? {
        missionsCompleted: 8  + (seed % 60),
        successRate:       70 + (seed % 30),
        hoursWorked:       60 + (seed % 150),
      },
    };
  }

  private _patch(id: string, updates: Partial<RichMember>): void {
    this.members.update(list => list.map(m => m.id === id ? { ...m, ...updates } : m));
    this.svc.updateMember(this.team()!.id, id, updates).subscribe();
  }
}
