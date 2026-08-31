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

// F11 admin — RBAC financier réel (onglets + droits), chantier "Gestion des accès".
// Réservé aux détenteurs de la clé 'roles.view' (voir financial-dashboard.routes.ts) ; les
// mutations ('roles.manage') sont re-vérifiées côté serveur avec plafond de délégation
// (FinanceUsersController._resoudreAutoriteDroits) — ce composant ne fait jamais confiance
// à sa propre UI comme seule barrière.
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

  // Brouillon local des sections "Accès aux onglets" / "Droits financiers" — ces deux
  // sections ne s'appliquent qu'au clic sur "Enregistrer" (setPermissions remplace la
  // liste complète : l'appliquer à chaque case cochée écraserait la liste à chaque clic
  // et empêcherait le bouton "appliquer le préréglage du rôle" ci-dessous). Les sections
  // "Rôle attribué" et "Accès au module financier" restent instantanées, comme avant.
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

  // droitsFinance est un coupe-circuit absolu (RG8, même règle que requireFinancePermission
  // côté serveur) : cocher un onglet/droit pendant qu'il est désactivé n'aurait aucun effet
  // réel, donc les sections 3/4 sont désactivées tant que la section 2 n'est pas activée —
  // pour ne jamais donner l'impression qu'un droit est accordé alors qu'il ne l'est pas.
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
    // Bloque le changement de sélection tant que le brouillon n'est ni enregistré ni
    // annulé — le bandeau "modifications non enregistrées" reste affiché à la place.
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

  // ── Sections 3/4 : brouillon des droits détaillés ───────────────────────────────

  // Implicite et non décochable pour un Administrateur (anti-verrouillage de l'écran
  // d'administration lui-même) — voir PERMISSIONS_GOUVERNANCE. Combiné avec la valeur du
  // brouillon dans estCoche() ci-dessous : toujours affiché coché pour un administrateur,
  // même si les données stockées étaient incomplètes.
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

  // Le backend renvoie déjà un message FR exploitable tel quel (403 auto-modification,
  // plafond de délégation dépassé, clé de gouvernance réservée à un administrateur, etc.)
  // — voir FinanceUsersController. Filet de secours seulement si la réponse est absente
  // ou dans un format inattendu (ex. coupure réseau).
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
