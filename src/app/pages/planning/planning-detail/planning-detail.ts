import {
  Component, OnInit, OnDestroy, signal, computed, inject,
  ViewChild, ElementRef, AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TimelineModule } from 'primeng/timeline';
import { ChartModule } from 'primeng/chart';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import * as L from 'leaflet';
import { PlanningService } from '../services/planning.service';
import { Planning, TeamApi } from '../models/planning.model';
import { AgencyService } from '../../../services/agency.service';
interface Incident {
  id: string; severity: 'critical' | 'warning' | 'info';
  title: string; description: string; reporter: string;
  reportedAt: string; resolved: boolean; resolvedAt?: string;
}
interface ActivityEvent {
  date: string; icon: string; color: string; title: string; detail: string;
}
interface RoundHistory {
  date: string; teams: string[]; status: string;
  householdsCollected: number; duration: string; completionRate: number;
}
interface Notification {
  id: string; channel: 'sms' | 'email' | 'app';
  recipient: string; message: string;
  sentAt: string; status: 'sent' | 'delivered' | 'read' | 'failed';
}

@Component({
  selector: 'app-planning-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink, MatIconModule,
    TimelineModule, ChartModule, TagModule, ToastModule, TooltipModule, SkeletonModule,
  ],
  providers: [MessageService],
  templateUrl: './planning-detail.html',
  styleUrl: './planning-detail.scss',
})
export class PlanningDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapEl') mapElRef!: ElementRef<HTMLDivElement>;

  private route        = inject(ActivatedRoute);
  private router       = inject(Router);
  private svc          = inject(PlanningService);
  private msg          = inject(MessageService);
  private agencySvc    = inject(AgencyService);

  private leafletMap!: L.Map;

  // ── State ─────────────────────────────────────────────────────
  agencyName    = signal('');
  isLoading     = signal(true);
  notFound      = signal(false);
  activeSection = signal('info');
  showCancelDlg   = signal(false);
  showStartDlg    = signal(false);
  showCompleteDlg = signal(false);
  showDupDlg      = signal(false);
  showDeleteDlg   = signal(false);
  isActioning   = signal(false);
  planning      = signal<Planning | null>(null);

  // ── Teams (real API data) ─────────────────────────────────────
  allTeams         = signal<TeamApi[]>([]);
  isLoadingTeams   = signal(false);
  addTeamOpen      = signal(false);
  teamSaving       = signal(false);
  teamSearch       = signal('');

  assignedTeams = computed(() => {
    const tid = this.planning()?.teamId;
    if (!tid) return [];
    const t = this.allTeams().find(x => x._id === tid);
    return t ? [t] : [];
  });
  availableTeams = computed(() => {
    const tid = this.planning()?.teamId;
    const q   = this.teamSearch().toLowerCase();
    return this.allTeams()
      .filter(t => t._id !== tid)
      .filter(t => !q || t.name.toLowerCase().includes(q));
  });
  canEditTeams = computed(() =>
    ['brouillon', 'planifie'].includes(this.planning()?.status ?? '')
  );

  // ── Mock detail data (incidents, history, notifications) ──────
  incidents     = signal<Incident[]>([]);
  activities    = signal<ActivityEvent[]>([]);
  history       = signal<RoundHistory[]>([]);
  notifications = signal<Notification[]>([]);

  // ── Computed ──────────────────────────────────────────────────
  statusColor = computed(() => {
    const m: Record<string, string> = {
      brouillon: '#94a3b8', planifie: '#3b82f6', en_cours: '#f59e0b',
      termine: '#16a34a', annule: '#ef4444',
    };
    return m[this.planning()?.status ?? ''] ?? '#64748b';
  });

  statusLabel = computed(() => {
    const m: Record<string, string> = {
      brouillon: 'Brouillon', planifie: 'Planifié', en_cours: 'En cours',
      termine: 'Terminé', annule: 'Annulé',
    };
    return m[this.planning()?.status ?? ''] ?? '—';
  });

  typeLabel = computed(() => {
    const m: Record<string, string> = {
      individuel: 'Client individuel', groupe: 'Groupe', zone: 'Par zone', secteur: 'Par secteur',
    };
    return m[this.planning()?.type ?? ''] ?? '—';
  });

  typeIcon = computed(() => {
    return ({ individuel: 'person', groupe: 'groups', zone: 'map', secteur: 'grid_view' } as Record<string,string>)[this.planning()?.type ?? ''] ?? 'list_alt';
  });

  typeColor = computed(() => {
    return ({ individuel: '#3b82f6', groupe: '#8b5cf6', zone: '#16a34a', secteur: '#f59e0b' } as Record<string,string>)[this.planning()?.type ?? ''] ?? '#64748b';
  });

  frequencyLabel = computed(() => {
    const m: Record<string, string> = { unique: 'Collecte unique', hebdomadaire: 'Hebdomadaire', bimensuel: 'Bimensuel', mensuel: 'Mensuel' };
    return m[this.planning()?.frequency ?? ''] ?? '—';
  });

  locationLabel = computed(() => {
    const p = this.planning();
    if (!p) return '—';
    return [p.ville, p.arrondissement, p.secteur, p.quartier].filter(Boolean).join(' › ') || p.zone || '—';
  });

  criticalIncidents = computed(() => this.incidents().filter(i => i.severity === 'critical' && !i.resolved).length);

  // ── Can perform transitions ───────────────────────────────────
  canPublish  = computed(() => this.planning()?.status === 'brouillon');
  canStart    = computed(() => this.planning()?.status === 'planifie');
  canComplete = computed(() => this.planning()?.status === 'en_cours');
  canCancel   = computed(() => ['planifie', 'en_cours'].includes(this.planning()?.status ?? ''));
  canDelete   = computed(() => ['brouillon', 'annule'].includes(this.planning()?.status ?? ''));

  // ── Charts ────────────────────────────────────────────────────
  completionChartData = computed(() => {
    const p    = this.planning();
    const done = p?.status === 'termine' ? p.clientsCount ?? 0 : Math.round((p?.clientsCount ?? 0) * 0.6);
    const rem  = (p?.clientsCount ?? 0) - done;
    return {
      labels: ['Collectés', 'Restants'],
      datasets: [{ data: [done, rem], backgroundColor: ['#16a34a', '#f1f5f9'], borderWidth: 0 }],
    };
  });
  completionChartOpts = {
    responsive: true, maintainAspectRatio: false, cutout: '72%',
    plugins: { legend: { display: false } },
  };

  historyChartData = computed(() => ({
    labels: this.history().map(h => h.date),
    datasets: [{
      label: 'Ménages collectés', data: this.history().map(h => h.householdsCollected),
      backgroundColor: '#3b82f620', borderColor: '#3b82f6', borderWidth: 2,
      borderRadius: 6, tension: 0.4, fill: true,
    }],
  }));
  historyChartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { grid: { color: 'rgba(0,0,0,.05)' }, ticks: { font: { size: 10 } }, beginAtZero: true },
    },
  };

  // ── Lifecycle ─────────────────────────────────────────────────
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this._fetchPlanning(id);
    this._loadTeams();
    this._loadAgencyName();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (!this.notFound()) this._initMap();
    }, 600);
  }

  ngOnDestroy(): void {
    if (this.leafletMap) this.leafletMap.remove();
  }

  // ── Fetch from API ────────────────────────────────────────────
  private _fetchPlanning(id: string): void {
    // First check if already in service cache
    const cached = this.svc.plannings().find(p => p.id === id);
    if (cached) {
      this.planning.set(cached);
      this._buildActivities(cached);
      this._loadRoundsIncidentsNotifications(id);
      this.isLoading.set(false);
      return;
    }

    this.svc.getPlanning(id).subscribe({
      next: (p) => {
        this.planning.set(p);
        this._buildActivities(p);
        this._loadRoundsIncidentsNotifications(id);
        this.isLoading.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.isLoading.set(false);
      },
    });
  }

  // ── Tournées / Incidents / Notifications (données réelles) ────
  private _loadRoundsIncidentsNotifications(planningId: string): void {
    this.svc.getRounds(planningId).subscribe(rounds => {
      this.history.set(rounds.map((r: any) => ({
        date:                 new Date(r.date).toLocaleDateString('fr-FR'),
        teams:                (r.equipeIds ?? []).map((e: any) => e?.name ?? e),
        status:               r.status,
        householdsCollected:  r.householdsCollected,
        duration:             r.duration ?? '—',
        completionRate:       r.completionRate,
      })));
    });

    this.svc.getIncidents(planningId).subscribe(incidents => {
      this.incidents.set(incidents.map((i: any) => ({
        id:          i._id,
        severity:    i.severity,
        title:       i.title,
        description: i.description,
        reporter:    i.reporter,
        reportedAt:  i.reportedAt,
        resolved:    i.resolved,
        resolvedAt:  i.resolvedAt,
      })));
    });

    this.svc.getPlanningNotifications(planningId).subscribe(notifs => {
      this.notifications.set(notifs.map((n: any) => ({
        id:        n._id,
        channel:   'app',
        recipient: n.user?.firstName ? `${n.user.firstName} ${n.user.lastName}` : 'Utilisateur',
        message:   n.message,
        sentAt:    n.createdAt,
        status:    n.read ? 'read' : 'sent',
      })));
    });
  }

  // ── Teams loader ─────────────────────────────────────────────
  private _loadTeams(): void {
    this.isLoadingTeams.set(true);
    this.svc.getTeamsForAgency().subscribe({
      next:  teams => { this.allTeams.set(teams); this.isLoadingTeams.set(false); },
      error: ()    => this.isLoadingTeams.set(false),
    });
  }

  // ── Agency name loader ────────────────────────────────────────
  private _loadAgencyName(): void {
    const agencyId = this.svc.agencyId;
    if (!agencyId) return;
    this.agencySvc.getAgencyByIdFromApi(agencyId).subscribe({
      next:  res => { if (res?.data?.name) this.agencyName.set(res.data.name); },
      error: ()  => {},
    });
  }

  // ── Team add / remove ─────────────────────────────────────────
  openAddTeamDrawer(): void {
    this.teamSearch.set('');
    this.addTeamOpen.set(true);
  }

  assignTeam(teamId: string): void {
    const pid = this.planning()?.id;
    if (!pid || this.teamSaving()) return;
    this.teamSaving.set(true);
    this.svc.addTeamToPlanning(pid, teamId).subscribe({
      next: p => {
        this.planning.update(prev => prev ? { ...prev, teamId: p.teamId, equipeIds: p.equipeIds, teams: p.teams } : prev);
        this.msg.add({ severity: 'success', summary: 'Équipe affectée', detail: `${this.allTeams().find(t => t._id === teamId)?.name ?? teamId} assignée` });
        this.teamSaving.set(false);
        this.addTeamOpen.set(false);
      },
      error: err => {
        this.msg.add({ severity: 'error', summary: 'Erreur', detail: err?.error?.message ?? 'Assignation impossible', life: 5000 });
        this.teamSaving.set(false);
      },
    });
  }

  removeTeam(): void {
    const pid = this.planning()?.id;
    if (!pid || this.teamSaving()) return;
    this.teamSaving.set(true);
    this.svc.removeTeamFromPlanning(pid).subscribe({
      next: p => {
        this.planning.update(prev => prev ? { ...prev, teamId: p.teamId, equipeIds: p.equipeIds, teams: p.teams } : prev);
        this.teamSaving.set(false);
      },
      error: err => {
        this.msg.add({ severity: 'error', summary: 'Erreur', detail: err?.error?.message ?? 'Impossible de retirer l\'équipe' });
        this.teamSaving.set(false);
      },
    });
  }

  teamMembersCount(t: TeamApi): number { return t.members?.length ?? t.collectors?.length ?? 0; }

  teamStatusBadgeColor(status: string): string {
    return ({ active: '#16a34a', on_mission: '#f59e0b', inactive: '#ef4444', maintenance: '#64748b' } as Record<string,string>)[status] ?? '#94a3b8';
  }
  teamStatusBadgeLabel(status: string): string {
    return ({ active: 'Disponible', on_mission: 'En mission', inactive: 'Indisponible', maintenance: 'Maintenance' } as Record<string,string>)[status] ?? status;
  }

  // ── Scroll to section ─────────────────────────────────────────
  scrollTo(id: string): void {
    this.activeSection.set(id);
    document.getElementById('section-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── Status transitions ────────────────────────────────────────
  publishPlanning(): void {
    const p = this.planning();
    if (!p || this.isActioning()) return;
    this.isActioning.set(true);
    this.svc.publishPlanning(p.id).subscribe({
      next: (res) => {
        this.planning.update(prev => prev ? { ...prev, status: res.data?.planningStatus ?? 'planifie', publishedAt: res.data?.publishedAt ?? prev.publishedAt } : prev);
        if (this.planning()) this._buildActivities(this.planning()!);
        this.msg.add({ severity: 'success', summary: 'Publié', detail: `Planning "${p.reference}" planifié avec succès` });
        this.isActioning.set(false);
      },
      error: (err) => {
        this.msg.add({ severity: 'error', summary: 'Erreur', detail: err?.error?.error?.message ?? 'Impossible de publier' });
        this.isActioning.set(false);
      },
    });
  }

  startPlanning(): void {
    this.showStartDlg.set(false);
    const p = this.planning();
    if (!p || this.isActioning()) return;
    this.isActioning.set(true);
    this.svc.startPlanning(p.id).subscribe({
      next: (res) => {
        this.planning.update(prev => prev ? { ...prev, status: res.data?.planningStatus ?? 'en_cours', startedAt: res.data?.startedAt ?? prev.startedAt } : prev);
        if (this.planning()) this._buildActivities(this.planning()!);
        this.msg.add({ severity: 'info', summary: 'Démarré', detail: `Planning "${p.reference}" en cours` });
        this.isActioning.set(false);
      },
      error: (err) => {
        this.msg.add({ severity: 'error', summary: 'Erreur', detail: err?.error?.error?.message ?? 'Impossible de démarrer' });
        this.isActioning.set(false);
      },
    });
  }

  completePlanning(): void {
    this.showCompleteDlg.set(false);
    const p = this.planning();
    if (!p || this.isActioning()) return;
    this.isActioning.set(true);
    this.svc.completePlanning(p.id).subscribe({
      next: (res) => {
        this.planning.update(prev => prev ? { ...prev, status: res.data?.planningStatus ?? 'termine', completedAt: res.data?.completedAt ?? prev.completedAt } : prev);
        if (this.planning()) this._buildActivities(this.planning()!);
        this.msg.add({ severity: 'success', summary: 'Terminé', detail: `Planning "${p.reference}" complété` });
        this.isActioning.set(false);
      },
      error: (err) => {
        this.msg.add({ severity: 'error', summary: 'Erreur', detail: err?.error?.error?.message ?? 'Impossible de terminer' });
        this.isActioning.set(false);
      },
    });
  }

  cancelPlanning(): void {
    this.showCancelDlg.set(false);
    const p = this.planning();
    if (!p || this.isActioning()) return;
    this.isActioning.set(true);
    this.svc.cancelPlanning(p.id).subscribe({
      next: (res) => {
        this.planning.update(prev => prev ? { ...prev, status: res.data?.planningStatus ?? 'annule', cancelledAt: res.data?.cancelledAt ?? prev.cancelledAt } : prev);
        if (this.planning()) this._buildActivities(this.planning()!);
        this.msg.add({ severity: 'warn', summary: 'Annulé', detail: `Planning "${p.reference}" annulé` });
        this.isActioning.set(false);
      },
      error: (err) => {
        this.msg.add({ severity: 'error', summary: 'Erreur', detail: err?.error?.error?.message ?? 'Impossible d\'annuler' });
        this.isActioning.set(false);
      },
    });
  }

  deletePlanning(): void {
    const p = this.planning();
    if (!p || this.isActioning()) return;
    this.showDeleteDlg.set(false);
    this.isActioning.set(true);
    this.svc.deletePlanning(p.id).subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: 'Supprimé', detail: `Planning "${p.reference}" supprimé` });
        setTimeout(() => this.router.navigate(['/planning/dashboard']), 1000);
      },
      error: (err) => {
        this.msg.add({ severity: 'error', summary: 'Erreur', detail: err?.error?.error?.message ?? 'Impossible de supprimer' });
        this.isActioning.set(false);
      },
    });
  }

  editPlanning(): void {
    const p = this.planning();
    if (!p) return;
    this.router.navigate(['/planning/create'], { queryParams: { edit: p.id } });
  }

  duplicatePlanning(): void {
    this.showDupDlg.set(false);
    const p = this.planning();
    if (!p) return;
    this.router.navigate(['/planning/create'], { queryParams: { duplicate: p.id } });
  }

  // ── PDF export ────────────────────────────────────────────────
  async exportPDF(): Promise<void> {
    const p = this.planning();
    if (!p) return;
    this.msg.add({ severity: 'info', summary: 'Export…', detail: 'Génération du PDF en cours' });
    try {
      const { default: jsPDF }    = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      doc.setFillColor(22, 163, 74);
      doc.rect(0, 0, 210, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18); doc.setFont('helvetica', 'bold');
      doc.text(`${this.agencyName() || 'WASTE MANAGEMENT'} – Planning de collecte`, 14, 14);
      doc.setFontSize(10); doc.setFont('helvetica', 'normal');
      doc.text(`Référence : ${p.reference}  •  Statut : ${this.statusLabel()}`, 14, 22);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(14); doc.setFont('helvetica', 'bold');
      doc.text(p.libelle, 14, 40);

      autoTable(doc, {
        startY: 46,
        head:   [['Champ', 'Valeur']],
        body:   [
          ['Type',        this.typeLabel()],
          ['Référence',   p.reference],
          ['Statut',      this.statusLabel()],
          ['Date',        p.date],
          ['Heure',       `${p.startTime}${p.endTime ? ' – ' + p.endTime : ''}`],
          ['Fréquence',   this.frequencyLabel()],
          ['Localisation',this.locationLabel()],
          ['Ménages',     String(p.clientsCount ?? '—')],
          ['Déchets',     p.wasteTypes.join(', ')],
          ['Équipes',     p.teams.join(', ')],
        ],
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 10 },
      });

      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setTextColor(148, 163, 184);
        doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} par ${this.agencyName() || 'SAHELYS'} – page ${i}/${pages}`, 14, 290);
      }

      doc.save(`planning-${p.reference}.pdf`);
      this.msg.add({ severity: 'success', summary: 'PDF prêt', detail: `planning-${p.reference}.pdf téléchargé` });
    } catch {
      this.msg.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de générer le PDF' });
    }
  }

  // ── UI helpers ────────────────────────────────────────────────
  teamStatusColor(s: string): string {
    return ({ disponible: '#16a34a', en_service: '#f59e0b', indisponible: '#ef4444' } as Record<string,string>)[s] ?? '#64748b';
  }
  teamStatusLabel(s: string): string {
    return ({ disponible: 'Disponible', en_service: 'En service', indisponible: 'Indisponible' } as Record<string,string>)[s] ?? s;
  }
  incidentColor(s: string): string {
    return ({ critical: '#ef4444', warning: '#f59e0b', info: '#3b82f6' } as Record<string,string>)[s] ?? '#64748b';
  }
  incidentLabel(s: string): string {
    return ({ critical: 'Critique', warning: 'Attention', info: 'Info' } as Record<string,string>)[s] ?? s;
  }
  notifIcon(c: string): string {
    return ({ sms: 'sms', email: 'email', app: 'notifications' } as Record<string,string>)[c] ?? 'send';
  }
  notifStatusColor(s: string): string {
    return ({ sent: '#94a3b8', delivered: '#3b82f6', read: '#16a34a', failed: '#ef4444' } as Record<string,string>)[s] ?? '#94a3b8';
  }
  notifStatusLabel(s: string): string {
    return ({ sent: 'Envoyé', delivered: 'Livré', read: 'Lu', failed: 'Échec' } as Record<string,string>)[s] ?? s;
  }

  completionRate(): number {
    const p = this.planning();
    if (!p?.clientsCount) return 0;
    if (p.status === 'termine')  return 100;
    if (p.status === 'en_cours') return 60;
    return 0;
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const m: Record<string, any> = {
      planifie: 'info', en_cours: 'warn', termine: 'success', brouillon: 'secondary', annule: 'danger',
    };
    return m[status] ?? 'secondary';
  }

  // ── Leaflet map ───────────────────────────────────────────────
  private _initMap(): void {
    if (!this.mapElRef?.nativeElement) return;
    const p = this.planning();
    const center: [number, number] = [12.3647, -1.5337];

    this.leafletMap = L.map(this.mapElRef.nativeElement, { center, zoom: 13, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19,
    }).addTo(this.leafletMap);

    L.circle(center, { radius: 600, color: '#16a34a', fillColor: '#16a34a', fillOpacity: 0.1, weight: 2 })
      .bindTooltip(p?.libelle ?? 'Zone de collecte').addTo(this.leafletMap);

    const waypoints: [number, number][] = [
      [center[0] - 0.005, center[1] - 0.006],
      [center[0] - 0.002, center[1] - 0.008],
      [center[0] + 0.003, center[1] - 0.004],
      [center[0] + 0.005, center[1] + 0.002],
      [center[0] + 0.001, center[1] + 0.007],
      [center[0] - 0.004, center[1] + 0.005],
    ];
    L.polyline(waypoints, { color: '#3b82f6', weight: 3, dashArray: '6,4' }).addTo(this.leafletMap);
    waypoints.forEach((wp, i) => {
      L.circleMarker(wp, { radius: 7, fillColor: i === 0 ? '#16a34a' : '#3b82f6', color: '#fff', weight: 2, fillOpacity: 1 })
        .bindTooltip(`Point ${i + 1}`).addTo(this.leafletMap);
    });
  }

  // ── Journal d'activités — construit à partir des vraies dates de transition
  // (publishedAt/startedAt/completedAt/cancelledAt, posées par le backend dans
  // publishPlanning/startPlanning/completePlanning/cancelPlanning). Aucune heure
  // inventée : un événement n'apparaît que si son horodatage existe réellement.
  private _buildActivities(p: Planning): void {
    const events: ActivityEvent[] = [
      { date: p.createdAt, icon: 'add_circle', color: '#3b82f6', title: 'Planning créé', detail: 'Créé par le gestionnaire' },
    ];
    if (p.publishedAt) {
      events.push({ date: p.publishedAt, icon: 'send', color: '#16a34a', title: 'Planning publié', detail: 'Notifications envoyées aux équipes et clients' });
    }
    if (p.startedAt) {
      events.push({ date: p.startedAt, icon: 'play_circle', color: '#f59e0b', title: 'Collecte démarrée', detail: 'Équipes en route' });
    }
    if (p.completedAt) {
      events.push({ date: p.completedAt, icon: 'check_circle', color: '#16a34a', title: 'Collecte terminée', detail: `${p.clientsCount ?? 0} ménages collectés` });
    }
    if (p.cancelledAt) {
      events.push({ date: p.cancelledAt, icon: 'cancel', color: '#ef4444', title: 'Planning annulé', detail: 'Annulé par le gestionnaire' });
    }
    // "Mis à jour" seulement si updatedAt ne correspond à aucun événement déjà listé
    // (sinon on afficherait deux fois le même instant : la transition ET "mis à jour").
    const knownTimestamps = new Set([p.createdAt, p.publishedAt, p.startedAt, p.completedAt, p.cancelledAt].filter(Boolean));
    if (p.updatedAt && !knownTimestamps.has(p.updatedAt)) {
      events.push({ date: p.updatedAt, icon: 'verified', color: '#8b5cf6', title: 'Mis à jour', detail: 'Dernière modification' });
    }
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    this.activities.set(events);
  }

  readonly navSections = [
    { id: 'info',    label: 'Informations', icon: 'info' },
    { id: 'teams',   label: 'Équipes',      icon: 'groups' },
    { id: 'map',     label: 'Carte',        icon: 'map' },
    { id: 'history', label: 'Historique',   icon: 'history' },
    { id: 'incidents',label:'Incidents',    icon: 'warning' },
    { id: 'timeline',label: 'Activités',    icon: 'timeline' },
    { id: 'stats',   label: 'Statistiques', icon: 'bar_chart' },
    { id: 'notifs',  label: 'Notifications',icon: 'notifications' },
  ];
}
