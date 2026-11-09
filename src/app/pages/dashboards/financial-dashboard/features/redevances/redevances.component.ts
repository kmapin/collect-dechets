import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { finalize, forkJoin, map } from 'rxjs';
import { ContratService } from '../../../../../services/contrat.service';
import { RedevanceService } from '../../../../../services/redevance.service';
import { Contrat } from '../../../../../models/contrat.model';
import { Redevance } from '../../../../../models/redevance.model';
import { PaiementGroupeRedevance, ReductionType } from '../../../../../models/paiement-groupe-redevance.model';
import { formatFrDate } from '../../../../../shared/format.util';
import { ScrollLockDirective } from '../../../../../shared/scroll-lock.directive';
import { DraggableDirective } from '../../../../../shared/draggable.directive';
import { aLaPermission } from '../../models';
import { SESSION_SERVICE } from '../../data-access/tokens/session.token';
import { NotificationService } from '../../../../../services/notification.service';
import { ConfirmDialogService } from '../../../../../services/confirm-dialog.service';
import { LoadingSpinnerComponent } from '../../../../../components/loading-spinner/loading-spinner.component';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { badgeRedevance } from '../../shared/status-badge/status-badge.util';

type FiltreStatutRedevance = 'Tous' | 'en_attente' | 'retard' | 'paye' | 'annule' | 'echec';

/** Formulaire "Paiement manuel" — date, somme reçue, commentaire libre. */
interface PaiementManuelForm {
  datePaiement: string;
  montantRecu: number;
  commentaire: string;
}

/**
 * Drawer unifié pour trois cas :
 * - redevance individuelle (clic sur l'icône paiement d'une ligne)
 * - groupe (proposition active créée antérieurement)
 * - selection (1..N redevances cochées → bouton "Payer" de la barre)
 */
type CiblePaiementManuel =
  | { type: 'redevance'; redevance: Redevance }
  | { type: 'groupe'; proposition: PaiementGroupeRedevance }
  | { type: 'selection'; redevances: Redevance[] };

