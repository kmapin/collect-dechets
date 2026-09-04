import {
  Component, OnInit, ViewChild, signal, computed, inject, effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Table, TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { ContextMenuModule } from 'primeng/contextmenu';
import { MessageService, MenuItem } from 'primeng/api';
import { TeamService } from '../../services/team.service';
import { TeamStore } from '../../store/team.store';
import { TeamCard } from '../../components/team-card/team-card';
import { TeamForm } from '../../components/team-form/team-form';
import { TeamDetailModal } from '../../components/team-detail-modal/team-detail-modal';
import { Team, TeamFormData, TeamStatus, TeamMember } from '../../models/team.model';
import { teamStatusLabel, teamStatusColor, vehicleStatusColor } from '../../models/team-labels';
import { PlanningTeamsTabs } from '../../../../shared/planning-teams-tabs/planning-teams-tabs';

@Component({
  selector: 'app-team-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatIconModule,
    TableModule, TooltipModule, ToastModule, SkeletonModule, TagModule, ContextMenuModule,
    TeamCard, TeamForm, TeamDetailModal, PlanningTeamsTabs,
  ],
  providers: [MessageService],
  templateUrl: './team-list.html',
  styleUrl: './team-list.scss',
})
export class TeamList implements OnInit {
  @ViewChild('dt') dt!: Table;

  readonly svc    = inject(TeamService);
  readonly store  = inject(TeamStore);
  private  msg    = inject(MessageService);
  private  route  = inject(ActivatedRoute);
  readonly router = inject(Router);

  constructor() {
    effect(() => {
      const err = this.svc.error();
      if (err) {
        this.msg.add({ severity: 'error', summary: 'Erreur', detail: err, life: 5000 });
        this.svc.clearError();
      }
    });
  }

  // ── UI State ──────────────────────────────────────────────
  loading           = signal(true);
  formOpen          = signal(false);
  modalTeam         = signal<Team | null>(null);
  modalOpen         = signal(false);
  modalLoading      = signal(false);
  editingTeam       = signal<Team | null>(null);
  deletingTeam      = signal<Team | null>(null);
  confirmDeleteOpen = signal(false);
  selectedRows      = signal<Team[]>([]);
  ctxTeam           = signal<Team | null>(null);
  contextMenuItems  = signal<MenuItem[]>([]);
  zoneFilter        = signal<string>('');

  // ── Computed ──────────────────────────────────────────────
  stats = this.svc.stats;

  filteredTeams = computed(() => {
    let teams = this.svc.getFiltered(this.store.filter());
    const z = this.zoneFilter();
    if (z) teams = teams.filter(t => t.zones.some(zn => zn.name.toLowerCase().includes(z.toLowerCase())));
    return teams;
  });

  allZones = computed(() => {
    const names = new Set<string>();
    this.svc.teams().forEach(t => t.zones.forEach(z => names.add(z.name)));
    return [...names].sort();
  });

  totalPages     = computed(() => Math.max(1, Math.ceil(this.filteredTeams().length / this.store.pageSize)));
  pages          = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  pageStart      = computed(() => this.filteredTeams().length === 0 ? 0 : (this.store.currentPage() - 1) * this.store.pageSize + 1);
  pageEnd        = computed(() => Math.min(this.store.currentPage() * this.store.pageSize, this.filteredTeams().length));
  paginatedTeams = computed(() => {
    const p = this.store.currentPage();
    const s = this.store.pageSize;
    return this.filteredTeams().slice((p - 1) * s, p * s);
  });

  readonly skeletonRows = Array(8).fill(0);
  readonly teamStatuses = [
    { value: '',           label: 'Tous',         color: '#64748b' },
    { value: 'active',     label: 'Active',        color: '#16a34a' },
    { value: 'inactive',   label: 'Inactive',      color: '#94a3b8' },
    { value: 'on_mission', label: 'En mission',    color: '#f59e0b' },
    { value: 'maintenance',label: 'Maintenance',   color: '#ef4444' },
  ];

  ngOnInit(): void {
    this.svc.loadTeams();
    // Bind loading to service signal and fall back after timeout
    const unsub = setInterval(() => {
      if (!this.svc.loading()) { this.loading.set(false); clearInterval(unsub); }
    }, 100);
    setTimeout(() => { this.loading.set(false); clearInterval(unsub); }, 5000);

    const qs = this.route.snapshot.queryParamMap;
    if (qs.get('create') === '1') {
      this.openCreate();
      this.router.navigate([], { replaceUrl: true });
    }
  }

  // ── Search & Filters ──────────────────────────────────────
  setSearch(val: string): void       { this.store.setSearch(val); this.dt?.filterGlobal(val, 'contains'); }
  setStatus(v: string): void         { this.store.setStatus(v); }
  setZone(v: string): void           { this.zoneFilter.set(v); }
  setHasVehicle(v: boolean | null): void { this.store.setHasVehicle(v); }
  setSortBy(v: string): void         { this.store.setSortBy(v as any); }
  toggleSortDir(): void              { this.store.toggleSortDir(); }
  clearFilters(): void               { this.store.clearFilters(); this.zoneFilter.set(''); }
  toggleFilters(): void              { this.store.showFilters.update(v => !v); }

