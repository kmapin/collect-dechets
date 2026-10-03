import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AgencyService } from '../../../../../../services/agency.service';
import { NotificationService } from '../../../../../../services/notification.service';
import {
  FinancePermission,
  GROUPES_DROITS_FINANCIERS,
  PERMISSIONS_GOUVERNANCE as FINANCE_PERMISSIONS_GOUVERNANCE,
  PERMISSIONS_ONGLETS,
  PRESETS_ROLE,
  Role,
} from '../../../../financial-dashboard/models';
import { FINANCIAL_ROLE_FRONTEND_VERS_BACKEND, ManagerRoleAccess } from '../shared/manager-role-access.model';
import { ManagerRoleAccessListService } from '../shared/manager-role-access-list.service';

const LABEL_ROLE_FINANCE: Record<Role, string> = {
  [Role.COMPTABLE]: 'Comptable',
  [Role.MANAGER_TERRAIN]: 'Manager terrain',
  [Role.ADMINISTRATEUR]: 'Administrateur',
};

/**
 * Onglet "Droits financiers" du dashboard super_admin — pendant plateforme entière des
 * sections 1-4 de agency-dashboard/features/administration/roles-access/roles-access.ts
 * (Rôle attribué, Accès au module financier, Accès aux onglets, Droits financiers
 * détaillés), personnel = managers de toutes agences. Séparé de l'onglet Permissions
 * Administration (même scission que côté agence : roles-access vs administration-
 * permissions) — chaque onglet ne touche que son propre domaine, même liste source
 * partagée (ManagerRoleAccessListService) pour ne pas dupliquer le chargement.
 */
@Component({
  selector: 'app-admin-finance-access',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-finance-access.html',
  styleUrl: '../admin-roles-access-shared.scss',
})
export class AdminFinanceAccess {
  private readonly listeService = inject(ManagerRoleAccessListService);
  private readonly agencyService = inject(AgencyService);
  private readonly notification = inject(NotificationService);

  readonly labelRoleFinance = LABEL_ROLE_FINANCE;
  readonly rolesFinance = Object.values(Role);
  readonly permissionsOnglets = PERMISSIONS_ONGLETS;
  readonly groupesDroitsFinanciers = GROUPES_DROITS_FINANCIERS;

  readonly utilisateurs = signal<ManagerRoleAccess[]>([]);
  readonly chargement = signal(true);
  readonly recherche = signal('');
  private readonly selectionId = signal<string | null>(null);

  private readonly brouillon = signal<Set<FinancePermission>>(new Set());
  readonly enregistrementEnCours = signal(false);

  constructor() {
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

  readonly droitsFinanceActifs = computed(() => this.utilisateurSelectionne()?.droitsFinance ?? false);

  readonly modifie = computed(() => {
    const u = this.utilisateurSelectionne();
    if (!u) return false;
    const projet = this.brouillon();
    if (u.financePermissions.length !== projet.size) return true;
    return u.financePermissions.some((cle) => !projet.has(cle));
  });

  selectionner(u: ManagerRoleAccess): void {
    if (this.modifie()) return;
    this.selectionId.set(u.idUtilisateur);
    this.brouillon.set(new Set(u.financePermissions));
  }

  initiales(identifiants: string): string {
    return identifiants
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((mot) => mot.charAt(0).toUpperCase())
      .join('');
  }

  // role=null retire le rôle financier (et donc tous les droits qui en dépendent) — même
  // capacité que le select rapide "Aucun rôle financier" du tableau Utilisateurs
  // (admin-dashboard.ts::assignFinancialRole), qui manquait à cet écran plus détaillé :
  // seuls Comptable/Manager terrain/Administrateur étaient sélectionnables, jamais "Aucun".
  changerRole(u: ManagerRoleAccess, role: Role | null): void {
    const financialRole = role ? FINANCIAL_ROLE_FRONTEND_VERS_BACKEND[role] : null;
    this.agencyService.setEmployeeFinancialRole$(u.idUtilisateur, financialRole, u.agencyId).subscribe({
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

  basculerDroitsFinance(u: ManagerRoleAccess): void {
    this.agencyService.toggleEmployeeDroitsFinance$(u.idUtilisateur, u.agencyId).subscribe({
      next: (maj) => {
        this.notification.showSuccess(
          'Droits financiers mis à jour',
          maj?.droitsFinance ? 'Accès au module financier activé.' : 'Accès au module financier désactivé.',
        );
        this.charger();
      },
      error: (err: HttpErrorResponse) => this.notification.showError('Droits non mis à jour', this.messageErreur(err)),
    });
  }

  estImplicite(cle: FinancePermission): boolean {
    const u = this.utilisateurSelectionne();
    return !!u && u.financialRole === Role.ADMINISTRATEUR && FINANCE_PERMISSIONS_GOUVERNANCE.includes(cle);
  }

  estCoche(cle: FinancePermission): boolean {
    return this.estImplicite(cle) || this.brouillon().has(cle);
  }

  basculerPermission(cle: FinancePermission): void {
    if (this.estImplicite(cle) || !this.droitsFinanceActifs()) return;
    const projet = new Set(this.brouillon());
    if (projet.has(cle)) projet.delete(cle);
    else projet.add(cle);
    this.brouillon.set(projet);
  }

  appliquerPreregleRole(): void {
    const u = this.utilisateurSelectionne();
    if (!u || !this.droitsFinanceActifs() || !u.financialRole) return;
    this.brouillon.set(new Set(PRESETS_ROLE[u.financialRole]));
  }

  enregistrer(): void {
    const u = this.utilisateurSelectionne();
    if (!u) return;
    this.enregistrementEnCours.set(true);
    this.agencyService.setEmployeeFinancePermissions$(u.idUtilisateur, [...this.brouillon()], u.agencyId).subscribe({
      next: () => {
        this.enregistrementEnCours.set(false);
        this.notification.showSuccess('Droits mis à jour', 'Les accès financiers de cet utilisateur ont été enregistrés.');
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
    if (u) this.brouillon.set(new Set(u.financePermissions));
  }

  private messageErreur(err: HttpErrorResponse): string {
    return (err.error as any)?.message ?? 'Action impossible pour le moment.';
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
          this.brouillon.set(new Set(selectionne.financePermissions));
        }
      },
      error: () => {
        this.chargement.set(false);
      },
    });
  }
}
