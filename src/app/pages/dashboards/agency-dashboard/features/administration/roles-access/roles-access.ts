import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NotificationService } from '../../../../../../services/notification.service';
import { AuthService } from '../../../../../../services/auth.service';
import { AdministrationUsersService, UtilisateurAdministration } from '../services/administration-users.service';
import {
  AdministrationPermission,
  GROUPES_DROITS_ADMINISTRATION,
  PERMISSIONS_GOUVERNANCE as ADMIN_PERMISSIONS_GOUVERNANCE,
  aLaPermissionAdministration,
} from '../models/administration-permission';
import { SESSION_SERVICE } from '../../../../financial-dashboard/data-access/tokens/session.token';
import {
  FinancePermission,
  GROUPES_DROITS_FINANCIERS,
  PERMISSIONS_GOUVERNANCE as FINANCE_PERMISSIONS_GOUVERNANCE,
  PERMISSIONS_ONGLETS,
  PRESETS_ROLE,
  Role,
  Utilisateur,
  aLaPermissionDepuisUser,
} from '../../../../financial-dashboard/models';

/**
 * Écran "Rôles et accès" d'Administration — fusionne deux écrans historiquement séparés :
 * - Section Finance : déplacée telle quelle depuis financial-dashboard/features/
 *   roles-admin/roles-admin.component.ts (mêmes méthodes/comportement, même service
 *   SESSION_SERVICE — désormais fourni en racine, voir main.ts — pour ne pas dupliquer
 *   le moteur de permissions finance).
 * - Section Administration : reprend l'écran plus simple construit précédemment dans ce
 *   module (AdministrationUsersService), inchangé.
 * Les deux domaines restent des systèmes de permissions INDÉPENDANTS côté backend
 * (financePermissions vs administrationPermissions) — cet écran ne fait que les
 * présenter côte à côte pour la même personne sélectionnée, sans les mélanger : chaque
 * section appelle uniquement son propre service, avec son propre état "modifié"/
 * "enregistrement en cours".
 */

const LABEL_ROLE_FINANCE: Record<Role, string> = {
  [Role.COMPTABLE]: 'Comptable',
  [Role.MANAGER_TERRAIN]: 'Manager terrain',
  [Role.ADMINISTRATEUR]: 'Administrateur',
};

const LABEL_ROLE_OPERATIONNEL: Record<string, string> = {
  manager: 'Manager',
  collector: 'Collecteur',
  super_admin: 'Super admin',
};

interface UtilisateurCombine {
  idUtilisateur: string;
  identifiants: string;
  /** Rôle opérationnel (manager/collector/...), depuis le domaine Administration —
   * vide si cette personne n'apparaît que côté Finance (ne devrait pas arriver en
   * pratique, les deux domaines listant le même personnel d'agence). */
  roleOperationnel: string;
  finance: Utilisateur | null;
  administration: UtilisateurAdministration | null;
}

@Component({
  selector: 'app-administration-roles-access',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './roles-access.html',
  styleUrl: './roles-access.scss',
})
export class RolesAccess {
  private readonly session = inject(SESSION_SERVICE);
  private readonly administrationUsersService = inject(AdministrationUsersService);
  private readonly notification = inject(NotificationService);
  private readonly authService = inject(AuthService);

  readonly labelRoleFinance = LABEL_ROLE_FINANCE;
  readonly labelRoleOperationnel = LABEL_ROLE_OPERATIONNEL;
  readonly rolesFinance = Object.values(Role);
  readonly permissionsOnglets = PERMISSIONS_ONGLETS;
  readonly groupesDroitsFinanciers = GROUPES_DROITS_FINANCIERS;
  readonly groupesDroitsAdministration = GROUPES_DROITS_ADMINISTRATION;

  readonly utilisateurs = signal<UtilisateurCombine[]>([]);
  readonly chargement = signal(true);
  readonly recherche = signal('');
  readonly filtreRole = signal('');
  private readonly selectionId = signal<string | null>(null);

  // Dépend des droits de L'APPELANT (pas de la personne sélectionnée) — un appel 403 sur
  // un domaine masque toute sa section plutôt que de faire échouer toute la page.
  readonly accesFinanceDisponible = signal(false);
  readonly accesAdministrationDisponible = signal(false);

  private readonly brouillonFinance = signal<Set<FinancePermission>>(new Set());
  private readonly brouillonAdministration = signal<Set<AdministrationPermission>>(new Set());
  readonly enregistrementFinanceEnCours = signal(false);
  readonly enregistrementAdministrationEnCours = signal(false);

  // Calculés une fois à la construction (snapshot du token courant) — après
  // l'affectation des propriétés de paramètres du constructeur, jamais en initialiseur
  // de champ (voir employees-list.ts pour le même piège déjà rencontré/corrigé).
  readonly peutGererAdministration: boolean;
  readonly peutGererFinance: boolean;

