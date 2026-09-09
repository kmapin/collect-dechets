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
  private newContratSub?: RxSubscription;

  constructor(
    private authService: AuthService,
    private contratService: ContratService,
    private redevanceService: RedevanceService,
    private websocketService: Webstockets,
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      this.loadContrats();
    });
    this.loadContrats();

    this.newContratSub = this.websocketService.onNewNotification().subscribe((notification: SocketNotification) => {
      if (notification?.type === 'Contrat') {
        this.loadContrats();
      }
      if (notification?.type === 'Redevance' && this.selectedContratId) {
        this.loadRedevances(this.selectedContratId);
        this.loadPropositionPaiementGroupe(this.selectedContratId);
      }
    });
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
}
