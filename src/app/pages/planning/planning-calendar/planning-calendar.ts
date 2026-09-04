import {
  Component, OnInit, signal, computed, inject, effect, ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { FullCalendarModule, FullCalendarComponent } from '@fullcalendar/angular';
import { CalendarOptions, EventInput, EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import frLocale from '@fullcalendar/core/locales/fr';
import { PlanningService } from '../services/planning.service';
import { Planning } from '../models/planning.model';
import { PlanningTeamsTabs } from '../../../shared/planning-teams-tabs/planning-teams-tabs';

// ── Constants ─────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  brouillon: '#94a3b8',
  planifie:  '#3b82f6',
  en_cours:  '#f59e0b',
  termine:   '#16a34a',
  annule:    '#ef4444',
};
const TYPE_COLORS: Record<string, string> = {
  individuel: '#3b82f6',
  groupe:     '#8b5cf6',
  zone:       '#16a34a',
  secteur:    '#f59e0b',
};
const STATUS_LABELS: Record<string, string> = {
  brouillon: 'Brouillon', planifie: 'Planifié', en_cours: 'En cours',
  termine: 'Terminé', annule: 'Annulé',
};
const TYPE_LABELS: Record<string, string> = {
  individuel: 'Individuel', groupe: 'Groupe', zone: 'Zone', secteur: 'Secteur',
};
const TYPE_ICONS: Record<string, string> = {
  individuel: 'person', groupe: 'groups', zone: 'map', secteur: 'grid_view',
};

// ── Component ─────────────────────────────────────────────────
@Component({
  selector: 'app-planning-calendar',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule, MatIconModule,
    TooltipModule, ToastModule, SkeletonModule, FullCalendarModule,
    PlanningTeamsTabs,
  ],
  templateUrl: './planning-calendar.html',
  styleUrl:    './planning-calendar.scss',
  providers: [MessageService],
})
export class PlanningCalendarComponent implements OnInit {
  @ViewChild('calendarEl') calendarEl!: FullCalendarComponent;

  private svc    = inject(PlanningService);
  private router = inject(Router);

  // ── Loading ───────────────────────────────────────────────────
  isLoading  = this.svc.loading;
  loadError  = this.svc.error;

  // ── Filter signals ────────────────────────────────────────────
  // Mobile first (bug remonté en usage réel) : ouvert par défaut quel que soit
  // l'écran, le panneau de filtres (recherche/stats/statut/type/équipe/légende)
  // poussait le calendrier entièrement hors écran sur mobile, où il occupe
  // toute la largeur (voir le breakpoint 768px de planning-calendar.scss). Sur
  // desktop (sidebar à côté du calendrier, jamais en pleine largeur), rester
  // ouvert par défaut reste le comportement voulu.
  sidebarOpen   = signal(typeof window === 'undefined' || window.innerWidth > 768);
  activeStatus  = signal<string[]>([]);
  activeTypes   = signal<string[]>([]);
  activeTeams   = signal<string[]>([]);
  searchQuery   = signal('');
  selectedEvent = signal<any | null>(null);
  popupOpen     = signal(false);
  currentView   = signal<string>('dayGridMonth');

  // ── Static filter options ─────────────────────────────────────
  readonly statuses = ['brouillon', 'planifie', 'en_cours', 'termine', 'annule'];
  readonly types    = ['individuel', 'groupe', 'zone', 'secteur'];

  // Équipes dynamiques depuis l'API
  teamNames = computed(() => this.svc.teams().map(t => t.name));

  statusColors  = STATUS_COLORS;
  typeColors    = TYPE_COLORS;
  statusLabels  = STATUS_LABELS;
  typeLabels    = TYPE_LABELS;

  // ── Plannings data ────────────────────────────────────────────
  plannings = computed(() => this.svc.plannings());

  allEvents = computed<EventInput[]>(() =>
    this.plannings().map(p => this._toEvent(p))
  );

