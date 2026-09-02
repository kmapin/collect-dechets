import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../../../services/auth.service';
import { AgencyService } from '../../../../../services/agency.service';
import { ContratService } from '../../../../../services/contrat.service';
import { RedevanceService } from '../../../../../services/redevance.service';
import { Contrat, FrequenceCollecte } from '../../../../../models/contrat.model';
import { Redevance } from '../../../../../models/redevance.model';
import { Tarif } from '../../../../../models/agency.model';
import { formatFrDate } from '../../../../../shared/format.util';
import { Client } from '../../models';
import { CLIENT_DATA_SERVICE } from '../../data-access/tokens/client-data.token';
import { SESSION_SERVICE } from '../../data-access/tokens/session.token';
import { aLaPermission } from '../../models';
import { NotificationService } from '../../../../../services/notification.service';
import { LoadingSpinnerComponent } from '../../../../../components/loading-spinner/loading-spinner.component';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { badgeContrat } from '../../shared/status-badge/status-badge.util';

// Onglet "Contrats" — déplacé depuis agency-dashboard.ts (chantier "Contrats -> dashboard
// financier") vers ce module, désormais soumis à son RBAC réel (clés `contracts.view`/
// `contracts.create`/`contracts.manage`, voir models/finance-permission.ts). Réutilise directement
// `ContratService`/`RedevanceService` (`src/app/services/...`, `providedIn:'root'`) — même
// précédent déjà établi par `client-sheet/tabs/subscription-tab.component.ts` pour ce même
// domaine, plutôt qu'un nouveau triplet contract/token/http (aucun des 5 domaines
// existants de ce module ne couvre les contrats).
@Component({
  selector: 'app-contracts',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent, StatusBadgeComponent],
  templateUrl: './contracts.component.html',
  styleUrl: './contracts.component.scss',
})
export class ContractsComponent {
  private readonly authService = inject(AuthService);
  private readonly agencyService = inject(AgencyService);
  private readonly contratService = inject(ContratService);
  private readonly redevanceService = inject(RedevanceService);
  private readonly clientData = inject(CLIENT_DATA_SERVICE);
  private readonly session = inject(SESSION_SERVICE);
  private readonly notificationService = inject(NotificationService);

  // Profondeur de défense (cosmétique) : le serveur refuse déjà les mutations sans
  // 'contracts.create'/'contracts.manage' (requireFinancePermission) — masquer les actions
  // évite juste un aller-retour inutile pour un utilisateur qui n'a que 'contracts.view'.
  // Deux droits distincts (retour utilisateur, gestion des accès) : créer un contrat
  // (POST /) est accordable indépendamment de résilier/suspendre/réactiver/générer le
  // document (toujours 'contracts.manage', voir routes/contratRoute.js).
  private readonly currentUser = toSignal(this.session.currentUser$, { initialValue: this.session.getCurrentUser() });
  readonly peutCreer = computed(() => aLaPermission(this.currentUser(), 'contracts.create'));
  readonly peutGerer = computed(() => aLaPermission(this.currentUser(), 'contracts.manage'));

  readonly badgeContrat = badgeContrat;
  readonly formatDate = formatFrDate;

