import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { EmployeeAdministrationService } from '../employee-administration.service';
import { Employee, EmployeeRole, EmployeeStatus } from '../employee.model';
import { EmployeeForm } from '../employee-form/employee-form';
import { AuthService } from '../../../../../../../services/auth.service';
import { ConfirmDialogService } from '../../../../../../../services/confirm-dialog.service';
import { NotificationService } from '../../../../../../../services/notification.service';
import { SharedService } from '../../../../../../../services/shared-service';
import { TerritoryHttpService } from '../../../../../../../services/territory-http.service';
import { AgencyImportService } from '../../../../../../../services/agency-import.service';
import { ExcelImportComponent } from '../../../../../../../components/excel-import/excel-import.component';
import { TerritorySelectComponent, TerritoryOption, toTerritoryOptionsById } from '../../../../../../../shared/territory-select/territory-select';
import { aLaPermissionAdministration } from '../../models/administration-permission';
import { ResetFiltersButtonComponent } from '../../../../../financial-dashboard/shared/filters/reset-filters-button/reset-filters-button.component';
import { hasNonDefaultFilters, loadFilters, saveFilters } from '../../../../../../../shared/filter-persistence.util';
import { ScrollLockDirective } from '../../../../../../../shared/scroll-lock.directive';

type EtatChargement = 'loading' | 'loaded' | 'error';
type VueMode = 'card' | 'table';

const FILTERS_KEY = 'agencyAdministration.employees';
interface EmployeesFilters {
  terme: string;
  filtreRole: EmployeeRole | '';
  filtreStatut: EmployeeStatus | '';
  filtreVille: string;
  filtreArrondissement: string;
  filtreSecteur: string;
  filtreQuartier: string;
}
const FILTERS_DEFAULTS: EmployeesFilters = {
  terme: '', filtreRole: '', filtreStatut: '',
  filtreVille: '', filtreArrondissement: '', filtreSecteur: '', filtreQuartier: '',
};

/**
 * Parité avec l'ancien écran "Gestion des Employés" du agency-dashboard monolithique
 * (retiré en Phase F de ce module, voir agency-dashboard.ts/html avant le commit
 * 9e0ab2b) : vue Cartes/Tableau, recherche repliable, filtres géographiques en cascade
 * (Ville -> Arrondissement -> Secteur -> Quartier, via TerritoryHttpService — même
 * service que quartiers-management.ts/zone-selector), filtre Statut, téléchargement du
 * modèle Excel et import Excel (ExcelImportComponent/AgencyImportService, génériques et
 * déjà backend-complets pour 'employees', voir routes/agencyImportRoute.js côté
 * serveur). Contrairement à l'ancien écran (filtrage 100% client sur une liste chargée
 * en une fois), les filtres géographiques/statut sont ici envoyés au backend
 * (services/employeesAdministration.js::list) pour rester corrects avec la pagination
 * serveur déjà en place — pas de régression de correction pour un gain de parité
 * cosmétique.
 */
@Component({
  selector: 'app-employees-list',
  standalone: true,
  imports: [CommonModule, FormsModule, EmployeeForm, ExcelImportComponent, TerritorySelectComponent, ResetFiltersButtonComponent, ScrollLockDirective],
  templateUrl: './employees-list.html',
  styleUrl: './employees-list.scss',
})
export class EmployeesList {
  readonly employes = signal<Employee[]>([]);
  readonly etat = signal<EtatChargement>('loading');
  readonly messageErreur = signal('');

  private readonly persistedFiltres = loadFilters(FILTERS_KEY, FILTERS_DEFAULTS);
  readonly terme = signal(this.persistedFiltres.terme);
  readonly filtreRole = signal<EmployeeRole | ''>(this.persistedFiltres.filtreRole);
  readonly filtreStatut = signal<EmployeeStatus | ''>(this.persistedFiltres.filtreStatut);
  readonly filtresNonDefaut = computed(() => hasNonDefaultFilters({
    terme: this.terme(), filtreRole: this.filtreRole(), filtreStatut: this.filtreStatut(),
    filtreVille: this.filtreVille(), filtreArrondissement: this.filtreArrondissement(),
    filtreSecteur: this.filtreSecteur(), filtreQuartier: this.filtreQuartier(),
  }, FILTERS_DEFAULTS));
  readonly page = signal(1);
  readonly limit = signal(10);
  readonly total = signal(0);
  readonly totalPages = signal(1);

  readonly vueMode = signal<VueMode>('table');
  readonly afficherFiltres = signal(true);

