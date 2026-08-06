import { AgencyService } from './agency.service';

/**
 * Prompt 06 : signalements unifiés côté agence — `getAgencySignalements$()`
 * remplace `getAgencyReports$()` (legacy Collecte-only), et
 * `assignSignalementToTeam$()`/`resolveSignalement$()` remplacent
 * `assignReportToTeam$()`/`resolveReport$()` (qui ne peuvent structurellement
 * pas adresser un signalement indépendant, sans `collecteId`).
 */
describe('AgencyService - signalements unifiés (Prompt 06)', () => {
  let httpSpy: { get: jasmine.Spy; patch: jasmine.Spy };
  let service: AgencyService;

  beforeEach(() => {
    httpSpy = { get: jasmine.createSpy('get'), patch: jasmine.createSpy('patch') };
    service = new AgencyService(httpSpy as any);
  });

  it('getAgencySignalements$ : interroge GET /signalements sans agencyId (dérivé côté serveur), avec les filtres fournis', () => {
    httpSpy.get.and.returnValue({ pipe: (op: any) => ({ subscribe: () => {} }) });

    service.getAgencySignalements$({ origine: 'independant', status: 'open' });

    expect(httpSpy.get.calls.count()).toBe(1);
    const [url, options] = httpSpy.get.calls.argsFor(0);
    expect(url.endsWith('/signalements')).toBe(true);
    expect(options.params.get('origine')).toBe('independant');
    expect(options.params.get('status')).toBe('open');
    expect(options.params.has('agencyId')).toBe(false);
  });

  it("getAgencySignalements$ : omet les filtres non fournis (pas de 'undefined' littéral dans les query params)", () => {
    httpSpy.get.and.returnValue({ pipe: () => ({}) });

    service.getAgencySignalements$({});

    const [, options] = httpSpy.get.calls.argsFor(0);
    expect(options.params.keys().length).toBe(0);
  });

  it('assignSignalementToTeam$ : PATCH /signalements/:id/assign-team avec { teamId } seulement', () => {
    httpSpy.patch.and.returnValue({ pipe: () => ({}) });

    service.assignSignalementToTeam$('sig-1', 'team-1');

    expect(httpSpy.patch.calls.count()).toBe(1);
    const [url, body] = httpSpy.patch.calls.argsFor(0);
    expect(url.endsWith('/signalements/sig-1/assign-team')).toBe(true);
    expect(body).toEqual({ teamId: 'team-1' });
  });

  it('resolveSignalement$ : PATCH /signalements/:id/resolve, sans resolvedBy (dérivé côté serveur)', () => {
    httpSpy.patch.and.returnValue({ pipe: () => ({}) });

    service.resolveSignalement$('sig-1', 'Réglé');

    const [url, body] = httpSpy.patch.calls.argsFor(0);
    expect(url.endsWith('/signalements/sig-1/resolve')).toBe(true);
    expect(body).toEqual({ resolutionComment: 'Réglé' });
    expect('resolvedBy' in body).toBe(false);
  });
});