  constructor() {
    const currentUser = this.authService.getCurrentUser();
    this.peutGererAdministration = aLaPermissionAdministration(currentUser as any, 'roles.manage');
    this.peutGererFinance = aLaPermissionDepuisUser(currentUser as any, 'roles.manage');

    this.charger();
  }

  readonly utilisateursFiltres = computed(() => {
    const terme = this.recherche().trim().toLowerCase();
    const role = this.filtreRole();
    return this.utilisateurs().filter((u) => {
      const correspondTerme = !terme || u.identifiants.toLowerCase().includes(terme);
      const correspondRole = !role || u.roleOperationnel === role;
      return correspondTerme && correspondRole;
    });
  });

  readonly utilisateurSelectionne = computed(
    () => this.utilisateurs().find((u) => u.idUtilisateur === this.selectionId()) ?? null,
  );

  readonly droitsFinanceActifs = computed(() => this.utilisateurSelectionne()?.finance?.droitsFinance ?? false);

  readonly modifieFinance = computed(() => {
    const u = this.utilisateurSelectionne()?.finance;
    if (!u) return false;
    const projet = this.brouillonFinance();
    if (u.permissions.length !== projet.size) return true;
    return u.permissions.some((cle) => !projet.has(cle));
  });

  readonly modifieAdministration = computed(() => {
    const u = this.utilisateurSelectionne()?.administration;
    if (!u) return false;
    const actuel = u.permissions as AdministrationPermission[];
    const projet = this.brouillonAdministration();
    if (actuel.length !== projet.size) return true;
    return actuel.some((cle) => !projet.has(cle));
  });

  selectionner(u: UtilisateurCombine): void {
    if (this.modifieFinance() || this.modifieAdministration()) return;
    this.selectionId.set(u.idUtilisateur);
    this.brouillonFinance.set(new Set(u.finance?.permissions ?? []));
    this.brouillonAdministration.set(new Set((u.administration?.permissions ?? []) as AdministrationPermission[]));
  }

  initiales(identifiants: string): string {
    return identifiants
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((mot) => mot.charAt(0).toUpperCase())
      .join('');
  }

  // ── Section Finance (reprise de financial-dashboard/features/roles-admin/) ────────

  changerRoleFinance(u: UtilisateurCombine, role: Role): void {
    this.session.setFinancialRole(u.idUtilisateur, role).subscribe({
      next: () => {
        this.notification.showSuccess('Rôle mis à jour', `${u.identifiants} est maintenant ${this.labelRoleFinance[role]}.`);
        this.charger();
      },
      error: (err: HttpErrorResponse) => this.notification.showError('Rôle non mis à jour', this.messageErreur(err)),
    });
  }

  basculerDroitsFinance(u: UtilisateurCombine): void {
    this.session.toggleDroitsFinance(u.idUtilisateur).subscribe({
      next: (maj) => {
        this.notification.showSuccess(
          'Droits financiers mis à jour',
          maj.droitsFinance ? 'Accès au module financier activé.' : 'Accès au module financier désactivé.',
        );
        this.charger();
      },
      error: (err: HttpErrorResponse) => this.notification.showError('Droits non mis à jour', this.messageErreur(err)),
    });
  }

  estImpliciteFinance(cle: FinancePermission): boolean {
    const u = this.utilisateurSelectionne()?.finance;
    return !!u && u.role === Role.ADMINISTRATEUR && FINANCE_PERMISSIONS_GOUVERNANCE.includes(cle);
  }

  estCocheFinance(cle: FinancePermission): boolean {
    return this.estImpliciteFinance(cle) || this.brouillonFinance().has(cle);
  }

  basculerPermissionFinance(cle: FinancePermission): void {
    if (this.estImpliciteFinance(cle) || !this.droitsFinanceActifs()) return;
    const projet = new Set(this.brouillonFinance());
    if (projet.has(cle)) projet.delete(cle);
    else projet.add(cle);
    this.brouillonFinance.set(projet);
  }

  appliquerPreregleRoleFinance(): void {
    const u = this.utilisateurSelectionne()?.finance;
    if (!u || !this.droitsFinanceActifs() || !u.role) return;
    this.brouillonFinance.set(new Set(PRESETS_ROLE[u.role]));
  }

  enregistrerFinance(): void {
    const u = this.utilisateurSelectionne();
    if (!u) return;
    this.enregistrementFinanceEnCours.set(true);
    this.session.setPermissions(u.idUtilisateur, [...this.brouillonFinance()]).subscribe({
      next: () => {
        this.enregistrementFinanceEnCours.set(false);
        this.notification.showSuccess('Droits mis à jour', 'Les accès financiers de cet utilisateur ont été enregistrés.');
        this.charger();
      },
      error: (err: HttpErrorResponse) => {
        this.enregistrementFinanceEnCours.set(false);
        this.notification.showError('Droits non enregistrés', this.messageErreur(err));
      },
    });
  }