  // Filtres géographiques en cascade — les SIGNALS ci-dessous stockent l'ID Territory
  // (nécessaire pour enchaîner getArrondissementsByCity(id) etc., voir quartiers-
  // management.ts, même service). Le backend, lui, filtre sur address.city/
  // arrondissement/sector/neighborhood — des chaînes LIBRES sur User (jamais une
  // référence vers les collections Territory) — donc on résout l'id vers son nom
  // (resoudreNomParId ci-dessous) juste avant d'appeler charger(), jamais en stockant
  // le nom directement dans ces signals.
  readonly filtreVille = signal(this.persistedFiltres.filtreVille);
  readonly filtreArrondissement = signal(this.persistedFiltres.filtreArrondissement);
  readonly filtreSecteur = signal(this.persistedFiltres.filtreSecteur);
  readonly filtreQuartier = signal(this.persistedFiltres.filtreQuartier);

  readonly villesDisponibles = signal<TerritoryOption[]>([]);
  readonly arrondissementsDisponibles = signal<TerritoryOption[]>([]);
  readonly secteursDisponibles = signal<TerritoryOption[]>([]);
  readonly quartiersDisponibles = signal<TerritoryOption[]>([]);

  readonly afficherFormulaire = signal(false);
  readonly employeEnEdition = signal<Employee | null>(null);
  readonly afficherImportExcel = signal(false);

  // Lu une fois à la construction (snapshot du token courant, pas un flux réactif) —
  // calculé APRÈS l'affectation des propriétés de paramètres du constructeur, jamais en
  // initialiseur de champ (this.authService y serait encore undefined, les
  // initialiseurs de champs s'exécutant avant le corps du constructeur).
  readonly peutCreer: boolean;
  readonly peutModifier: boolean;
  readonly peutSupprimer: boolean;

  constructor(
    private employeeAdministrationService: EmployeeAdministrationService,
    private authService: AuthService,
    private confirmDialog: ConfirmDialogService,
    private notification: NotificationService,
    private sharedService: SharedService,
    private territoryService: TerritoryHttpService,
    private agencyImportService: AgencyImportService,
  ) {
    const currentUser = this.authService.getCurrentUser();
    this.peutCreer = aLaPermissionAdministration(currentUser as any, 'employees.create');
    this.peutModifier = aLaPermissionAdministration(currentUser as any, 'employees.update');
    this.peutSupprimer = aLaPermissionAdministration(currentUser as any, 'employees.delete');

    this.charger();
    this.chargerVilles();
  }

  /** Résout un id Territory sélectionné vers son NOM (label de l'option correspondante)
   * — c'est le nom, jamais l'id, qui est envoyé au backend (voir commentaire sur les
   * signals filtreVille/etc. plus haut). Chaîne vide si rien n'est sélectionné ou si
   * l'id ne correspond à aucune option chargée. */
  private resoudreNomParId(id: string, options: TerritoryOption[]): string {
    if (!id) return '';
    return options.find((o) => o.value === id)?.label ?? '';
  }

  charger(): void {
    this.etat.set('loading');
    saveFilters(FILTERS_KEY, {
      terme: this.terme(), filtreRole: this.filtreRole(), filtreStatut: this.filtreStatut(),
      filtreVille: this.filtreVille(), filtreArrondissement: this.filtreArrondissement(),
      filtreSecteur: this.filtreSecteur(), filtreQuartier: this.filtreQuartier(),
    });
    this.employeeAdministrationService
      .list({
        term: this.terme(),
        role: this.filtreRole(),
        city: this.resoudreNomParId(this.filtreVille(), this.villesDisponibles()),
        arrondissement: this.resoudreNomParId(this.filtreArrondissement(), this.arrondissementsDisponibles()),
        sector: this.resoudreNomParId(this.filtreSecteur(), this.secteursDisponibles()),
        neighborhood: this.resoudreNomParId(this.filtreQuartier(), this.quartiersDisponibles()),
        status: this.filtreStatut(),
        page: this.page(),
        limit: this.limit(),
      })
      .subscribe({
        next: (resultat) => {
          this.employes.set(resultat.data);
          this.total.set(resultat.total);
          this.totalPages.set(resultat.totalPages || 1);
          this.etat.set('loaded');
        },
        error: (err: HttpErrorResponse) => {
          this.etat.set('error');
          this.messageErreur.set(err.error?.message ?? 'Impossible de charger les employés pour le moment.');
        },
      });
  }

  rechercher(): void {
    this.page.set(1);
    this.charger();
  }

  changerFiltreRole(role: EmployeeRole | ''): void {
    this.filtreRole.set(role);
    this.page.set(1);
    this.charger();
  }

  changerFiltreStatut(statut: EmployeeStatus | ''): void {
    this.filtreStatut.set(statut);
    this.page.set(1);
    this.charger();
  }

  basculerVue(mode: VueMode): void {
    this.vueMode.set(mode);
  }

  basculerFiltres(): void {
    this.afficherFiltres.set(!this.afficherFiltres());
  }