  prevPage(): void { this.store.currentPage.update(p => Math.max(1, p - 1)); }
  nextPage(): void { this.store.currentPage.update(p => Math.min(this.totalPages(), p + 1)); }

  get activeFilterCount(): number {
    return this.store.activeFilterCount() + (this.zoneFilter() ? 1 : 0);
  }

  // ── Context Menu ──────────────────────────────────────────
  buildContextMenu(team: Team): void {
    this.ctxTeam.set(team);
    this.contextMenuItems.set([
      { label: 'Voir le détail', icon: 'pi pi-eye',    command: () => this.goToDetail(team.id) },
      { label: 'Modifier',       icon: 'pi pi-pencil', command: () => this.openEdit(team) },
      { separator: true },
      {
        label: 'Changer le statut',
        icon:  'pi pi-sync',
        items: [
          { label: 'Active',      icon: 'pi pi-check-circle', disabled: team.status === 'active',      command: () => this.changeStatus(team, 'active') },
          { label: 'Inactive',    icon: 'pi pi-ban',          disabled: team.status === 'inactive',    command: () => this.changeStatus(team, 'inactive') },
          { label: 'En mission',  icon: 'pi pi-send',         disabled: team.status === 'on_mission',  command: () => this.changeStatus(team, 'on_mission') },
          { label: 'Maintenance', icon: 'pi pi-wrench',       disabled: team.status === 'maintenance', command: () => this.changeStatus(team, 'maintenance') },
        ],
      },
      { separator: true },
      { label: 'Supprimer', icon: 'pi pi-trash', styleClass: 'ctx-danger', command: () => this.confirmDelete(team) },
    ]);
  }

  // ── Navigation ────────────────────────────────────────────
  openModal(team: Team): void {
    this.modalTeam.set(team);
    this.modalOpen.set(true);
    this.modalLoading.set(true);
    this.svc.getTeamV2(team.id).subscribe({
      next: full => {
        if (this.modalOpen()) this.modalTeam.set(full);
        this.modalLoading.set(false);
      },
      error: () => this.modalLoading.set(false),
    });
  }
  goToDetail(id: string): void { this.router.navigate(['/teams/detail', id]); }

  // ── CRUD ──────────────────────────────────────────────────
  openCreate(): void  { this.editingTeam.set(null);  this.formOpen.set(true); }
  openEdit(t: Team): void { this.editingTeam.set(t); this.formOpen.set(true); }

  onFormSave(data: TeamFormData): void {
    const editing = this.editingTeam();
    const vehicle = data.vehicleId
      ? this.svc.availableVehicles().find(v => v.id === data.vehicleId)
      : undefined;
    const zones = (data.zoneIds ?? [])
      .map(id => this.svc.availableZones().find(z => z.id === id))
      .filter(Boolean) as any[];

    const members: TeamMember[] = (data.members ?? []).map((m, i) => ({
      id:           m._id && !m._id.startsWith('LOCAL-') ? m._id : `LOCAL-${Date.now()}-${i}`,
      name:         m.name,
      phone:        m.phone,
      role:         m.role,
      availability: 'disponible' as const,
      joinedAt:     new Date().toISOString().split('T')[0],
    }));

    const payload: Partial<Team> & { name: string } = {
      name:        data.name,
      color:       data.color,
      status:      data.status as TeamStatus,
      description: data.description,
      supervisor:  data.supervisor,
      phone:       data.phone,
      members,
      zones,
      vehicle: vehicle
        ? { ...vehicle, lastMaintenance: '—', fuelLevel: 80, mileage: 0 }
        : undefined,
    };

    if (editing) {
      this.svc.updateV2(editing.id, payload).subscribe({
        next: () => {
          this.msg.add({ severity: 'success', summary: 'Modifié', detail: `${data.name} mis à jour` });
          this.formOpen.set(false);
        },
        error: err => {
          const detail = err?.error?.error?.message ?? 'Impossible de mettre à jour';
          this.msg.add({ severity: 'error', summary: 'Erreur', detail });
        },
      });
    } else {
      this.svc.createV2(payload).subscribe({
        next: t => {
          this.msg.add({ severity: 'success', summary: 'Créé !', detail: `Équipe ${t.name} créée` });
          this.formOpen.set(false);
        },
        error: err => {
          const detail = err?.error?.message ?? 'Impossible de créer l\'équipe';
          this.msg.add({ severity: 'error', summary: 'Erreur', detail });
        },
      });
    }
  }

  toggleStatus(team: Team): void {
    const next: TeamStatus = team.status === 'active' ? 'inactive' : 'active';
    this.changeStatus(team, next);
  }

