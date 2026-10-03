import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AdministrationLayout } from './administration-layout';
import { AuthService } from '../../../../../../services/auth.service';

describe('AdministrationLayout.navItems (navigation Administration — visibilité de Rôles & Accès)', () => {
  function construire(user: any): AdministrationLayout {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser'], {
      currentUser$: of(user),
    });
    authServiceSpy.getCurrentUser.and.returnValue(user);

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authServiceSpy }],
    });

    return TestBed.runInInjectionContext(() => new AdministrationLayout());
  }

  it("masque Rôles & Accès si l'utilisateur n'a ni roles.view administration ni roles.view finance", () => {
    const composant = construire({ role: 'manager', administrationPermissions: ['employees.view'], droitsFinance: false, financePermissions: [] });
    const routes = composant.navItems().map((i) => i.route);
    expect(routes).toContain('employees');
    expect(routes).not.toContain('roles-access');
  });

  it('affiche Rôles & Accès pour un titulaire de roles.view ADMINISTRATION', () => {
    const composant = construire({ role: 'manager', administrationPermissions: ['roles.view'], droitsFinance: false, financePermissions: [] });
    expect(composant.navItems().map((i) => i.route)).toContain('roles-access');
  });

  it('affiche Rôles & Accès pour un titulaire de roles.view FINANCE uniquement, sans aucune permission administration (pas de régression finance dans la navigation)', () => {
    const composant = construire({ role: 'manager', administrationPermissions: [], droitsFinance: true, financePermissions: ['roles.view'] });
    const routes = composant.navItems().map((i) => i.route);
    expect(routes).toContain('roles-access');
    expect(routes).not.toContain('employees');
  });
});
