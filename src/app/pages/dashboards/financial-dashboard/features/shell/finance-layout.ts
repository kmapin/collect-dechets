import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { SESSION_SERVICE } from '../../data-access/tokens/session.token';
import { FINANCE_NAV_ITEMS } from './finance-nav.config';
import { aLaPermission } from '../../models';

// Shell du module Financial Dashboard : pas de sidebar (choix explicite) — navigation
// par onglets, pattern maison identique aux autres dashboards (DISCOVERY.md §2), mais
// piloté par le Router (routerLink/routerLinkActive) puisque chaque onglet est une
// vraie route enfant lazy plutôt qu'un état interne de composant.
@Component({
  selector: 'app-finance-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './finance-layout.html',
  styleUrl: './finance-layout.scss',
})
export class FinanceLayout {
  private readonly session = inject(SESSION_SERVICE);
  // `initialValue: null` (et non session.getCurrentUser(), qui lève tant que GET
  // /finance/session/moi n'a pas répondu) : navItems() doit rester utilisable (liste vide)
  // pendant le court instant où la session réelle est encore en vol, plutôt que de
  // planter le shell — voir SessionHttpService.
  private readonly currentUser = toSignal(this.session.currentUser$, { initialValue: null });

  readonly navItems = computed(() => {
    const utilisateur = this.currentUser();
    return FINANCE_NAV_ITEMS.filter(item => aLaPermission(utilisateur, ...item.permissions));
  });
}