  annulerFinance(): void {
    const u = this.utilisateurSelectionne()?.finance;
    if (u) this.brouillonFinance.set(new Set(u.permissions));
  }

  // ── Section Administration (reprise de l'écran existant) ──────────────────────────

  estGouvernanceAdministration(cle: AdministrationPermission): boolean {
    return ADMIN_PERMISSIONS_GOUVERNANCE.includes(cle);
  }

  estCocheAdministration(cle: AdministrationPermission): boolean {
    return this.brouillonAdministration().has(cle);
  }

  /** Désactivé (pas juste masqué) sur une cible super_admin ou l'appelant lui-même — le
   * backend refuserait de toute façon (controllers/administrationUsers.js). */
  peutModifierAdministration(): boolean {
    const u = this.utilisateurSelectionne();
    if (!u || !u.administration) return false;
    const estSoiMeme = u.idUtilisateur === this.authService.getCurrentUser()?._id;
    const estSuperAdmin = u.roleOperationnel === 'super_admin';
    return this.peutGererAdministration && !estSoiMeme && !estSuperAdmin;
  }

  basculerPermissionAdministration(cle: AdministrationPermission): void {
    if (!this.peutModifierAdministration()) return;
    const projet = new Set(this.brouillonAdministration());
    if (projet.has(cle)) projet.delete(cle);
    else projet.add(cle);
    this.brouillonAdministration.set(projet);
  }

  enregistrerAdministration(): void {
    const u = this.utilisateurSelectionne();
    if (!u) return;
    this.enregistrementAdministrationEnCours.set(true);
    this.administrationUsersService.setPermissions(u.idUtilisateur, [...this.brouillonAdministration()]).subscribe({
      next: () => {
        this.enregistrementAdministrationEnCours.set(false);
        this.notification.showSuccess('Permissions mises à jour', 'Les accès Administration de cet utilisateur ont été enregistrés.');
        this.charger();
      },
      error: (err: HttpErrorResponse) => {
        this.enregistrementAdministrationEnCours.set(false);
        this.notification.showError('Permissions non enregistrées', this.messageErreur(err));
      },
    });
  }

  annulerAdministration(): void {
    const u = this.utilisateurSelectionne()?.administration;
    if (u) this.brouillonAdministration.set(new Set(u.permissions as AdministrationPermission[]));
  }

  // ── Chargement combiné ──────────────────────────────────────────────────────────

  private messageErreur(err: HttpErrorResponse): string {
    return err.error?.message ?? 'Action impossible pour le moment.';
  }

  private charger(): void {
    this.chargement.set(true);
    forkJoin({
      finance: this.session.getUtilisateurs().pipe(catchError(() => of(null))),
      administration: this.administrationUsersService.getUtilisateurs().pipe(catchError(() => of(null))),
    }).subscribe(({ finance, administration }) => {
      this.accesFinanceDisponible.set(finance !== null);
      this.accesAdministrationDisponible.set(administration !== null);
      // Le filtre par rôle n'a de sens que si roleOperationnel est renseigné (domaine
      // Administration) — sans lui, tout vaut '' et un filtre déjà sélectionné
      // laisserait la liste coincée à vide (voir le select masqué dans le template).
      if (administration === null) this.filtreRole.set('');

      const map = new Map<string, UtilisateurCombine>();
      (administration ?? []).forEach((u) => {
        map.set(u.idUtilisateur, {
          idUtilisateur: u.idUtilisateur,
          identifiants: u.identifiants,
          roleOperationnel: u.role,
          finance: null,
          administration: u,
        });
      });
      (finance ?? []).forEach((u) => {
        const existant = map.get(u.idUtilisateur);
        if (existant) {
          existant.finance = u;
        } else {
          map.set(u.idUtilisateur, {
            idUtilisateur: u.idUtilisateur,
            identifiants: u.identifiants,
            roleOperationnel: '',
            finance: u,
            administration: null,
          });
        }
      });

      const liste = [...map.values()].sort((a, b) => a.identifiants.localeCompare(b.identifiants));
      this.utilisateurs.set(liste);
      this.chargement.set(false);

      if (!this.selectionId() && liste.length > 0) {
        this.selectionId.set(liste[0].idUtilisateur);
      }
      const selectionne = liste.find((u) => u.idUtilisateur === this.selectionId());
      if (selectionne) {
        this.brouillonFinance.set(new Set(selectionne.finance?.permissions ?? []));
        this.brouillonAdministration.set(new Set((selectionne.administration?.permissions ?? []) as AdministrationPermission[]));
      }
    });
  }
}
