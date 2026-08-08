import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription as RxSubscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ContratService } from '../../services/contrat.service';
import { RedevanceService } from '../../services/redevance.service';
import { Contrat } from '../../models/contrat.model';
import { Redevance } from '../../models/redevance.model';
import { Webstockets, SocketNotification } from '../../core/services/webstockets';
import { MobileMoneyFormComponent } from '../payment/mobile-money-form/mobile-money-form';

/**
 * "Mes contrats" — Phase 6, CONCEPTION_ABONNEMENT_CONTRAT.md §6.2. Réutilise
 * le patron déjà en place pour Abonnement côté client (`pages/subscription/`) :
 * carte(s) + liste, chargement au `ngOnInit`, rafraîchissement en direct sur
 * notification socket `type === 'Contrat'` (même principe que `Subscribed`
 * sur `subscription.ts`, Phase 5).
 */
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

    // Même principe que `subscription.ts` (Phase 5) : les notifications
    // Contrat passent désormais par `notifyUsers` (Phase 4, backend), donc par
    // ce canal socket en plus du chargement initial ci-dessus.
    this.newContratSub = this.websocketService.onNewNotification().subscribe((notification: SocketNotification) => {
      if (notification?.type === 'Contrat') {
        this.loadContrats();
      }
      // Phase 8 : paiement d'une redevance (mobile money) — recharge la liste
      // du contrat actuellement ouvert pour refléter le nouveau statut 'paye'
      // sans attendre un rechargement manuel de page.
      if (notification?.type === 'Redevance' && this.selectedContratId) {
        this.loadRedevances(this.selectedContratId);
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

  /**
   * Paiement d'une redevance par le client (Phase 8) — même patron que
   * `subscription.ts::initiatePayment()` : prépare `tarifResponse` et ouvre
   * le même formulaire mobile money partagé (`app-mobile-money-form`).
   * `redevanceId` (au lieu de `tarifId`) fait dériver côté backend le
   * montant/l'agence attendus depuis la Redevance elle-même — pas besoin de
   * `pricingId`/`numberMonths` ici (voir controllers/transaction.js::initiate).
   */
  payerRedevance(redevance: Redevance): void {
    this.tarifResponse = {
      redevanceId: redevance._id,
      userId: this.currentUser?._id,
      amount: redevance.montant,
    };
    this.showPaymentForm = true;
  }

  closePaymentForm(): void {
    this.showPaymentForm = false;
    this.tarifResponse = null;
    // Le paiement vient (probablement) de se conclure — recharge la liste du
    // contrat ouvert par prudence, même si la notification socket (ci-dessus)
    // devrait déjà l'avoir fait.
    if (this.selectedContratId) this.loadRedevances(this.selectedContratId);
  }

  redevanceStatusLabel(status: string): string {
    const map: { [key: string]: string } = { en_attente: 'En attente', retard: 'En retard', paye: 'Payée', annule: 'Annulée' };
    return map[status] || status;
  }

  telechargerDocument(contrat: Contrat): void {
    if (!contrat.documentUrl) return;
    window.open(contrat.documentUrl, '_blank');
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
