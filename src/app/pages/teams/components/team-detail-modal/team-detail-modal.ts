import {
  Component, Input, Output, EventEmitter, signal, computed, OnChanges, SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { Team } from '../../models/team.model';
import {
  teamStatusColor, teamStatusLabel,
  memberAvailabilityLabel, memberAvailabilityIcon,
  vehicleStatusColor, vehicleStatusLabel, vehicleTypeIcon,
  missionStatusColor, missionStatusLabel,
} from '../../models/team-labels';
import { formatFrDate } from '../../../../shared/format.util';

// ── Local types ───────────────────────────────────────────────
type Tab = 'apercu' | 'membres' | 'vehicule' | 'tournees' | 'performances' | 'incidents';

interface Incident {
  id: number; type: string; desc: string; date: string; severity: 'low' | 'medium' | 'high';
}
interface TimelineEvent {
  icon: string; color: string; text: string; time: string; type: string;
}
interface MissionBar { month: string; count: number; }

// ── Sparkline helpers ─────────────────────────────────────────
function sparkCoords(successRate: number): [number, number][] {
  const data = [
    Math.max(65, successRate - 14), Math.max(65, successRate - 10),
    Math.max(65, successRate - 6),  Math.max(65, successRate - 3),
    Math.max(65, successRate - 1),  successRate,
    Math.min(100, successRate + 2),
  ];
  return data.map((v, i) => [
    (i / (data.length - 1)) * 160,
    48 - ((v - 62) / (100 - 62)) * 48,
  ] as [number, number]);
}

@Component({
  selector: 'app-team-detail-modal',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, DialogModule, TooltipModule],
  templateUrl: './team-detail-modal.html',
  styleUrl:    './team-detail-modal.scss',
})
export class TeamDetailModal implements OnChanges {
  @Input() team: Team | null = null;
  @Input() visible = false;
  @Input() loading = false;
  @Output() visibleChange   = new EventEmitter<boolean>();
  @Output() edit            = new EventEmitter<Team>();
  @Output() toggleStatus    = new EventEmitter<Team>();
  @Output() confirmDelete   = new EventEmitter<Team>();
  @Output() navigateDetail  = new EventEmitter<string>();

  activeTab = signal<Tab>('apercu');