  readonly contrats = signal<Contrat[]>([]);
  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);

  // ── Création d'un contrat ────────────────────────────────────────────────
  readonly showCreateModal = signal(false);
  readonly clients = signal<Client[]>([]);
  readonly tariffs = signal<Tarif[]>([]);
  readonly newContrat = signal<{ clientId: string; pricingId: string; frequenceCollecte: FrequenceCollecte; endDate: string }>({
    clientId: '',
    pricingId: '',
    frequenceCollecte: 'monthly',
    endDate: '',
  });
  readonly clientSearch = signal('');
  readonly clientDropdownOpen = signal(false);

  readonly filteredClients = computed(() => {
    const terme = this.clientSearch().trim().toLowerCase();
    const tous = this.clients();
    if (!terme) return tous;
    return tous.filter(c => `${c.nom} ${c.prenom}`.toLowerCase().includes(terme));
  });

  readonly selectedClientLabel = computed(() => {
    const client = this.clients().find(c => c.idClient === this.newContrat().clientId);
    return client ? `${client.nom} ${client.prenom}` : '';
  });

  // ── Drawer redevances d'un contrat ───────────────────────────────────────
  readonly showRedevancesDrawer = signal(false);
  readonly redevancesDrawerContrat = signal<Contrat | null>(null);
  readonly redevancesDrawerList = signal<Redevance[]>([]);
  readonly chargementRedevances = signal(false);

  constructor() {
    this.charger();
  }

  reessayer(): void {
    this.charger();
  }

  private agencyId(): string | undefined {
    return this.authService.getCurrentUser()?.agencyId;
  }

  private charger(): void {
    const agencyId = this.agencyId();
    if (!agencyId) {
      this.erreur.set("Aucune agence associée à votre compte.");
      this.chargement.set(false);
      return;
    }
    this.chargement.set(true);
    this.erreur.set(null);
    this.contratService.getContratsByAgence$(agencyId).subscribe({
      next: contrats => {
        this.contrats.set(contrats);
        this.chargement.set(false);
      },
      error: () => {
        this.erreur.set('Impossible de charger les contrats pour le moment.');
        this.chargement.set(false);
      },
    });
  }

  contratClientName(contrat: Contrat): string {
    const client = contrat.clientId;
    return typeof client === 'object' ? `${client.firstName} ${client.lastName}` : '';
  }

  contratFrequenceLabel(frequence: string): string {
    const labels: Record<string, string> = { daily: 'Quotidienne', weekly: 'Hebdomadaire', monthly: 'Mensuelle' };
    return labels[frequence] ?? frequence;
  }

  // ── Création ─────────────────────────────────────────────────────────────

  openCreateModal(): void {
    this.newContrat.set({ clientId: '', pricingId: '', frequenceCollecte: 'monthly', endDate: '' });
    this.clientSearch.set('');
    this.clientDropdownOpen.set(false);
    this.showCreateModal.set(true);
    this.chargerClients();
    this.chargerTarifs();
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  toggleClientDropdown(): void {
    this.clientDropdownOpen.update(v => !v);
  }

  selectClient(client: Client): void {
    this.newContrat.update(v => ({ ...v, clientId: client.idClient }));
    this.clientDropdownOpen.set(false);
    this.clientSearch.set('');
  }

  // Le spread d'objet (`{...v, x}`) n'est pas supporté par le parseur d'expressions de
  // template Angular — d'où ces petits setters plutôt qu'un binding inline dans le HTML.
  setPricingId(pricingId: string): void {
    this.newContrat.update(v => ({ ...v, pricingId }));
  }

  setFrequenceCollecte(frequenceCollecte: FrequenceCollecte): void {
    this.newContrat.update(v => ({ ...v, frequenceCollecte }));
  }

  setEndDate(endDate: string): void {
    this.newContrat.update(v => ({ ...v, endDate }));
  }

  onCreerContrat(): void {
    const agencyId = this.agencyId();
    const { clientId, pricingId, frequenceCollecte, endDate } = this.newContrat();
    if (!agencyId || !clientId || !pricingId || !frequenceCollecte) {
      this.notificationService.showError('Erreur', 'Merci de renseigner le client, le plan tarifaire et la fréquence.');
      return;
    }
    this.contratService
      .creerContrat$({ clientId, agencyId, pricingId, frequenceCollecte, endDate: endDate || undefined })
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Succès', 'Contrat créé avec succès.');
          this.closeCreateModal();
          this.charger();
        },
        error: (err: any) => {
          this.notificationService.showError('Erreur', err?.error?.message ?? 'Impossible de créer le contrat.');
        },
      });
  }

  // ── Mutations ────────────────────────────────────────────────────────────

  onResilierContrat(contrat: Contrat): void {
    if (!confirm('Êtes-vous sûr de vouloir résilier ce contrat ?')) return;
    const raison = prompt('Motif de résiliation (optionnel) :') || undefined;
    this.contratService.resilierContrat$(contrat._id, raison).subscribe({
      next: () => {
        this.notificationService.showSuccess('Succès', 'Contrat résilié avec succès.');
        this.charger();
      },
      error: (err: any) => this.notificationService.showError('Erreur', err?.error?.message ?? 'Impossible de résilier le contrat.'),
    });
  }

  onSuspendreContrat(contrat: Contrat): void {
    if (!confirm('Êtes-vous sûr de vouloir suspendre ce contrat ?')) return;
    this.contratService.suspendreContrat$(contrat._id).subscribe({
      next: () => {
        this.notificationService.showSuccess('Succès', 'Contrat suspendu avec succès.');
        this.charger();
      },
      error: (err: any) => this.notificationService.showError('Erreur', err?.error?.message ?? 'Impossible de suspendre le contrat.'),
    });
  }

  onReactiverContrat(contrat: Contrat): void {
    if (!confirm('Êtes-vous sûr de vouloir réactiver ce contrat ?')) return;
    this.contratService.reactiverContrat$(contrat._id).subscribe({
      next: () => {
        this.notificationService.showSuccess('Succès', 'Contrat réactivé avec succès.');
        this.charger();
      },
      error: (err: any) => this.notificationService.showError('Erreur', err?.error?.message ?? 'Impossible de réactiver le contrat.'),
    });
  }

  onGenererDocument(contrat: Contrat): void {
    this.contratService.genererDocument$(contrat._id).subscribe({
      next: (reponse: any) => {
        this.notificationService.showSuccess('Succès', 'Document généré avec succès.');
        if (reponse?.documentUrl) window.open(reponse.documentUrl, '_blank');
        this.charger();
      },
      error: (err: any) => this.notificationService.showError('Erreur', err?.error?.message ?? 'Impossible de générer le document.'),
    });
  }

  // ── Drawer redevances ────────────────────────────────────────────────────

  openRedevancesDrawer(contrat: Contrat): void {
    this.redevancesDrawerContrat.set(contrat);
    this.showRedevancesDrawer.set(true);
    this.chargementRedevances.set(true);
    this.redevanceService.getRedevancesByContrat$(contrat._id).subscribe({
      next: redevances => {
        this.redevancesDrawerList.set(redevances);
        this.chargementRedevances.set(false);
      },
      error: () => this.chargementRedevances.set(false),
    });
  }

  closeRedevancesDrawer(): void {
    this.showRedevancesDrawer.set(false);
    this.redevancesDrawerContrat.set(null);
    this.redevancesDrawerList.set([]);
  }

  redevanceStatusLabel(status: string): string {
    const labels: Record<string, string> = { en_attente: 'En attente', retard: 'En retard', paye: 'Payée', annule: 'Annulée', echec: 'Échec' };
    return labels[status] ?? status;
  }

  onMarquerRedevancePayee(redevance: Redevance): void {
    if (!confirm(`Confirmer que la redevance "${redevance.periodLabel}" (${redevance.montant} FCFA) a été payée ?`)) return;
    this.redevanceService.payerRedevance$(redevance._id).subscribe({
      next: () => {
        this.notificationService.showSuccess('Succès', 'Redevance marquée comme payée.');
        const contrat = this.redevancesDrawerContrat();
        if (contrat) this.openRedevancesDrawer(contrat);
      },
      error: (err: any) => this.notificationService.showError('Erreur', err?.error?.message ?? 'Impossible de marquer cette redevance comme payée.'),
    });
  }

  private chargerClients(): void {
    this.clientData.getClients({ page: 1, pageSize: 200 }).subscribe({
      next: page => this.clients.set(page.items),
      error: () => this.clients.set([]),
    });
  }

  // Le typage `Observable<Tarif[]>` de `AgencyService.getAgencyAllTarifs$` ne correspond
  // pas à la réponse réelle du serveur : `getPricingsController` renvoie
  // `{success, data: Tarif[]}` (routes/pricingAgency.js), jamais un tableau nu — tous les
  // autres appelants (agency-dashboard.ts, agencies.ts, agency-details.ts) lisent déjà
  // `response.data`, ce n'était pas un bug à corriger.
  private chargerTarifs(): void {
    const agencyId = this.agencyId();
    if (!agencyId) return;
    this.agencyService.getAgencyAllTarifs$(agencyId).subscribe({
      next: (response: any) => this.tariffs.set(response?.data ?? []),
      error: () => this.tariffs.set([]),
    });
  }
}
