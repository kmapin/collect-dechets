import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FINANCE_DATA_SERVICE } from '../../data-access/tokens/finance-data.token';
import { PaiementListe } from '../../data-access/contracts/finance-data.service';
import { EXPORT_SERVICE } from '../../data-access/tokens/export.token';
import { formatMontantXof } from '../../utils/money.util';
import { formatFrDate } from '../../../../../shared/format.util';
import { DataTableColumn, DataTableComponent } from '../../shared/data-table/data-table.component';
import { SearchFilterComponent } from '../../shared/filters/search-filter.component';
import { ErrorStateComponent } from '../../shared/states/error-state.component';

const TAILLE_PAGE = 10;
// Écran à fort usage sans export (chantier Rapports/Statistiques, item 4) — même
// convention que WithdrawalRequestsHttpService::filterWithdrawals() (pageSize élevé pour
// récupérer le jeu filtré complet, pas seulement la page visible côté écran).
const TAILLE_PAGE_EXPORT = 1000;

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
  private readonly exportService = inject(EXPORT_SERVICE);

  readonly recherche = signal('');
  readonly page = signal(1);
  readonly items = signal<PaiementListe[]>([]);
  readonly total = signal(0);
  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  readonly exportEnCours = signal(false);

  // Chantier Frais plateforme (Prompt F4/F8) : "Montant" seul ne dit pas ce que l'agence
  // reçoit réellement une fois les frais appliqués — "Frais" et "Net agence" rendent ce
  // détail visible. `?? '—'` : un paiement antérieur à ce chantier n'a pas ces champs.
  readonly colonnes: DataTableColumn<PaiementListe>[] = [
    { key: 'clientNom', label: 'Client', sortable: true },
    { key: 'montant', label: 'Montant', sortable: true, format: r => formatMontantXof(r.montant) },
    // L'agence ne doit jamais voir le frais quand il est à la charge du client
    // (feePayer='CLIENT') — seul le sien (feePayer='AGENCE') reste visible ici.
    // Sans impact sur "Net agence" ci-dessous : quand le client paie le frais,
    // netAmount vaut déjà grossAmount (services/fee.js::calculateClientPaymentFee),
    // donc cette colonne ne révèle rien du frais côté client.
    // { key: 'feeAmount', label: 'Frais', format: r => (r.feePayer === 'CLIENT' || r.feeAmount === undefined ? '—' : formatMontantXof(r.feeAmount)) },
    // { key: 'netAmount', label: 'Net agence', format: r => (r.netAmount !== undefined ? formatMontantXof(r.netAmount) : '—') },
    { key: 'datePaiement', label: 'Date', sortable: true, format: r => formatFrDate(r.datePaiement) },
    { key: 'modePaiement', label: 'Mode', format: r => r.modePaiement ?? '—' },
    // Période du contrat/abonnement concerné par ce paiement (demande produit).
    { key: 'dateDebut', label: 'Date début', format: r => (r.dateDebut ? formatFrDate(r.dateDebut) : '—') },
    { key: 'dateFin', label: 'Date fin', format: r => (r.dateFin ? formatFrDate(r.dateFin) : '—') },
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

  /**
   * Export réel (chantier Rapports/Statistiques, item 4 — écran "Paiements" à fort
   * usage, jusqu'ici sans aucun export). Réutilise EXPORT_SERVICE (même token que
   * monthly-tracking.component.ts::exporterCsv()) — pas de mécanisme d'export
   * séparé pour cet écran. Re-fetch avec une pageSize élevée pour exporter le jeu
   * filtré complet, pas juste `items()` (la page visible, 10 lignes).
   */
  exporterCsv(): void {
    if (this.exportEnCours()) return;
    this.exportEnCours.set(true);
    this.financeData
      .getPaiements({
        page: 1,
        pageSize: TAILLE_PAGE_EXPORT,
        filter: this.recherche() ? { search: this.recherche() } : undefined,
      })
      .subscribe({
        next: (page) => {
          this.exportEnCours.set(false);
          const rows = page.items.map((p) => ({
            client: p.clientNom,
            montant: p.montant,
            // Même règle que la colonne "Frais" à l'écran ci-dessus.
            // frais: p.feePayer === 'CLIENT' || p.feeAmount === undefined ? '—' : p.feeAmount,
            // netAgence: p.netAmount ?? '—',
            date: formatFrDate(p.datePaiement),
            mode: p.modePaiement ?? '—',
            dateDebut: p.dateDebut ? formatFrDate(p.dateDebut) : '—',
            dateFin: p.dateFin ? formatFrDate(p.dateFin) : '—',
          }));
          this.exportService.exportToCsv(
            rows,
            [
              { key: 'client', label: 'Client' },
              { key: 'montant', label: 'Montant (FCFA)' },
              // { key: 'frais', label: 'Frais (FCFA)' },
              // { key: 'netAgence', label: 'Net agence (FCFA)' },
              { key: 'date', label: 'Date' },
              { key: 'mode', label: 'Mode' },
              { key: 'dateDebut', label: 'Date début' },
              { key: 'dateFin', label: 'Date fin' },
            ],
            `paiements-${new Date().toISOString().slice(0, 10)}`,
          );
        },
        error: () => {
          this.exportEnCours.set(false);
          this.erreur.set("Impossible d'exporter l'historique des paiements pour le moment.");
        },
      });
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
