import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FactureStatut, Periode, SuiviAbonneMensuel } from '../../models';
import { FACTURE_DATA_SERVICE } from '../../data-access/tokens/facture-data.token';
import { EXPORT_SERVICE } from '../../data-access/tokens/export.token';
import { formatMontantXof } from '../../utils/money.util';
import { periodeCourante, bornesPeriode } from '../../utils/periode.util';
import { MonthSelectorComponent } from '../../shared/month-selector/month-selector.component';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { badgeSuiviMensuel } from '../../shared/status-badge/status-badge.util';
import { ErrorStateComponent } from '../../shared/states/error-state.component';

const TAILLE_PAGE_MAX = 200; // pas de pagination sur cet écran (F12) : ~48 clients au plus

// F12 — Suivi mensuel des abonnés : qui a payé / qui n'a pas payé pour un mois donné.
@Component({
  selector: 'app-monthly-tracking',
  standalone: true,
  imports: [CommonModule, MonthSelectorComponent, StatusBadgeComponent, ErrorStateComponent],
  templateUrl: './monthly-tracking.component.html',
  styleUrl: './monthly-tracking.component.scss',
})
export class MonthlyTrackingComponent {
  private readonly factureData = inject(FACTURE_DATA_SERVICE);
  private readonly exportService = inject(EXPORT_SERVICE);

  readonly periode = signal<Periode>(periodeCourante());
  readonly impayeesSeulement = signal(false);
  readonly items = signal<SuiviAbonneMensuel[]>([]);
  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);

  readonly badgeSuivi = badgeSuiviMensuel;
  readonly formatMontant = formatMontantXof;

  readonly nombreImpayes = computed(() => this.items().filter(i => i.statut === FactureStatut.IMPAYEE).length);
  readonly nombreAbonnes = computed(() => this.items().length);

  constructor() {
    this.charger();
  }

  onPeriodeChange(periode: Periode): void {
    this.periode.set(periode);
    this.charger();
  }

  onToggleImpayeesSeulement(): void {
    this.impayeesSeulement.update(v => !v);
    this.charger();
  }

  reessayer(): void {
    this.charger();
  }

  exporterCsv(): void {
    // Période EXACTE de l'écran (this.periode(), celle envoyée à getSuiviMensuel() dans
    // charger()) reportée sur CHAQUE ligne — jusqu'ici seul le nom de fichier portait le
    // mois/année, le contenu du CSV n'indiquait la période nulle part (signalé : "Excel/
    // CSV → dates absentes"). Toutes les lignes de cet écran partagent la même période
    // (suivi MENSUEL, un mois à la fois) : pas une période par ligne différente.
    const { debut, fin } = bornesPeriode(this.periode());
    const optionsDate: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
    const periodeDu = debut.toLocaleDateString('fr-FR', optionsDate);
    const periodeAu = fin.toLocaleDateString('fr-FR', optionsDate);

    const rows = this.items().map(ligne => ({
      client: `${ligne.client.nom} ${ligne.client.prenom}`,
      quartier: ligne.client.quartier ?? '',
      periodeDu,
      periodeAu,
      montant: ligne.facture?.montant ?? 0,
      statut: ligne.statut,
      moisRetard: ligne.moisRetard,
    }));
    this.exportService.exportToCsv(
      rows,
      [
        { key: 'client', label: 'Client' },
        { key: 'quartier', label: 'Quartier' },
        { key: 'periodeDu', label: 'Période du' },
        { key: 'periodeAu', label: 'Au' },
        { key: 'montant', label: 'Montant (FCFA)' },
        { key: 'statut', label: 'Statut' },
        { key: 'moisRetard', label: 'Mois de retard' },
      ],
      `suivi-mensuel-${this.periode().annee}-${this.periode().mois}`,
    );
  }

  private charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);

    this.factureData
      .getSuiviMensuel(this.periode(), {
        pageSize: TAILLE_PAGE_MAX,
        filter: this.impayeesSeulement() ? { impayeesSeulement: true } : undefined,
      })
      .subscribe({
        next: page => {
          this.items.set(page.items);
          this.chargement.set(false);
        },
        error: () => {
          this.erreur.set('Impossible de charger le suivi mensuel pour le moment.');
          this.chargement.set(false);
        },
      });
  }
}
