import { ADMIN_ROLES_ACCESS_ROUTES } from './admin-roles-access.routes';

describe('ADMIN_ROLES_ACCESS_ROUTES (deux onglets séparés, finance par défaut)', () => {
  const enfants = ADMIN_ROLES_ACCESS_ROUTES[0].children ?? [];

  it("redirige l'URL vide vers 'finance' (onglet par défaut)", () => {
    const route = enfants.find((r) => r.path === '');
    expect(route?.redirectTo).toBe('finance');
  });

  it("la route 'finance' existe et charge AdminFinanceAccess en lazy", () => {
    const route = enfants.find((r) => r.path === 'finance');
    expect(route).withContext('route finance introuvable').toBeTruthy();
    expect(route?.loadComponent).toBeTruthy();
  });

  it("la route 'administration-permissions' existe et charge AdminAdministrationPermissions en lazy", () => {
    const route = enfants.find((r) => r.path === 'administration-permissions');
    expect(route).withContext('route administration-permissions introuvable').toBeTruthy();
    expect(route?.loadComponent).toBeTruthy();
  });

  it('une URL inconnue sous ce module retombe sur finance', () => {
    const route = enfants.find((r) => r.path === '**');
    expect(route?.redirectTo).toBe('finance');
  });

  it('le shell charge AdminRolesAccessLayout en lazy, sans garde propre (adminGuard posé au niveau de app.routes.ts)', () => {
    expect(ADMIN_ROLES_ACCESS_ROUTES[0].loadComponent).toBeTruthy();
    expect(ADMIN_ROLES_ACCESS_ROUTES[0].canActivate).toBeUndefined();
  });
});
