import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { finalize, map } from 'rxjs';
import { ContratService } from '../../../../../services/contrat.service';
import { RedevanceService } from '../../../../../services/redevance.service';
import { Contrat } from '../../../../../models/contrat.model';
import { Redevance } from '../../../../../models/redevance.model';
import { ApercuPaiementGroupe, PaiementGroupeRedevance, ReductionType } from '../../../../../models/paiement-groupe-redevance.model';
import { formatFrDate } from '../../../../../shared/format.util';
import { aLaPermission } from '../../models';
import { SESSION_SERVICE } from '../../data-access/tokens/session.token';
import { NotificationService } from '../../../../../services/notification.service';
import { ConfirmDialogService } from '../../../../../services/confirm-dialog.service';
import { LoadingSpinnerComponent } from '../../../../../components/loading-spinner/loading-spinner.component';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { badgeRedevance } from '../../shared/status-badge/status-badge.util';

type FiltreStatutRedevance = 'Tous' | 'en_attente' | 'retard' | 'paye' | 'annule' | 'echec';

/** Formulaire "Paiement manuel" — remplace l'ancienne simple confirmation
 * ("Marquer comme payée" / "Marquer payé (manuel)") : l'agence saisit ce qu'elle a
 * réellement constaté (date, somme reçue, commentaire libre), au lieu d'un paiement
 * implicitement daté d'aujourd'hui et pour le montant dû/à payer pile. */
interface PaiementManuelForm {
  datePaiement: string;
  montantRecu: number;
  commentaire: string;
}

/** Même drawer pour les deux cas : une redevance individuelle, ou un lot de paiement
 * groupé — seul le libellé affiché et l'endpoint appelé diffèrent (voir
 * onConfirmerPaiementManuel). */
type CiblePaiementManuel =
  | { type: 'redevance'; redevance: Redevance }
  | { type: 'groupe'; proposition: PaiementGroupeRedevance };