  // ── Filtres géographiques en cascade ────────────────────────────────────────────
  // Même principe que l'ancien onEmployeeCityFilterChange/onEmployeeArrondissementFilterChange/
  // onEmployeeSectorFilterChange (agency-dashboard.ts, avant Phase F) : choisir un niveau
  // réinitialise tous les niveaux enfants et recharge leurs options, jamais leur valeur.

  private chargerVilles(): void {
    this.territoryService.getAllCities().subscribe({
      next: (villes) => {
        this.villesDisponibles.set(toTerritoryOptionsById(villes));
        this.restaurerCascadeGeo();
      },
      error: () => this.villesDisponibles.set([]),
    });
  }

  /** Recharge les options Arrondissement/Secteur/Quartier correspondant à des filtres
   * géographiques restaurés depuis sessionStorage (voir FILTERS_KEY/persistedFiltres) —
   * au premier chargement, ces listes d'options sont vides tant que ce niveau parent n'a
   * jamais été sélectionné interactivement (seul changerFiltreVille/etc. les peuple
   * normalement). Reconstitue la cascade sans modifier les valeurs déjà restaurées, puis
   * relance charger() pour que les noms résolus (resoudreNomParId) soient enfin corrects. */
  private restaurerCascadeGeo(): void {
    if (!this.filtreVille()) return;
    this.territoryService.getArrondissementsByCity(this.filtreVille()).subscribe({
      next: (arr) => {
        this.arrondissementsDisponibles.set(toTerritoryOptionsById(arr));
        if (!this.filtreArrondissement()) {
          this.charger();
          return;
        }
        this.territoryService.getSectorsByArrondissement(this.filtreArrondissement()).subscribe({
          next: (secteurs) => {
            this.secteursDisponibles.set(toTerritoryOptionsById(secteurs));
            if (!this.filtreSecteur()) {
              this.charger();
              return;
            }
            this.territoryService.getNeighborhoodsBySector(this.filtreSecteur()).subscribe({
              next: (quartiers) => {
                this.quartiersDisponibles.set(toTerritoryOptionsById(quartiers));
                this.charger();
              },
              error: () => { this.quartiersDisponibles.set([]); this.charger(); },
            });
          },
          error: () => { this.secteursDisponibles.set([]); this.charger(); },
        });
      },
      error: () => { this.arrondissementsDisponibles.set([]); this.charger(); },
    });
  }

  changerFiltreVille(ville: string | number | null): void {
    this.filtreVille.set((ville as string) || '');
    this.filtreArrondissement.set('');
    this.filtreSecteur.set('');
    this.filtreQuartier.set('');
    this.arrondissementsDisponibles.set([]);
    this.secteursDisponibles.set([]);
    this.quartiersDisponibles.set([]);

    if (this.filtreVille()) {
      this.territoryService.getArrondissementsByCity(this.filtreVille()).subscribe({
        next: (arr) => this.arrondissementsDisponibles.set(toTerritoryOptionsById(arr)),
        error: () => this.arrondissementsDisponibles.set([]),
      });
    }
    this.page.set(1);
    this.charger();
  }

  changerFiltreArrondissement(arrondissement: string | number | null): void {
    this.filtreArrondissement.set((arrondissement as string) || '');
    this.filtreSecteur.set('');
    this.filtreQuartier.set('');
    this.secteursDisponibles.set([]);
    this.quartiersDisponibles.set([]);

    if (this.filtreArrondissement()) {
      this.territoryService.getSectorsByArrondissement(this.filtreArrondissement()).subscribe({
        next: (secteurs) => this.secteursDisponibles.set(toTerritoryOptionsById(secteurs)),
        error: () => this.secteursDisponibles.set([]),
      });
    }
    this.page.set(1);
    this.charger();
  }

  changerFiltreSecteur(secteur: string | number | null): void {
    this.filtreSecteur.set((secteur as string) || '');
    this.filtreQuartier.set('');
    this.quartiersDisponibles.set([]);

    if (this.filtreSecteur()) {
      this.territoryService.getNeighborhoodsBySector(this.filtreSecteur()).subscribe({
        next: (quartiers) => this.quartiersDisponibles.set(toTerritoryOptionsById(quartiers)),
        error: () => this.quartiersDisponibles.set([]),
      });
    }
    this.page.set(1);
    this.charger();
  }

  changerFiltreQuartier(quartier: string | number | null): void {
    this.filtreQuartier.set((quartier as string) || '');
    this.page.set(1);
    this.charger();
  }

  reinitialiserFiltres(): void {
    this.terme.set('');
    this.filtreRole.set('');
    this.filtreStatut.set('');
    this.filtreVille.set('');
    this.filtreArrondissement.set('');
    this.filtreSecteur.set('');
    this.filtreQuartier.set('');
    this.arrondissementsDisponibles.set([]);
    this.secteursDisponibles.set([]);
    this.quartiersDisponibles.set([]);
    this.page.set(1);
    this.charger();
  }

