import { resolveNotificationNavigation, dashboardRouteForRole } from './notification-route.util';

describe('notification-route.util', () => {
  describe('dashboardRouteForRole', () => {
    it('super_admin -> /dashboard/admin (corrige le 404 de l\'ancien switch en dur)', () => {
      expect(dashboardRouteForRole('super_admin')).toBe('/dashboard/admin');
    });

    it('manager -> /dashboard/agency', () => {
      expect(dashboardRouteForRole('manager')).toBe('/dashboard/agency');
    });

    it('rôle inconnu/absent -> racine', () => {
      expect(dashboardRouteForRole(null)).toBe('/');
      expect(dashboardRouteForRole('inconnu')).toBe('/');
    });
  });

  describe('resolveNotificationNavigation', () => {
    it('notification liée à un planning -> /planning/detail/:id, quel que soit le rôle', () => {
      const notif = { type: 'Planning' as const, target: { kind: 'planning' as const, id: 'p1' } };
      expect(resolveNotificationNavigation(notif, '/dashboard/agency', 'manager')).toEqual({
        commands: ['/planning/detail', 'p1'],
      });
    });

    it('client + Subscribed -> /subscription (sa propre ressource, sans id)', () => {
      const notif = { type: 'Subscribed' as const, target: null };
      expect(resolveNotificationNavigation(notif, '/dashboard/client', 'client')).toEqual({
        commands: ['/subscription'],
      });
    });

    it('client + Contrat -> /contrat', () => {
      const notif = { type: 'Contrat' as const, target: null };
      expect(resolveNotificationNavigation(notif, '/dashboard/client', 'client')).toEqual({
        commands: ['/contrat'],
      });
    });

    it('manager + Retrait -> /dashboard/financial/withdrawals (onglet réel, pas /dashboard/agency/finance)', () => {
      const notif = { type: 'Retrait' as const, target: null };
      expect(resolveNotificationNavigation(notif, '/dashboard/agency', 'manager')).toEqual({
        commands: ['/dashboard/financial/withdrawals'],
      });
    });

    it('super_admin + PaiementAgent -> /dashboard/financial/agent-payment', () => {
      const notif = { type: 'PaiementAgent' as const, target: null };
      expect(resolveNotificationNavigation(notif, '/dashboard/admin', 'super_admin')).toEqual({
        commands: ['/dashboard/financial/agent-payment'],
      });
    });

    it('manager + Signalement -> /dashboard/agency?tab=reports (mécanisme réel d\'onglet, pas un fragment mort)', () => {
      const notif = { type: 'Signalement' as const, target: null };
      expect(resolveNotificationNavigation(notif, '/dashboard/agency', 'manager')).toEqual({
        commands: ['/dashboard/agency'],
        extras: { queryParams: { tab: 'reports', source: 'notification' } },
      });
    });

    it('manager + Planning sans target -> /dashboard/agency?tab=schedules', () => {
      const notif = { type: 'Planning' as const, target: null };
      expect(resolveNotificationNavigation(notif, '/dashboard/agency', 'manager')).toEqual({
        commands: ['/dashboard/agency'],
        extras: { queryParams: { tab: 'schedules', source: 'notification' } },
      });
    });

    it('manager + Contrat -> /dashboard/agency?tab=contrats (onglet dédié, plus précis que la liste clients finance)', () => {
      const notif = { type: 'Contrat' as const, target: null };
      expect(resolveNotificationNavigation(notif, '/dashboard/agency', 'manager')).toEqual({
        commands: ['/dashboard/agency'],
        extras: { queryParams: { tab: 'contrats', source: 'notification' } },
      });
    });

    it('manager + Subscribed -> /dashboard/financial/clients (pas d\'onglet "abonnements" côté agence)', () => {
      const notif = { type: 'Subscribed' as const, target: null };
      expect(resolveNotificationNavigation(notif, '/dashboard/agency', 'manager')).toEqual({
        commands: ['/dashboard/financial/clients'],
      });
    });

    it('super_admin + Contrat -> /dashboard/financial/clients (mécanisme d\'onglet non applicable, dashboard différent)', () => {
      const notif = { type: 'Contrat' as const, target: null };
      expect(resolveNotificationNavigation(notif, '/dashboard/admin', 'super_admin')).toEqual({
        commands: ['/dashboard/financial/clients'],
      });
    });

    it('client + Retrait -> repli dashboard (pas la finance, réservée au staff)', () => {
      const notif = { type: 'Retrait' as const, target: null };
      const nav = resolveNotificationNavigation(notif, '/dashboard/client', 'client');
      expect(nav.commands).toEqual(['/dashboard/client']);
    });

    it("Signalement pour un rôle sans mécanisme d'onglet vérifié (municipality) -> repli dashboard nu", () => {
      const notif = { type: 'Signalement' as const, target: null };
      const nav = resolveNotificationNavigation(notif, '/dashboard/municipality', 'municipality');
      expect(nav.commands).toEqual(['/dashboard/municipality']);
      expect(nav.extras?.queryParams).toEqual({ source: 'notification' });
    });

    it("type sans onglet connu (Communication) pour un manager -> repli dashboard sans tab", () => {
      const notif = { type: 'Communication' as const, target: null };
      const nav = resolveNotificationNavigation(notif, '/dashboard/agency', 'manager');
      expect(nav.commands).toEqual(['/dashboard/agency']);
      expect(nav.extras?.queryParams).toEqual({ source: 'notification' });
    });

    it('super_admin corrigé vers /dashboard/admin (plus le bug /dashboard/super_admin)', () => {
      const notif = { type: 'Communication' as const, target: null };
      const nav = resolveNotificationNavigation(notif, '/dashboard/admin', 'super_admin');
      expect(nav.commands).toEqual(['/dashboard/admin']);
    });

    it('rôle/dashboardRoute absent -> repli racine, jamais un segment undefined', () => {
      const notif = { type: 'Communication' as const, target: null };
      expect(resolveNotificationNavigation(notif, '', null)).toEqual({ commands: ['/'] });
    });
  });
});