@Component({
  selector: 'app-redevances',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LoadingSpinnerComponent, StatusBadgeComponent],
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
  readonly peutGerer = computed(() => aLaPermission(this.currentUser(), 'contracts.manage'));

  readonly badgeRedevance = badgeRedevance;
  readonly formatDate = formatFrDate;

  readonly contratId = toSignal(
    this.route.paramMap.pipe(map(params => params.get('contratId') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('contratId') ?? '' },
  );

  /** Lien "retour" du haut de page — par défaut la liste des Contrats, mais chaque
   * origine réelle du bouton "Paiement manuel" doit ramener à CETTE origine, pas
   * systématiquement à la fiche client :
   * - `?depuis=client&idClient=...` : onglet Facturation de la fiche client (voir
   *   billing-tab.component.ts::allerVersPaiementManuel) — rouvre sur l'onglet
   *   Facturation, pas sur Informations par défaut (voir client-sheet.component.ts).
   * - `?depuis=suivi-mensuel&mois=...&annee=...` : page Suivi mensuel (voir
   *   monthly-tracking.component.ts::allerVersPaiementManuel) — rouvre sur le MÊME
   *   mois consulté, pas sur le mois courant par défaut.
   * Dérivé des query params plutôt que de l'historique du navigateur : fonctionne
   * aussi après un rechargement de page. */
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

  // Résumé — même calcul que RedevanceService.getResumeClientContrat côté backend,
  // fait ici directement sur la liste déjà chargée (évite un second aller-retour réseau).
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

  readonly redevanceEnCours = signal<string | null>(null);

  // ── Paiement groupé + réduction (repris de contracts.component.ts) ─────────
  readonly paiementGroupeActif = signal<PaiementGroupeRedevance | null>(null);
  readonly showPaiementGroupeForm = signal(false);
  readonly paiementGroupeApercu = signal<ApercuPaiementGroupe | null>(null);
  readonly chargementApercu = signal(false);
  readonly paiementGroupeForm = signal<{ genererTout: boolean; reductionType: ReductionType; reductionValeur: number }>({
    genererTout: false,
    reductionType: 'pourcentage',
    reductionValeur: 0,
  });
  readonly paiementGroupeEnCours = signal(false);

  // ── Paiement manuel (redevance individuelle OU lot groupé) ─────────────────
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

  // ── Paiement groupé + réduction ─────────────────────────────────────────

  private chargerPaiementGroupeActif(): void {
    this.redevanceService.getPropositionActivePaiementGroupe$(this.contratId()).subscribe({
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
    this.chargementApercu.set(true);
    this.redevanceService.apercuPaiementGroupe$(this.contratId(), this.paiementGroupeForm().genererTout).subscribe({
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
    const { genererTout, reductionType, reductionValeur } = this.paiementGroupeForm();
    this.paiementGroupeEnCours.set(true);
    this.redevanceService.creerPropositionPaiementGroupe$(this.contratId(), { genererTout, reductionType, reductionValeur })
      .pipe(finalize(() => this.paiementGroupeEnCours.set(false)))
      .subscribe({
        next: (res) => {
          this.notificationService.showSuccess('Succès', 'Proposition de paiement groupé créée. Le client a été notifié.');
          this.paiementGroupeActif.set(res.proposition);
          this.showPaiementGroupeForm.set(false);
          this.chargerRedevances(); // recharge les redevances (générées si genererTout)
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

  /** Ouvre le même drawer "Paiement manuel" que ouvrirPaiementManuel() ci-dessous, pour le
   * lot entier plutôt qu'une redevance isolée — remplace l'ancienne simple confirmation
   * "Marquer payé (manuel)". */
  ouvrirPaiementManuelGroupe(proposition: PaiementGroupeRedevance): void {
    this.paiementManuelCible.set({ type: 'groupe', proposition });
    this.paiementManuelForm.set({
      datePaiement: this.dateDuJour,
      montantRecu: proposition.montantAPayer,
      commentaire: '',
    });
    this.showPaiementManuelDrawer.set(true);
  }

  // ── Paiement manuel d'une redevance (remplace "Marquer comme payée") ───────

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

  /** Formulaire incomplet (date ou somme manquante/invalide) — désactive le bouton de
   * confirmation plutôt que de laisser l'agence soumettre puis découvrir l'erreur. */
  paiementManuelInvalide(): boolean {
    const { datePaiement, montantRecu } = this.paiementManuelForm();
    return !datePaiement || !montantRecu || montantRecu <= 0 || datePaiement > this.dateDuJour;
  }

  onConfirmerPaiementManuel(): void {
    if (this.paiementManuelEnCours() || this.paiementManuelInvalide()) return;
    const cible = this.paiementManuelCible();
    if (!cible) return;
    const { datePaiement, montantRecu, commentaire } = this.paiementManuelForm();
    const payload = { datePaiement, montantRecu, commentaire: commentaire.trim() || undefined };

    const onSuccess = () => {
      this.notificationService.showSuccess('Succès', 'Paiement enregistré.');
      this.fermerPaiementManuel();
      this.chargerRedevances();
      if (cible.type === 'groupe') this.paiementGroupeActif.set(null);
    };
    const onError = (err: any) =>
      this.notificationService.showError('Erreur', err?.error?.message ?? "Impossible d'enregistrer ce paiement.");

    this.paiementManuelEnCours.set(true);
    // Deux observables de formes différentes (redevance vs proposition) — branché en
    // entier plutôt qu'unifié dans une variable commune, TypeScript ne pouvant pas
    // réconcilier leurs signatures Observer respectives dans un seul `.subscribe()`.
    if (cible.type === 'redevance') {
      this.redevanceService.payerRedevance$(cible.redevance._id, payload)
        .pipe(finalize(() => this.paiementManuelEnCours.set(false)))
        .subscribe({ next: onSuccess, error: onError });
    } else {
      this.redevanceService.payerManuelPaiementGroupe$(cible.proposition._id, payload)
        .pipe(finalize(() => this.paiementManuelEnCours.set(false)))
        .subscribe({ next: onSuccess, error: onError });
    }
  }
}
