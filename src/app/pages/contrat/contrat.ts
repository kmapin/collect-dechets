import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription as RxSubscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ContratService } from '../../services/contrat.service';
import { RedevanceService } from '../../services/redevance.service';
import { Contrat } from '../../models/contrat.model';
import { Redevance } from '../../models/redevance.model';
import { PaiementGroupeRedevance } from '../../models/paiement-groupe-redevance.model';
import { Webstockets, SocketNotification } from '../../core/services/webstockets';
import { MobileMoneyFormComponent } from '../payment/mobile-money-form/mobile-money-form';
import { EligibilityService, EligibilityResult, isContratCurrentlyActive } from '../../services/eligibility.service';

@Component({
  selector: 'app-contrat',
  imports: [CommonModule, MobileMoneyFormComponent],
  templateUrl: './contrat.html',
  styleUrl: './contrat.css',
})
export class ContratPage implements OnInit, OnDestroy {
  currentUser: any = null;
  contrats: Contrat[] = [];
  isLoading = false;
  selectedContratId: string | null = null;
  redevancesByContrat: { [contratId: string]: Redevance[] } = {};
  isLoadingRedevances: { [contratId: string]: boolean } = {};
  propositionByContrat: { [contratId: string]: PaiementGroupeRedevance | null | undefined } = {};
  showPaymentForm = false;
  tarifResponse: any = null;
  eligibility: EligibilityResult | null = null;
  private newContratSub?: RxSubscription;

