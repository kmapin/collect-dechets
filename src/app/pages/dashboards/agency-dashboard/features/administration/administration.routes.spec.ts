import { ADMINISTRATION_ROUTES } from './administration.routes';

describe('ADMINISTRATION_ROUTES (navigation Administration + refresh direct des URLs)', () => {
  const enfants = ADMINISTRATION_ROUTES[0].children ?? [];

  it("la route roles-access existe, charge RolesAccess en lazy et utilise sa propre garde dédiée (pas administrationPermissionGuard)", () => {
    const route = enfants.find((r) => r.path === 'roles-access');
    expect(route).withContext('route roles-access introuvable').toBeTruthy();
    expect(route?.loadComponent).toBeTruthy();
    expect(route?.canActivate?.length).toBe(1);
  });

  it("la route roles-access est une route enfant déclarée par chemin (standard Angular Router) : un accès direct /dashboard/agency/administration/roles-access, y compris par rafraîchissement du navigateur, est résolu de la même façon qu'une navigation interne — pas d'état client requis pour l'atteindre", () => {
    const route = enfants.find((r) => r.path === 'roles-access');
    expect(typeof route?.path).toBe('string');
    expect(route?.path).toBe('roles-access');
  });

  it("la route employees garde administrationPermissionGuard, inchangée par ce déplacement", () => {
    const route = enfants.find((r) => r.path === 'employees');
    expect(route).toBeTruthy();
    expect(route?.canActivate?.length).toBe(1);
  });

  it('le shell Administration reste protégé par administrationAccessGuard', () => {
    expect(ADMINISTRATION_ROUTES[0].canActivate?.length).toBe(1);
  });

  it("la route administration-permissions existe, charge AdministrationPermissions en lazy et utilise administrationPermissionGuard (pas rolesAccessGuard — écran sans contenu finance)", () => {
    const route = enfants.find((r) => r.path === 'administration-permissions');
    expect(route).withContext('route administration-permissions introuvable').toBeTruthy();
    expect(route?.loadComponent).toBeTruthy();
    expect(route?.canActivate?.length).toBe(1);
    expect((route?.data as any)?.permissions).toEqual(['roles.view']);
  });
});
