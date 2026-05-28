import { Component, OnInit, signal, computed, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { BadgeModule } from 'primeng/badge';
import { ProgressBarModule } from 'primeng/progressbar';
import { PlanningService } from '../services/planning.service';
import { Planning, PlanningAlert, PlanningTeam } from '../models/planning.model';

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
  ],
  templateUrl: './planning-dashboard.html',
  styleUrl: './planning-dashboard.scss',
})
export class PlanningDashboard implements OnInit, OnDestroy {
  private svc = inject(PlanningService);

  isLoading = signal(true);

  // ---- Data from service (signals) ----
  stats       = this.svc.stats;
  alerts      = this.svc.alerts;
  teams       = this.svc.teams;
  recentPlannings = signal<Planning[]>([]);
  zones = this.svc.zones;

  // ---- Stat cards ----
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

  // ---- Charts ----
  typeChartData: any;
  typeChartOptions: any;
  statusChartData: any;
  statusChartOptions: any;
  evolutionChartData: any;
  evolutionChartOptions: any;
  teamWorkloadData: any;
  teamWorkloadOptions: any;

  // ---- Notifications overlay ----
  notifOpen = signal(false);

  toggleNotif(): void { this.notifOpen.update(v => !v); }
  private refreshTimer: any;

  ngOnInit(): void {
    this.recentPlannings.set(this.svc.getRecentPlannings(6));
    setTimeout(() => {
      this.isLoading.set(false);
      this._initCharts();
    }, 600);

    this.refreshTimer = setInterval(() => {
      this.recentPlannings.set(this.svc.getRecentPlannings(6));
    }, 30_000);
  }

  ngOnDestroy(): void {
    clearInterval(this.refreshTimer);
  }

  private _initCharts(): void {
    const byType   = this.svc.planningsByType();
    const byStatus = this.svc.planningsByStatus();
    const workload = this.svc.teamWorkload();

    // ---- Donut – par type ----
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
    this.typeChartOptions = this._donutOptions('Répartition par type');

    // ---- Donut – par statut ----
    this.statusChartData = {
      labels: ['Brouillon', 'Publié', 'En cours', 'Terminé'],
      datasets: [{
        data: [byStatus.brouillon, byStatus.publie, byStatus.en_cours, byStatus.termine],
        backgroundColor: ['#94a3b8', '#3b82f6', '#f59e0b', '#16a34a'],
        hoverBackgroundColor: ['#64748b', '#2563eb', '#d97706', '#15803d'],
        borderWidth: 2,
        borderColor: '#ffffff',
      }],
    };
    this.statusChartOptions = this._donutOptions('Répartition par statut');

    // ---- Line – évolution des collectes ----
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

    // ---- Bar – charge des équipes ----
    this.teamWorkloadData = {
      labels: workload.map(t => t.name),
      datasets: [{
        label: 'Collectes du jour',
        data: workload.map(t => t.value),
        backgroundColor: ['#3b82f6', '#16a34a', '#f59e0b', '#ef4444'],
        borderRadius: 6,
        borderSkipped: false,
      }],
    };
    this.teamWorkloadOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.raw} collectes` } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 11 } }, beginAtZero: true },
      },
    };
  }

  private _donutOptions(title: string): any {
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

  // ---- UI helpers ----
  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const map: Record<string, any> = {
      publie: 'info',
      en_cours: 'warn',
      termine: 'success',
      brouillon: 'secondary',
      annule: 'danger',
    };
    return map[status] ?? 'secondary';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      publie: 'Publié',
      en_cours: 'En cours',
      termine: 'Terminé',
      brouillon: 'Brouillon',
      annule: 'Annulé',
    };
    return map[status] ?? status;
  }

  getTypeLabel(type: string): string {
    const map: Record<string, string> = {
      individuel: 'Individuel',
      groupe: 'Groupe',
      zone: 'Par zone',
      secteur: 'Par secteur',
    };
    return map[type] ?? type;
  }

  getTypeIcon(type: string): string {
    const map: Record<string, string> = {
      individuel: 'person',
      groupe: 'groups',
      zone: 'map',
      secteur: 'grid_view',
    };
    return map[type] ?? 'list_alt';
  }

  getTypeColor(type: string): string {
    const map: Record<string, string> = {
      individuel: '#3b82f6',
      groupe: '#8b5cf6',
      zone: '#16a34a',
      secteur: '#f59e0b',
    };
    return map[type] ?? '#64748b';
  }

  getAlertIcon(type: string): string {
    const map: Record<string, string> = {
      warning: 'warning',
      danger: 'error',
      info: 'info',
      success: 'check_circle',
    };
    return map[type] ?? 'notifications';
  }

  getTeamStatusColor(status: string): string {
    const map: Record<string, string> = {
      disponible: '#16a34a',
      en_service: '#f59e0b',
      indisponible: '#ef4444',
    };
    return map[status] ?? '#64748b';
  }

  getTeamStatusLabel(status: string): string {
    const map: Record<string, string> = {
      disponible: 'Disponible',
      en_service: 'En service',
      indisponible: 'Indisponible',
    };
    return map[status] ?? status;
  }

  dismissAlert(id: string): void {
    this.svc.dismissAlert(id);
  }

  trackByRef(_i: number, p: Planning): string { return p.id; }
}
