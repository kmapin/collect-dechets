import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Periode, Retrait } from '../../models';
import { FINANCE_DATA_SERVICE } from '../../data-access/tokens/finance-data.token';
import { formatMontantXof } from '../../utils/money.util';
import { formatFrDate } from '../../../../../shared/format.util';
import { DataTableColumn, DataTableComponent } from '../../shared/data-table/data-table.component';
import { SearchFilterComponent } from '../../shared/filters/search-filter.component';
import { MonthFilterComponent } from '../../shared/filters/month-filter.component';
import { ErrorStateComponent } from '../../shared/states/error-state.component';
import { CreateWithdrawalDialogComponent } from './create-withdrawal-dialog.component';

const TAILLE_PAGE = 10;

// Mêmes libellés que admin-dashboard.ts::getWithdrawalStatusText (vue Super Admin) —
// une seule terminologie pour les mêmes statuts réels de Withdraw.js (Règle 3 du Prompt 0).
const LIBELLES_STATUT: Record<string, string> = {
  EN_ATTENTE_VALIDATION: 'En attente',
  INITIATED: 'Approuvé',
  COMPLETED: 'Payé',
  COMPLETED_WITH_ERROR: 'Traité avec erreur',
  FAILED: 'Échoué',
  REJETE: 'Rejeté',
};

function libelleStatut(statut?: string): string {
  if (!statut) return '—';
  return LIBELLES_STATUT[statut] ?? statut;
}

// F4 — Historique des retraits de l'agence (impacte le solde disponible, RG7), et création
// d'un nouveau retrait (POST /finance/retraits, réellement branché — voir
// CreateWithdrawalDialogComponent). La liste se rafraîchit automatiquement après création.
@Component({
  selector: 'app-withdrawals',
  standalone: true,
  imports: [
    CommonModule,
    DataTableComponent,
    SearchFilterComponent,
    MonthFilterComponent,
    ErrorStateComponent,
    MatButtonModule,
    MatIconModule,
    CreateWithdrawalDialogComponent,
  ],
  templateUrl: './withdrawals.component.html',
  styleUrl: './withdrawals.component.scss',
})
export class WithdrawalsComponent {
  private readonly financeData = inject(FINANCE_DATA_SERVICE);
  private readonly snackBar = inject(MatSnackBar);

  readonly recherche = signal('');
  readonly periode = signal<Periode | null>(null);
  readonly page = signal(1);
  readonly items = signal<Retrait[]>([]);
  readonly total = signal(0);
  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  readonly afficherFormulaireCreation = signal(false);

  // Chantier Frais plateforme (Prompt F5/F8) : "Montant" (demandé) ne suffit plus à
  // décrire ce qui a réellement été reçu/débité — "Frais" et "Net reçu" rendent le
  // détail visible plutôt qu'un montant unique opaque. `?? '—'` : un retrait antérieur
  // à ce chantier n'a pas ces champs (compatibilité rétroactive honnête).
  readonly colonnes: DataTableColumn<Retrait>[] = [
    { key: 'montant', label: 'Montant demandé', sortable: true, format: r => formatMontantXof(r.montant) },
    { key: 'feeAmount', label: 'Frais', format: r => (r.feeAmount !== undefined ? formatMontantXof(r.feeAmount) : '—') },
    { key: 'netAmountReceived', label: 'Net reçu', format: r => (r.netAmountReceived !== undefined ? formatMontantXof(r.netAmountReceived) : '—') },
    { key: 'dateRetrait', label: 'Date', sortable: true, format: r => formatFrDate(r.dateRetrait) },
    { key: 'motif', label: 'Motif', format: r => r.motif ?? '—' },
    { key: 'initiateurNom', label: 'Initié par', format: r => r.initiateurNom ?? '—' },
    {
      key: 'statut',
      label: 'Statut',
      format: r => (r.statut === 'REJETE' && r.motifRejet ? `${libelleStatut(r.statut)} — ${r.motifRejet}` : libelleStatut(r.statut)),
    },
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

  ouvrirNouveauRetrait(): void {
    this.afficherFormulaireCreation.set(true);
  }

  onFormulaireCreationFerme(succes: boolean): void {
    this.afficherFormulaireCreation.set(false);
    if (!succes) return;
    this.snackBar.open('Retrait enregistré avec succès.', 'Fermer', { duration: 5000 });
    this.page.set(1);
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
