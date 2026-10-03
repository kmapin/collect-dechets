import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AgencyService } from '../../../../../../services/agency.service';
import { AuthService } from '../../../../../../services/auth.service';
import { NotificationService } from '../../../../../../services/notification.service';
import {
  ADMINISTRATION_PERMISSIONS,
  AdministrationPermission,
  DEFAULT_OWNER_PERMISSIONS,
  GROUPES_DROITS_ADMINISTRATION,
  PERMISSIONS_GOUVERNANCE,
  aLaPermissionAdministration,
} from '../../../../agency-dashboard/features/administration/models/administration-permission';
import { ManagerRoleAccess } from '../shared/manager-role-access.model';
import { ManagerRoleAccessListService } from '../shared/manager-role-access-list.service';

/**
 * Onglet "Permissions Administration" du dashboard super_admin — pendant plateforme
 * entière de agency-dashboard/features/administration/administration-permissions/, mais
 * personnel = managers de toutes agences (même liste source que l'onglet Droits
 * financiers, voir ManagerRoleAccessListService — pas de duplication de chargement).
 */
@Component({
  selector: 'app-admin-administration-permissions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-administration-permissions.html',
  styleUrl: '../admin-roles-access-shared.scss',
})
export class AdminAdministrationPermissions {
  private readonly listeService = inject(ManagerRoleAccessListService);
  private readonly agencyService = inject(AgencyService);
  private readonly notification = inject(NotificationService);
  private readonly authService = inject(AuthService);

  readonly groupesDroitsAdministration = GROUPES_DROITS_ADMINISTRATION;

  readonly utilisateurs = signal<ManagerRoleAccess[]>([]);
  readonly chargement = signal(true);
  readonly recherche = signal('');
  private readonly selectionId = signal<string | null>(null);

  private readonly brouillon = signal<Set<AdministrationPermission>>(new Set());
  readonly enregistrementEnCours = signal(false);

  // Calculé une fois à la construction (snapshot du token courant) — après l'affectation
  // des propriétés de paramètres du constructeur, jamais en initialiseur de champ (piège
  // déjà rencontré/corrigé dans employees-list.ts et roles-access.ts). Toujours true ici
  // (super_admin), conservé pour cohérence avec l'écran agence et défense en profondeur.
  readonly peutGerer: boolean;

  constructor() {
    const currentUser = this.authService.getCurrentUser();
    this.peutGerer = aLaPermissionAdministration(currentUser as any, 'roles.manage');

    this.charger();
  }

  readonly utilisateursFiltres = computed(() => {
    const terme = this.recherche().trim().toLowerCase();
    if (!terme) return this.utilisateurs();
    return this.utilisateurs().filter(
      (u) => u.identifiants.toLowerCase().includes(terme) || u.agenceNom.toLowerCase().includes(terme),
    );
  });

  readonly utilisateurSelectionne = computed(
    () => this.utilisateurs().find((u) => u.idUtilisateur === this.selectionId()) ?? null,
  );

  readonly modifie = computed(() => {
    const u = this.utilisateurSelectionne();
    if (!u) return false;
    const projet = this.brouillon();
    if (u.administrationPermissions.length !== projet.size) return true;
    return u.administrationPermissions.some((cle) => !projet.has(cle));
  });

  selectionner(u: ManagerRoleAccess): void {
    if (this.modifie()) return;
    this.selectionId.set(u.idUtilisateur);
    this.brouillon.set(new Set(u.administrationPermissions));
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

  // Préréglages rapides — même paire que le select du tableau Utilisateurs
  // (admin-dashboard.ts::assignAdministrationPermissions, options "employees"/
  // "employees_roles") : juste un raccourci pour peupler le brouillon, toujours soumis à
  // Enregistrer/Annuler comme n'importe quelle case cochée à la main. "Aucun" n'a pas
  // besoin d'un bouton dédié ici (contrairement au select) : décocher manuellement les 1
  // ou 2 cases présentes revient au même sur un écran qui les affiche déjà toutes.
  appliquerPreregleEmployes(): void {
    if (!this.peutModifier()) return;
    this.brouillon.set(new Set(DEFAULT_OWNER_PERMISSIONS));
  }

  appliquerPreregleEmployesEtRoles(): void {
    if (!this.peutModifier()) return;
    this.brouillon.set(new Set(ADMINISTRATION_PERMISSIONS));
  }

  /** Désactivé (pas juste masqué) sur l'appelant lui-même — le backend refuserait de
   * toute façon (controllers/administrationUsers.js). Pas de blocage "cible super_admin"
   * ici : la liste ne contient que des managers. */
  peutModifier(): boolean {
    const u = this.utilisateurSelectionne();
    if (!u) return false;
    const estSoiMeme = u.idUtilisateur === this.authService.getCurrentUser()?._id;
    return this.peutGerer && !estSoiMeme;
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
    this.agencyService.setEmployeeAdministrationPermissions$(u.idUtilisateur, [...this.brouillon()], u.agencyId).subscribe({
      next: () => {
        this.enregistrementEnCours.set(false);
        this.notification.showSuccess('Permissions mises à jour', 'Les accès Administration de cet utilisateur ont été enregistrés.');
        this.charger();
      },
      error: (err: HttpErrorResponse) => {
        this.enregistrementEnCours.set(false);
        this.notification.showError('Permissions non enregistrées', (err.error as any)?.message ?? 'Action impossible pour le moment.');
      },
    });
  }

  annuler(): void {
    const u = this.utilisateurSelectionne();
    if (u) this.brouillon.set(new Set(u.administrationPermissions));
  }

  private charger(): void {
    this.chargement.set(true);
    this.listeService.charger().subscribe({
      next: (liste) => {
        this.utilisateurs.set(liste);
        this.chargement.set(false);

        if (!this.selectionId() && liste.length > 0) {
          this.selectionId.set(liste[0].idUtilisateur);
        }
        const selectionne = liste.find((u) => u.idUtilisateur === this.selectionId());
        if (selectionne) {
          this.brouillon.set(new Set(selectionne.administrationPermissions));
        }
      },
      error: () => {
        this.chargement.set(false);
      },
    });
  }
}