  // ── Export du modèle / import Excel ─────────────────────────────────────────────
  // AgencyImportService/ExcelImportComponent sont génériques (type: 'employees'), déjà
  // utilisés tels quels par la liste Clients du dashboard agence — réutilisés ici sans
  // duplication, le backend (routes/agencyImportRoute.js) gère déjà ce type.

  telechargerModele(): void {
    this.agencyImportService.downloadTemplate$('employees').subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const lien = document.createElement('a');
        lien.href = url;
        lien.download = 'employes_modele.xlsx';
        lien.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.notification.showError('Erreur', 'Impossible de télécharger le modèle Excel.');
      },
    });
  }

  ouvrirImportExcel(): void {
    this.afficherImportExcel.set(true);
  }

  fermerImportExcel(): void {
    this.afficherImportExcel.set(false);
  }

  surImportReussi(): void {
    this.afficherImportExcel.set(false);
    this.page.set(1);
    this.charger();
  }

  // Pagination — même modèle que la liste Clients du dashboard agence
  // (agency-dashboard.ts::goToClientPage/nextClientPage/previousClientPage/
  // getClientPaginationPages/getClientEndItemNumber), reproduit ici pour le même rendu.
  changerLimit(nouvelleTaille: number): void {
    this.limit.set(nouvelleTaille);
    this.page.set(1);
    this.charger();
  }

  allerPage(p: number): void {
    if (p >= 1 && p <= this.totalPages() && p !== this.page()) {
      this.page.set(p);
      this.charger();
    }
  }

  pageePrecedente(): void {
    if (this.page() <= 1) return;
    this.page.set(this.page() - 1);
    this.charger();
  }

  pageSuivante(): void {
    if (this.page() >= this.totalPages()) return;
    this.page.set(this.page() + 1);
    this.charger();
  }

  numerosDePages(): number[] {
    const maxAffiches = 5;
    const moitie = Math.floor(maxAffiches / 2);
    let debut = Math.max(1, this.page() - moitie);
    const fin = Math.min(this.totalPages(), debut + maxAffiches - 1);
    if (fin - debut + 1 < maxAffiches) {
      debut = Math.max(1, fin - maxAffiches + 1);
    }
    const pages: number[] = [];
    for (let i = debut; i <= fin; i++) pages.push(i);
    return pages;
  }

  finItem(): number {
    return Math.min(this.page() * this.limit(), this.total());
  }

  debutItem(): number {
    return this.total() === 0 ? 0 : (this.page() - 1) * this.limit() + 1;
  }

  ouvrirCreation(): void {
    this.employeEnEdition.set(null);
    this.afficherFormulaire.set(true);
  }

  ouvrirEdition(employe: Employee): void {
    this.employeEnEdition.set(employe);
    this.afficherFormulaire.set(true);
  }

  fermerFormulaire(): void {
    this.afficherFormulaire.set(false);
    this.employeEnEdition.set(null);
  }

  surEnregistrement(): void {
    this.fermerFormulaire();
    this.charger();
  }

  async supprimer(employe: Employee): Promise<void> {
    const confirme = await this.confirmDialog.confirm({
      title: 'Supprimer cet employé ?',
      message: `${employe.firstName} ${employe.lastName} n'aura plus accès à l'agence. Cette action peut être annulée par un administrateur si besoin.`,
      variant: 'danger',
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler',
    });
    if (!confirme) return;

    this.employeeAdministrationService.remove(employe._id).subscribe({
      next: () => {
        this.notification.showSuccess('Employé supprimé', `${employe.firstName} ${employe.lastName} a été supprimé.`);
        this.charger();
      },
      error: (err: HttpErrorResponse) => {
        this.notification.showError('Suppression impossible', err.error?.message ?? 'Une erreur est survenue.');
      },
    });
  }

  // Avatar (initiales + couleur) — réutilise SharedService, déjà utilisé par le même
  // design sur la liste Clients (agency-dashboard.ts::getInitials/getRandomColor),
  // plutôt que de dupliquer la logique ici.
  initiales(employe: Employee): string {
    return this.sharedService.getInitials(`${employe.firstName} ${employe.lastName}`);
  }

  couleurAvatar(employe: Employee): string {
    return this.sharedService.getRandomColor(employe);
  }

  adresseLabel(employe: Employee): string {
    const { neighborhood, city } = employe.address || {};
    return [neighborhood, city].filter(Boolean).join(', ');
  }

  labelRole(role: EmployeeRole): string {
    return role === 'manager' ? 'Manager' : 'Collecteur';
  }

  labelStatut(status: Employee['status']): string {
    const map: Record<Employee['status'], string> = {
      active: 'Actif',
      inactive: 'Inactif',
      pending_activation: 'En attente',
    };
    return map[status] || status;
  }
}