@Component({
  selector: 'app-redevances',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LoadingSpinnerComponent, StatusBadgeComponent, ScrollLockDirective, DraggableDirective],
  templateUrl: './redevances.component.html',
  styleUrl: './redevances.component.scss',
})
export class RedevancesComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly contratService = inject(ContratService);
  private readonly redevanceService = inject(RedevanceService);
  private readonly session = inject(SESSION_SERVICE);
  private readonly notificationService = inject(NotificationService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  private readonly currentUser = toSignal(this.session.currentUser$, { initialValue: this.session.getCurrentUser() });
  readonly peutPayerManuel = computed(() => aLaPermission(this.currentUser(), 'contracts.pay_manual'));

  readonly badgeRedevance = badgeRedevance;
  readonly formatDate = formatFrDate;

  readonly contratId = toSignal(
    this.route.paramMap.pipe(map(params => params.get('contratId') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('contratId') ?? '' },
  );

  private readonly queryParamMap = toSignal(
    this.route.queryParamMap,
    { initialValue: this.route.snapshot.queryParamMap },
  );
  readonly retour = computed(() => {
    const params = this.queryParamMap();
    const depuis = params.get('depuis');

    if (depuis === 'client' && params.get('idClient')) {
      return {
        lien: ['/dashboard/financial/clients', params.get('idClient')],
        queryParams: { onglet: 'facturation' },
        label: 'Fiche client',
      };
    }

    if (depuis === 'suivi-mensuel' && params.get('mois') && params.get('annee')) {
      return {
        lien: ['/dashboard/financial/monthly-tracking'],
        queryParams: { mois: params.get('mois'), annee: params.get('annee') },
        label: 'Suivi mensuel',
      };
    }

    return { lien: ['/dashboard/financial/contracts'], queryParams: {}, label: 'Contrats' };
  });

  readonly contrat = signal<Contrat | null>(null);
  readonly chargementContrat = signal(true);
  readonly erreur = signal<string | null>(null);

  readonly redevances = signal<Redevance[]>([]);
  readonly chargementRedevances = signal(true);
  readonly filtreStatut = signal<FiltreStatutRedevance>('Tous');

  readonly redevancesFiltrees = computed(() => {
    const filtre = this.filtreStatut();
    const liste = this.redevances();
    return filtre === 'Tous' ? liste : liste.filter(r => r.status === filtre);
  });

  readonly resume = computed(() => {
    const liste = this.redevances();
    const montantDu = liste
      .filter(r => r.status === 'en_attente' || r.status === 'retard')
      .reduce((acc, r) => acc + r.montant, 0);
    return {
      total: liste.length,
      payees: liste.filter(r => r.status === 'paye').length,
      enRetard: liste.filter(r => r.status === 'retard').length,
      montantDu,
    };
  });

  // ── Proposition groupée active (créée lors d'une session précédente) ──
  readonly paiementGroupeActif = signal<PaiementGroupeRedevance | null>(null);
  readonly paiementGroupeEnCours = signal(false);

  // ── Sélection pour paiement (checkboxes dans le tableau) ──────────────
  readonly selectedIds = signal<Set<string>>(new Set());
  /** Réduction optionnelle activable dans le drawer de sélection. */
  readonly avecReduction = signal(false);
  readonly reductionForm = signal<{ type: ReductionType; valeur: number }>({ type: 'pourcentage', valeur: 0 });

  readonly selectionCount = computed(() => this.selectedIds().size);

  readonly selectionMontant = computed(() => {
    const ids = this.selectedIds();
    return this.redevances()
      .filter(r => ids.has(r._id))
      .reduce((acc, r) => acc + r.montant, 0);
  });

  /** Prévisualisation côté frontend du montant après réduction sur la sélection —
   *  le backend recalcule et fait foi à la création réelle. */
  readonly montantApresReductionSelection = computed(() => {
    const base = this.selectionMontant();
    const { type, valeur } = this.reductionForm();
    const reduction = type === 'pourcentage'
      ? Math.round(base * ((valeur || 0) / 100))
      : (valeur || 0);
    return Math.max(0, base - Math.min(reduction, base));
  });

  readonly toutesImpayeesSelectionnees = computed(() => {
    const impayees = this.redevances().filter(r => r.status === 'en_attente' || r.status === 'retard');
    if (impayees.length === 0) return false;
    const ids = this.selectedIds();
    return impayees.every(r => ids.has(r._id));
  });

  // ── Paiement manuel (drawer unifié) ───────────────────────────────────
  readonly showPaiementManuelDrawer = signal(false);
  readonly paiementManuelCible = signal<CiblePaiementManuel | null>(null);
  readonly paiementManuelForm = signal<PaiementManuelForm>({ datePaiement: '', montantRecu: 0, commentaire: '' });
  readonly paiementManuelEnCours = signal(false);
  readonly dateDuJour = new Date().toISOString().slice(0, 10);

  constructor() {
    this.charger();
  }

  reessayer(): void {
    this.charger();
  }

  private charger(): void {
    const contratId = this.contratId();
    if (!contratId) {
      this.erreur.set('Contrat introuvable.');
      this.chargementContrat.set(false);
      return;
    }
    this.chargementContrat.set(true);
    this.erreur.set(null);
    this.contratService.getContratById$(contratId).subscribe({
      next: (contrat) => {
        if (!contrat) {
          this.erreur.set("Ce contrat n'existe pas ou vous n'y avez pas accès.");
          this.chargementContrat.set(false);
          return;
        }
        this.contrat.set(contrat);
        this.chargementContrat.set(false);
        this.chargerRedevances();
        this.chargerPaiementGroupeActif();
      },
      error: () => {
        this.erreur.set('Impossible de charger ce contrat pour le moment.');
        this.chargementContrat.set(false);
      },
    });
  }

  private chargerRedevances(): void {
    const contratId = this.contratId();
    this.chargementRedevances.set(true);
    this.redevanceService.getRedevancesByContrat$(contratId).subscribe({
      next: (redevances) => {
        this.redevances.set(redevances);
        this.chargementRedevances.set(false);
      },
      error: () => this.chargementRedevances.set(false),
    });
  }

  changerFiltreStatut(statut: FiltreStatutRedevance): void {
    this.filtreStatut.set(statut);
  }

  contratClientName(contrat: Contrat): string {
    const client = contrat.clientId;
    return typeof client === 'object' ? `${client.firstName} ${client.lastName}` : '';
  }

  contratFrequenceLabel(frequence: string): string {
    const labels: Record<string, string> = { daily: 'Quotidienne', weekly: 'Hebdomadaire', monthly: 'Mensuelle' };
    return labels[frequence] ?? frequence;
  }

  contratServiceLocationLabel(contrat: Contrat): string {
    const lieu = contrat.serviceLocationId;
    return typeof lieu === 'object' && lieu ? lieu.name : 'Tous les lieux';
  }

  // ── Proposition groupée active (session précédente) ────────────────────

  private chargerPaiementGroupeActif(): void {
    this.redevanceService.getPropositionActivePaiementGroupe$(this.contratId()).subscribe({
      next: proposition => this.paiementGroupeActif.set(proposition),
      error: () => this.paiementGroupeActif.set(null),
    });
  }

  /** Ouvre le drawer sur la proposition active existante. */
  ouvrirPaiementManuelGroupe(proposition: PaiementGroupeRedevance): void {
    this.paiementManuelCible.set({ type: 'groupe', proposition });
    this.paiementManuelForm.set({
      datePaiement: this.dateDuJour,
      montantRecu: proposition.montantAPayer,
      commentaire: '',
    });
    this.showPaiementManuelDrawer.set(true);
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

  // ── Sélection checkboxes ───────────────────────────────────────────────

  toggleSelection(id: string): void {
    this.selectedIds.update(s => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  effacerSelection(): void {
    this.selectedIds.set(new Set());
  }

  toggleToutImpayees(): void {
    const impayees = this.redevances().filter(r => r.status === 'en_attente' || r.status === 'retard');
    if (this.toutesImpayeesSelectionnees()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(impayees.map(r => r._id)));
    }
  }

  /** Ouvre le drawer unifié pour la sélection courante. */
  ouvrirPayerSelection(): void {
    const ids = this.selectedIds();
    const selected = this.redevances().filter(r => ids.has(r._id));
    if (!selected.length) return;
    this.paiementManuelCible.set({ type: 'selection', redevances: selected });
    this.avecReduction.set(false);
    this.reductionForm.set({ type: 'pourcentage', valeur: 0 });
    this.paiementManuelForm.set({
      datePaiement: this.dateDuJour,
      montantRecu: selected.reduce((acc, r) => acc + r.montant, 0),
      commentaire: '',
    });
    this.showPaiementManuelDrawer.set(true);
  }

  toggleReduction(checked: boolean): void {
    this.avecReduction.set(checked);
    if (checked) {
      this.paiementManuelForm.update(v => ({ ...v, montantRecu: this.montantApresReductionSelection() }));
    } else {
      const cible = this.paiementManuelCible();
      if (cible?.type === 'selection') {
        const sel = (cible as { type: 'selection'; redevances: Redevance[] }).redevances;
        this.paiementManuelForm.update(v => ({ ...v, montantRecu: sel.reduce((a, r) => a + r.montant, 0) }));
      }
    }
  }

  setReductionType(type: ReductionType): void {
    this.reductionForm.update(v => ({ ...v, type }));
    if (this.avecReduction()) {
      this.paiementManuelForm.update(v => ({ ...v, montantRecu: this.montantApresReductionSelection() }));
    }
  }

  setReductionValeur(valeur: number): void {
    this.reductionForm.update(v => ({ ...v, valeur }));
    if (this.avecReduction()) {
      this.paiementManuelForm.update(v => ({ ...v, montantRecu: this.montantApresReductionSelection() }));
    }
  }

  // ── Drawer paiement manuel ─────────────────────────────────────────────

  /** Raccourci direct sur une ligne individuelle (clic icône). */
  ouvrirPaiementManuel(redevance: Redevance): void {
    this.paiementManuelCible.set({ type: 'redevance', redevance });
    this.paiementManuelForm.set({
      datePaiement: this.dateDuJour,
      montantRecu: redevance.montant,
      commentaire: '',
    });
    this.showPaiementManuelDrawer.set(true);
  }

  fermerPaiementManuel(): void {
    this.showPaiementManuelDrawer.set(false);
    this.paiementManuelCible.set(null);
  }

  setDatePaiement(datePaiement: string): void {
    this.paiementManuelForm.update(v => ({ ...v, datePaiement }));
  }

  setMontantRecu(montantRecu: number): void {
    this.paiementManuelForm.update(v => ({ ...v, montantRecu }));
  }

  setCommentaire(commentaire: string): void {
    this.paiementManuelForm.update(v => ({ ...v, commentaire }));
  }

  paiementManuelInvalide(): boolean {
    const { datePaiement, montantRecu } = this.paiementManuelForm();
    if (!datePaiement || datePaiement > this.dateDuJour) return true;
    const cible = this.paiementManuelCible();
    // Sélection sans réduction : chaque redevance est payée pour son propre montant,
    // le champ "somme reçue" n'est pas affiché — seule la date est requise.
    if (cible?.type === 'selection' && !this.avecReduction()) return false;
    return !montantRecu || montantRecu <= 0;
  }

  onConfirmerPaiementManuel(): void {
    if (this.paiementManuelEnCours() || this.paiementManuelInvalide()) return;
    const cible = this.paiementManuelCible();
    if (!cible) return;
    const { datePaiement, montantRecu, commentaire } = this.paiementManuelForm();
    const commentaireTrimmed = commentaire.trim() || undefined;

    const onSuccess = () => {
      this.notificationService.showSuccess('Succès', 'Paiement enregistré.');
      this.fermerPaiementManuel();
      this.selectedIds.set(new Set());
      this.chargerRedevances();
      if (cible.type === 'groupe') this.paiementGroupeActif.set(null);
    };
    const onError = (err: any) =>
      this.notificationService.showError('Erreur', err?.error?.message ?? "Impossible d'enregistrer ce paiement.");

    this.paiementManuelEnCours.set(true);

    if (cible.type === 'redevance') {
      this.redevanceService.payerRedevance$(cible.redevance._id, { datePaiement, montantRecu, commentaire: commentaireTrimmed })
        .pipe(finalize(() => this.paiementManuelEnCours.set(false)))
        .subscribe({ next: onSuccess, error: onError });

    } else if (cible.type === 'groupe') {
      this.redevanceService.payerManuelPaiementGroupe$(cible.proposition._id, { datePaiement, montantRecu, commentaire: commentaireTrimmed })
        .pipe(finalize(() => this.paiementManuelEnCours.set(false)))
        .subscribe({ next: onSuccess, error: onError });

    } else {
      // Sélection
      if (this.avecReduction()) {
        // Passe les ids sélectionnés — le backend valide qu'ils appartiennent
        // au contrat et sont bien impayés, puis applique la réduction uniquement sur eux.
        const { type, valeur } = this.reductionForm();
        this.redevanceService.creerPropositionPaiementGroupe$(this.contratId(), {
          genererTout: false,
          reductionType: type,
          reductionValeur: valeur,
          redevanceIds: cible.redevances.map(r => r._id),
        }).subscribe({
          next: (res) => {
            this.redevanceService.payerManuelPaiementGroupe$(res.proposition._id, {
              datePaiement, montantRecu, commentaire: commentaireTrimmed,
            }).pipe(finalize(() => this.paiementManuelEnCours.set(false)))
              .subscribe({ next: onSuccess, error: onError });
          },
          error: (err) => {
            this.paiementManuelEnCours.set(false);
            onError(err);
          },
        });
      } else {
        // Paiement individuel en parallèle pour chaque redevance sélectionnée
        forkJoin(
          cible.redevances.map(r =>
            this.redevanceService.payerRedevance$(r._id, {
              datePaiement,
              montantRecu: r.montant,
              commentaire: commentaireTrimmed,
            })
          )
        ).pipe(finalize(() => this.paiementManuelEnCours.set(false)))
          .subscribe({ next: () => onSuccess(), error: onError });
      }
    }
  }
}