  filteredEvents = computed<EventInput[]>(() => {
    const sF = this.activeStatus(), tF = this.activeTypes(), teamF = this.activeTeams();
    const q  = this.searchQuery().toLowerCase();
    return this.allEvents().filter(ev => {
      const ext = ev.extendedProps as any;
      if (sF.length    && !sF.includes(ext.status))                             return false;
      if (tF.length    && !tF.includes(ext.type))                               return false;
      if (teamF.length && !ext.teams.some((t: string) => teamF.includes(t)))    return false;
      if (q && !(ev.title as string).toLowerCase().includes(q)
            && !((ext.reference ?? '') as string).toLowerCase().includes(q))    return false;
      return true;
    });
  });

  // ── Monthly stats ─────────────────────────────────────────────
  monthlyStats = computed(() => {
    const evs = this.filteredEvents();
    const now = new Date();
    const month = evs.filter(ev => {
      const d = new Date(ev.start as string);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    return {
      total:    month.length,
      termine:  month.filter(e => (e.extendedProps as any).status === 'termine').length,
      en_cours: month.filter(e => (e.extendedProps as any).status === 'en_cours').length,
      planifie: month.filter(e => (e.extendedProps as any).status === 'planifie').length,
      annule:   month.filter(e => (e.extendedProps as any).status === 'annule').length,
    };
  });

  // ── Calendar options ──────────────────────────────────────────
  calendarOptions = signal<CalendarOptions>({
    plugins:  [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
    initialView: 'dayGridMonth',
    height: '100%',
    contentHeight: '100%',
    expandRows: true,
    locale:   frLocale,
    headerToolbar: {
      left:   'prev,next today',
      center: 'title',
      right:  'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
    },
    buttonText: {
      today: "Aujourd'hui",
      month: 'Mois',
      week:  'Semaine',
      day:   'Jour',
      list:  'Liste',
    },
    events:       [],
    editable:     false,
    selectable:   true,
    nowIndicator: true,
    dayMaxEvents: 4,
    moreLinkText: (n: number) => `+${n} autres`,
    eventContent: (arg: any) => ({ html: this._renderEventHtml(arg.event) }),
    eventClick:   (arg: EventClickArg) => this._onEventClick(arg),
    viewDidMount: (arg: any) => this.currentView.set(arg.view.type),
    datesSet:     (arg: any) => this.currentView.set(arg.view.type),
    eventDidMount:(info: any) => { info.el.setAttribute('title', info.event.title); },
  });

  // ── Constructor: sync filtered events → calendar ───────────────
  constructor() {
    effect(() => {
      const events = this.filteredEvents();
      this.calendarOptions.update(o => ({ ...o, events }));
    });
  }

  ngOnInit(): void {
    // Charger les plannings V2 (inclut aussi les équipes dans le forkJoin du service)
    this.svc.loadPlannings({ pageSize: 200 });
  }

  // ── Filter actions ────────────────────────────────────────────
  toggleStatus(s: string): void  { this.activeStatus.update(a => a.includes(s) ? a.filter(x => x !== s) : [...a, s]); }
  toggleType(t: string): void    { this.activeTypes.update(a => a.includes(t) ? a.filter(x => x !== t) : [...a, t]); }
  toggleTeam(t: string): void    { this.activeTeams.update(a => a.includes(t) ? a.filter(x => x !== t) : [...a, t]); }
  clearFilters(): void           { this.activeStatus.set([]); this.activeTypes.set([]); this.activeTeams.set([]); this.searchQuery.set(''); }
  hasFilters = computed(() => this.activeStatus().length + this.activeTypes().length + this.activeTeams().length > 0 || !!this.searchQuery());
  isStatusActive(s: string): boolean { return this.activeStatus().length === 0 || this.activeStatus().includes(s); }

  toggleSidebar(): void { this.sidebarOpen.update(v => !v); }

  // ── Calendar navigation ───────────────────────────────────────
  goToToday(): void         { this.calendarEl?.getApi().today(); }
  switchView(v: string): void { this.calendarEl?.getApi().changeView(v); this.currentView.set(v); }

  // ── Popup ─────────────────────────────────────────────────────
  closePopup(): void { this.popupOpen.set(false); this.selectedEvent.set(null); }

  viewDetail(): void {
    const ev = this.selectedEvent();
    if (!ev) return;
    this.closePopup();
    this.router.navigate(['/planning/detail', ev.id]);
  }

  editEvent(): void {
    const ev = this.selectedEvent();
    if (!ev) return;
    this.closePopup();
    this.router.navigate(['/planning/create'], { queryParams: { edit: ev.id } });
  }

  duplicateEvent(): void {
    const ev = this.selectedEvent();
    if (!ev) return;
    this.closePopup();
    this.router.navigate(['/planning/create'], { queryParams: { duplicate: ev.id } });
  }

  // ── Helpers ───────────────────────────────────────────────────
  statusLabel(s: string):  string { return STATUS_LABELS[s] ?? s; }
  typeLabel(t: string):    string { return TYPE_LABELS[t] ?? t; }
  typeIcon(t: string):     string { return TYPE_ICONS[t] ?? 'list_alt'; }
  statusColor(s: string):  string { return STATUS_COLORS[s] ?? '#64748b'; }
  typeColor(t: string):    string { return TYPE_COLORS[t] ?? '#64748b'; }

  // ── Private ───────────────────────────────────────────────────
  private _onEventClick(arg: EventClickArg): void {
    this.selectedEvent.set({
      id:    arg.event.id,
      title: arg.event.title,
      start: arg.event.start,
      end:   arg.event.end,
      ...arg.event.extendedProps,
    });
    this.popupOpen.set(true);
  }

  private _renderEventHtml(event: any): string {
    const ext   = event.extendedProps;
    const sc    = STATUS_COLORS[ext.status]  ?? '#64748b';
    const tc    = TYPE_COLORS[ext.type]      ?? '#64748b';
    const icon  = TYPE_ICONS[ext.type]       ?? 'list_alt';
    const team  = (ext.teams ?? [])[0] ?? '';
    const hasInc = ext.hasIncident ? `<span class="ev-inc" title="Incident signalé">⚠</span>` : '';
    return `
      <div class="fc-ev" style="--sc:${sc};--tc:${tc}">
        <div class="fc-ev-bar" style="background:${sc}"></div>
        <div class="fc-ev-body">
          <div class="fc-ev-title">
            <span class="material-icons fc-ev-icon">${icon}</span>
            <span class="fc-ev-name">${event.title}</span>
            ${hasInc}
          </div>
          ${team ? `<div class="fc-ev-team">${team}</div>` : ''}
          <div class="fc-ev-status" style="color:${sc}">${STATUS_LABELS[ext.status] ?? ext.status}</div>
        </div>
      </div>`;
  }

  private _toEvent(p: Planning): EventInput {
    const dateStr = this._parseDateToISO(p.date);
    const color   = STATUS_COLORS[p.status] ?? '#64748b';
    return {
      id:    p.id,
      title: p.libelle,
      start: `${dateStr}T${p.startTime ?? '08:00'}`,
      end:   p.endTime ? `${dateStr}T${p.endTime}` : undefined,
      backgroundColor: color + '20',
      borderColor:     color,
      textColor:       '#1e293b',
      extendedProps: {
        status:     p.status,
        type:       p.type,
        reference:  p.reference,
        teams:      p.teams ?? [],
        zone:       p.zone ?? '',
        hasIncident: false,
        clientId:   p.clientId,
        wasteTypes: p.wasteTypes ?? [],
      },
    };
  }

  /** Convertit une date ISO (2026-06-04T22:00:00Z) ou dd/mm/yyyy en YYYY-MM-DD */
  private _parseDateToISO(date: string): string {
    if (!date) return '';
    if (date.includes('T') || (date.includes('-') && date.indexOf('-') !== date.lastIndexOf('-'))) {
      return date.split('T')[0];
    }
    if (date.includes('/')) {
      const [d, m, y] = date.split('/');
      return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    }
    return date;
  }
}
