import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FactureStatut, Periode, SuiviAbonneMensuel } from '../../models';
import { FACTURE_DATA_SERVICE } from '../../data-access/tokens/facture-data.token';
import { EXPORT_SERVICE } from '../../data-access/tokens/export.token';
import { formatMontantXof } from '../../utils/money.util';
import { periodeCourante, bornesPeriode } from '../../utils/periode.util';
import { MonthSelectorComponent } from '../../shared/month-selector/month-selector.component';
import { SearchFilterComponent } from '../../shared/filters/search-filter/search-filter.component';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { badgeSuiviMensuel } from '../../shared/status-badge/status-badge.util';
import { ErrorStateComponent } from '../../shared/states/error-state/error-state.component';

const TAILLE_PAGE_DEFAUT = 20;
const TAILLES_PAGE_DISPONIBLES = [5, 10, 20, 50, 100];
const TAILLE_PAGE_EXPORT = 1000;

// F12 — Suivi mensuel des abonnés : qui a payé / qui n'a pas payé pour un mois donné.
@Component({
  selector: 'app-monthly-tracking',
  standalone: true,
  imports: [CommonModule, MonthSelectorComponent, SearchFilterComponent, StatusBadgeComponent, ErrorStateComponent],
  templateUrl: './monthly-tracking.component.html',
  styleUrl: './monthly-tracking.component.scss',
})
export class MonthlyTrackingComponent {
  private readonly factureData = inject(FACTURE_DATA_SERVICE);
  private readonly exportService = inject(EXPORT_SERVICE);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // ?mois=...&annee=... : retour depuis la page Redevances (voir
  // allerVersPaiementManuel ci-dessous et redevances.component.ts::retour) — rouvre sur
  // le même mois consulté avant de cliquer "Paiement manuel", pas sur le mois courant.
  readonly periode = signal<Periode>(this.periodeInitiale());
  readonly impayeesSeulement = signal(false);
  readonly recherche = signal('');
  readonly items = signal<SuiviAbonneMensuel[]>([]);
  readonly page = signal(1);
  readonly itemsPerPage = signal(TAILLE_PAGE_DEFAUT);
  readonly taillesPageDisponibles = TAILLES_PAGE_DISPONIBLES;
  readonly total = signal(0);
  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  readonly exportEnCours = signal(false);

  readonly badgeSuivi = badgeSuiviMensuel;
  readonly formatMontant = formatMontantXof;

  readonly nombreImpayes = computed(() => this.items().filter(i => i.statut === FactureStatut.IMPAYEE).length);
  readonly nombreAbonnes = computed(() => this.items().length);

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total() / this.itemsPerPage()));
  }

  /** Dernier numéro d'élément affiché sur la page courante (texte "X–Y sur Z") — même
   * modèle que client-list.component.ts::finDePage. */
  get finDePage(): number {
    return Math.min(this.page() * this.itemsPerPage(), this.total());
  }

  constructor() {
    this.charger();
  }

  private periodeInitiale(): Periode {
    const params = this.route.snapshot.queryParamMap;
    const mois = Number(params.get('mois'));
    const annee = Number(params.get('annee'));
    if (mois >= 1 && mois <= 12 && annee > 0) return { mois, annee };
    return periodeCourante();
  }

  onPeriodeChange(periode: Periode): void {
    this.periode.set(periode);
    this.page.set(1);
    this.charger();
  }

  onToggleImpayeesSeulement(): void {
    this.impayeesSeulement.update(v => !v);
    this.page.set(1);
    this.charger();
  }

  onRechercheChange(recherche: string): void {
    this.recherche.set(recherche);
    this.page.set(1);
    this.charger();
  }

  changerPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.page.set(page);
    this.charger();
  }

  changerTaillePage(taille: number): void {
    this.itemsPerPage.set(taille);
    this.page.set(1);
    this.charger();
  }

  /** Fenêtre glissante de 5 numéros de page autour de la page courante — même algorithme
   * que client-list.component.ts::getPageNumbers. */
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    const half = Math.floor(maxPagesToShow / 2);

    let start = Math.max(1, this.page() - half);
    const end = Math.min(this.totalPages, start + maxPagesToShow - 1);
    if (end - start + 1 < maxPagesToShow) {
      start = Math.max(1, end - maxPagesToShow + 1);
    }

    for (let i = start; i <= end; i += 1) {
      pages.push(i);
    }
    return pages;
  }

  reessayer(): void {
    this.charger();
  }

  /** Ouvre la page Redevances du contrat couvrant cette ligne, pour y enregistrer un
   * paiement manuel — `depuis=suivi-mensuel` + le mois/année consultés (voir
   * redevances.component.ts::retour) pour que le retour rouvre CETTE page Suivi mensuel
   * sur le même mois, plutôt que la fiche client ou les Contrats. */
  allerVersPaiementManuel(ligne: SuiviAbonneMensuel): void {
    if (!ligne.facture?.contratId) return;
    const { mois, annee } = this.periode();
    this.router.navigate(['/dashboard/financial/contracts', ligne.facture.contratId, 'redevances'], {
      queryParams: { depuis: 'suivi-mensuel', mois, annee },
    });
  }

  exporterCsv(): void {
    if (this.exportEnCours()) return;
    this.exportEnCours.set(true);

    const { debut, fin } = bornesPeriode(this.periode());
    const optionsDate: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
    const periodeDu = debut.toLocaleDateString('fr-FR', optionsDate);
    const periodeAu = fin.toLocaleDateString('fr-FR', optionsDate);

    this.factureData
      .getSuiviMensuel(this.periode(), {
        page: 1,
        pageSize: TAILLE_PAGE_EXPORT,
        filter: { impayeesSeulement: this.impayeesSeulement() || undefined, search: this.recherche() || undefined },
      })
      .subscribe({
        next: page => {
          this.exportEnCours.set(false);
          const rows = page.items
            .filter(ligne => ligne.statut !== 'NonGeneree')
            .map(ligne => ({
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
        },
        error: () => {
          this.exportEnCours.set(false);
          this.erreur.set("Impossible d'exporter le suivi mensuel pour le moment.");
        },
      });
  }

  private charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);

    this.factureData
      .getSuiviMensuel(this.periode(), {
        page: this.page(),
        pageSize: this.itemsPerPage(),
        filter: { impayeesSeulement: this.impayeesSeulement() || undefined, search: this.recherche() || undefined },
      })
      .subscribe({
        next: page => {
          this.items.set(page.items);
          this.total.set(page.total);
          this.chargement.set(false);
        },
        error: () => {
          this.erreur.set('Impossible de charger le suivi mensuel pour le moment.');
          this.chargement.set(false);
        },
      });
  }
}