  readonly tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'apercu',       label: 'Aperçu',       icon: 'dashboard'      },
    { key: 'membres',      label: 'Membres',       icon: 'group'          },
    { key: 'vehicule',     label: 'Véhicule',      icon: 'local_shipping' },
    { key: 'tournees',     label: 'Tournées',      icon: 'route'          },
    { key: 'performances', label: 'Performances',  icon: 'insights'       },
    { key: 'incidents',    label: 'Incidents',     icon: 'warning_amber'  },
  ];

  // ── Computed ─────────────────────────────────────────────────
  statusColor = computed(() => teamStatusColor(this.team?.status ?? ''));
  statusLabel = computed(() => this.team ? teamStatusLabel(this.team.status) : '—');

  availStats = computed(() => {
    const t = this.team;
    if (!t || t.members.length === 0) return { disponible: 0, occupe: 0, absent: 0, total: 0, pct: 0 };
    const d = t.members.filter(m => m.availability === 'disponible').length;
    const o = t.members.filter(m => m.availability === 'occupe').length;
    const a = t.members.filter(m => m.availability === 'absent').length;
    return { disponible: d, occupe: o, absent: a, total: t.members.length, pct: Math.round(d / t.members.length * 100) };
  });

  donutBackground = computed(() => {
    const s = this.availStats();
    if (s.total === 0) return '#f1f5f9';
    const d = (s.disponible / s.total * 100).toFixed(1);
    const o = ((s.disponible + s.occupe) / s.total * 100).toFixed(1);
    return `conic-gradient(#16a34a 0% ${d}%, #f59e0b ${d}% ${o}%, #ef4444 ${o}% 100%)`;
  });

  sparkPoints = computed(() => {
    if (!this.team) return '';
    return sparkCoords(this.team.successRate).map(p => p.join(',')).join(' ');
  });
  sparkPath = computed(() => {
    if (!this.team) return '';
    const pts = sparkCoords(this.team.successRate);
    return `M${pts[0][0]},48 ${pts.map(p => `L${p[0]},${p[1]}`).join(' ')} L${pts[pts.length - 1][0]},48 Z`;
  });

  monthlyMissions = computed((): MissionBar[] => {
    const t = this.team;
    if (!t) return [];
    const base = Math.max(4, Math.floor(t.completedMissions / 6));
    return ['Jan','Fév','Mar','Avr','Mai','Jui'].map((month, i) => ({
      month,
      count: Math.max(1, base + Math.round(Math.sin(i * 1.2 + 0.5) * 4)),
    }));
  });
  maxMonthCount = computed(() => Math.max(1, ...this.monthlyMissions().map(m => m.count)));

  timeline = computed((): TimelineEvent[] => {
    const t = this.team;
    if (!t) return [];
    const evts: TimelineEvent[] = [];
    if (t.status === 'on_mission') {
      evts.push({ icon: 'directions_run', color: '#f59e0b', text: 'Équipe en mission active', time: 'Maintenant', type: 'status' });
    }
    t.recentMissions.slice(0, 4).forEach(m => {
      evts.push({
        icon:  m.status === 'termine' ? 'check_circle' : m.status === 'en_cours' ? 'pending' : 'schedule',
        color: m.status === 'termine' ? '#16a34a' : m.status === 'en_cours' ? '#f59e0b' : '#3b82f6',
        text:  `Mission ${m.reference} – ${m.zone}`,
        time:  m.date,
        type:  'mission',
      });
    });
    evts.push({ icon: 'group', color: '#8b5cf6', text: `Équipe constituée de ${t.members.length} membres`, time: t.createdAt.split('T')[0], type: 'info' });
    return evts.slice(0, 5);
  });

  incidents = computed((): Incident[] => {
    const t = this.team;
    if (!t) return [];
    return [
      { id: 1, type: 'retard',   desc: `Retard de collecte – zone ${t.zones[0]?.name?.split('–')[0]?.trim() ?? 'principale'}`, date: '10/05/2025', severity: 'low'    },
      { id: 2, type: 'absence',  desc: 'Agent absent sans remplacement immédiat',  date: '05/05/2025', severity: 'medium' },
      { id: 3, type: 'vehicule', desc: t.vehicle ? `Panne signalée sur ${t.vehicle.plate}` : 'Manque de véhicule', date: '28/04/2025', severity: t.vehicle?.status === 'maintenance' ? 'high' : 'low' },
    ];
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['team']) this.activeTab.set('apercu');
  }

  close(): void { this.visibleChange.emit(false); }
  setTab(t: Tab): void { this.activeTab.set(t); }

  // ── Helpers ──────────────────────────────────────────────────
  roleLabel(r: string): string   { return ({ manager:'Manager', collector:'Collecteur' } as Record<string,string>)[r] ?? r; }
  roleColor(r: string): string   { return ({ manager:'#3b82f6', collector:'#16a34a'   } as Record<string,string>)[r] ?? '#64748b'; }
  roleIcon(r: string): string    { return ({ manager:'manage_accounts', collector:'recycling' } as Record<string,string>)[r] ?? 'person'; }
  availColor(a: string): string  { return ({ disponible:'#16a34a', occupe:'#f59e0b', absent:'#ef4444'                                   } as Record<string,string>)[a] ?? '#94a3b8'; }
  availLabel(a: string): string  { return memberAvailabilityLabel(a); }
  availIcon(a: string): string   { return memberAvailabilityIcon(a); }
  vhStatusColor(s: string): string { return vehicleStatusColor(s); }
  vhStatusLabel(s: string): string { return vehicleStatusLabel(s); }
  vhTypeIcon(t: string): string    { return vehicleTypeIcon(t); }
  msnColor(s: string): string      { return missionStatusColor(s); }
  msnLabel(s: string): string      { return missionStatusLabel(s); }
  sevColor(s: string): string      { return ({ low:'#16a34a', medium:'#f59e0b', high:'#ef4444'                                         } as Record<string,string>)[s] ?? '#94a3b8'; }
  sevLabel(s: string): string      { return ({ low:'Faible', medium:'Modéré', high:'Critique'                                          } as Record<string,string>)[s] ?? s; }
  incIcon(t: string): string       { return ({ retard:'schedule', absence:'person_off', vehicule:'local_shipping', autre:'report'       } as Record<string,string>)[t] ?? 'warning'; }
  incTypeLabel(t: string): string  { return ({ retard:'Retard', absence:'Absence', vehicule:'Véhicule', autre:'Autre'                    } as Record<string,string>)[t] ?? t; }
  workloadColor(w: number): string { return w >= 80 ? '#ef4444' : w >= 50 ? '#f59e0b' : '#16a34a'; }
  fuelColor(f: number): string     { return f <= 20 ? '#ef4444' : f <= 40 ? '#f59e0b' : '#16a34a'; }

  /** Exposé pour usage direct dans le template (dates ISO brutes venant du backend). */
  formatFrDate = formatFrDate;

  memberCountByRole(role: string): number {
    return this.team?.members.filter(m => m.role === role).length ?? 0;
  }
  incidentCountBySeverity(severity: string): number {
    return this.incidents().filter(i => i.severity === severity).length;
  }
  range(n: number): number[] { return Array.from({ length: n }); }

  msnPct(householdsCollected: number, total: number): number {
    return total > 0 ? Math.round(householdsCollected / total * 100) : 0;
  }
}
