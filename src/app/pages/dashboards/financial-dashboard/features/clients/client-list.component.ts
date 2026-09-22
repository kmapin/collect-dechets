import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Client, ClientStatut } from '../../models';
import { CLIENT_DATA_SERVICE } from '../../data-access/tokens/client-data.token';
import { FACTURE_DATA_SERVICE } from '../../data-access/tokens/facture-data.token';
import { SituationPaiementClient } from '../../data-access/contracts/facture-data.service';
import { SESSION_SERVICE } from '../../data-access/tokens/session.token';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { badgeSituationPaiement, badgeStatutClient } from '../../shared/status-badge/status-badge.util';
import { SearchFilterComponent } from '../../shared/filters/search-filter.component';
import { ErrorStateComponent } from '../../shared/states/error-state.component';
import { ClientListFilters, ClientListStatutFiltre, CLIENT_LIST_FILTERS_INITIAL } from './client-list.filters';

const TAILLE_PAGE_DEFAUT = 10;
const TAILLES_PAGE_DISPONIBLES = [5, 10, 20, 50, 100];

// Liste globale des clients, statut + situation de paiement, filtrable.
@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent, SearchFilterComponent, ErrorStateComponent],
  templateUrl: './client-list.component.html',
  styleUrl: './client-list.component.scss',
})
export class ClientListComponent {
  private readonly clientData = inject(CLIENT_DATA_SERVICE);
  private readonly factureData = inject(FACTURE_DATA_SERVICE);
  private readonly session = inject(SESSION_SERVICE);
  private readonly router = inject(Router);

  private readonly currentUser = toSignal(this.session.currentUser$, { initialValue: this.session.getCurrentUser() });
  readonly afficherColonneFinance = computed(() => this.currentUser().droitsFinance);

  readonly filtres = signal<ClientListFilters>({ ...CLIENT_LIST_FILTERS_INITIAL });
  readonly page = signal(1);
  readonly itemsPerPage = signal(TAILLE_PAGE_DEFAUT);
  readonly taillesPageDisponibles = TAILLES_PAGE_DISPONIBLES;

  readonly items = signal<Client[]>([]);
  readonly total = signal(0);
  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  private readonly situationParClient = signal<Map<string, SituationPaiementClient>>(new Map());

  readonly badgeStatut = badgeStatutClient;
  readonly badgeSituation = badgeSituationPaiement;

  readonly ClientStatut = ClientStatut;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total() / this.itemsPerPage()));
  }

  /** Dernier numéro d'élément affiché sur la page courante (texte "X–Y sur Z") — même
   * modèle que agency-dashboard.ts::getClientEndItemNumber. */
  get finDePage(): number {
    return Math.min(this.page() * this.itemsPerPage(), this.total());
  }

  constructor() {
    this.chargerSituations();
    this.charger();
  }

  changerFiltreStatut(statut: ClientListStatutFiltre): void {
    this.filtres.update(f => ({ ...f, statut }));
    this.page.set(1);
    this.charger();
  }

  onRechercheChange(search: string): void {
    this.filtres.update(f => ({ ...f, search }));
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
   * que agency-dashboard.ts::getClientPaginationPages. */
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

  ouvrirFiche(idClient: string): void {
    this.router.navigate(['/dashboard/financial/clients', idClient]);
  }

  situationDe(idClient: string): SituationPaiementClient {
    return this.situationParClient().get(idClient) ?? { idClient, moisRetard: 0, aJour: false, source: 'NONE' };
  }

  private chargerSituations(): void {
    this.factureData.getSituationClients().subscribe({
      next: situations => this.situationParClient.set(new Map(situations.map(s => [s.idClient, s]))),
      error: () => this.situationParClient.set(new Map()),
    });
  }

  private charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);
    const { statut, search } = this.filtres();

    this.clientData
      .getClients({
        page: this.page(),
        pageSize: this.itemsPerPage(),
        filter: { statut, search: search || undefined },
      })
      .subscribe({
        next: page => {
          this.items.set(page.items);
          this.total.set(page.total);
          this.chargement.set(false);
        },
        error: () => {
          this.erreur.set('Impossible de charger la liste des clients pour le moment.');
          this.chargement.set(false);
        },
      });
  }
}
