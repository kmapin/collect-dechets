import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FINANCE_DATA_SERVICE } from '../../data-access/tokens/finance-data.token';
import { PaiementListe } from '../../data-access/contracts/finance-data.service';
import { formatMontantXof } from '../../utils/money.util';
import { formatFrDate } from '../../../../../shared/format.util';
import { DataTableColumn, DataTableComponent } from '../../shared/data-table/data-table.component';
import { SearchFilterComponent } from '../../shared/filters/search-filter.component';
import { ErrorStateComponent } from '../../shared/states/error-state.component';

const TAILLE_PAGE = 10;

// F3 — Historique des paiements de l'agence.
@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, DataTableComponent, SearchFilterComponent, ErrorStateComponent],
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.scss',
})
export class PaymentsComponent {
  private readonly financeData = inject(FINANCE_DATA_SERVICE);

  readonly recherche = signal('');
  readonly page = signal(1);
  readonly items = signal<PaiementListe[]>([]);
  readonly total = signal(0);
  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);

  readonly colonnes: DataTableColumn<PaiementListe>[] = [
    { key: 'clientNom', label: 'Client', sortable: true },
    { key: 'montant', label: 'Montant', sortable: true, format: r => formatMontantXof(r.montant) },
    { key: 'datePaiement', label: 'Date', sortable: true, format: r => formatFrDate(r.datePaiement) },
    { key: 'modePaiement', label: 'Mode', format: r => r.modePaiement ?? '—' },
  ];

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total() / TAILLE_PAGE));
  }

  constructor() {
    this.charger();
  }

  onRechercheChange(valeur: string): void {
    this.recherche.set(valeur);
    this.page.set(1);
    this.charger();
  }

  changerPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.page.set(page);
    this.charger();
  }

  reessayer(): void {
    this.charger();
  }

  private charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);

    this.financeData
      .getPaiements({
        page: this.page(),
        pageSize: TAILLE_PAGE,
        filter: this.recherche() ? { search: this.recherche() } : undefined,
      })
      .subscribe({
        next: page => {
          this.items.set(page.items);
          this.total.set(page.total);
          this.chargement.set(false);
        },
        error: () => {
          this.erreur.set("Impossible de charger l'historique des paiements pour le moment.");
          this.chargement.set(false);
        },
      });
  }
}
