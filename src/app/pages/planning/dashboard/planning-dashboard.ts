import { Component, OnInit, signal, computed, inject, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { BadgeModule } from 'primeng/badge';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { PlanningService } from '../services/planning.service';
import { Planning, PlanningAlert, PlanningStatus } from '../models/planning.model';
import { TeamService } from '../../teams/services/team.service';

interface StatCard {
  label: string;
  value: number;
  icon: string;
  color: string;
  bgColor: string;
  trend: number;
  trendLabel: string;
}

@Component({
  selector: 'app-planning-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterLink, MatIconModule,
    ChartModule, TableModule, ButtonModule, TagModule,
    TooltipModule, SkeletonModule,
    BadgeModule, ProgressBarModule,
    ToastModule, ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './planning-dashboard.html',
  styleUrl: './planning-dashboard.scss',
})
export class PlanningDashboard implements OnInit, OnDestroy {
  private planningService    = inject(PlanningService);
  private teamService = inject(TeamService)
  private msg     = inject(MessageService);
  private confirm = inject(ConfirmationService);
  private router  = inject(Router);

  isLoading = signal(true);

  constructor() {
    effect(() => {
      const err = this.planningService.error();
      if (err) {
        this.msg.add({ severity: 'error', summary: 'Erreur', detail: err, life: 5000 });
        this.planningService.clearError();
      }
    });
  }

  // ── Data from service (signals) ────────────────────────────
  stats   = this.planningService.stats;
  alerts  = this.planningService.alerts;
  zones   = this.planningService.zones;
  recentPlannings = signal<Planning[]>([]);

  // ── Teams mapped for display ─────────────────────────────────
  teams = computed(() =>
    this.planningService.teams().map(t => ({
      id:               t._id,
      name:             t.name,
      membersCount:     t.collectors?.length ?? 0,
      status:           t.status === 'active' ? 'disponible' : 'indisponible',
      currentZone:      t.zones?.[0] ?? '—',
      collectionsToday: (t.collectors?.length ?? 0) * 2,
      completionRate:   t.status === 'active' ? 75 : 0,
    }))
  );

  // ── Stat cards ──────────────────────────────────────────────
  statCards = computed<StatCard[]>(() => {
    const s = this.stats();
    return [
      {
        label: 'Total plannings',
        value: s.totalPlannings,
        icon: 'list_alt',
        color: '#3b82f6',
        bgColor: '#eff6ff',
        trend: 12,
        trendLabel: 'vs semaine dernière',
      },
      {
        label: "Plannings aujourd'hui",
        value: s.todayPlannings,
        icon: 'today',
        color: '#f59e0b',
        bgColor: '#fffbeb',
        trend: 8,
        trendLabel: 'vs hier',
      },
      {
        label: "En cours d'exécution",
        value: s.inProgress,
        icon: 'sync',
        color: '#8b5cf6',
        bgColor: '#f5f3ff',
        trend: -2,
        trendLabel: 'vs hier',
      },
      {
        label: "Terminés aujourd'hui",
        value: s.completedToday,
        icon: 'check_circle',
        color: '#16a34a',
        bgColor: '#f0fdf4',
        trend: 5,
        trendLabel: 'vs hier',
      },
    ];
  });

  // ── Charts ──────────────────────────────────────────────────
  typeChartData: any;
  typeChartOptions: any;
  statusChartData: any;
  statusChartOptions: any;
  evolutionChartData: any;
  evolutionChartOptions: any;
  teamWorkloadData: any;
  teamWorkloadOptions: any;

  // ── Notifications overlay ────────────────────────────────────
  notifOpen = signal(false);
  toggleNotif(): void { this.notifOpen.update(v => !v); }

  private refreshTimer: any;

  ngOnInit(): void {
    // Load all data from real API
    this.planningService.loadStats();
    this.planningService.loadZones();
    this.planningService.loadAlerts();
    this.teamService.loadTeams();
    this.planningService.loadPlannings();

    // Wait for data then init charts
    setTimeout(() => {
      this.recentPlannings.set(this.planningService.getRecentPlannings(6));
      this.isLoading.set(false);
      this._initCharts();
    }, 1200);

    // Refresh recent plannings periodically
    this.refreshTimer = setInterval(() => {
      this.recentPlannings.set(this.planningService.getRecentPlannings(6));
      this._initCharts();
    }, 30_000);
  }

  ngOnDestroy(): void {
    clearInterval(this.refreshTimer);
  }

  private _initCharts(): void {
    const byType   = this.planningService.planningsByType();
    const byStatus = this.planningService.planningsByStatus();
    const workload = this.planningService.teamWorkload();

    // ── Donut – par type ──────────────────────────────────────
    this.typeChartData = {
      labels: ['Client individuel', 'Groupe de clients', 'Par zone', 'Par secteur'],
      datasets: [{
        data: [byType.individuel, byType.groupe, byType.zone, byType.secteur],
        backgroundColor: ['#3b82f6', '#8b5cf6', '#16a34a', '#f59e0b'],
        hoverBackgroundColor: ['#2563eb', '#7c3aed', '#15803d', '#d97706'],
        borderWidth: 2,
        borderColor: '#ffffff',
      }],
    };
    this.typeChartOptions = this._donutOptions();

    // ── Donut – par statut ────────────────────────────────────
    this.statusChartData = {
      labels: ['Brouillon', 'Planifié', 'En cours', 'Terminé'],
      datasets: [{
        data: [byStatus.brouillon, byStatus.planifie, byStatus.en_cours, byStatus.termine],
        backgroundColor: ['#94a3b8', '#3b82f6', '#f59e0b', '#16a34a'],
        hoverBackgroundColor: ['#64748b', '#2563eb', '#d97706', '#15803d'],
        borderWidth: 2,
        borderColor: '#ffffff',
      }],
    };
    this.statusChartOptions = this._donutOptions();

    // ── Line – évolution hebdomadaire ─────────────────────────
    this.evolutionChartData = {
      labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
      datasets: [
        {
          label: 'Planifiées',
          data: [18, 22, 15, 28, 24, 10, 8],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.08)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#3b82f6',
          pointRadius: 4,
        },
        {
          label: 'Effectuées',
          data: [16, 20, 13, 25, 22, 9, 6],
          borderColor: '#16a34a',
          backgroundColor: 'rgba(22,163,74,0.08)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#16a34a',
          pointRadius: 4,
        },
      ],
    };
    this.evolutionChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8, font: { size: 12 } } },
        tooltip: { mode: 'index', intersect: false },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 11 } }, beginAtZero: true },
      },
    };

    // ── Bar – charge des équipes ──────────────────────────────
    this.teamWorkloadData = {
      labels: workload.map(t => t.name),
      datasets: [{
        label: 'Collecteurs',
        data: workload.map(t => t.value),
        backgroundColor: ['#3b82f6', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
        borderRadius: 6,
        borderSkipped: false,
      }],
    };
    this.teamWorkloadOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.raw} collecteurs` } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 11 } }, beginAtZero: true },
      },
    };
  }

  private _donutOptions(): any {
    return {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 14, font: { size: 11 } } },
        tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.label}: ${ctx.raw} (${ctx.formattedValue})` } },
      },
    };
  }

  // ── UI helpers ──────────────────────────────────────────────
  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const map: Record<string, any> = {
      planifie: 'info',
      en_cours: 'warn',
      termine:  'success',
      brouillon:'secondary',
      annule:   'danger',
    };
    return map[status] ?? 'secondary';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      planifie: 'Planifié',
      en_cours: 'En cours',
      termine:  'Terminé',
      brouillon:'Brouillon',
      annule:   'Annulé',
    };
    return map[status] ?? status;
  }

  getTypeLabel(type: string): string {
    const map: Record<string, string> = {
      individuel: 'Individuel',
      groupe:     'Groupe',
      zone:       'Par zone',
      secteur:    'Par secteur',
    };
    return map[type] ?? type;
  }

  getTypeIcon(type: string): string {
    const map: Record<string, string> = {
      individuel: 'person',
      groupe:     'groups',
      zone:       'map',
      secteur:    'grid_view',
    };
    return map[type] ?? 'list_alt';
  }

  getTypeColor(type: string): string {
    const map: Record<string, string> = {
      individuel: '#3b82f6',
      groupe:     '#8b5cf6',
      zone:       '#16a34a',
      secteur:    '#f59e0b',
    };
    return map[type] ?? '#64748b';
  }

  getAlertIcon(type: string): string {
    const map: Record<string, string> = {
      warning: 'warning',
      danger:  'error',
      info:    'info',
      success: 'check_circle',
    };
    return map[type] ?? 'notifications';
  }

  getTeamStatusColor(status: string): string {
    return ({ disponible: '#16a34a', en_service: '#f59e0b', indisponible: '#ef4444' } as Record<string,string>)[status] ?? '#64748b';
  }

  getTeamStatusLabel(status: string): string {
    return ({ disponible: 'Disponible', en_service: 'En service', indisponible: 'Indisponible' } as Record<string,string>)[status] ?? status;
  }

  // ── Planning status actions ──────────────────────────────────

  actionLoading = signal<string | null>(null); // ID du planning en cours d'action

  /** brouillon → planifie */
  publishPlanning(p: Planning): void {
    this.confirm.confirm({
      message: `Publier le planning <strong>${p.reference}</strong> ?<br>Il sera visible et exécutable par les équipes.`,
      header: 'Confirmer la publication',
      icon: 'pi pi-send',
      acceptLabel: 'Publier',
      rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        this.actionLoading.set(p.id);
        this.planningService.publishPlanning(p.id).subscribe({
          next: (res) => {
            this._refreshPlannings(p.id, res?.data?.planningStatus ?? 'planifie');
            this.msg.add({ severity: 'success', summary: 'Publié', detail: `${p.reference} est maintenant planifié.` });
          },
          error: (err) => {
            const detail = err?.error?.error?.message ?? 'Impossible de publier ce planning';
            this.msg.add({ severity: 'error', summary: 'Erreur', detail });
          },
          complete: () => this.actionLoading.set(null),
        });
      },
    });
  }

  /** planifie → en_cours */
  startPlanning(p: Planning): void {
    this.actionLoading.set(p.id);
    this.planningService.startPlanning(p.id).subscribe({
      next: (res) => {
        this._refreshPlannings(p.id, res?.data?.planningStatus ?? 'en_cours');
        this.msg.add({ severity: 'info', summary: 'Démarré', detail: `${p.reference} est maintenant en cours.` });
      },
      error: (err) => {
        const detail = err?.error?.error?.message ?? 'Impossible de démarrer ce planning';
        this.msg.add({ severity: 'error', summary: 'Erreur', detail });
      },
      complete: () => this.actionLoading.set(null),
    });
  }

  /** en_cours → termine */
  completePlanning(p: Planning): void {
    this.actionLoading.set(p.id);
    this.planningService.completePlanning(p.id).subscribe({
      next: (res) => {
        this._refreshPlannings(p.id, res?.data?.planningStatus ?? 'termine');
        this.msg.add({ severity: 'success', summary: 'Terminé', detail: `${p.reference} marqué comme terminé.` });
      },
      error: (err) => {
        const detail = err?.error?.error?.message ?? 'Impossible de terminer ce planning';
        this.msg.add({ severity: 'error', summary: 'Erreur', detail });
      },
      complete: () => this.actionLoading.set(null),
    });
  }

  /** planifie | en_cours → annule */
  cancelPlanning(p: Planning): void {
    this.confirm.confirm({
      message: `Annuler le planning <strong>${p.reference}</strong> ?<br>Cette action est irréversible.`,
      header: 'Confirmer l\'annulation',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Annuler le planning',
      rejectLabel: 'Retour',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.actionLoading.set(p.id);
        this.planningService.cancelPlanning(p.id).subscribe({
          next: (res) => {
            this._refreshPlannings(p.id, res?.data?.planningStatus ?? 'annule');
            this.msg.add({ severity: 'warn', summary: 'Annulé', detail: `${p.reference} a été annulé.` });
          },
          error: (err) => {
            const detail = err?.error?.error?.message ?? 'Impossible d\'annuler ce planning';
            this.msg.add({ severity: 'error', summary: 'Erreur', detail });
          },
          complete: () => this.actionLoading.set(null),
        });
      },
    });
  }

  navigateToEdit(p: Planning): void {
    this.router.navigate(['/planning/create'], { queryParams: { edit: p.id } });
  }

  /** brouillon → supprimé */
  deletePlanning(p: Planning): void {
    this.confirm.confirm({
      message: `Supprimer définitivement le planning <strong>${p.reference}</strong> ?<br>Cette action est irréversible.`,
      header: 'Confirmer la suppression',
      icon: 'pi pi-trash',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.actionLoading.set(p.id);
        this.planningService.deletePlanning(p.id).subscribe({
          next: () => {
            this.recentPlannings.update(list => list.filter(x => x.id !== p.id));
            this.msg.add({ severity: 'success', summary: 'Supprimé', detail: `Planning ${p.reference} supprimé.` });
          },
          error: (err) => {
            const detail = err?.error?.error?.message ?? 'Impossible de supprimer ce planning';
            this.msg.add({ severity: 'error', summary: 'Erreur', detail });
          },
          complete: () => this.actionLoading.set(null),
        });
      },
    });
  }

  private _refreshPlannings(id: string, newStatus: PlanningStatus): void {
    this.recentPlannings.update(list =>
      list.map(x => x.id === id ? { ...x, status: newStatus } : x)
    );
  }

  dismissAlert(id: string): void { this.planningService.dismissAlert(id); }
  trackByRef(_i: number, p: Planning): string { return p.id; }
  trackByAlert(_i: number, a: PlanningAlert): string { return a.id; }
}
