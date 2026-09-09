import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { NotificationService } from '../../../../../services/notification.service';
import {
  FinancePermission,
  GROUPES_DROITS_FINANCIERS,
  PERMISSIONS_GOUVERNANCE,
  PERMISSIONS_ONGLETS,
  PRESETS_ROLE,
  Role,
  Utilisateur,
} from '../../models';
import { SESSION_SERVICE } from '../../data-access/tokens/session.token';

const LABEL_ROLE: Record<Role, string> = {
  [Role.COMPTABLE]: 'Comptable',
  [Role.MANAGER_TERRAIN]: 'Manager terrain',
  [Role.ADMINISTRATEUR]: 'Administrateur',
};

@Component({
  selector: 'app-roles-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './roles-admin.component.html',
  styleUrl: './roles-admin.component.scss',
})
export class RolesAdminComponent {
  private readonly session = inject(SESSION_SERVICE);
  private readonly notification = inject(NotificationService);

  readonly utilisateurs = signal<Utilisateur[]>([]);
  readonly chargement = signal(true);
  readonly recherche = signal('');
  readonly filtreRole = signal<Role | ''>('');
  private readonly selectionId = signal<string | null>(null);

  readonly labelRole = LABEL_ROLE;
  readonly roles = Object.values(Role);
  readonly permissionsOnglets = PERMISSIONS_ONGLETS;
  readonly groupesDroits = GROUPES_DROITS_FINANCIERS;

  private readonly brouillon = signal<Set<FinancePermission>>(new Set());
  readonly enregistrementEnCours = signal(false);

  readonly utilisateursFiltres = computed(() => {
    const terme = this.recherche().trim().toLowerCase();
    const role = this.filtreRole();
    return this.utilisateurs().filter(u => {
      const correspondTerme = !terme || u.identifiants.toLowerCase().includes(terme);
      const correspondRole = !role || u.role === role;
      return correspondTerme && correspondRole;
    });
  });

  readonly utilisateurSelectionne = computed(
    () => this.utilisateurs().find(u => u.idUtilisateur === this.selectionId()) ?? null,
  );

  // droitsFinance 

  readonly droitsDetaillesActifs = computed(() => this.utilisateurSelectionne()?.droitsFinance ?? false);

  readonly modifie = computed(() => {
    const u = this.utilisateurSelectionne();
    if (!u) return false;
    const actuel = u.permissions;
    const projet = this.brouillon();
    if (actuel.length !== projet.size) return true;
    return actuel.some(cle => !projet.has(cle));
  });

  constructor() {
    this.charger();
  }

  selectionner(utilisateur: Utilisateur): void {
    if (this.modifie()) return;
    this.selectionId.set(utilisateur.idUtilisateur);
    this.brouillon.set(new Set(utilisateur.permissions));
  }

  initiales(identifiants: string): string {
    return identifiants
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(mot => mot.charAt(0).toUpperCase())
      .join('');
  }

  changerRole(utilisateur: Utilisateur, role: Role): void {
    this.session.setFinancialRole(utilisateur.idUtilisateur, role).subscribe({
      next: () => {
        this.notification.showSuccess('Rôle mis à jour', `${utilisateur.identifiants} est maintenant ${this.labelRole[role]}.`);
        this.charger();
      },
      error: (err: HttpErrorResponse) => this.notification.showError('Rôle non mis à jour', this.messageErreur(err)),
    });
  }

  basculerDroitsFinance(utilisateur: Utilisateur): void {
    this.session.toggleDroitsFinance(utilisateur.idUtilisateur).subscribe({
      next: utilisateurMisAJour => {
        this.notification.showSuccess(
          'Droits financiers mis à jour',
          utilisateurMisAJour.droitsFinance ? 'Accès au module financier activé.' : 'Accès au module financier désactivé.',
        );
        this.charger();
      },
      error: (err: HttpErrorResponse) => this.notification.showError('Droits non mis à jour', this.messageErreur(err)),
    });
  }

  estImplicite(cle: FinancePermission): boolean {
    const u = this.utilisateurSelectionne();
    return !!u && u.role === Role.ADMINISTRATEUR && PERMISSIONS_GOUVERNANCE.includes(cle);
  }

  estCoche(cle: FinancePermission): boolean {
    return this.estImplicite(cle) || this.brouillon().has(cle);
  }

  basculerPermission(cle: FinancePermission): void {
    if (this.estImplicite(cle) || !this.droitsDetaillesActifs()) return;
    const projet = new Set(this.brouillon());
    if (projet.has(cle)) projet.delete(cle);
    else projet.add(cle);
    this.brouillon.set(projet);
  }

  appliquerPreregleRole(): void {
    const u = this.utilisateurSelectionne();
    if (!u || !this.droitsDetaillesActifs()) return;
    this.brouillon.set(new Set(PRESETS_ROLE[u.role]));
  }

  enregistrer(): void {
    const u = this.utilisateurSelectionne();
    if (!u) return;
    this.enregistrementEnCours.set(true);
    this.session.setPermissions(u.idUtilisateur, [...this.brouillon()]).subscribe({
      next: () => {
        this.enregistrementEnCours.set(false);
        this.notification.showSuccess('Droits mis à jour', 'Les accès de cet utilisateur ont été enregistrés.');
        this.charger();
      },
      error: (err: HttpErrorResponse) => {
        this.enregistrementEnCours.set(false);
        this.notification.showError('Droits non enregistrés', this.messageErreur(err));
      },
    });
  }

  annuler(): void {
    const u = this.utilisateurSelectionne();
    if (u) this.brouillon.set(new Set(u.permissions));
  }

  private messageErreur(err: HttpErrorResponse): string {
    return err.error?.message ?? 'Action impossible pour le moment.';
  }

  private charger(): void {
    this.chargement.set(true);
    this.session.getUtilisateurs().subscribe(utilisateurs => {
      this.utilisateurs.set(utilisateurs);
      this.chargement.set(false);
      if (!this.selectionId() && utilisateurs.length > 0) {
        this.selectionId.set(utilisateurs[0].idUtilisateur);
      }
      const selectionne = utilisateurs.find(u => u.idUtilisateur === this.selectionId());
      if (selectionne) this.brouillon.set(new Set(selectionne.permissions));
    });
  }
}
