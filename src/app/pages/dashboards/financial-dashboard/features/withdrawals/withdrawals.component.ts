import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Periode, Retrait } from '../../models';
import { FINANCE_DATA_SERVICE } from '../../data-access/tokens/finance-data.token';
import { formatMontantXof } from '../../utils/money.util';
import { formatFrDate } from '../../../../../shared/format.util';
import { DataTableColumn, DataTableComponent } from '../../shared/data-table/data-table.component';
import { SearchFilterComponent } from '../../shared/filters/search-filter.component';
import { MonthFilterComponent } from '../../shared/filters/month-filter.component';
import { ErrorStateComponent } from '../../shared/states/error-state.component';

const TAILLE_PAGE = 10;

// F4 — Historique des retraits de l'agence (impacte le solde disponible, RG7).
@Component({
  selector: 'app-withdrawals',
  standalone: true,
  imports: [CommonModule, DataTableComponent, SearchFilterComponent, MonthFilterComponent, ErrorStateComponent],
  templateUrl: './withdrawals.component.html',
  styleUrl: './withdrawals.component.scss',
})
export class WithdrawalsComponent {
  private readonly financeData = inject(FINANCE_DATA_SERVICE);

  readonly recherche = signal('');
  readonly periode = signal<Periode | null>(null);
  readonly page = signal(1);
  readonly items = signal<Retrait[]>([]);
  readonly total = signal(0);
  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);

  readonly colonnes: DataTableColumn<Retrait>[] = [
    { key: 'montant', label: 'Montant', sortable: true, format: r => formatMontantXof(r.montant) },
    { key: 'dateRetrait', label: 'Date', sortable: true, format: r => formatFrDate(r.dateRetrait) },
    { key: 'motif', label: 'Motif', format: r => r.motif ?? '—' },
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

  onPeriodeChange(periode: Periode | null): void {
    this.periode.set(periode);
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
      .getRetraits({
        page: this.page(),
        pageSize: TAILLE_PAGE,
        filter: this.recherche() ? { search: this.recherche() } : undefined,
        periode: this.periode() ?? undefined,
      })
      .subscribe({
        next: page => {
          this.items.set(page.items);
          this.total.set(page.total);
          this.chargement.set(false);
        },
        error: () => {
          this.erreur.set("Impossible de charger l'historique des retraits pour le moment.");
          this.chargement.set(false);
        },
      });
  }
}