  changeStatus(team: Team, status: TeamStatus): void {
    this.svc.changeStatus(team.id, status).subscribe({
      next: t => {
        const labels: Record<TeamStatus, string> = {
          active: 'activée', inactive: 'désactivée',
          on_mission: 'mise en mission', maintenance: 'mise en maintenance',
        };
        this.msg.add({ severity: 'info', summary: 'Statut modifié', detail: `${t.name} ${labels[t.status]}` });
      },
      error: err => {
        const detail = err?.error?.error?.message ?? 'Impossible de modifier le statut';
        this.msg.add({ severity: 'error', summary: 'Erreur', detail });
      },
    });
  }

  confirmDelete(team: Team): void { this.deletingTeam.set(team); this.confirmDeleteOpen.set(true); }

  doDelete(): void {
    const t = this.deletingTeam();
    if (!t) return;
    this.svc.delete(t.id).subscribe(() => {
      this.msg.add({ severity: 'warn', summary: 'Supprimé', detail: `${t.name} supprimée` });
      this.confirmDeleteOpen.set(false);
      this.deletingTeam.set(null);
    });
  }

  // ── Exports ───────────────────────────────────────────────
  exportCSV(): void {
    const headers = ['Code', 'Nom', 'Chef', 'Statut', 'Membres', 'Véhicule', 'Zone', 'Charge', 'Taux réussite'];
    const rows = this.filteredTeams().map(t => [
      t.code, t.name,
      this.getChef(t)?.name ?? '—',
      this.statusLabel(t.status),
      t.members.length,
      t.vehicle ? t.vehicle.plate : '—',
      t.zones[0]?.name ?? '—',
      `${t.workload}%`,
      `${t.successRate}%`,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `equipes-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    this.msg.add({ severity: 'success', summary: 'Export CSV', detail: 'Fichier téléchargé' });
  }

  async exportPDF(): Promise<void> {
    this.msg.add({ severity: 'info', summary: 'Export…', detail: 'Génération du PDF' });
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      doc.setFillColor(22, 163, 74);
      doc.rect(0, 0, 297, 22, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14); doc.setFont('helvetica', 'bold');
      doc.text('SAHELYS – Liste des équipes', 12, 14);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text(`Exporté le ${new Date().toLocaleDateString('fr-FR')} · ${this.filteredTeams().length} équipe(s)`, 200, 14);
      doc.setTextColor(15, 23, 42);

      autoTable(doc, {
        startY: 26,
        head: [['Code', 'Nom', 'Chef d\'équipe', 'Statut', 'Membres', 'Véhicule', 'Zone principale', 'Charge', 'Missions', 'Taux']],
        body: this.filteredTeams().map(t => [
          t.code, t.name,
          this.getChef(t)?.name ?? '—',
          this.statusLabel(t.status),
          t.members.length,
          t.vehicle ? `${t.vehicle.plate} (${t.vehicle.capacityTons}T)` : '—',
          t.zones[0]?.name ?? '—',
          `${t.workload}%`,
          `${t.completedMissions}/${t.totalMissions}`,
          `${t.successRate}%`,
        ]),
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 0: { fontStyle: 'bold' } },
      });

      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setTextColor(148, 163, 184);
        doc.text(`SAHELYS – page ${i}/${pages}`, 12, 205);
      }
      doc.save(`equipes-${new Date().toISOString().slice(0,10)}.pdf`);
      this.msg.add({ severity: 'success', summary: 'PDF prêt', detail: 'Téléchargement démarré' });
    } catch {
      this.msg.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de générer le PDF' });
    }
  }

  // ── Row helpers ───────────────────────────────────────────
  getChef(t: Team): TeamMember | undefined {
    return t.members.find(m => m.role === 'manager');
  }
  getAvailability(t: Team): { available: number; total: number; pct: number } {
    const available = t.members.filter(m => m.availability === 'disponible').length;
    const total = t.members.length;
    return { available, total, pct: total ? Math.round(available / total * 100) : 0 };
  }
  getPrimaryZone(t: Team): string { return t.zones[0]?.name?.split('–')[0]?.trim() ?? '—'; }

  statusLabel(s: string): string {
    return teamStatusLabel(s);
  }
  statusColor(s: string): string {
    return teamStatusColor(s);
  }
  workloadColor(w: number): string {
    if (w >= 80) return '#ef4444';
    if (w >= 50) return '#f59e0b';
    return '#16a34a';
  }
  availColor(pct: number): string {
    if (pct >= 70) return '#16a34a';
    if (pct >= 40) return '#f59e0b';
    return '#ef4444';
  }
  vehicleStatusColor(s: string): string {
    return vehicleStatusColor(s);
  }
  hiddenZonesTooltip(team: Team, from: number): string {
    return team.zones.slice(from).map(z => `${z.name} — ${z.ville}`).join(', ');
  }
}
