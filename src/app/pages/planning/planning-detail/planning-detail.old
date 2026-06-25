import {
  Component, OnInit, OnDestroy, signal, computed, inject,
  ViewChild, ElementRef, AfterViewInit,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TimelineModule } from 'primeng/timeline';
import { ChartModule } from 'primeng/chart';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
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

// ── Component ──────────────────────────────────────────────────
@Component({
  selector: 'app-planning-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink, MatIconModule,
    TimelineModule, ChartModule, TagModule, ToastModule, TooltipModule,
  ],
  providers: [MessageService, DatePipe],
  templateUrl: './planning-detail.html',
  styleUrl: './planning-detail.scss',
})
export class PlanningDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapEl') mapElRef!: ElementRef<HTMLDivElement>;

  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private svc     = inject(PlanningService);
  private msg     = inject(MessageService);
  private datePipe = inject(DatePipe);

  private leafletMap!: L.Map;

  // ── State ─────────────────────────────────────────────────────
  isLoading     = signal(true);
  notFound      = signal(false);
  activeSection = signal('info');
  showCancelDlg = signal(false);
  showDupDlg    = signal(false);
  planning      = signal<Planning | null>(null);

  // ── Mock enriched data ────────────────────────────────────────
  teams          = signal<TeamDetail[]>([]);
  incidents      = signal<Incident[]>([]);
  activities     = signal<ActivityEvent[]>([]);
  history        = signal<RoundHistory[]>([]);
  notifications  = signal<Notification[]>([]);

  // ── Computed ──────────────────────────────────────────────────
  statusColor = computed(() => {
    const m: Record<string, string> = {
      brouillon: '#94a3b8', publie: '#3b82f6', en_cours: '#f59e0b',
      termine: '#16a34a', annule: '#ef4444',
    };
    return m[this.planning()?.status ?? ''] ?? '#64748b';
  });
  statusLabel = computed(() => {
    const m: Record<string, string> = {
      brouillon: 'Brouillon', publie: 'Publié', en_cours: 'En cours',
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
    const m: Record<string, string> = { individuel: 'person', groupe: 'groups', zone: 'map', secteur: 'grid_view' };
    return m[this.planning()?.type ?? ''] ?? 'list_alt';
  });
  typeColor = computed(() => {
    const m: Record<string, string> = { individuel: '#3b82f6', groupe: '#8b5cf6', zone: '#16a34a', secteur: '#f59e0b' };
    return m[this.planning()?.type ?? ''] ?? '#64748b';
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

  // Charts
  completionChartData = computed(() => {
    const p = this.planning();
    const done = p?.status === 'termine' ? p.clientsCount ?? 0 : Math.round((p?.clientsCount ?? 0) * 0.6);
    const remaining = (p?.clientsCount ?? 0) - done;
    return {
      labels: ['Collectés', 'Restants'],
      datasets: [{ data: [done, remaining], backgroundColor: ['#16a34a', '#f1f5f9'], borderWidth: 0 }],
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
    const found = this.svc.plannings().find(p => p.id === id);
    if (!found) {
      // Try extra mock
      const mock = this._getMockPlanning(id);
      if (mock) { this.planning.set(mock); this._loadMockData(mock); }
      else { this.notFound.set(true); }
    } else {
      this.planning.set(found);
      this._loadMockData(found);
    }
    setTimeout(() => this.isLoading.set(false), 400);
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (!this.notFound()) this._initMap();
    }, 500);
  }

  ngOnDestroy(): void {
    if (this.leafletMap) this.leafletMap.remove();
  }

  // ── Scroll to section ─────────────────────────────────────────
  scrollTo(id: string): void {
    this.activeSection.set(id);
    document.getElementById('section-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── Actions ───────────────────────────────────────────────────
  editPlanning(): void { this.router.navigate(['/planning/create']); }

  async duplicatePlanning(): Promise<void> {
    this.showDupDlg.set(false);
    const p = this.planning();
    if (!p) return;
    const nextDate = this._addDays(p.date, 7);
    this.msg.add({ severity: 'success', summary: 'Dupliqué !', detail: `Planning copié pour le ${nextDate}` });
  }

  cancelPlanning(): void {
    this.showCancelDlg.set(false);
    const p = this.planning();
    if (!p) return;
    this.planning.update(prev => prev ? { ...prev, status: 'annule' } : prev);
    this.msg.add({ severity: 'warn', summary: 'Annulé', detail: `Planning "${p.libelle}" annulé` });
  }

  async exportPDF(): Promise<void> {
    const p = this.planning();
    if (!p) return;
    this.msg.add({ severity: 'info', summary: 'Export…', detail: 'Génération du PDF en cours' });
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Header
      doc.setFillColor(22, 163, 74);
      doc.rect(0, 0, 210, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('SAHELYS – Planning de collecte', 14, 14);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Référence : ${p.reference}  •  Statut : ${this.statusLabel()}`, 14, 22);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(p.libelle, 14, 40);

      // General info table
      autoTable(doc, {
        startY: 46,
        head: [['Champ', 'Valeur']],
        body: [
          ['Type',       this.typeLabel()],
          ['Date',       p.date],
          ['Heure',      `${p.startTime}${p.endTime ? ' – ' + p.endTime : ''}`],
          ['Localisation', this.locationLabel()],
          ['Fréquence',  this.frequencyLabel()],
          ['Ménages',    String(p.clientsCount ?? '—')],
          ['Déchets',    p.wasteTypes.join(', ')],
          ['Équipes',    p.teams.join(', ')],
        ],
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 10 },
      });

      const y1 = (doc as any).lastAutoTable.finalY + 8;

      // Incidents
      if (this.incidents().length) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Incidents', 14, y1);
        autoTable(doc, {
          startY: y1 + 4,
          head: [['Sévérité', 'Titre', 'Déclaré par', 'Date', 'Résolu']],
          body: this.incidents().map(i => [
            i.severity === 'critical' ? 'Critique' : i.severity === 'warning' ? 'Attention' : 'Info',
            i.title, i.reporter, i.reportedAt, i.resolved ? 'Oui' : 'Non',
          ]),
          headStyles: { fillColor: [239, 68, 68], textColor: 255 },
          styles: { fontSize: 9 },
        });
      }

      // Footer
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
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
    return ({ disponible: '#16a34a', en_service: '#f59e0b', indisponible: '#ef4444' } as Record<string, string>)[s] ?? '#64748b';
  }
  teamStatusLabel(s: string): string {
    return ({ disponible: 'Disponible', en_service: 'En service', indisponible: 'Indisponible' } as Record<string, string>)[s] ?? s;
  }
  incidentColor(s: string): string {
    return ({ critical: '#ef4444', warning: '#f59e0b', info: '#3b82f6' } as Record<string, string>)[s] ?? '#64748b';
  }
  incidentLabel(s: string): string {
    return ({ critical: 'Critique', warning: 'Attention', info: 'Info' } as Record<string, string>)[s] ?? s;
  }
  notifIcon(c: string): string {
    return ({ sms: 'sms', email: 'email', app: 'notifications' } as Record<string, string>)[c] ?? 'send';
  }
  notifStatusColor(s: string): string {
    return ({ sent: '#94a3b8', delivered: '#3b82f6', read: '#16a34a', failed: '#ef4444' } as Record<string, string>)[s] ?? '#94a3b8';
  }
  notifStatusLabel(s: string): string {
    return ({ sent: 'Envoyé', delivered: 'Livré', read: 'Lu', failed: 'Échec' } as Record<string, string>)[s] ?? s;
  }

  completionRate(): number {
    const p = this.planning();
    if (!p || !p.clientsCount) return 0;
    if (p.status === 'termine') return 100;
    if (p.status === 'en_cours') return 60;
    if (p.status === 'publie') return 0;
    return 0;
  }

  // ── Map ───────────────────────────────────────────────────────
  private _initMap(): void {
    if (!this.mapElRef?.nativeElement) return;
    const p = this.planning();
    const center: [number, number] = p?.ville === 'Bobo-Dioulasso' ? [11.1777, -4.2985] : [12.3647, -1.5337];

    this.leafletMap = L.map(this.mapElRef.nativeElement, { center, zoom: 13, zoomControl: true });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(this.leafletMap);

    // Zone circle
    L.circle(center, { radius: 600, color: '#16a34a', fillColor: '#16a34a', fillOpacity: 0.1, weight: 2 })
      .bindTooltip(p?.libelle ?? 'Zone de collecte').addTo(this.leafletMap);

    // Route waypoints (mock)
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

    // Team marker
    L.circleMarker([center[0] + 0.002, center[1] + 0.003], {
      radius: 10, fillColor: '#f59e0b', color: '#fff', weight: 2, fillOpacity: 1,
    }).bindTooltip('Équipe en cours').addTo(this.leafletMap);
  }

  // ── Private ───────────────────────────────────────────────────
  private _loadMockData(p: Planning): void {
    this.teams.set([
      { id: 'T1', name: 'Équipe Alpha', initials: 'α', membersCount: 4, vehicle: 'Camion 01 – 5T', status: 'en_service', workload: 65, lastPosition: 'Secteur 3, Dassasgho', phone: '+226 70 00 00 01' },
      { id: 'T2', name: 'Équipe Bravo', initials: 'β', membersCount: 3, vehicle: 'Camion 02 – 3T', status: 'disponible',  workload: 20, lastPosition: 'Base principale', phone: '+226 70 00 00 02' },
    ]);

    this.incidents.set([
      { id: 'I1', severity: 'warning', title: 'Bac débordant – Rue 14.12', description: 'Bac ménager non vidé depuis 2 jours, débordement signalé par habitant.', reporter: 'Moussa Kaboré', reportedAt: '10/05/2025 08:42', resolved: false },
      { id: 'I2', severity: 'info',    title: 'Accès difficile – Passage étroit', description: 'Le camion 5T ne peut pas accéder. Passage trop étroit near quartier Bendogo.', reporter: 'Équipe Alpha', reportedAt: '10/05/2025 09:15', resolved: true, resolvedAt: '10/05/2025 10:30' },
      { id: 'I3', severity: 'critical', title: 'Pneu crevé – Camion 01', description: 'Pneu avant droit crevé sur secteur 3. Opération interrompue 35 min.', reporter: 'Équipe Alpha', reportedAt: '10/05/2025 10:05', resolved: true, resolvedAt: '10/05/2025 10:40' },
    ]);

    this.activities.set([
      { date: p.createdAt,   icon: 'add_circle',       color: '#3b82f6', title: 'Planning créé',             detail: 'Créé par le gestionnaire Simeon K.' },
      { date: p.updatedAt,   icon: 'verified',          color: '#8b5cf6', title: 'Validé par le superviseur', detail: 'Approuvé – Diallo Issouf' },
      { date: p.date + ' 06:00', icon: 'send',          color: '#16a34a', title: 'Notifications envoyées',    detail: '2 équipes + 3 clients notifiés via SMS' },
      { date: p.date + ' 07:00', icon: 'play_circle',   color: '#f59e0b', title: 'Collecte démarrée',         detail: 'Équipe Alpha en route — secteur Baskuy' },
      { date: p.date + ' 07:45', icon: 'warning',       color: '#ef4444', title: 'Incident signalé',          detail: 'Bac débordant – Rue 14.12 (non critique)' },
      { date: p.date + ' 11:30', icon: 'check_circle',  color: '#16a34a', title: 'Collecte terminée',         detail: '45 ménages collectés — 100% zone couverte' },
    ]);

    this.history.set([
      { date: '26/04/2025', teams: ['Équipe Alpha'],             status: 'termine',  householdsCollected: 44, duration: '3h20', completionRate: 98 },
      { date: '19/04/2025', teams: ['Équipe Charlie'],           status: 'termine',  householdsCollected: 41, duration: '3h45', completionRate: 91 },
      { date: '12/04/2025', teams: ['Équipe Alpha', 'Équipe Bravo'], status: 'termine', householdsCollected: 45, duration: '2h30', completionRate: 100 },
      { date: '05/04/2025', teams: ['Équipe Bravo'],             status: 'annule',   householdsCollected: 0,  duration: '—',    completionRate: 0 },
      { date: '29/03/2025', teams: ['Équipe Alpha'],             status: 'termine',  householdsCollected: 43, duration: '3h10', completionRate: 96 },
    ]);

    this.notifications.set([
      { id: 'N1', channel: 'sms',   recipient: 'Équipe Alpha',       message: 'Rappel : Collecte prévue demain 07h00 – Baskuy S1',       sentAt: p.date + ' 06:00', status: 'read' },
      { id: 'N2', channel: 'sms',   recipient: 'Équipe Bravo',       message: 'Rappel : Collecte prévue demain 07h00 – Baskuy S1',       sentAt: p.date + ' 06:00', status: 'delivered' },
      { id: 'N3', channel: 'email', recipient: 'diabre.alain@email.com', message: 'Votre collecte est planifiée le ' + p.date + ' à 07h00', sentAt: p.date + ' 06:00', status: 'read' },
      { id: 'N4', channel: 'app',   recipient: 'Tous les clients zone', message: 'Collecte ce jour – merci de sortir vos bacs avant 07h', sentAt: p.date + ' 05:30', status: 'delivered' },
      { id: 'N5', channel: 'email', recipient: 'superviseur@sahelys.com', message: 'Planning ' + p.reference + ' démarré',              sentAt: p.date + ' 07:05', status: 'read' },
    ]);
  }

  private _getMockPlanning(id: string): Planning | null {
    const now = new Date().toISOString();
    const mocks: Record<string, Planning> = {
      'EX1': { id: 'EX1', reference: 'PLN-2025-001', libelle: 'Baskuy – Secteur 1', status: 'en_cours', type: 'zone',
        date: this._today(), startTime: '07:00', endTime: '11:00', frequency: 'hebdomadaire',
        teams: ['Équipe Alpha'], wasteTypes: ['Ménagers'], clientsCount: 45,
        ville: 'Ouagadougou', arrondissement: 'Baskuy', secteur: 'Secteur 1',
        createdAt: now, updatedAt: now, zone: 'Baskuy – Secteur 1' },
    };
    return mocks[id] ?? {
      id, reference: `PLN-2025-${id.replace('EX', '').padStart(3,'0')}`,
      libelle: `Planning ${id}`, status: 'publie', type: 'zone',
      date: this._today(), startTime: '08:00', endTime: '12:00', frequency: 'unique',
      teams: ['Équipe Alpha'], wasteTypes: ['Ménagers'], clientsCount: 50,
      ville: 'Ouagadougou', arrondissement: 'Bogodogo', secteur: 'Secteur 4',
      createdAt: now, updatedAt: now, zone: 'Bogodogo – Secteur 4',
    };
  }

  private _today(): string {
    const d = new Date();
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  }

  private _addDays(dateStr: string, days: number): string {
    const [day, month, year] = dateStr.split('/').map(Number);
    const d = new Date(year, month - 1, day + days);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  }

  readonly navSections = [
    { id: 'info',   label: 'Informations',  icon: 'info' },
    { id: 'teams',  label: 'Équipes',        icon: 'groups' },
    { id: 'map',    label: 'Carte',          icon: 'map' },
    { id: 'history',label: 'Historique',     icon: 'history' },
    { id: 'incidents',label:'Incidents',     icon: 'warning' },
    { id: 'timeline',label:'Activités',      icon: 'timeline' },
    { id: 'stats',  label: 'Statistiques',   icon: 'bar_chart' },
    { id: 'notifs', label: 'Notifications',  icon: 'notifications' },
  ];
}
