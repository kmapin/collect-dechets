import { of, throwError } from 'rxjs';
import { EmployeesList } from './employees-list';
import { EmployeeAdministrationService } from '../employee-administration.service';
import { AuthService } from '../../../../../../../services/auth.service';
import { ConfirmDialogService } from '../../../../../../../services/confirm-dialog.service';
import { NotificationService } from '../../../../../../../services/notification.service';
import { SharedService } from '../../../../../../../services/shared-service';

describe('EmployeesList', () => {
  let employeeServiceSpy: { list: jasmine.Spy; remove: jasmine.Spy };
  let authServiceSpy: { getCurrentUser: jasmine.Spy };
  let confirmDialogSpy: { confirm: jasmine.Spy };
  let notificationSpy: { showSuccess: jasmine.Spy; showError: jasmine.Spy };
  let sharedServiceSpy: { getInitials: jasmine.Spy; getRandomColor: jasmine.Spy };

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

    return new EmployeesList(
      employeeServiceSpy as any,
      authServiceSpy as any,
      confirmDialogSpy as any,
      notificationSpy as any,
      sharedServiceSpy as any,
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

    const composant = new EmployeesList(
      employeeServiceSpy as any,
      authServiceSpy as any,
      confirmDialogSpy as any,
      notificationSpy as any,
      sharedServiceSpy as any,
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
});
