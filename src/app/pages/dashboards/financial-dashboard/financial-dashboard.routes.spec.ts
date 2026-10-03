import { FINANCIAL_DASHBOARD_ROUTES } from './financial-dashboard.routes';
import { FINANCE_NAV_ITEMS } from './features/shell/finance-nav.config';

describe('FINANCIAL_DASHBOARD_ROUTES (navigation financial-dashboard après déplacement de roles-admin)', () => {
  const enfants = FINANCIAL_DASHBOARD_ROUTES[0].children ?? [];

  it("l'ancienne route roles-admin redirige vers Administration -> Rôles et accès plutôt que de charger un composant (lien/favori existant préservé)", () => {
    const route = enfants.find((r) => r.path === 'roles-admin');
    expect(route).withContext('route roles-admin introuvable').toBeTruthy();
    expect(route?.redirectTo).toBe('/dashboard/agency/administration/roles-access');
    expect(route?.loadComponent).toBeUndefined();
  });

  it('la redirection est absolue (commence par /) pour sortir de l’arbre de routes finance, pas une redirection relative', () => {
    const route = enfants.find((r) => r.path === 'roles-admin');
    expect((route?.redirectTo as string).startsWith('/')).toBe(true);
  });

  it("aucune autre route finance n'a été perturbée par le déplacement (statistiques, clients, contracts toujours présentes)", () => {
    const chemins = enfants.map((r) => r.path);
    expect(chemins).toContain('statistiques');
    expect(chemins).toContain('clients');
    expect(chemins).toContain('contracts');
  });

  it("le menu finance (FINANCE_NAV_ITEMS) ne référence plus roles-admin (plus de doublon de navigation)", () => {
    const routes = FINANCE_NAV_ITEMS.map((item) => item.route);
    expect(routes).not.toContain('roles-admin');
  });
});
