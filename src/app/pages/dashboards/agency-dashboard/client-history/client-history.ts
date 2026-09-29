import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ClientService } from '../../../../services/client.service';
import { Admin } from '../../../../services/admin';
import { AuthService } from '../../../../services/auth.service';
import { Breadcrumb, BreadcrumbItem } from '../../../../shared/breadcrumb/breadcrumb';
import { dashboardLabelForRole, dashboardRouteForRole } from '../../../../shared/notification-route.util';
import { formatFrDate } from '../../../../shared/format.util';
import { withBreadcrumbTrail } from '../../../../shared/breadcrumb-trail.util';

type Bucket = 'a_venir' | 'en_cours' | 'terminee' | 'manquee';
type StatusFilter = 'all' | Bucket;

interface HistoryRow {
  id: string;
  bucket: Bucket;
  statusLabel: string;
  statusColor: string;
  date: string | null;
  reference?: string;
  location?: string;
  rating?: number;
  planningId?: string;
}

/** `serviceLocationId` est peuplé (name/type) sur les Collecte (voir
 * SERVICE_LOCATION_POPULATE côté back) mais reste un simple ObjectId — ou `null`
 * pour les plannings groupe/zone/secteur (models/planning.js:131-140) — sur les
 * Planning pas encore matérialisés en Collecte ("à venir"). */
function serviceLocationLabel(serviceLocationId: any): string | undefined {
  return typeof serviceLocationId === 'object' && serviceLocationId ? serviceLocationId.name : undefined;
}

// Collecte.status (models/Collecte.js) -> libellé + couleur d'affichage. 'Scheduled' n'apparaît
// jamais ici (traité à part comme "en cours", voir _buildRows).
const HISTORY_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  Completed: { label: 'Terminée', color: '#16a34a' },
  Collected: { label: 'Terminée', color: '#16a34a' },
  Cancelled: { label: 'Annulée', color: '#94a3b8' },
  Reported:  { label: 'Signalée', color: '#f59e0b' },
  Missed:    { label: 'Manquée', color: '#ef4444' },
};

const BUCKET_LABELS: Record<Bucket, string> = {
  a_venir: 'À venir',
  en_cours: 'En cours',
  terminee: 'Terminée',
  manquee: 'Manquée',
};

@Component({
  selector: 'app-client-history',
  standalone: true,
  imports: [CommonModule, Breadcrumb],
  templateUrl: './client-history.html',
  styleUrl: './client-history.scss',
})
export class ClientHistory implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private clientService = inject(ClientService);
  private adminService = inject(Admin);
  private auth = inject(AuthService);

  formatFrDate = formatFrDate;
  bucketLabels = BUCKET_LABELS;

  clientId = '';
  client = signal<any | null>(null);
  isLoading = signal(true);
  rows = signal<HistoryRow[]>([]);
  statusFilter = signal<StatusFilter>('all');

  breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    const role = this.auth.getCurrentUser()?.role;
    const c = this.client();
    return [
      { label: dashboardLabelForRole(role), route: dashboardRouteForRole(role), icon: 'home' },
      { label: 'Clients', route: '/dashboard/agency', queryParams: { tab: 'clients' } },
      { label: c ? `${c.firstName} ${c.lastName}` : 'Historique des collectes' },
    ];
  });

  counts = computed(() => {
    const list = this.rows();
    return {
      all: list.length,
      a_venir: list.filter(r => r.bucket === 'a_venir').length,
      en_cours: list.filter(r => r.bucket === 'en_cours').length,
      terminee: list.filter(r => r.bucket === 'terminee').length,
      manquee: list.filter(r => r.bucket === 'manquee').length,
    };
  });

  filteredRows = computed(() => {
    const filter = this.statusFilter();
    const list = this.rows();
    return filter === 'all' ? list : list.filter(r => r.bucket === filter);
  });

  ngOnInit(): void {
    this.clientId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.clientId) return;
    this._loadClient();
    this._loadHistory();
  }

  setStatusFilter(filter: StatusFilter): void {
    this.statusFilter.set(filter);
  }

  goToPlanning(planningId: string | undefined): void {
    if (!planningId) return;
    const c = this.client();
    const trail = [
      { label: 'Clients', route: '/dashboard/agency', queryParams: { tab: 'clients' } },
      {
        label: c ? `${c.firstName} ${c.lastName}` : 'Historique des collectes',
        route: `/dashboard/agency/clients/${this.clientId}/historique`,
      },
    ];
    this.router.navigate(['/planning/detail', planningId], withBreadcrumbTrail(trail));
  }

  goBackToClients(): void {
    this.router.navigate(['/dashboard/agency'], { queryParams: { tab: 'clients' } });
  }

  private _loadClient(): void {
    this.adminService.getUserById(this.clientId).subscribe({
      next: (res: any) => this.client.set(res?.user ?? null),
      error: () => this.client.set(null),
    });
  }

  private _loadHistory(): void {
    this.isLoading.set(true);
    forkJoin({
      upcoming: this.clientService.getClientUpcomingPlannings(this.clientId).pipe(catchError(() => of([]))),
      scheduled: this.clientService.getClientPlanning(this.clientId).pipe(catchError(() => of([]))),
      history: this.clientService.getClientPlanningHistory(this.clientId).pipe(catchError(() => of([]))),
    }).subscribe(({ upcoming, scheduled, history }) => {
      this.rows.set(this._buildRows(upcoming, scheduled, history));
      this.isLoading.set(false);
    });
  }

  /** Fusionne les 3 sources déjà utilisées par client-dashboard.ts (mêmes endpoints, même
   * logique de statut) en une seule liste normalisée, triée du plus récent au plus ancien. */
  private _buildRows(upcoming: any[], scheduled: any[], history: any[]): HistoryRow[] {
    const fromUpcoming: HistoryRow[] = (upcoming || []).map((p) => {
      const bucket: Bucket = p.planningStatus === 'en_cours' ? 'en_cours' : 'a_venir';
      return {
        id: p._id,
        bucket,
        statusLabel: bucket === 'en_cours' ? 'En cours' : 'À venir',
        statusColor: bucket === 'en_cours' ? '#f59e0b' : '#3b82f6',
        date: p.date ?? null,
        reference: p.reference,
        location: serviceLocationLabel(p.serviceLocationId),
        planningId: p._id,
      };
    });

    const fromScheduled: HistoryRow[] = (scheduled || []).map((c) => ({
      id: c._id,
      bucket: 'en_cours' as const,
      statusLabel: 'En cours',
      statusColor: '#f59e0b',
      date: c.date ?? null,
      location: serviceLocationLabel(c.serviceLocationId),
      planningId: typeof c.code === 'object' ? c.code?._id : c.code,
    }));

    const fromHistory: HistoryRow[] = (history || []).map((h) => {
      const status = h.status === 'Collected' ? 'Completed' : h.status;
      const meta = HISTORY_STATUS_LABELS[status] ?? { label: status, color: '#94a3b8' };
      const bucket: Bucket = status === 'Missed' ? 'manquee' : 'terminee';
      return {
        id: h._id,
        bucket,
        statusLabel: meta.label,
        statusColor: meta.color,
        date: h.date ?? h.createdAt ?? null,
        location: serviceLocationLabel(h.serviceLocationId),
        rating: h.rating?.stars,
        planningId: typeof h.code === 'object' ? h.code?._id : h.code,
      };
    });

    return [...fromUpcoming, ...fromScheduled, ...fromHistory].sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });
  }
}
