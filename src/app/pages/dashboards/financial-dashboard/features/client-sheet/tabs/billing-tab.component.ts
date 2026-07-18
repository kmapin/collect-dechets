import { Component, inject, Input, OnChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Facture } from '../../../models';
import { FACTURE_DATA_SERVICE } from '../../../data-access/tokens/facture-data.token';
import { formatMontantXof } from '../../../utils/money.util';
import { formatFrDate } from '../../../../../../shared/format.util';
import { StatusBadgeComponent } from '../../../shared/status-badge/status-badge.component';
import { badgeFacture } from '../../../shared/status-badge/status-badge.util';
import { ErrorStateComponent } from '../../../shared/states/error-state.component';

// F8 — Factures mensuelles du client (RG3 : statut dérivé de la présence d'un paiement).
// Onglet gated finance (RG8) au niveau du parent (client-sheet.component.ts).
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
