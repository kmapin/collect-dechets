import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { rolesAccessGuard } from './roles-access.guard';
import { AuthService } from '../../../../../../services/auth.service';

describe('rolesAccessGuard (accès autorisé / refusé — deux domaines indépendants)', () => {
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
    return TestBed.runInInjectionContext(() => rolesAccessGuard({} as any, {} as any)) as boolean;
  }

  it("accès refusé : ni roles.view administration, ni roles.view finance -> false, redirection", () => {
    configurer({ role: 'manager', isOwnerAgency: false, administrationPermissions: [], droitsFinance: false, financePermissions: [] });
    expect(executerGuard()).toBe(false);
    expect(routerSpy.navigate).toHaveBeenCalled();
  });

  it('accès autorisé : roles.view ADMINISTRATION seul (aucun droit finance) -> true', () => {
    configurer({ role: 'manager', administrationPermissions: ['roles.view'], droitsFinance: false, financePermissions: [] });
    expect(executerGuard()).toBe(true);
  });

  it('accès autorisé : roles.view FINANCE seul (aucune permission administration) -> true (préserve le fonctionnement existant des permissions financières)', () => {
    configurer({ role: 'manager', administrationPermissions: [], droitsFinance: true, financePermissions: ['roles.view'] });
    expect(executerGuard()).toBe(true);
  });

  it('accès autorisé : les deux domaines accordés -> true', () => {
    configurer({ role: 'manager', administrationPermissions: ['roles.view'], droitsFinance: true, financePermissions: ['roles.view'] });
    expect(executerGuard()).toBe(true);
  });

  it('droitsFinance=false bloque roles.view finance même si la clé est présente dans financePermissions (même règle que aLaPermission existante)', () => {
    configurer({ role: 'manager', administrationPermissions: [], droitsFinance: false, financePermissions: ['roles.view'] });
    expect(executerGuard()).toBe(false);
  });

  it('super_admin -> toujours autorisé (bypass administration)', () => {
    configurer({ role: 'super_admin', administrationPermissions: [], droitsFinance: false, financePermissions: [] });
    expect(executerGuard()).toBe(true);
  });
});
