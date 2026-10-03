import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { administrationAccessGuard } from './administration-access.guard';
import { AuthService } from '../../../../../../services/auth.service';

describe('administrationAccessGuard (navigation directe / redirection si non autorisé)', () => {
  let authServiceSpy: { getCurrentUser: jasmine.Spy };
  let routerSpy: { navigate: jasmine.Spy };

  function configurer(user: any): void {
    authServiceSpy = { getCurrentUser: jasmine.createSpy('getCurrentUser').and.returnValue(user) };
    routerSpy = { navigate: jasmine.createSpy('navigate') };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });
  }

  function executerGuard(): boolean {
    return TestBed.runInInjectionContext(() => administrationAccessGuard({} as any, {} as any)) as boolean;
  }

  it("utilisateur non authentifié (null) -> refusé, redirection", () => {
    configurer(null);
    expect(executerGuard()).toBe(false);
    expect(routerSpy.navigate).toHaveBeenCalled();
  });

  it("utilisateur sans aucune permission d'administration -> refusé, redirection vers son dashboard (test d'un utilisateur sans permission)", () => {
    configurer({ role: 'client', administrationPermissions: [] });
    expect(executerGuard()).toBe(false);
    expect(routerSpy.navigate).toHaveBeenCalled();
  });

  it("manager détenant au moins une permission d'administration -> autorisé (test d'un manager avec permissions)", () => {
    configurer({ role: 'manager', administrationPermissions: ['employees.view'] });
    expect(executerGuard()).toBe(true);
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('super_admin -> toujours autorisé même sans permissions stockées', () => {
    configurer({ role: 'super_admin', administrationPermissions: [] });
    expect(executerGuard()).toBe(true);
  });

  it("manager d'une autre agence détenant des permissions reste autorisé au niveau du shell (le scoping d'agence est backend, pas un rôle de ce guard — voir test d'accès backend)", () => {
    configurer({ role: 'manager', agencyId: 'agence-B', administrationPermissions: ['roles.view'] });
    expect(executerGuard()).toBe(true);
  });

  it("manager détenant roles.view côté FINANCE uniquement (aucune permission administration) -> autorisé (régression testée : ne casse pas le fonctionnement actuel des permissions financières)", () => {
    configurer({ role: 'manager', administrationPermissions: [], droitsFinance: true, financePermissions: ['roles.view'] });
    expect(executerGuard()).toBe(true);
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('droitsFinance=false désactive le bypass finance même si roles.view est présent dans financePermissions -> refusé', () => {
    configurer({ role: 'manager', administrationPermissions: [], droitsFinance: false, financePermissions: ['roles.view'] });
    expect(executerGuard()).toBe(false);
  });
});
