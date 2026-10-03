import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { NotificationService } from '../../../../../../services/notification.service';
import { AuthService } from '../../../../../../services/auth.service';
import { AdministrationUsersService, UtilisateurAdministration } from '../services/administration-users.service';
import {
  AdministrationPermission,
  GROUPES_DROITS_ADMINISTRATION,
  PERMISSIONS_GOUVERNANCE,
  aLaPermissionAdministration,
} from '../models/administration-permission';

const LABEL_ROLE_OPERATIONNEL: Record<string, string> = {
  manager: 'Manager',
  collector: 'Collecteur',
  super_admin: 'Super admin',
};

/**
 * Écran dédié, UNIQUEMENT au domaine Administration — contrairement à roles-access/ (qui
 * fusionne Administration ET Finance côte à côte dans un même écran pour les titulaires de
 * roles.view finance), celui-ci n'appelle que AdministrationUsersService et n'affiche jamais
 * de contenu financier. Même logique de permissions que la section "Permissions
 * Administration" de roles-access.ts (pas de duplication de RÈGLES, seulement de l'écran :
 * les deux appellent le même AdministrationUsersService.setPermissions, donc le même
 * endpoint gouverné côté backend).
 */
@Component({
  selector: 'app-administration-permissions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './administration-permissions.html',
  styleUrl: './administration-permissions.scss',
})
export class AdministrationPermissions {
  private readonly administrationUsersService = inject(AdministrationUsersService);
  private readonly notification = inject(NotificationService);
  private readonly authService = inject(AuthService);

  readonly labelRoleOperationnel = LABEL_ROLE_OPERATIONNEL;
  readonly groupesDroitsAdministration = GROUPES_DROITS_ADMINISTRATION;

  readonly utilisateurs = signal<UtilisateurAdministration[]>([]);
  readonly chargement = signal(true);
  readonly recherche = signal('');
  readonly filtreRole = signal('');
  private readonly selectionId = signal<string | null>(null);

  private readonly brouillon = signal<Set<AdministrationPermission>>(new Set());
  readonly enregistrementEnCours = signal(false);

  // Calculé une fois à la construction (snapshot du token courant) — après l'affectation
  // des propriétés de paramètres du constructeur, jamais en initialiseur de champ (piège
  // déjà rencontré/corrigé dans employees-list.ts et roles-access.ts).
  readonly peutGerer: boolean;

  constructor() {
    const currentUser = this.authService.getCurrentUser();
    this.peutGerer = aLaPermissionAdministration(currentUser as any, 'roles.manage');

    this.charger();
  }

  readonly utilisateursFiltres = computed(() => {
    const terme = this.recherche().trim().toLowerCase();
    const role = this.filtreRole();
    return this.utilisateurs().filter((u) => {
      const correspondTerme = !terme || u.identifiants.toLowerCase().includes(terme);
      const correspondRole = !role || u.role === role;
      return correspondTerme && correspondRole;
    });
  });

  readonly utilisateurSelectionne = computed(
    () => this.utilisateurs().find((u) => u.idUtilisateur === this.selectionId()) ?? null,
  );

  readonly modifie = computed(() => {
    const u = this.utilisateurSelectionne();
    if (!u) return false;
    const actuel = u.permissions as AdministrationPermission[];
    const projet = this.brouillon();
    if (actuel.length !== projet.size) return true;
    return actuel.some((cle) => !projet.has(cle));
  });

  selectionner(u: UtilisateurAdministration): void {
    if (this.modifie()) return;
    this.selectionId.set(u.idUtilisateur);
    this.brouillon.set(new Set(u.permissions as AdministrationPermission[]));
  }

  initiales(identifiants: string): string {
    return identifiants
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((mot) => mot.charAt(0).toUpperCase())
      .join('');
  }

  estGouvernance(cle: AdministrationPermission): boolean {
    return PERMISSIONS_GOUVERNANCE.includes(cle);
  }

  estCoche(cle: AdministrationPermission): boolean {
    return this.brouillon().has(cle);
  }

  /** Désactivé (pas juste masqué) sur une cible super_admin ou l'appelant lui-même — le
   * backend refuserait de toute façon (controllers/administrationUsers.js). */
  peutModifier(): boolean {
    const u = this.utilisateurSelectionne();
    if (!u) return false;
    const estSoiMeme = u.idUtilisateur === this.authService.getCurrentUser()?._id;
    const estSuperAdmin = u.role === 'super_admin';
    return this.peutGerer && !estSoiMeme && !estSuperAdmin;
  }

  basculerPermission(cle: AdministrationPermission): void {
    if (!this.peutModifier()) return;
    const projet = new Set(this.brouillon());
    if (projet.has(cle)) projet.delete(cle);
    else projet.add(cle);
    this.brouillon.set(projet);
  }

  enregistrer(): void {
    const u = this.utilisateurSelectionne();
    if (!u) return;
    this.enregistrementEnCours.set(true);
    this.administrationUsersService.setPermissions(u.idUtilisateur, [...this.brouillon()]).subscribe({
      next: () => {
        this.enregistrementEnCours.set(false);
        this.notification.showSuccess('Permissions mises à jour', 'Les accès Administration de cet utilisateur ont été enregistrés.');
        this.charger();
      },
      error: (err: HttpErrorResponse) => {
        this.enregistrementEnCours.set(false);
        this.notification.showError('Permissions non enregistrées', err.error?.message ?? 'Action impossible pour le moment.');
      },
    });
  }

  annuler(): void {
    const u = this.utilisateurSelectionne();
    if (u) this.brouillon.set(new Set(u.permissions as AdministrationPermission[]));
  }

  private charger(): void {
    this.chargement.set(true);
    this.administrationUsersService.getUtilisateurs().subscribe({
      next: (liste) => {
        const triee = [...liste].sort((a, b) => a.identifiants.localeCompare(b.identifiants));
        this.utilisateurs.set(triee);
        this.chargement.set(false);

        if (!this.selectionId() && triee.length > 0) {
          this.selectionId.set(triee[0].idUtilisateur);
        }
        const selectionne = triee.find((u) => u.idUtilisateur === this.selectionId());
        if (selectionne) {
          this.brouillon.set(new Set(selectionne.permissions as AdministrationPermission[]));
        }
      },
      error: () => {
        this.chargement.set(false);
      },
    });
  }
}
