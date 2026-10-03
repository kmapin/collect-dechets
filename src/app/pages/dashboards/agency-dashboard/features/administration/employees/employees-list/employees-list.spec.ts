import { of, throwError } from 'rxjs';
import { EmployeesList } from './employees-list';
import { EmployeeAdministrationService } from '../employee-administration.service';
import { AuthService } from '../../../../../../../services/auth.service';
import { ConfirmDialogService } from '../../../../../../../services/confirm-dialog.service';
import { NotificationService } from '../../../../../../../services/notification.service';
import { SharedService } from '../../../../../../../services/shared-service';
import { TerritoryHttpService } from '../../../../../../../services/territory-http.service';
import { AgencyImportService } from '../../../../../../../services/agency-import.service';

describe('EmployeesList', () => {
  let employeeServiceSpy: { list: jasmine.Spy; remove: jasmine.Spy };
  let authServiceSpy: { getCurrentUser: jasmine.Spy };
  let confirmDialogSpy: { confirm: jasmine.Spy };
  let notificationSpy: { showSuccess: jasmine.Spy; showError: jasmine.Spy };
  let sharedServiceSpy: { getInitials: jasmine.Spy; getRandomColor: jasmine.Spy };
  let territoryServiceSpy: jasmine.SpyObj<TerritoryHttpService>;
  let agencyImportServiceSpy: jasmine.SpyObj<AgencyImportService>;

  const RESULTAT_VIDE = { data: [], total: 0, page: 1, limit: 10, totalPages: 1 };

  function creerComposant(user: any): EmployeesList {
    employeeServiceSpy = {
      list: jasmine.createSpy('list').and.returnValue(of(RESULTAT_VIDE)),
      remove: jasmine.createSpy('remove').and.returnValue(of(undefined)),
    };
    authServiceSpy = { getCurrentUser: jasmine.createSpy('getCurrentUser').and.returnValue(user) };
    confirmDialogSpy = { confirm: jasmine.createSpy('confirm').and.returnValue(Promise.resolve(true)) };
    notificationSpy = { showSuccess: jasmine.createSpy('showSuccess'), showError: jasmine.createSpy('showError') };
    sharedServiceSpy = {
      getInitials: jasmine.createSpy('getInitials').and.returnValue('AB'),
      getRandomColor: jasmine.createSpy('getRandomColor').and.returnValue('#000000'),
    };
    territoryServiceSpy = jasmine.createSpyObj<TerritoryHttpService>('TerritoryHttpService', [
      'getAllCities', 'getArrondissementsByCity', 'getSectorsByArrondissement', 'getNeighborhoodsBySector',
    ]);
    territoryServiceSpy.getAllCities.and.returnValue(of([]));
    territoryServiceSpy.getArrondissementsByCity.and.returnValue(of([]));
    territoryServiceSpy.getSectorsByArrondissement.and.returnValue(of([]));
    territoryServiceSpy.getNeighborhoodsBySector.and.returnValue(of([]));
    agencyImportServiceSpy = jasmine.createSpyObj<AgencyImportService>('AgencyImportService', [
      'downloadTemplate$', 'preview$', 'confirm$', 'downloadErrorReport$',
    ]);

    return new EmployeesList(
      employeeServiceSpy as any,
      authServiceSpy as any,
      confirmDialogSpy as any,
      notificationSpy as any,
      sharedServiceSpy as any,
      territoryServiceSpy as any,
      agencyImportServiceSpy as any,
    );
  }

  it("charge la liste dès la construction (pas d'erreur 'authService is undefined' — régression du bug d'ordre d'initialisation des champs)", () => {
    const composant = creerComposant({ role: 'manager', administrationPermissions: ['employees.view'] });
    expect(employeeServiceSpy.list).toHaveBeenCalled();
    expect(composant.etat()).toBe('loaded');
  });

  it("masque le bouton Ajouter (peutCreer=false) si employees.create absent", () => {
    const composant = creerComposant({ role: 'manager', administrationPermissions: ['employees.view'] });
    expect(composant.peutCreer).toBe(false);
  });

  it('affiche le bouton Ajouter (peutCreer=true) si employees.create présent', () => {
    const composant = creerComposant({ role: 'manager', administrationPermissions: ['employees.view', 'employees.create'] });
    expect(composant.peutCreer).toBe(true);
  });

  it('peutModifier / peutSupprimer suivent exactement employees.update / employees.delete', () => {
    const composant = creerComposant({ role: 'manager', administrationPermissions: ['employees.update'] });
    expect(composant.peutModifier).toBe(true);
    expect(composant.peutSupprimer).toBe(false);
  });

  it('super_admin voit toujours les trois actions, quelles que soient ses permissions stockées', () => {
    const composant = creerComposant({ role: 'super_admin', administrationPermissions: [] });
    expect(composant.peutCreer).toBe(true);
    expect(composant.peutModifier).toBe(true);
    expect(composant.peutSupprimer).toBe(true);
  });

  it("gère une erreur de chargement -> état 'error', message exposé", () => {
    employeeServiceSpy = {
      list: jasmine.createSpy('list').and.returnValue(throwError(() => ({ error: { message: 'Permission requise' } }))),
      remove: jasmine.createSpy('remove'),
    };
    authServiceSpy = { getCurrentUser: jasmine.createSpy('getCurrentUser').and.returnValue({ role: 'manager', administrationPermissions: [] }) };
    confirmDialogSpy = { confirm: jasmine.createSpy('confirm') };
    notificationSpy = { showSuccess: jasmine.createSpy('showSuccess'), showError: jasmine.createSpy('showError') };
    sharedServiceSpy = {
      getInitials: jasmine.createSpy('getInitials').and.returnValue('AB'),
      getRandomColor: jasmine.createSpy('getRandomColor').and.returnValue('#000000'),
    };
    territoryServiceSpy = jasmine.createSpyObj<TerritoryHttpService>('TerritoryHttpService', ['getAllCities']);
    territoryServiceSpy.getAllCities.and.returnValue(of([]));
    agencyImportServiceSpy = jasmine.createSpyObj<AgencyImportService>('AgencyImportService', ['downloadTemplate$']);

    const composant = new EmployeesList(
      employeeServiceSpy as any,
      authServiceSpy as any,
      confirmDialogSpy as any,
      notificationSpy as any,
      sharedServiceSpy as any,
      territoryServiceSpy as any,
      agencyImportServiceSpy as any,
    );

    expect(composant.etat()).toBe('error');
    expect(composant.messageErreur()).toBe('Permission requise');
  });

  it("supprimer() : demande confirmation avant d'appeler remove()", async () => {
    const composant = creerComposant({ role: 'manager', administrationPermissions: ['employees.delete'] });
    const employe = { _id: 'e1', firstName: 'A', lastName: 'B', phone: '70000000', role: 'collector', status: 'active' } as any;

    await composant.supprimer(employe);

    expect(confirmDialogSpy.confirm).toHaveBeenCalled();
    expect(employeeServiceSpy.remove).toHaveBeenCalledWith('e1');
    expect(notificationSpy.showSuccess).toHaveBeenCalled();
  });

  it("supprimer() : n'appelle jamais remove() si l'utilisateur annule la confirmation", async () => {
    const composant = creerComposant({ role: 'manager', administrationPermissions: ['employees.delete'] });
    confirmDialogSpy.confirm.and.returnValue(Promise.resolve(false));
    const employe = { _id: 'e1', firstName: 'A', lastName: 'B', phone: '70000000', role: 'collector', status: 'active' } as any;

    await composant.supprimer(employe);

    expect(employeeServiceSpy.remove).not.toHaveBeenCalled();
  });

  // ── Parité avec l'ancien écran agency-dashboard (vue, filtres, import/export) ────────

  it('charge les villes disponibles dès la construction (pour le filtre géographique)', () => {
    territoryServiceSpy = jasmine.createSpyObj<TerritoryHttpService>('TerritoryHttpService', ['getAllCities']);
    territoryServiceSpy.getAllCities.and.returnValue(of([{ id: '1', name: 'Ouagadougou' } as any]));
    agencyImportServiceSpy = jasmine.createSpyObj<AgencyImportService>('AgencyImportService', ['downloadTemplate$']);
    employeeServiceSpy = { list: jasmine.createSpy('list').and.returnValue(of(RESULTAT_VIDE)), remove: jasmine.createSpy('remove') };
    authServiceSpy = { getCurrentUser: jasmine.createSpy('getCurrentUser').and.returnValue({ role: 'manager', administrationPermissions: [] }) };
    confirmDialogSpy = { confirm: jasmine.createSpy('confirm') };
    notificationSpy = { showSuccess: jasmine.createSpy('showSuccess'), showError: jasmine.createSpy('showError') };
    sharedServiceSpy = { getInitials: jasmine.createSpy('getInitials'), getRandomColor: jasmine.createSpy('getRandomColor') };

    const composant = new EmployeesList(
      employeeServiceSpy as any, authServiceSpy as any, confirmDialogSpy as any,
      notificationSpy as any, sharedServiceSpy as any, territoryServiceSpy as any, agencyImportServiceSpy as any,
    );

    expect(territoryServiceSpy.getAllCities).toHaveBeenCalled();
    expect(composant.villesDisponibles()).toEqual([{ value: '1', label: 'Ouagadougou' }]);
  });

  it('basculerVue() change le mode card/table', () => {
    const composant = creerComposant({ role: 'manager', administrationPermissions: [] });
    expect(composant.vueMode()).toBe('table');
    composant.basculerVue('card');
    expect(composant.vueMode()).toBe('card');
  });

  it('basculerFiltres() inverse la visibilité du panneau de filtres', () => {
    const composant = creerComposant({ role: 'manager', administrationPermissions: [] });
    expect(composant.afficherFiltres()).toBe(true);
    composant.basculerFiltres();
    expect(composant.afficherFiltres()).toBe(false);
  });

  it('changerFiltreVille() recharge la liste avec le NOM de la ville (résolu depuis son id) et réinitialise les filtres enfants + recharge les arrondissements', () => {
    const composant = creerComposant({ role: 'manager', administrationPermissions: [] });
    composant.villesDisponibles.set([{ value: 'city-1', label: 'Ouagadougou' }]);
    territoryServiceSpy.getArrondissementsByCity.and.returnValue(of([{ id: 'arr-1', name: 'A1' } as any]));
    employeeServiceSpy.list.calls.reset();

    composant.changerFiltreVille('city-1');

    expect(composant.filtreVille()).toBe('city-1');
    expect(territoryServiceSpy.getArrondissementsByCity).toHaveBeenCalledWith('city-1');
    expect(composant.arrondissementsDisponibles()).toEqual([{ value: 'arr-1', label: 'A1' }]);
    expect(employeeServiceSpy.list).toHaveBeenCalledWith(jasmine.objectContaining({ city: 'Ouagadougou', page: 1 }));
  });

  it('changerFiltreVille(null) vide le filtre et tous ses enfants', () => {
    const composant = creerComposant({ role: 'manager', administrationPermissions: [] });
    composant.villesDisponibles.set([{ value: 'city-1', label: 'Ouagadougou' }]);
    territoryServiceSpy.getArrondissementsByCity.and.returnValue(of([{ id: 'arr-1', name: 'A1' } as any]));
    composant.changerFiltreVille('city-1');
    composant.changerFiltreArrondissement('arr-1');

    composant.changerFiltreVille(null);

    expect(composant.filtreVille()).toBe('');
    expect(composant.filtreArrondissement()).toBe('');
    expect(composant.arrondissementsDisponibles()).toEqual([]);
  });

  it('changerFiltreStatut() recharge la liste avec le statut et revient à la page 1', () => {
    const composant = creerComposant({ role: 'manager', administrationPermissions: [] });
    employeeServiceSpy.list.calls.reset();

    composant.changerFiltreStatut('inactive');

    expect(composant.filtreStatut()).toBe('inactive');
    expect(employeeServiceSpy.list).toHaveBeenCalledWith(jasmine.objectContaining({ status: 'inactive', page: 1 }));
  });

  it('reinitialiserFiltres() remet tous les filtres à vide et recharge', () => {
    const composant = creerComposant({ role: 'manager', administrationPermissions: [] });
    composant.terme.set('awa');
    composant.changerFiltreRole('manager');
    composant.changerFiltreVille('Ouagadougou');
    employeeServiceSpy.list.calls.reset();

    composant.reinitialiserFiltres();

    expect(composant.terme()).toBe('');
    expect(composant.filtreRole()).toBe('');
    expect(composant.filtreVille()).toBe('');
    expect(employeeServiceSpy.list).toHaveBeenCalledWith(jasmine.objectContaining({ term: '', role: '', city: '' }));
  });

  it('telechargerModele() appelle AgencyImportService.downloadTemplate$ avec "employees"', () => {
    const composant = creerComposant({ role: 'manager', administrationPermissions: [] });
    agencyImportServiceSpy.downloadTemplate$.and.returnValue(of(new Blob()));

    composant.telechargerModele();

    expect(agencyImportServiceSpy.downloadTemplate$).toHaveBeenCalledWith('employees');
  });

  it('telechargerModele() affiche une erreur si le téléchargement échoue', () => {
    const composant = creerComposant({ role: 'manager', administrationPermissions: [] });
    agencyImportServiceSpy.downloadTemplate$.and.returnValue(throwError(() => new Error('boom')));

    composant.telechargerModele();

    expect(notificationSpy.showError).toHaveBeenCalled();
  });

  it('ouvrirImportExcel()/fermerImportExcel() pilotent la visibilité du drawer d\'import', () => {
    const composant = creerComposant({ role: 'manager', administrationPermissions: [] });
    expect(composant.afficherImportExcel()).toBe(false);
    composant.ouvrirImportExcel();
    expect(composant.afficherImportExcel()).toBe(true);
    composant.fermerImportExcel();
    expect(composant.afficherImportExcel()).toBe(false);
  });

  it('surImportReussi() ferme le drawer et recharge la liste (page 1)', () => {
    const composant = creerComposant({ role: 'manager', administrationPermissions: [] });
    composant.ouvrirImportExcel();
    employeeServiceSpy.list.calls.reset();

    composant.surImportReussi();

    expect(composant.afficherImportExcel()).toBe(false);
    expect(employeeServiceSpy.list).toHaveBeenCalledWith(jasmine.objectContaining({ page: 1 }));
  });
});
