import {
  Component, OnInit, signal, computed, inject, effect, ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { FullCalendarModule, FullCalendarComponent } from '@fullcalendar/angular';
import { CalendarOptions, EventInput, EventClickArg, EventDropArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { EventResizeDoneArg } from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import frLocale from '@fullcalendar/core/locales/fr';
import { PlanningService } from '../services/planning.service';
import { Planning } from '../models/planning.model';

// ── Constants ─────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  brouillon: '#94a3b8',
  publie:    '#3b82f6',
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
  brouillon: 'Brouillon', publie: 'Publié', en_cours: 'En cours',
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
    TooltipModule, ToastModule, FullCalendarModule,
  ],
  templateUrl: './planning-calendar.html',
  styleUrl:    './planning-calendar.scss',
  providers: [MessageService],
})
export class PlanningCalendarComponent implements OnInit {
  @ViewChild('calendarEl') calendarEl!: FullCalendarComponent;

  private svc    = inject(PlanningService);
  private router = inject(Router);
  private msg    = inject(MessageService);

  // ── Filter signals ────────────────────────────────────────────
  sidebarOpen   = signal(true);
  activeStatus  = signal<string[]>([]);
  activeTypes   = signal<string[]>([]);
  activeTeams   = signal<string[]>([]);
  searchQuery   = signal('');
  selectedEvent = signal<any | null>(null);
  popupOpen     = signal(false);
  currentView   = signal<string>('dayGridMonth');

  // ── Static filter options ─────────────────────────────────────
  readonly statuses = ['brouillon', 'publie', 'en_cours', 'termine', 'annule'];
  readonly types    = ['individuel', 'groupe', 'zone', 'secteur'];
  readonly teams    = ['Équipe Alpha', 'Équipe Bravo', 'Équipe Charlie', 'Équipe Delta', 'Équipe Echo'];

  statusColors  = STATUS_COLORS;
  typeColors    = TYPE_COLORS;
  statusLabels  = STATUS_LABELS;
  typeLabels    = TYPE_LABELS;

  // ── Plannings data ────────────────────────────────────────────
  plannings = computed(() => this.svc.plannings());

  allEvents = computed<EventInput[]>(() =>
    [...this.plannings(), ...this._extraMockPlannings()].map(p => this._toEvent(p))
  );

  filteredEvents = computed<EventInput[]>(() => {
    const sF = this.activeStatus(), tF = this.activeTypes(), teamF = this.activeTeams();
    const q  = this.searchQuery().toLowerCase();
    return this.allEvents().filter(ev => {
      const ext = ev.extendedProps as any;
      if (sF.length    && !sF.includes(ext.status))                   return false;
      if (tF.length    && !tF.includes(ext.type))                     return false;
      if (teamF.length && !ext.teams.some((t: string) => teamF.includes(t))) return false;
      if (q && !(ev.title as string).toLowerCase().includes(q))       return false;
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
      total:     month.length,
      termine:   month.filter(e => (e.extendedProps as any).status === 'termine').length,
      en_cours:  month.filter(e => (e.extendedProps as any).status === 'en_cours').length,
      publie:    month.filter(e => (e.extendedProps as any).status === 'publie').length,
      annule:    month.filter(e => (e.extendedProps as any).status === 'annule').length,
    };
  });

  // ── Calendar options ──────────────────────────────────────────
  calendarOptions = signal<CalendarOptions>({
    plugins:  [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
    initialView: 'dayGridMonth',
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
    events:          [],
    editable:        true,
    droppable:       true,
    selectable:      true,
    nowIndicator:    true,
    dayMaxEvents:    4,
    moreLinkText:    (n: number) => `+${n} autres`,
    eventContent:    (arg: any) => ({ html: this._renderEventHtml(arg.event) }),
    eventClick:      (arg: EventClickArg) => this._onEventClick(arg),
    eventDrop:       (arg: EventDropArg) => this._onEventDrop(arg),
    eventResize:     (arg: EventResizeDoneArg) => this._onEventResize(arg),
    viewDidMount:    (arg: any) => this.currentView.set(arg.view.type),
    datesSet:        (arg: any) => this.currentView.set(arg.view.type),
    eventDidMount:   (info: any) => {
      info.el.setAttribute('title', info.event.title);
    },
  });

  // ── Constructor: sync filtered events → calendar ───────────────
  constructor() {
    effect(() => {
      const events = this.filteredEvents();
      this.calendarOptions.update(o => ({ ...o, events }));
    });
  }

  ngOnInit(): void {}

  // ── Filter actions ────────────────────────────────────────────
  toggleStatus(s: string): void  { this.activeStatus.update(a => a.includes(s) ? a.filter(x => x !== s) : [...a, s]); }
  toggleType(t: string): void    { this.activeTypes.update(a => a.includes(t) ? a.filter(x => x !== t) : [...a, t]); }
  toggleTeam(t: string): void    { this.activeTeams.update(a => a.includes(t) ? a.filter(x => x !== t) : [...a, t]); }
  clearFilters(): void           { this.activeStatus.set([]); this.activeTypes.set([]); this.activeTeams.set([]); this.searchQuery.set(''); }
  hasFilters = computed(() => this.activeStatus().length + this.activeTypes().length + this.activeTeams().length > 0 || !!this.searchQuery());
  isStatusActive(s: string): boolean { return this.activeStatus().length === 0 || this.activeStatus().includes(s); }

  toggleSidebar(): void { this.sidebarOpen.update(v => !v); }

  // ── Calendar navigation ───────────────────────────────────────
  goToToday(): void    { this.calendarEl?.getApi().today(); }
  switchView(v: string): void { this.calendarEl?.getApi().changeView(v); this.currentView.set(v); }

  // ── Popup ─────────────────────────────────────────────────────
  closePopup(): void { this.popupOpen.set(false); this.selectedEvent.set(null); }

  editEvent(): void {
    const ev = this.selectedEvent();
    if (!ev) return;
    this.closePopup();
    this.router.navigate(['/planning/create']);
  }

  duplicateEvent(): void {
    const ev = this.selectedEvent();
    if (!ev) return;
    const nextDate = new Date(ev.start);
    nextDate.setDate(nextDate.getDate() + 7);
    this.msg.add({ severity: 'success', summary: 'Dupliqué', detail: `"${ev.title}" copié pour le ${this._fmtDate(nextDate)}` });
    this.closePopup();
  }

  cancelEvent(): void {
    const ev = this.selectedEvent();
    if (!ev) return;
    this.msg.add({ severity: 'warn', summary: 'Annulé', detail: `Planning "${ev.title}" marqué comme annulé` });
    this.closePopup();
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
      id:     arg.event.id,
      title:  arg.event.title,
      start:  arg.event.start,
      end:    arg.event.end,
      ...arg.event.extendedProps,
    });
    this.popupOpen.set(true);
  }

