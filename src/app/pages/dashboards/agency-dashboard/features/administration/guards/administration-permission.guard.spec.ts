import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { administrationPermissionGuard } from './administration-permission.guard';
import { AuthService } from '../../../../../../services/auth.service';

describe('administrationPermissionGuard (filtrage par permission, par sous-page)', () => {
  let authServiceSpy: { getCurrentUser: jasmine.Spy };
  let routerSpy: { createUrlTree: jasmine.Spy };

  function configurer(user: any): void {
    authServiceSpy = { getCurrentUser: jasmine.createSpy('getCurrentUser').and.returnValue(user) };
    routerSpy = { createUrlTree: jasmine.createSpy('createUrlTree').and.callFake((commands: any[]) => commands as unknown as UrlTree) };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });
  }

  function executerGuard(permissionsRequises: string[]): boolean | UrlTree {
    const route = { data: { permissions: permissionsRequises } } as any;
    return TestBed.runInInjectionContext(() => administrationPermissionGuard(route, {} as any)) as boolean | UrlTree;
  }

  it("manager sans la permission 'roles.view' -> refusé (redirigé, pas simplement bloqué), test d'un utilisateur sans permission", () => {
    configurer({ role: 'manager', administrationPermissions: ['employees.view'] });
    const resultat = executerGuard(['roles.view']);
    expect(resultat).not.toBe(true);
    expect(routerSpy.createUrlTree).toHaveBeenCalled();
  });

  it("manager avec 'employees.view' -> autorisé sur la sous-page employees", () => {
    configurer({ role: 'manager', administrationPermissions: ['employees.view'] });
    expect(executerGuard(['employees.view'])).toBe(true);
  });

  it("redirige vers le premier onglet que l'utilisateur PEUT voir plutôt qu'un refus sec", () => {
    configurer({ role: 'manager', administrationPermissions: ['employees.view'] }); // pas roles.view
    executerGuard(['roles.view']);
    expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/dashboard/agency/administration/employees']);
  });

  it("aucune permission du tout -> redirige hors du module (vers /dashboard/agency)", () => {
    configurer({ role: 'client', administrationPermissions: [] });
    executerGuard(['employees.view']);
    expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/dashboard/agency']);
  });

  it('super_admin -> toujours autorisé sur toute sous-page', () => {
    configurer({ role: 'super_admin', administrationPermissions: [] });
    expect(executerGuard(['roles.manage'])).toBe(true);
  });
});
