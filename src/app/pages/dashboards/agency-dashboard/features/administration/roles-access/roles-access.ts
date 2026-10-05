import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NotificationService } from '../../../../../../services/notification.service';
import { AuthService } from '../../../../../../services/auth.service';
import { AdministrationUsersService } from '../services/administration-users.service';
import { SESSION_SERVICE } from '../../../../financial-dashboard/data-access/tokens/session.token';
import { ResetFiltersButtonComponent } from '../../../../financial-dashboard/shared/filters/reset-filters-button/reset-filters-button.component';
import {
  FinancePermission,
  GROUPES_DROITS_FINANCIERS,
  PERMISSIONS_GOUVERNANCE as FINANCE_PERMISSIONS_GOUVERNANCE,
  PERMISSIONS_ONGLETS,
  PRESETS_ROLE,
  Role,
  Utilisateur,
} from '../../../../financial-dashboard/models';
import { hasNonDefaultFilters, loadFilters, saveFilters } from '../../../../../../shared/filter-persistence.util';

const FILTERS_KEY = 'agencyAdministration.rolesAccess';
const FILTERS_DEFAULTS = { recherche: '', filtreRole: '' };

/**
 * Écran "Droits financiers" d'Administration — déplacé tel quel depuis financial-dashboard/
 * features/roles-admin/roles-admin.component.ts (mêmes méthodes/comportement, même service
 * SESSION_SERVICE — fourni en racine, voir main.ts — pour ne pas dupliquer le moteur de
 * permissions finance). Le volet Administration (jadis affiché en bas de cet écran) a sa
 * propre page dédiée depuis l'ajout de l'onglet "Permissions Administration" (voir
 * administration-permissions/) — l'afficher aussi ici aurait été redondant. Cet écran
 * continue toutefois d'interroger AdministrationUsersService.getUtilisateurs() pour une
 * seule raison : en dériver roleOperationnel (manager/collector), utile à l'avatar, au
 * badge de rôle et au filtre de la liste Personnel — jamais pour éditer des permissions
 * d'administration, qui n'existent plus sur cet écran.
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
   * pratique, les deux domaines listant le même personnel d'agence). Utilisé seulement
   * pour l'avatar/le badge/le filtre de la liste — plus aucune permission Administration
   * n'est éditée sur cet écran (voir administration-permissions/). */
  roleOperationnel: string;
  finance: Utilisateur | null;
}

@Component({
  selector: 'app-administration-roles-access',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ResetFiltersButtonComponent],
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

  readonly utilisateurs = signal<UtilisateurCombine[]>([]);
  readonly chargement = signal(true);
  private readonly persistedFiltres = loadFilters(FILTERS_KEY, FILTERS_DEFAULTS);
  readonly recherche = signal(this.persistedFiltres.recherche);
  readonly filtreRole = signal(this.persistedFiltres.filtreRole);
  readonly filtresNonDefaut = computed(() => hasNonDefaultFilters(
    { recherche: this.recherche(), filtreRole: this.filtreRole() }, FILTERS_DEFAULTS,
  ));
  private readonly selectionId = signal<string | null>(null);

  // Dépend des droits de L'APPELANT (pas de la personne sélectionnée) — un appel 403 sur
  // un domaine masque toute sa section plutôt que de faire échouer toute la page.
  readonly accesFinanceDisponible = signal(false);
  readonly accesAdministrationDisponible = signal(false);

  private readonly brouillonFinance = signal<Set<FinancePermission>>(new Set());
  readonly enregistrementFinanceEnCours = signal(false);

  constructor() {
    effect(() => saveFilters(FILTERS_KEY, { recherche: this.recherche(), filtreRole: this.filtreRole() }));
    this.charger();
  }

  resetFiltres(): void {
    this.recherche.set(FILTERS_DEFAULTS.recherche);
    this.filtreRole.set(FILTERS_DEFAULTS.filtreRole);
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

  selectionner(u: UtilisateurCombine): void {
    if (this.modifieFinance()) return;
    this.selectionId.set(u.idUtilisateur);
    this.brouillonFinance.set(new Set(u.finance?.permissions ?? []));
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

  // role=null retire le rôle financier (et donc tous les droits qui en dépendent) — même
  // capacité que l'écran "Droits financiers" du dashboard super_admin (voir
  // admin-finance-access.ts::changerRole), qui manquait ici : seuls Comptable/Manager
  // terrain/Administrateur étaient sélectionnables, jamais "Aucun".
  changerRoleFinance(u: UtilisateurCombine, role: Role | null): void {
    this.session.setFinancialRole(u.idUtilisateur, role).subscribe({
      next: () => {
        this.notification.showSuccess(
          'Rôle mis à jour',
          role ? `${u.identifiants} est maintenant ${this.labelRoleFinance[role]}.` : `Rôle financier retiré à ${u.identifiants}.`,
        );
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
      }
    });
  }
}