  private _onEventDrop(arg: EventDropArg): void {
    const newDate = this._fmtDate(arg.event.start!);
    this.msg.add({ severity: 'info', summary: 'Déplacé', detail: `"${arg.event.title}" → ${newDate}` });
  }

  private _onEventResize(arg: EventResizeDoneArg): void {
    this.msg.add({ severity: 'info', summary: 'Redimensionné', detail: `"${arg.event.title}" mis à jour` });
  }

  private _renderEventHtml(event: any): string {
    const ext    = event.extendedProps;
    const sc     = STATUS_COLORS[ext.status]  ?? '#64748b';
    const tc     = TYPE_COLORS[ext.type]      ?? '#64748b';
    const icon   = TYPE_ICONS[ext.type]       ?? 'list_alt';
    const teams  = (ext.teams ?? []).slice(0, 2).join(', ');
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
          ${teams ? `<div class="fc-ev-team">${teams}</div>` : ''}
          <div class="fc-ev-status" style="color:${sc}">${STATUS_LABELS[ext.status] ?? ext.status}</div>
        </div>
      </div>`;
  }

  private _toEvent(p: Planning): EventInput {
    const [day, month, year] = p.date.split('/').map(Number);
    const start = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}T${p.startTime ?? '08:00'}`;
    const color = STATUS_COLORS[p.status] ?? '#64748b';
    return {
      id:       p.id,
      title:    p.libelle,
      start,
      end:      p.endTime ? `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}T${p.endTime}` : undefined,
      backgroundColor: color + '20',
      borderColor:     color,
      textColor:       '#1e293b',
      extendedProps: {
        status:      p.status,
        type:        p.type,
        teams:       p.teams ?? [],
        zone:        p.zone ?? '',
        hasIncident: p.status === 'en_cours' && Math.random() > 0.7,
        clientId:    p.clientId,
        clientName:  p.clientName,
        wasteTypes:  p.wasteTypes ?? [],
      },
    };
  }

  private _fmtDate(d: Date): string {
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  }