  constructor(
    private authService: AuthService,
    private contratService: ContratService,
    private redevanceService: RedevanceService,
    private websocketService: Webstockets,
    private eligibilityService: EligibilityService,
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      this.loadContrats();
      this.loadEligibility();
    });
    this.loadContrats();
    this.loadEligibility();

    this.newContratSub = this.websocketService.onNewNotification().subscribe((notification: SocketNotification) => {
      if (notification?.type === 'Contrat' || notification?.type === 'Subscribed') {
        this.loadContrats();
        this.loadEligibility();
      }
      if (notification?.type === 'Redevance' && this.selectedContratId) {
        this.loadRedevances(this.selectedContratId);
        this.loadPropositionPaiementGroupe(this.selectedContratId);
      }
    });
  }

  /** Même bandeau d'éligibilité que pages/subscription/subscription.ts — un client
   * peut arriver directement sur /contrat sans passer par /subscription. */
  loadEligibility(): void {
    const clientId = this.currentUser?._id;
    if (!clientId) return;
    this.eligibilityService.checkEligibility$(clientId).subscribe({
      next: (result) => { this.eligibility = result; },
      error: () => { this.eligibility = null; },
    });
  }

  get showContractContinuityBanner(): boolean {
    return this.eligibility?.source === 'CONTRACT';
  }

  /** Symétrique du bandeau positif — piloté uniquement par `eligible`/`reason`. */
  get showIneligibilityBanner(): boolean {
    return this.eligibility !== null && this.eligibility.eligible === false;
  }

  /** Traduction d'affichage des valeurs réelles de `reason` — ne recalcule aucune règle. */
  ineligibilityMessage(): string {
    const map: { [key: string]: string } = {
      CONTRACT_EXPIRED: "Votre abonnement a expiré et vous n'avez aucun contrat actif. Renouvelez votre abonnement ou contactez votre agence pour continuer à bénéficier du service.",
      NO_ACTIVE_CONTRACT: "Vous n'avez actuellement ni abonnement ni contrat actif. Souscrivez un abonnement ou contactez votre agence pour bénéficier du service.",
    };
    const reason = this.eligibility?.reason;
    return (reason && map[reason]) || "Vous ne bénéficiez actuellement d'aucun service actif.";
  }

  ngOnDestroy(): void {
    this.newContratSub?.unsubscribe();
  }

  loadContrats(): void {
    const clientId = this.currentUser?._id;
    if (!clientId) return;
    this.isLoading = true;
    this.contratService.getContratsByClient$(clientId).subscribe({
      next: (contrats) => {
        this.contrats = contrats;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  toggleDetail(contratId: string): void {
    this.selectedContratId = this.selectedContratId === contratId ? null : contratId;
    if (this.selectedContratId && !this.redevancesByContrat[contratId]) {
      this.loadRedevances(contratId);
    }
    if (this.selectedContratId && this.propositionByContrat[contratId] === undefined) {
      this.loadPropositionPaiementGroupe(contratId);
    }
  }

  /** Proposition de paiement groupé en attente pour ce contrat, configurée par l'agence (le cas échéant). */
  loadPropositionPaiementGroupe(contratId: string): void {
    this.redevanceService.getPropositionActivePaiementGroupe$(contratId).subscribe({
      next: (proposition) => { this.propositionByContrat[contratId] = proposition; },
      error: () => { this.propositionByContrat[contratId] = null; },
    });
  }

  /** Redevances (factures périodiques) du contrat, chargées à la demande à l'ouverture du détail. */
  loadRedevances(contratId: string): void {
    this.isLoadingRedevances[contratId] = true;
    this.redevanceService.getRedevancesByContrat$(contratId).subscribe({
      next: (redevances) => {
        this.redevancesByContrat[contratId] = redevances;
        this.isLoadingRedevances[contratId] = false;
      },
      error: () => {
        this.isLoadingRedevances[contratId] = false;
      },
    });
  }

  /** Fusion Subscription -> Contrat : reprend pages/subscription/subscription.ts::
   * initiatePayment() — un contrat "à la durée" (numberMonths renseigné, né d'un
   * paiement) se paie/se renouvelle par Mobile Money, jamais par une Redevance
   * (contrairement à un contrat classique facturé à la Redevance, cf. payerRedevance
   * ci-dessus). Un mois de plus par défaut à chaque clic — même comportement que
   * l'ex page /subscription. */
  initiatePayment(contrat: Contrat): void {
    if (!contrat) return;
    const pricing = this.pricing(contrat);
    const lieu = contrat.serviceLocationId;
    this.tarifResponse = {
      tarifId: pricing?._id ?? contrat.pricingId,
      agencyId: this.agencyId(contrat),
      userId: this.currentUser?._id,
      numberMonths: '1',
      amount: pricing?.price ?? contrat.prixParPeriode,
      planType: pricing?.planType,
      serviceLocationId: typeof lieu === 'object' ? lieu?._id : lieu,
    };
    this.showPaymentForm = true;
  }

  /** Un "Payer/Renouveler" n'a de sens que pour un contrat né d'un paiement (période
   * en mois) — un contrat classique se règle uniquement via ses Redevances. */
  peutPayerParMobileMoney(contrat: Contrat): boolean {
    return contrat.numberMonths != null;
  }

  isContratActif(contrat: Contrat): boolean {
    return isContratCurrentlyActive(contrat);
  }

  private agencyId(contrat: Contrat): string {
    const agence = contrat.agencyId as any;
    return typeof agence === 'object' ? agence?._id : agence;
  }

  payerRedevance(redevance: Redevance): void {
    this.tarifResponse = {
      redevanceId: redevance._id,
      userId: this.currentUser?._id,
      amount: redevance.montant,
    };
    this.showPaymentForm = true;
  }

  payerPropositionGroupee(proposition: PaiementGroupeRedevance): void {
    this.tarifResponse = {
      paiementGroupeId: proposition._id,
      userId: this.currentUser?._id,
      amount: proposition.montantAPayer,
    };
    this.showPaymentForm = true;
  }

  closePaymentForm(): void {
    this.showPaymentForm = false;
    this.tarifResponse = null;
    if (this.selectedContratId) {
      this.loadRedevances(this.selectedContratId);
      this.loadPropositionPaiementGroupe(this.selectedContratId);
    }
    // Un paiement via initiatePayment() renouvelle/crée un contrat (nouvelle endDate,
    // voire nouveau contrat côté serveur) : on rafraîchit la liste et l'éligibilité
    // pour refléter le changement, même si le websocket ('Contrat'/'Subscribed') le
    // fait déjà en général — filet de sécurité si l'événement arrive en retard.
    this.loadContrats();
    this.loadEligibility();
  }

  redevanceStatusLabel(status: string): string {
    const map: { [key: string]: string } = { en_attente: 'En attente', retard: 'En retard', paye: 'Payée', annule: 'Annulée' };
    return map[status] || status;
  }

  telechargerDocument(contrat: Contrat): void {
    if (!contrat.documentUrl) return;
    this.contratService.getDocumentUrl$(contrat._id).subscribe({
      next: (res) => window.open(res.documentUrl, '_blank'),
      error: () => {},
    });
  }

  frequenceLabel(frequence: string): string {
    const map: { [key: string]: string } = { daily: 'Quotidienne', weekly: 'Hebdomadaire', monthly: 'Mensuelle' };
    return map[frequence] || frequence;
  }

  statusLabel(status: string): string {
    const map: { [key: string]: string } = { actif: 'Actif', suspendu: 'Suspendu', resilie: 'Résilié' };
    return map[status] || status;
  }

  agencyName(contrat: Contrat): string {
    return typeof contrat.agencyId === 'object' ? contrat.agencyId?.name : '';
  }

  pricing(contrat: Contrat): any {
    return typeof contrat.pricingId === 'object' ? contrat.pricingId : null;
  }

  /** `null` = contrat "compte entier" (couvre tous les lieux du client pour cette agence) —
   * voir services/eligibility.service.js pour la portée réelle de ce cas. */
  serviceLocation(contrat: Contrat): any {
    return typeof contrat.serviceLocationId === 'object' ? contrat.serviceLocationId : null;
  }
}
