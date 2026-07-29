import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Role, Utilisateur } from '../../models';
import { SESSION_SERVICE } from '../../data-access/tokens/session.token';

const LABEL_ROLE: Record<Role, string> = {
  [Role.COMPTABLE]: 'Comptable',
  [Role.MANAGER_TERRAIN]: 'Manager terrain',
  [Role.ADMINISTRATEUR]: 'Administrateur',
};

// F11 admin — gestion réelle des droitsFinance par rôle (PATCH /finance/session/
// utilisateurs/:id/droits-finance). Réservé à l'Administrateur (finance-admin.guard.ts).
// La bascule est persistée côté serveur et immédiatement répercutée sur les gardes via
// SessionService (RG8) si l'utilisateur modifié est celui de la session active.
@Component({
  selector: 'app-roles-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './roles-admin.component.html',
  styleUrl: './roles-admin.component.scss',
})
export class RolesAdminComponent {
  private readonly session = inject(SESSION_SERVICE);

  readonly utilisateurs = signal<Utilisateur[]>([]);
  readonly chargement = signal(true);

  readonly labelRole = LABEL_ROLE;

  constructor() {
    this.charger();
  }

  basculerDroitsFinance(utilisateur: Utilisateur): void {
    this.session.toggleDroitsFinance(utilisateur.idUtilisateur);
    this.charger();
  }

  private charger(): void {
    this.chargement.set(true);
    this.session.getUtilisateurs().subscribe(utilisateurs => {
      this.utilisateurs.set(utilisateurs);
      this.chargement.set(false);
    });
  }
}
