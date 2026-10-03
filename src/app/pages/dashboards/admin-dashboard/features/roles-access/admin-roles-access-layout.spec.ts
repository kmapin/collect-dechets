import { TestBed } from '@angular/core/testing';
import { AdminRolesAccessLayout } from './admin-roles-access-layout';
import { AuthService } from '../../../../../services/auth.service';

describe('AdminRolesAccessLayout (shell — breadcrumb + 2 onglets)', () => {
  function construire(): AdminRolesAccessLayout {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    authServiceSpy.getCurrentUser.and.returnValue({ _id: 'super', role: 'super_admin' });

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authServiceSpy }],
    });

    return TestBed.runInInjectionContext(() => new AdminRolesAccessLayout());
  }

  it('expose exactement 2 onglets : finance et administration-permissions', () => {
    const composant = construire();
    expect(composant.navItems.map((i) => i.route)).toEqual(['finance', 'administration-permissions']);
  });

  it('le fil d\'Ariane pointe vers le dashboard super_admin', () => {
    const composant = construire();
    expect(composant.breadcrumbItems[0].route).toBe('/dashboard/admin');
    expect(composant.breadcrumbItems[1].label).toBe('Droits financiers & Administration');
  });
});
