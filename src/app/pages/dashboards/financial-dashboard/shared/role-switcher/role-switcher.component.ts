import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { Role } from '../../models';
import { SESSION_SERVICE } from '../../data-access/tokens/session.token';

const LABEL_PAR_ROLE: Record<Role, string> = {
  [Role.COMPTABLE]: 'Comptable',
  [Role.MANAGER_TERRAIN]: 'Manager terrain',
  [Role.ADMINISTRATEUR]: 'Administrateur',
};

// Démo uniquement (F11) : permet de prouver la compartimentalisation RBAC sans
// authentification réelle — jamais présent en production (DISCOVERY.md §4).
@Component({
  selector: 'app-role-switcher',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './role-switcher.component.html',
  styleUrl: './role-switcher.component.scss',
})
export class RoleSwitcherComponent {
  private readonly session = inject(SESSION_SERVICE);
  private readonly currentUser = toSignal(this.session.currentUser$, { initialValue: this.session.getCurrentUser() });

  readonly roles = Object.values(Role);
  readonly labelParRole = LABEL_PAR_ROLE;
  readonly roleActif = computed(() => this.currentUser().role);

  choisirRole(role: Role): void {
    this.session.switchRole(role);
  }
}
