import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize, Observable } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../../../services/auth.service';
import { AgencyService } from '../../../../../services/agency.service';
import { ContratService } from '../../../../../services/contrat.service';
import { RedevanceService } from '../../../../../services/redevance.service';
import { ServiceLocationService } from '../../../../../services/service-location.service';
import { ServiceLocation } from '../../../../../models/service-location.model';
import { Contrat, FrequenceCollecte } from '../../../../../models/contrat.model';
import { Redevance } from '../../../../../models/redevance.model';
import { ApercuPaiementGroupe, PaiementGroupeRedevance, ReductionType } from '../../../../../models/paiement-groupe-redevance.model';
import { Tarif } from '../../../../../models/agency.model';
import { formatFrDate } from '../../../../../shared/format.util';
import { Client } from '../../models';
import { CLIENT_DATA_SERVICE } from '../../data-access/tokens/client-data.token';
import { SESSION_SERVICE } from '../../data-access/tokens/session.token';
import { aLaPermission } from '../../models';
import { NotificationService } from '../../../../../services/notification.service';
import { ConfirmDialogService } from '../../../../../services/confirm-dialog.service';
import { LoadingSpinnerComponent } from '../../../../../components/loading-spinner/loading-spinner.component';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { badgeContrat } from '../../shared/status-badge/status-badge.util';

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
  private readonly serviceLocationService = inject(ServiceLocationService);
  private readonly clientData = inject(CLIENT_DATA_SERVICE);
  private readonly session = inject(SESSION_SERVICE);
  private readonly notificationService = inject(NotificationService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  private readonly currentUser = toSignal(this.session.currentUser$, { initialValue: this.session.getCurrentUser() });
  readonly peutCreer = computed(() => aLaPermission(this.currentUser(), 'contracts.create'));
  readonly peutGerer = computed(() => aLaPermission(this.currentUser(), 'contracts.manage'));

  readonly badgeContrat = badgeContrat;
  readonly formatDate = formatFrDate;

  readonly contrats = signal<Contrat[]>([]);
  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);

  readonly creationContratEnCours = signal(false);
  readonly contratMutationEnCours = signal<string | null>(null);
  readonly redevanceEnCours = signal<string | null>(null);
  readonly paiementGroupeEnCours = signal(false);

  // Création d'un contrat 
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

  // Contrat couvrant plusieurs lieux (le client demande, l'agence sélectionne les zones
  // concernées) — un Contrat distinct est créé par lieu sélectionné côté backend, jamais
  // un contrat unique multi-lieux (voir services/contrat.js::creerContratsMultiLieux).
  // Sélection vide = comportement inchangé (contrat "compte entier", un seul créé).
  readonly clientServiceLocations = signal<ServiceLocation[]>([]);
  readonly isLoadingClientLocations = signal(false);
  readonly selectedServiceLocationIds = signal<string[]>([]);

  readonly selectedTarifPrice = computed(() => {
    const pricingId = this.newContrat().pricingId;
    return this.tariffs().find(t => t._id === pricingId)?.price ?? 0;
  });

  readonly montantTotalPreview = computed(() => {
    const nombreLieux = this.selectedServiceLocationIds().length || 1;
    return this.selectedTarifPrice() * nombreLieux;
  });

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

  // Drawer redevances d'un contrat 
  readonly showRedevancesDrawer = signal(false);
  readonly redevancesDrawerContrat = signal<Contrat | null>(null);
  readonly redevancesDrawerList = signal<Redevance[]>([]);
  readonly chargementRedevances = signal(false);

  // ── Paiement groupé + réduction (chantier "payer toutes les redevances d'un
  // contrat en une fois, avec une réduction accordée par l'agence")
  readonly paiementGroupeActif = signal<PaiementGroupeRedevance | null>(null);
  readonly showPaiementGroupeForm = signal(false);
  readonly paiementGroupeApercu = signal<ApercuPaiementGroupe | null>(null);
  readonly chargementApercu = signal(false);
  readonly paiementGroupeForm = signal<{ genererTout: boolean; reductionType: ReductionType; reductionValeur: number }>({
    genererTout: false,
    reductionType: 'pourcentage',
    reductionValeur: 0,
  });

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

  /** "Tous les lieux" = contrat "compte entier" (serviceLocationId absent — voir
   * services/eligibility.service.js pour sa portée réelle, limitée au lieu principal). */
  contratServiceLocationLabel(contrat: Contrat): string {
    const lieu = contrat.serviceLocationId;
    return typeof lieu === 'object' && lieu ? lieu.name : 'Tous les lieux';
  }

  // Création 

  openCreateModal(): void {
    this.newContrat.set({ clientId: '', pricingId: '', frequenceCollecte: 'monthly', endDate: '' });
    this.clientSearch.set('');
    this.clientDropdownOpen.set(false);
    this.clientServiceLocations.set([]);
    this.selectedServiceLocationIds.set([]);
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
    this.chargerLieuxClient(client.idClient);
  }

  private chargerLieuxClient(clientId: string): void {
    this.selectedServiceLocationIds.set([]);
    this.clientServiceLocations.set([]);
    if (!clientId) return;
    this.isLoadingClientLocations.set(true);
    this.serviceLocationService.listByClient$(clientId).subscribe({
      next: ({ data }) => {
        this.clientServiceLocations.set(data || []);
        this.isLoadingClientLocations.set(false);
      },
      error: () => {
        this.clientServiceLocations.set([]);
        this.isLoadingClientLocations.set(false);
      },
    });
  }

  toggleServiceLocationSelection(locationId: string): void {
    this.selectedServiceLocationIds.update((ids) =>
      ids.includes(locationId) ? ids.filter((id) => id !== locationId) : [...ids, locationId],
    );
  }

  //  Setters plutôt qu'un binding inline dans le HTML.
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
    if (this.creationContratEnCours()) return;
    const agencyId = this.agencyId();
    const { clientId, pricingId, frequenceCollecte, endDate } = this.newContrat();
    if (!agencyId || !clientId || !pricingId || !frequenceCollecte) {
      this.notificationService.showError('Erreur', 'Merci de renseigner le client, le plan tarifaire et la fréquence.');
      return;
    }

    const serviceLocationIds = this.selectedServiceLocationIds();
    this.creationContratEnCours.set(true);

    // Un ou plusieurs lieux sélectionnés -> un Contrat par lieu (montant total = tarif ×
    // nombre de lieux) ; aucun lieu sélectionné -> comportement historique inchangé (un
    // seul contrat "compte entier").
    const requete: Observable<any> = serviceLocationIds.length > 0
      ? this.contratService.creerContratsMultiLieux$({ clientId, agencyId, pricingId, frequenceCollecte, endDate: endDate || undefined, serviceLocationIds })
      : this.contratService.creerContrat$({ clientId, agencyId, pricingId, frequenceCollecte, endDate: endDate || undefined });

    requete
      .pipe(finalize(() => this.creationContratEnCours.set(false)))
      .subscribe({
        next: (res: any) => {
          const message = serviceLocationIds.length > 0
            ? `${serviceLocationIds.length} contrat(s) créé(s) avec succès (${res.montantTotal} FCFA au total).`
            : 'Contrat créé avec succès.';
          this.notificationService.showSuccess('Succès', message);
          this.closeCreateModal();
          this.charger();
        },
        error: (err: any) => {
          this.notificationService.showError('Erreur', err?.error?.message ?? 'Impossible de créer le contrat.');
        },
      });
  }

  async onResilierContrat(contrat: Contrat): Promise<void> {
    if (this.contratMutationEnCours()) return;
    const raisonSaisie = await this.confirmDialog.confirmWithInput({
      title: 'Résilier ce contrat ?',
      message: 'Êtes-vous sûr de vouloir résilier ce contrat ? Le motif est conservé sur le contrat.',
      variant: 'danger',
      confirmLabel: 'Résilier',
      inputField: { placeholder: 'Motif de résiliation (optionnel)' },
    });
    if (raisonSaisie === null) return;
    const raison = raisonSaisie || undefined;
    this.contratMutationEnCours.set(contrat._id);
    this.contratService.resilierContrat$(contrat._id, raison)
      .pipe(finalize(() => this.contratMutationEnCours.set(null)))
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Succès', 'Contrat résilié avec succès.');
          this.charger();
        },
        error: (err: any) => this.notificationService.showError('Erreur', err?.error?.message ?? 'Impossible de résilier le contrat.'),
      });
  }

  async onSuspendreContrat(contrat: Contrat): Promise<void> {
    if (this.contratMutationEnCours()) return;
    const ok = await this.confirmDialog.confirm({
      title: 'Suspendre ce contrat ?',
      message: 'Êtes-vous sûr de vouloir suspendre ce contrat ?',
      variant: 'primary',
      confirmLabel: 'Suspendre',
    });
    if (!ok) return;
    this.contratMutationEnCours.set(contrat._id);
    this.contratService.suspendreContrat$(contrat._id)
      .pipe(finalize(() => this.contratMutationEnCours.set(null)))
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Succès', 'Contrat suspendu avec succès.');
          this.charger();
        },
        error: (err: any) => this.notificationService.showError('Erreur', err?.error?.message ?? 'Impossible de suspendre le contrat.'),
      });
  }

  async onReactiverContrat(contrat: Contrat): Promise<void> {
    if (this.contratMutationEnCours()) return;
    const ok = await this.confirmDialog.confirm({
      title: 'Réactiver ce contrat ?',
      message: 'Êtes-vous sûr de vouloir réactiver ce contrat ?',
      variant: 'success',
      confirmLabel: 'Réactiver',
    });
    if (!ok) return;
    this.contratMutationEnCours.set(contrat._id);
    this.contratService.reactiverContrat$(contrat._id)
      .pipe(finalize(() => this.contratMutationEnCours.set(null)))
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Succès', 'Contrat réactivé avec succès.');
          this.charger();
        },
        error: (err: any) => this.notificationService.showError('Erreur', err?.error?.message ?? 'Impossible de réactiver le contrat.'),
      });
  }

  /**
   * `contrat.documentUrl` (stocké en base) n'est plus consultable directement — PDF en
   * type Cloudinary 'private' (backend, services/pdfContrat.js) : une URL signée à
   * durée limitée doit être régénérée à chaque consultation.
   */
  onVoirDocument(contrat: Contrat): void {
    this.contratService.getDocumentUrl$(contrat._id).subscribe({
      next: (res) => window.open(res.documentUrl, '_blank'),
      error: (err: any) => this.notificationService.showError('Erreur', err?.error?.message ?? 'Impossible d\'ouvrir le document.'),
    });
  }

  onGenererDocument(contrat: Contrat): void {
    if (this.contratMutationEnCours()) return;
    this.contratMutationEnCours.set(contrat._id);
    this.contratService.genererDocument$(contrat._id)
      .pipe(finalize(() => this.contratMutationEnCours.set(null)))
      .subscribe({
        next: (reponse: any) => {
          this.notificationService.showSuccess('Succès', 'Document généré avec succès.');
          if (reponse?.documentUrl) window.open(reponse.documentUrl, '_blank');
          this.charger();
        },
        error: (err: any) => this.notificationService.showError('Erreur', err?.error?.message ?? 'Impossible de générer le document.'),
      });
  }

  // Drawer redevances 

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
    this.chargerPaiementGroupeActif(contrat._id);
  }

  closeRedevancesDrawer(): void {
    this.showRedevancesDrawer.set(false);
    this.redevancesDrawerContrat.set(null);
    this.redevancesDrawerList.set([]);
    this.paiementGroupeActif.set(null);
    this.showPaiementGroupeForm.set(false);
    this.paiementGroupeApercu.set(null);
  }

  private chargerPaiementGroupeActif(contratId: string): void {
    this.redevanceService.getPropositionActivePaiementGroupe$(contratId).subscribe({
      next: proposition => this.paiementGroupeActif.set(proposition),
      error: () => this.paiementGroupeActif.set(null),
    });
  }

  ouvrirFormPaiementGroupe(): void {
    this.paiementGroupeForm.set({ genererTout: false, reductionType: 'pourcentage', reductionValeur: 0 });
    this.paiementGroupeApercu.set(null);
    this.showPaiementGroupeForm.set(true);
    this.chargerApercuPaiementGroupe();
  }

  fermerFormPaiementGroupe(): void {
    this.showPaiementGroupeForm.set(false);
    this.paiementGroupeApercu.set(null);
  }

  setGenererTout(genererTout: boolean): void {
    this.paiementGroupeForm.update(v => ({ ...v, genererTout }));
    this.chargerApercuPaiementGroupe();
  }

  setReductionType(reductionType: ReductionType): void {
    this.paiementGroupeForm.update(v => ({ ...v, reductionType }));
  }

  setReductionValeur(reductionValeur: number): void {
    this.paiementGroupeForm.update(v => ({ ...v, reductionValeur }));
  }

  chargerApercuPaiementGroupe(): void {
    const contrat = this.redevancesDrawerContrat();
    if (!contrat) return;
    this.chargementApercu.set(true);
    this.redevanceService.apercuPaiementGroupe$(contrat._id, this.paiementGroupeForm().genererTout).subscribe({
      next: apercu => {
        this.paiementGroupeApercu.set(apercu);
        this.chargementApercu.set(false);
      },
      error: (err: any) => {
        this.chargementApercu.set(false);
        this.notificationService.showError('Erreur', err?.error?.message ?? "Impossible de calculer l'aperçu.");
      },
    });
  }

  /** Montant réellement à payer après réduction, calculé côté frontend pour un aperçu
   * immédiat pendant la saisie — le backend recalcule et fait foi à la création réelle
   * (services/paiementGroupe.js::_calculerReduction), jamais fait confiance ici seul. */
  montantApresReductionApercu(): number {
    const apercu = this.paiementGroupeApercu();
    const { reductionType, reductionValeur } = this.paiementGroupeForm();
    if (!apercu) return 0;
    const total = apercu.montantTotal;
    const reduction = reductionType === 'pourcentage'
      ? Math.round(total * ((reductionValeur || 0) / 100))
      : (reductionValeur || 0);
    return Math.max(0, total - Math.min(reduction, total));
  }

  onCreerPropositionPaiementGroupe(): void {
    if (this.paiementGroupeEnCours()) return;
    const contrat = this.redevancesDrawerContrat();
    if (!contrat) return;
    const { genererTout, reductionType, reductionValeur } = this.paiementGroupeForm();
    this.paiementGroupeEnCours.set(true);
    this.redevanceService.creerPropositionPaiementGroupe$(contrat._id, { genererTout, reductionType, reductionValeur })
      .pipe(finalize(() => this.paiementGroupeEnCours.set(false)))
      .subscribe({
        next: (res) => {
          this.notificationService.showSuccess('Succès', 'Proposition de paiement groupé créée. Le client a été notifié.');
          this.paiementGroupeActif.set(res.proposition);
          this.showPaiementGroupeForm.set(false);
          this.openRedevancesDrawer(contrat); // recharge les redevances (générées si genererTout)
        },
        error: (err: any) => this.notificationService.showError('Erreur', err?.error?.message ?? 'Impossible de créer la proposition de paiement groupé.'),
      });
  }

  async onAnnulerPaiementGroupe(): Promise<void> {
    if (this.paiementGroupeEnCours()) return;
    const proposition = this.paiementGroupeActif();
    if (!proposition) return;
    const ok = await this.confirmDialog.confirm({
      title: 'Annuler cette proposition ?',
      message: 'Annuler cette proposition de paiement groupé ?',
      variant: 'danger',
      confirmLabel: 'Annuler la proposition',
    });
    if (!ok) return;
    this.paiementGroupeEnCours.set(true);
    this.redevanceService.annulerPropositionPaiementGroupe$(proposition._id)
      .pipe(finalize(() => this.paiementGroupeEnCours.set(false)))
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Succès', 'Proposition annulée.');
          this.paiementGroupeActif.set(null);
        },
        error: (err: any) => this.notificationService.showError('Erreur', err?.error?.message ?? "Impossible d'annuler cette proposition."),
      });
  }

  async onPayerManuelPaiementGroupe(): Promise<void> {
    if (this.paiementGroupeEnCours()) return;
    const proposition = this.paiementGroupeActif();
    const contrat = this.redevancesDrawerContrat();
    if (!proposition || !contrat) return;
    const ok = await this.confirmDialog.confirm({
      title: 'Confirmer la réception du paiement ?',
      message: `Confirmer que le paiement groupé de ${proposition.montantAPayer} FCFA a été reçu ?`,
      variant: 'success',
      confirmLabel: 'Confirmer',
    });
    if (!ok) return;
    this.paiementGroupeEnCours.set(true);
    this.redevanceService.payerManuelPaiementGroupe$(proposition._id)
      .pipe(finalize(() => this.paiementGroupeEnCours.set(false)))
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Succès', 'Paiement groupé enregistré.');
          this.openRedevancesDrawer(contrat);
        },
        error: (err: any) => this.notificationService.showError('Erreur', err?.error?.message ?? "Impossible d'enregistrer ce paiement groupé."),
      });
  }

  redevanceStatusLabel(status: string): string {
    const labels: Record<string, string> = { en_attente: 'En attente', retard: 'En retard', paye: 'Payée', annule: 'Annulée', echec: 'Échec' };
    return labels[status] ?? status;
  }

  async onMarquerRedevancePayee(redevance: Redevance): Promise<void> {
    if (this.redevanceEnCours()) return;
    const ok = await this.confirmDialog.confirm({
      title: 'Confirmer le paiement de la redevance ?',
      message: `Confirmer que la redevance "${redevance.periodLabel}" (${redevance.montant} FCFA) a été payée ?`,
      variant: 'success',
      confirmLabel: 'Confirmer',
    });
    if (!ok) return;
    this.redevanceEnCours.set(redevance._id);
    this.redevanceService.payerRedevance$(redevance._id)
      .pipe(finalize(() => this.redevanceEnCours.set(null)))
      .subscribe({
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
