import { ClientService } from './client.service';

/**
 * Prompt 05 : `createSignalement()` doit couvrir les deux parcours (lié à une
 * collecte / indépendant) via un seul point d'entrée HTTP (`POST /signalements`),
 * et `getClientReports()` doit désormais lire le nouvel endpoint unifié
 * (`GET /signalements?clientId=`) plutôt que l'ancienne route Collecte-only.
 */
describe('ClientService - createSignalement / getClientReports (Prompt 05)', () => {
  let httpSpy: { post: jasmine.Spy; get: jasmine.Spy };
  let service: ClientService;

  beforeEach(() => {
    httpSpy = { post: jasmine.createSpy('post'), get: jasmine.createSpy('get') };
    service = new ClientService(httpSpy as any);
  });

  it('signalement lié à une collecte : envoie collecteId dans le body POST /signalements', () => {
    httpSpy.post.and.returnValue({ pipe: () => ({}) });

    service.createSignalement({ collecteId: 'collecte-1', type: 'missed_collection', severity: 'high' });

    expect(httpSpy.post.calls.count()).toBe(1);
    const [url, body] = httpSpy.post.calls.argsFor(0);
    expect(url.endsWith('/signalements')).toBe(true);
    expect(body.collecteId).toBe('collecte-1');
    expect(body.type).toBe('missed_collection');
  });

  it("signalement indépendant : collecteId absent du body (pas envoyé vide) quand omis à l'appel", () => {
    httpSpy.post.and.returnValue({ pipe: () => ({}) });

    service.createSignalement({ type: 'complaint', severity: 'medium' });

    const [, body] = httpSpy.post.calls.argsFor(0);
    expect('collecteId' in body).toBe(false);
  });

  it("signalement indépendant : collecteId vide explicitement fourni est aussi retiré du body", () => {
    httpSpy.post.and.returnValue({ pipe: () => ({}) });

    service.createSignalement({ collecteId: '', type: 'other' });

    const [, body] = httpSpy.post.calls.argsFor(0);
    expect('collecteId' in body).toBe(false);
  });

  it('getClientReports : interroge GET /signalements avec clientId en query param', () => {
    httpSpy.get.and.returnValue({ pipe: () => ({}) });

    service.getClientReports('client-1');

    expect(httpSpy.get.calls.count()).toBe(1);
    const [url, options] = httpSpy.get.calls.argsFor(0);
    expect(url.endsWith('/signalements')).toBe(true);
    expect(options.params.clientId).toBe('client-1');
  });
});
