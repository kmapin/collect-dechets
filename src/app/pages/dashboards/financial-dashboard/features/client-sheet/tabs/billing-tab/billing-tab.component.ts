import { Component, computed, inject, Input, OnChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { aLaPermission, Facture } from '../../../../models';
import { FACTURE_DATA_SERVICE } from '../../../../data-access/tokens/facture-data.token';
import { SESSION_SERVICE } from '../../../../data-access/tokens/session.token';
import { formatMontantXof } from '../../../../utils/money.util';
import { formatFrDate } from '../../../../../../../shared/format.util';
import { StatusBadgeComponent } from '../../../../shared/status-badge/status-badge.component';
import { badgeFacture } from '../../../../shared/status-badge/status-badge.util';
import { ErrorStateComponent } from '../../../../shared/states/error-state/error-state.component';

// Facturation
@Component({
  selector: 'app-client-billing-tab',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent, ErrorStateComponent],
  templateUrl: './billing-tab.component.html',
  styleUrl: './billing-tab.component.scss',
})
export class BillingTabComponent implements OnChanges {
  private readonly factureData = inject(FACTURE_DATA_SERVICE);
  private readonly router = inject(Router);
  private readonly session = inject(SESSION_SERVICE);

  private readonly currentUser = toSignal(this.session.currentUser$, { initialValue: this.session.getCurrentUser() });
  // Même droit que la page Redevances (redevances.component.ts::peutPayerManuel), distinct
  // de 'contracts.manage' — le bouton "Paiement manuel" ouvre cette même page, gardée côté
  // serveur par 'contracts.pay_manual' (routes/redevanceRoute.js::/payer).
  readonly peutPayerManuel = computed(() => aLaPermission(this.currentUser(), 'contracts.pay_manual'));

  @Input({ required: true }) idClient!: string;

  readonly factures = signal<Facture[]>([]);
  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);

  readonly badgeFacture = badgeFacture;
  readonly formatMontant = formatMontantXof;
  readonly formatDate = formatFrDate;

  ngOnChanges(): void {
    this.charger();
  }

  reessayer(): void {
    this.charger();
  }

  editerReleve(): void {
    this.router.navigate(['/dashboard/financial/statement'], { queryParams: { idClient: this.idClient } });
  }

  /** Ouvre la page Redevances du contrat couvrant cette facture, pour y enregistrer un
   * paiement manuel — `depuis`/`idClient` permettent à cette page de proposer un retour
   * "Fiche client" plutôt que son "Contrats" par défaut (voir redevances.component.ts). */
  allerVersPaiementManuel(facture: Facture): void {
    if (!facture.contratId) return;
    this.router.navigate(['/dashboard/financial/contracts', facture.contratId, 'redevances'], {
      queryParams: { depuis: 'client', idClient: this.idClient },
    });
  }

  private charger(): void {
    if (!this.idClient) return;
    this.chargement.set(true);
    this.erreur.set(null);
    this.factureData.getFacturesClient(this.idClient).subscribe({
      next: factures => {
        this.factures.set([...factures].sort((a, b) => (a.dateGeneration < b.dateGeneration ? 1 : -1)));
        this.chargement.set(false);
      },
      error: () => {
        this.erreur.set('Impossible de charger les factures de ce client.');
        this.chargement.set(false);
      },
    });
  }
}
