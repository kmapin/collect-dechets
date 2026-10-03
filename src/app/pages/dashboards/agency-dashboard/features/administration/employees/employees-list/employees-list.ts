import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { EmployeeAdministrationService } from '../employee-administration.service';
import { Employee, EmployeeRole } from '../employee.model';
import { EmployeeForm } from '../employee-form/employee-form';
import { AuthService } from '../../../../../../../services/auth.service';
import { ConfirmDialogService } from '../../../../../../../services/confirm-dialog.service';
import { NotificationService } from '../../../../../../../services/notification.service';
import { SharedService } from '../../../../../../../services/shared-service';
import { aLaPermissionAdministration } from '../../models/administration-permission';

type EtatChargement = 'loading' | 'loaded' | 'error';

@Component({
  selector: 'app-employees-list',
  standalone: true,
  imports: [CommonModule, FormsModule, EmployeeForm],
  templateUrl: './employees-list.html',
  styleUrl: './employees-list.scss',
})
export class EmployeesList {
  readonly employes = signal<Employee[]>([]);
  readonly etat = signal<EtatChargement>('loading');
  readonly messageErreur = signal('');

  readonly terme = signal('');
  readonly filtreRole = signal<EmployeeRole | ''>('');
  readonly page = signal(1);
  readonly limit = signal(10);
  readonly total = signal(0);
  readonly totalPages = signal(1);

  readonly afficherFormulaire = signal(false);
  readonly employeEnEdition = signal<Employee | null>(null);

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
  ) {
    const currentUser = this.authService.getCurrentUser();
    this.peutCreer = aLaPermissionAdministration(currentUser as any, 'employees.create');
    this.peutModifier = aLaPermissionAdministration(currentUser as any, 'employees.update');
    this.peutSupprimer = aLaPermissionAdministration(currentUser as any, 'employees.delete');

    this.charger();
  }

  charger(): void {
    this.etat.set('loading');
    this.employeeAdministrationService
      .list({ term: this.terme(), role: this.filtreRole(), page: this.page(), limit: this.limit() })
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
