import {
  Component, OnInit, inject, signal, computed, HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TeamService } from '../../services/team.service';
import { Team, TeamMember, MemberRole, MemberAvailability } from '../../models/team.model';
import { memberAvailabilityLabel } from '../../models/team-labels';
import { formatFrDate } from '../../../../shared/format.util';
import { ScrollLockDirective } from '../../../../shared/scroll-lock.directive';

// ── Local types ──────────────────────────────────────────────────
interface RichMember extends TeamMember {
  active: boolean;
  performance: { missionsCompleted: number; successRate: number; hoursWorked: number };
}

const ROLES: { value: MemberRole; label: string; icon: string; color: string }[] = [
  { value: 'manager',   label: 'Manager',    icon: 'manage_accounts', color: '#3b82f6' },
  { value: 'collector', label: 'Collecteur', icon: 'recycling',       color: '#16a34a' },
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
    DragDropModule, TooltipModule, ToastModule, ScrollLockDirective,
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

  // ── Vue tableau + pagination (même modèle que planning-detail) ──
  viewMode     = signal<'card' | 'table'>('table');
  page         = signal(1);
  itemsPerPage = signal(10);

  addOpen    = signal(false);
  roleMenuId = signal<string | null>(null);
  deleteTarget  = signal<RichMember | null>(null);
  saving        = signal(false);

  employeeSearch = signal('');
  selectedEmpIds = signal<string[]>([]);

  readonly allRoles  = ROLES;
  readonly allAvails = AVAILS;

  addForm = this.fb.group({
    name:         ['', [Validators.required, Validators.minLength(2)]],
    phone:        ['', Validators.required],
    role:         ['collector' as MemberRole, Validators.required],
    availability: ['disponible' as MemberAvailability],
    zoneId:       [''],
    vehicleId:    [''],
  });

  // ── Computed ──────────────────────────────────────────────────
  // Le glisser-déposer ne réordonne que la page affichée : désactivé dès qu'un
  // filtre est actif OU qu'il y a plus d'une page (l'ordre inter-pages serait faux).
  canDragDrop = computed(() =>
    !this.search() && !this.roleFilter() && !this.availFilter() && !this.activeOnly()
    && this.membersTotalPages() === 1
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

  membersTotalItems = computed(() => this.filteredMembers().length);
  membersTotalPages = computed(() => Math.max(1, Math.ceil(this.membersTotalItems() / this.itemsPerPage())));
  pagedMembers = computed(() => {
    const page = Math.min(this.page(), this.membersTotalPages());
    const start = (page - 1) * this.itemsPerPage();
    return this.filteredMembers().slice(start, start + this.itemsPerPage());
  });

  // Employees from agency not yet in the team
  filteredEmployees = computed(() => {
    const existing = new Set(this.members().map(m => m.id));
    const q = this.employeeSearch().toLowerCase().trim();
    return this.svc.collectors().filter(c => {
      if (existing.has(c._id)) return false;
      const name = `${c.firstName} ${c.lastName}`.toLowerCase();
      return !q || name.includes(q) || (c.phone ?? '').includes(q);
    });
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

    if (!this.svc.collectors().length) this.svc.loadCollectors();

    // Check cache first
    const cached = this.svc.getById(id);
    if (cached) {
      this.team.set(cached);
      this.members.set(cached.members.map(m => this._enrich(m)));
      return;
    }

    // Fallback: fetch from API
    this.svc.getTeam(id).subscribe({
      next: team => {
        this.team.set(team);
        this.members.set(team.members.map(m => this._enrich(m)));
      },
      error: () => this.router.navigate(['/teams/list']),
    });
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
    this.members.update(list => list.map(x => x.id === m.id ? { ...x, availability } : x));
    this.svc.updateMemberAvailability(this.team()!.id, m.id, availability).subscribe();
  }

  // ── Active toggle ─────────────────────────────────────────────
  toggleActive(m: RichMember): void {
    this._patch(m.id, { active: !m.active });
  }

  // ── Add member ────────────────────────────────────────────────
  openAdd(): void {
    this.employeeSearch.set('');
    this.selectedEmpIds.set([]);
    this.addForm.reset({ role: 'collector', availability: 'disponible' });
    this.addOpen.set(true);
  }

  toggleEmployee(id: string): void {
    this.selectedEmpIds.update(ids =>
      ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]
    );
  }

  isEmployeeSelected(id: string): boolean {
    return this.selectedEmpIds().includes(id);
  }

  submitAdd(): void {
    this._submitFromList();
  }

  private _submitFromList(): void {
    const ids = this.selectedEmpIds();
    if (!ids.length || this.saving()) return;
    this.saving.set(true);
    const teamId   = this.team()!.id;
    const employees = this.svc.collectors().filter(c => ids.includes(c._id));

    let done = 0, errors = 0;
    for (const emp of employees) {
      const apiRole: 'manager' | 'collector' = emp.role === 'manager' ? 'manager' : 'collector';
      this.svc.addMemberV2(teamId, {
        userId: emp._id,
        name:   `${emp.firstName} ${emp.lastName}`.trim(),
        phone:  emp.phone || '—',
        role:   apiRole,
      }).subscribe({
        next: added => {
          this.members.update(list => [...list, this._enrich(added)]);
          done++;
          if (done + errors === employees.length) this._finishAdd(done, errors);
        },
        error: (err: Error) => {
          errors++;
          this.msg.add({
            severity: 'error',
            summary: `${emp.firstName} ${emp.lastName}`,
            detail: err?.message ?? 'Impossible d\'ajouter le membre',
            life: 6000,
          });
          if (done + errors === employees.length) this._finishAdd(done, errors);
        },
      });
    }
  }

  private _finishAdd(done: number, errors: number): void {
    this.saving.set(false);
    if (done > 0) this.msg.add({ severity: 'success', summary: 'Membres ajoutés', detail: `${done} membre(s) ajouté(s)` });
    this.selectedEmpIds.set([]);
    this.employeeSearch.set('');
    if (errors === 0) this.addOpen.set(false);
  }

  // ── Delete ────────────────────────────────────────────────────
  isRemovingMember = false;
  doDelete(): void {
    if (this.isRemovingMember) return;
    const m = this.deleteTarget();
    if (!m) return;
    this.isRemovingMember = true;
    this.svc.removeMemberV2(this.team()!.id, m.id).pipe(finalize(() => this.isRemovingMember = false)).subscribe({
      next: () => {
        this.members.update(list => list.filter(x => x.id !== m.id));
        this.msg.add({ severity: 'warn', summary: 'Retiré', detail: `${m.name} retiré de l'équipe` });
        this.deleteTarget.set(null);
      },
      error: err => {
        const detail = err?.error?.message ?? 'Impossible de retirer le membre';
        this.msg.add({ severity: 'error', summary: 'Erreur', detail });
      },
    });
  }

  clearFilters(): void {
    this.search.set(''); this.roleFilter.set('');
    this.availFilter.set(''); this.activeOnly.set(false);
    this.page.set(1);
  }

  // ── Pagination (même modèle que planning-detail) ─────────────
  changeItemsPerPage(taille: number): void {
    this.itemsPerPage.set(taille);
    this.page.set(1);
  }
  goToPage(page: number): void {
    if (page >= 1 && page <= this.membersTotalPages()) this.page.set(page);
  }
  nextPage(): void { this.goToPage(this.page() + 1); }
  previousPage(): void { this.goToPage(this.page() - 1); }
  getPaginationPages(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    const half = Math.floor(maxPagesToShow / 2);
    const total = this.membersTotalPages();
    let start = Math.max(1, this.page() - half);
    const end = Math.min(total, start + maxPagesToShow - 1);
    if (end - start + 1 < maxPagesToShow) start = Math.max(1, end - maxPagesToShow + 1);
    for (let i = start; i <= end; i += 1) pages.push(i);
    return pages;
  }
  getEndItemNumber(): number {
    return Math.min(this.page() * this.itemsPerPage(), this.membersTotalItems());
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
    return memberAvailabilityLabel(a);
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
  /** Ville associée à la zone du membre (pour tooltip), en complément de memberZone(). */
  memberZoneTooltip(m: RichMember): string {
    const zone = m.zoneId
      ? this.svc.availableZones().find(z => z.id === m.zoneId)
      : null;
    if (zone) return zone.ville ? `${zone.name} – ${zone.ville}` : zone.name;
    const teamZone = this.team()?.zones[0];
    if (teamZone) return teamZone.ville ? `${teamZone.name} – ${teamZone.ville}` : teamZone.name;
    return '—';
  }
  /** Le véhicule est affecté à l'équipe, jamais à un membre individuellement —
   * seul le manager (au volant du véhicule d'équipe) l'affiche ici. */
  memberVehicle(m: RichMember): string {
    if (m.role === 'manager' && this.team()?.vehicle) {
      const v = this.team()!.vehicle!;
      return `${v.plate} · ${v.model}`;
    }
    return '';
  }

  // ── Formatage ─────────────────────────────────────────────────
  formatFrDate = formatFrDate;

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
