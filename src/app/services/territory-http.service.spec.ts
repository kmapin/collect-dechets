import { of } from 'rxjs';
import { TerritoryHttpService } from './territory-http.service';

/**
 * Chantier "unifier la géographie" — TerritoryHttpService est le pendant réel (HTTP)
 * de CountriesOrgMockService (en mémoire). Même style que client.service.spec.ts :
 * instanciation manuelle avec un spy HttpClient, pas de TestBed.
 */
describe('TerritoryHttpService', () => {
  let httpSpy: { get: jasmine.Spy };
  let service: TerritoryHttpService;

  beforeEach(() => {
    httpSpy = { get: jasmine.createSpy('get') };
    service = new TerritoryHttpService(httpSpy as any);
  });

  it('getCountries : interroge GET /territories/countries, sans paramètre', () => {
    httpSpy.get.and.returnValue(of([]));

    service.getCountries().subscribe();

    expect(httpSpy.get.calls.count()).toBe(1);
    const [url, options] = httpSpy.get.calls.argsFor(0);
    expect(url.endsWith('/territories/countries')).toBe(true);
    expect(options).toBeUndefined();
  });

  it('getAllCities : interroge GET /territories/cities, sans paramètre (jamais un id de pays fictif)', () => {
    httpSpy.get.and.returnValue(of([]));

    service.getAllCities().subscribe();

    const [url, options] = httpSpy.get.calls.argsFor(0);
    expect(url.endsWith('/territories/cities')).toBe(true);
    expect(options).toBeUndefined();
  });

  it('getCitiesByCountry : interroge GET /territories/cities avec countryId en query param', () => {
    httpSpy.get.and.returnValue(of([]));

    service.getCitiesByCountry('pays-1').subscribe();

    const [url, options] = httpSpy.get.calls.argsFor(0);
    expect(url.endsWith('/territories/cities')).toBe(true);
    expect(options.params).toEqual({ countryId: 'pays-1' });
  });

  it('getArrondissementsByCity : interroge GET /territories/arrondissements avec cityId', () => {
    httpSpy.get.and.returnValue(of([]));

    service.getArrondissementsByCity('ville-1').subscribe();

    const [url, options] = httpSpy.get.calls.argsFor(0);
    expect(url.endsWith('/territories/arrondissements')).toBe(true);
    expect(options.params).toEqual({ cityId: 'ville-1' });
  });

  it('getSectorsByArrondissement : interroge GET /territories/sectors avec arrondissementId', () => {
    httpSpy.get.and.returnValue(of([]));

    service.getSectorsByArrondissement('arr-1').subscribe();

    const [url, options] = httpSpy.get.calls.argsFor(0);
    expect(url.endsWith('/territories/sectors')).toBe(true);
    expect(options.params).toEqual({ arrondissementId: 'arr-1' });
  });

  it('getNeighborhoodsBySector : interroge GET /territories/neighborhoods avec sectorId', () => {
    httpSpy.get.and.returnValue(of([]));

    service.getNeighborhoodsBySector('sec-1').subscribe();

    const [url, options] = httpSpy.get.calls.argsFor(0);
    expect(url.endsWith('/territories/neighborhoods')).toBe(true);
    expect(options.params).toEqual({ sectorId: 'sec-1' });
  });

  // Chantier "migrer le frontend" — bug réel trouvé et corrigé : le backend renvoie des
  // documents Mongoose plats avec `_id` (jamais de virtuel `id`, vérifié directement sur
  // le modèle), alors que tous les appelants (register.ts, profile.ts, etc.) lisent
  // `.id` (contrat hérité de CountriesOrgMockService). Sans la normalisation, `.id`
  // valait toujours `undefined` et chaque niveau de la cascade envoyait un id
  // "undefined" au niveau suivant, silencieusement vide.
  it("renomme `_id` en `id` sur chaque élément renvoyé par le backend (jamais `undefined`)", () => {
    httpSpy.get.and.returnValue(of([{ _id: 'mongo-id-1', name: 'Ouagadougou', code: 'OUA' }]));

    service.getAllCities().subscribe((cities) => {
      expect(cities[0].id).toBe('mongo-id-1');
      expect((cities[0] as any)._id).toBe('mongo-id-1');
      expect(cities[0].name).toBe('Ouagadougou');
    });
  });
});