  private _extraMockPlannings(): Planning[] {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth() + 1;
    const pad = (n: number) => String(n).padStart(2, '0');
    const d = (offset: number) => {
      const dt = new Date(today);
      dt.setDate(today.getDate() + offset);
      return `${pad(dt.getDate())}/${pad(dt.getMonth()+1)}/${dt.getFullYear()}`;
    };
    const now = new Date().toISOString();
    const base = {
      id: 'x', libelle: '', status: 'publie' as any, type: 'zone' as any,
      date: '', startTime: '08:00', endTime: '12:00',
      frequency: 'unique' as any, teams: [], wasteTypes: [],
      clientsCount: 50, zone: 'Ouagadougou',
      reference: 'EX-REF', createdAt: now, updatedAt: now,
    };
    return [
      { ...base, id: 'EX1', libelle: 'Baskuy – Secteur 1',    status: 'publie',   type: 'zone',       date: d(0),  startTime: '07:00', endTime: '11:00', teams: ['Équipe Alpha'],  wasteTypes: ['Ménagers'], clientsCount: 45 },
      { ...base, id: 'EX2', libelle: 'Bogodogo – Secteur 4',  status: 'en_cours', type: 'zone',       date: d(0),  startTime: '08:30', endTime: '13:00', teams: ['Équipe Bravo'],  wasteTypes: ['Recyclables'], clientsCount: 80 },
      { ...base, id: 'EX3', libelle: 'Diabré Alain',          status: 'termine',  type: 'individuel', date: d(-1), startTime: '09:00', endTime: '09:30', teams: ['Équipe Alpha'],  wasteTypes: ['Ménagers'], clientsCount: 1 },
      { ...base, id: 'EX4', libelle: 'Groupe Résidentiel A',  status: 'publie',   type: 'groupe',     date: d(1),  startTime: '07:30', endTime: '11:00', teams: ['Équipe Charlie'],wasteTypes: ['Ménagers', 'Verts'], clientsCount: 12 },
      { ...base, id: 'EX5', libelle: 'Zone Boulmiougou',      status: 'brouillon',type: 'zone',       date: d(2),  startTime: '06:00', endTime: '10:30', teams: ['Équipe Echo'],   wasteTypes: ['Encombrants'], clientsCount: 60 },
      { ...base, id: 'EX6', libelle: 'Secteur 7',             status: 'annule',   type: 'secteur',    date: d(2),  startTime: '13:00', endTime: '17:00', teams: ['Équipe Delta'],  wasteTypes: ['Spéciaux'], clientsCount: 120 },
      { ...base, id: 'EX7', libelle: 'Zone Sig-Noghin',       status: 'publie',   type: 'zone',       date: d(3),  startTime: '07:00', endTime: '12:00', teams: ['Équipe Alpha', 'Équipe Bravo'], wasteTypes: ['Ménagers'], clientsCount: 95 },
      { ...base, id: 'EX8', libelle: 'Ouédraogo Marie',       status: 'publie',   type: 'individuel', date: d(3),  startTime: '10:00', endTime: '10:30', teams: ['Équipe Bravo'],  wasteTypes: ['Recyclables'], clientsCount: 1 },
      { ...base, id: 'EX9', libelle: 'Nongremassom Centre',   status: 'en_cours', type: 'zone',       date: d(4),  startTime: '06:30', endTime: '11:00', teams: ['Équipe Charlie'],wasteTypes: ['Ménagers'], clientsCount: 70 },
      { ...base, id: 'EX10',libelle: 'Groupe Tampouy',        status: 'publie',   type: 'groupe',     date: d(5),  startTime: '08:00', endTime: '11:30', teams: ['Équipe Echo'],   wasteTypes: ['Verts', 'Ménagers'], clientsCount: 18 },
      { ...base, id: 'EX11',libelle: 'Baskuy – Secteur 2',   status: 'publie',   type: 'zone',       date: d(7),  startTime: '07:00', endTime: '12:00', teams: ['Équipe Alpha'],  wasteTypes: ['Ménagers'], clientsCount: 55 },
      { ...base, id: 'EX12',libelle: 'Zone Konsa (Bobo)',     status: 'publie',   type: 'zone',       date: d(8),  startTime: '06:00', endTime: '13:00', teams: ['Équipe Bravo', 'Équipe Charlie'], wasteTypes: ['Ménagers', 'Encombrants'], clientsCount: 110 },
      { ...base, id: 'EX13',libelle: 'Secteur 14',            status: 'termine',  type: 'secteur',    date: d(-3), startTime: '08:00', endTime: '14:00', teams: ['Équipe Delta'],  wasteTypes: ['Recyclables'], clientsCount: 130 },
      { ...base, id: 'EX14',libelle: 'Compaoré Aïcha',        status: 'termine',  type: 'individuel', date: d(-4), startTime: '09:30', endTime: '10:00', teams: ['Équipe Alpha'],  wasteTypes: ['Ménagers'], clientsCount: 1 },
      { ...base, id: 'EX15',libelle: 'Boulmiougou – S12',     status: 'en_cours', type: 'zone',       date: d(-2), startTime: '07:00', endTime: '12:00', teams: ['Équipe Echo'],   wasteTypes: ['Ménagers', 'Verts'], clientsCount: 75 },
    ];
  }
}
