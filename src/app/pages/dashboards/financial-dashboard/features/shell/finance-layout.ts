import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { SESSION_SERVICE } from '../../data-access/tokens/session.token';
import { FINANCE_NAV_ITEMS } from './finance-nav.config';

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
  private readonly currentUser = toSignal(this.session.currentUser$, { initialValue: this.session.getCurrentUser() });

  readonly navItems = computed(() => {
    const role = this.currentUser().role;
    return FINANCE_NAV_ITEMS.filter(item => !item.rolesAutorises || item.rolesAutorises.includes(role));
  });
}
