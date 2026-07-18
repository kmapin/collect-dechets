import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Client, ClientStatut } from '../../models';
import { CLIENT_DATA_SERVICE } from '../../data-access/tokens/client-data.token';
import { FACTURE_DATA_SERVICE } from '../../data-access/tokens/facture-data.token';
import { SESSION_SERVICE } from '../../data-access/tokens/session.token';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { badgeSituationPaiement, badgeStatutClient } from '../../shared/status-badge/status-badge.util';
import { SearchFilterComponent } from '../../shared/filters/search-filter.component';
import { ErrorStateComponent } from '../../shared/states/error-state.component';
import { ClientListFilters, ClientListStatutFiltre, CLIENT_LIST_FILTERS_INITIAL } from './client-list.filters';

const TAILLE_PAGE = 10;

// F6 — Liste globale des clients, statut + situation de paiement, filtrable.
// RG8 : la colonne "situation paiement" (financière) est masquée si le rôle courant
// n'a pas droitsFinance — même si, avec la simplification RBAC du Prompt 6, cette route
// est déjà entièrement bloquée pour ces rôles (voir ARCHITECTURE.md §7). Le composant
// reste tout de même role-aware pour rester correct si ce garde est assoupli plus tard.
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

  readonly items = signal<Client[]>([]);
  readonly total = signal(0);
  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  private readonly moisRetardParClient = signal<Map<string, number>>(new Map());

  readonly badgeStatut = badgeStatutClient;
  readonly badgeSituation = badgeSituationPaiement;

  readonly ClientStatut = ClientStatut;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total() / TAILLE_PAGE));
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

  reessayer(): void {
    this.charger();
  }

  ouvrirFiche(idClient: string): void {
    this.router.navigate(['/dashboard/financial/clients', idClient]);
  }

  moisRetardDe(idClient: string): number {
    return this.moisRetardParClient().get(idClient) ?? 0;
  }

  private chargerSituations(): void {
    this.factureData.getSituationClients().subscribe({
      next: situations => this.moisRetardParClient.set(new Map(situations.map(s => [s.idClient, s.moisRetard]))),
      error: () => this.moisRetardParClient.set(new Map()),
    });
  }

  private charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);
    const { statut, search } = this.filtres();

    this.clientData
      .getClients({
        page: this.page(),
        pageSize: TAILLE_PAGE,
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
