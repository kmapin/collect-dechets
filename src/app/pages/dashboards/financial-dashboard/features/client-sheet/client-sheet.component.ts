import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { Client } from '../../models';
import { CLIENT_DATA_SERVICE } from '../../data-access/tokens/client-data.token';
import { SESSION_SERVICE } from '../../data-access/tokens/session.token';
import { InfoTabComponent } from './tabs/info-tab.component';
import { BillingTabComponent } from './tabs/billing-tab.component';
import { SubscriptionTabComponent } from './tabs/subscription-tab.component';
import { ErrorStateComponent } from '../../shared/states/error-state.component';

type OngletClientSheet = 'info' | 'facturation' | 'abonnements';

// F7/F8 — Fiche client : onglet Info (toujours visible) + onglets Facturation
// et Abonnements/Contrats (masqués si le rôle courant n'a pas droitsFinance, RG8 —
// même règle de visibilité, ces deux onglets exposant des informations de paiement).
@Component({
  selector: 'app-client-sheet',
  standalone: true,
  imports: [CommonModule, InfoTabComponent, BillingTabComponent, SubscriptionTabComponent, ErrorStateComponent],
  templateUrl: './client-sheet.component.html',
  styleUrl: './client-sheet.component.scss',
})
export class ClientSheetComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly clientData = inject(CLIENT_DATA_SERVICE);
  private readonly session = inject(SESSION_SERVICE);

  private readonly currentUser = toSignal(this.session.currentUser$, { initialValue: this.session.getCurrentUser() });
  readonly afficherFacturation = computed(() => this.currentUser().droitsFinance);

  readonly idClient = toSignal(
    this.route.paramMap.pipe(map(params => params.get('idClient') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('idClient') ?? '' },
  );

  readonly client = signal<Client | null>(null);
  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  readonly ongletActif = signal<OngletClientSheet>('info');

  constructor() {
    this.charger();
  }

  changerOnglet(onglet: OngletClientSheet): void {
    if ((onglet === 'facturation' || onglet === 'abonnements') && !this.afficherFacturation()) return;
    this.ongletActif.set(onglet);
  }

  reessayer(): void {
    this.charger();
  }

  private charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);
    this.clientData.getClient(this.idClient()).subscribe({
      next: client => {
        this.client.set(client);
        this.chargement.set(false);
      },
      error: () => {
        this.erreur.set('Impossible de charger la fiche client.');
        this.chargement.set(false);
      },
    });
  }
}
