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
import { Planning } from '../models/planning.model';

// ── Local types ────────────────────────────────────────────────
interface TeamDetail {
  id: string; name: string; initials: string; membersCount: number;
  vehicle: string; status: 'disponible' | 'en_service' | 'indisponible';
  workload: number; lastPosition: string; phone: string;
}
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

  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private svc    = inject(PlanningService);
  private msg    = inject(MessageService);

  private leafletMap!: L.Map;

  // ── State ─────────────────────────────────────────────────────
  isLoading     = signal(true);
  notFound      = signal(false);
  activeSection = signal('info');
  showCancelDlg = signal(false);
  showDupDlg    = signal(false);
  isActioning   = signal(false);
  planning      = signal<Planning | null>(null);

  // ── Enriched mock data (kept local — no API endpoint) ─────────
  teams         = signal<TeamDetail[]>([]);
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
  canDelete   = computed(() => this.planning()?.status === 'brouillon');

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
      this._enrichWithMockData(cached);
      this.isLoading.set(false);
      return;
    }

    this.svc.getPlanning(id).subscribe({
      next: (p) => {
        this.planning.set(p);
        this._enrichWithMockData(p);
        this.isLoading.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.isLoading.set(false);
      },
    });
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
        this.planning.update(prev => prev ? { ...prev, status: res.data?.planningStatus ?? 'planifie' } : prev);
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
    const p = this.planning();
    if (!p || this.isActioning()) return;
    this.isActioning.set(true);
    this.svc.startPlanning(p.id).subscribe({
      next: (res) => {
        this.planning.update(prev => prev ? { ...prev, status: res.data?.planningStatus ?? 'en_cours' } : prev);
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
    const p = this.planning();
    if (!p || this.isActioning()) return;
    this.isActioning.set(true);
    this.svc.completePlanning(p.id).subscribe({
      next: (res) => {
        this.planning.update(prev => prev ? { ...prev, status: res.data?.planningStatus ?? 'termine' } : prev);
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
        this.planning.update(prev => prev ? { ...prev, status: res.data?.planningStatus ?? 'annule' } : prev);
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
    this.router.navigate(['/planning/create']);
  }

  async duplicatePlanning(): Promise<void> {
    this.showDupDlg.set(false);
    const p = this.planning();
    if (!p) return;
    const nextDate = this._addDays(p.date, 7);
    this.msg.add({ severity: 'success', summary: 'Dupliqué !', detail: `Planning copié pour le ${nextDate}` });
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
      doc.text('SAHELYS – Planning de collecte', 14, 14);
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
        doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} par SAHELYS – page ${i}/${pages}`, 14, 290);
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

  // ── Mock enrichment (static detail data not covered by API) ───
  private _enrichWithMockData(p: Planning): void {
    this.teams.set([
      { id: 'T1', name: p.teams[0] ?? 'Équipe Alpha', initials: 'α', membersCount: 4, vehicle: 'Camion 01 – 5T', status: 'en_service', workload: 65, lastPosition: this.locationLabel(), phone: '+226 70 00 00 01' },
      ...(p.teams[1] ? [{ id: 'T2', name: p.teams[1], initials: 'β', membersCount: 3, vehicle: 'Camion 02 – 3T', status: 'disponible' as const, workload: 20, lastPosition: 'Base principale', phone: '+226 70 00 00 02' }] : []),
    ]);

    this.activities.set([
      { date: p.createdAt,   icon: 'add_circle',  color: '#3b82f6', title: 'Planning créé',              detail: `Créé par le gestionnaire` },
      { date: p.updatedAt,   icon: 'verified',    color: '#8b5cf6', title: 'Mis à jour',                 detail: 'Dernière modification' },
      ...(p.status !== 'brouillon' ? [
        { date: p.date + ' 06:00', icon: 'send',       color: '#16a34a', title: 'Notifications envoyées', detail: 'Équipes et clients notifiés via SMS' },
        { date: p.date + ' 07:00', icon: 'play_circle', color: '#f59e0b', title: 'Collecte démarrée',    detail: `Équipes en route` },
      ] : []),
      ...(p.status === 'termine' ? [
        { date: p.date + ' 11:30', icon: 'check_circle', color: '#16a34a', title: 'Collecte terminée',  detail: `${p.clientsCount ?? 0} ménages collectés` },
      ] : []),
    ]);

    this.history.set([
      { date: '26/04/2025', teams: [p.teams[0] ?? 'Équipe Alpha'], status: 'termine',  householdsCollected: 44, duration: '3h20', completionRate: 98 },
      { date: '19/04/2025', teams: [p.teams[0] ?? 'Équipe Alpha'], status: 'termine',  householdsCollected: 41, duration: '3h45', completionRate: 91 },
      { date: '12/04/2025', teams: p.teams,                         status: 'termine',  householdsCollected: 45, duration: '2h30', completionRate: 100 },
      { date: '05/04/2025', teams: [p.teams[0] ?? 'Équipe Alpha'], status: 'annule',   householdsCollected: 0,  duration: '—',    completionRate: 0 },
    ]);

    this.notifications.set([
      { id: 'N1', channel: 'sms',   recipient: p.teams[0] ?? 'Équipe Alpha',  message: `Rappel : Collecte prévue ${p.date} ${p.startTime}`, sentAt: p.date + ' 06:00', status: 'read' },
      { id: 'N2', channel: 'email', recipient: 'superviseur@sahelys.com',     message: `Planning ${p.reference} en cours`,                  sentAt: p.date + ' 07:05', status: 'read' },
      { id: 'N3', channel: 'app',   recipient: 'Clients zone',                message: 'Collecte prévue — merci de sortir vos bacs',        sentAt: p.date + ' 05:30', status: 'delivered' },
    ]);

    this.incidents.set([
      { id: 'I1', severity: 'warning', title: 'Bac débordant', description: 'Bac ménager signalé débordant dans la zone.', reporter: 'Équipe', reportedAt: p.date + ' 08:42', resolved: false },
    ]);
  }

  private _addDays(dateStr: string, days: number): string {
    const parts = dateStr.includes('/')
      ? dateStr.split('/').map(Number)
      : dateStr.split('-').map(Number);
    const [y, m, d] = parts.length === 3 && parts[0] > 1000
      ? parts
      : [parts[2], parts[1], parts[0]];
    const dt = new Date(y, m - 1, d + days);
    return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
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
