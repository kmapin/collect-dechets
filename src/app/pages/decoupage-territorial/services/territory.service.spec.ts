import { of } from 'rxjs';
import { TerritoryHttpService } from '../../../services/territory-http.service';
import { TerritoryService } from './territory.service';

describe('TerritoryService API hierarchy', () => {
  it('retourne les quartiers qui dépendent directement d’un secteur', async () => {
    const api = {
      getCountries: jasmine.createSpy().and.returnValue(of([
        { id: 'bf', _id: 'bf', name: 'Burkina Faso', code: 'BF' },
      ])),
      getAllCities: jasmine.createSpy().and.returnValue(of([
        { id: 'city-1', _id: 'city-1', name: 'Ouagadougou', countryId: 'bf' },
      ])),
      getAllArrondissements: jasmine.createSpy().and.returnValue(of([
        { id: 'arr-1', _id: 'arr-1', name: 'Arrondissement 1', cityId: 'city-1' },
      ])),
      getAllSectors: jasmine.createSpy().and.returnValue(of([
        { id: 'sector-1', _id: 'sector-1', name: 'Secteur 1', arrondissementId: 'arr-1' },
      ])),
      getAllNeighborhoods: jasmine.createSpy().and.returnValue(of([
        { id: 'quarter-1', _id: 'quarter-1', name: 'Bilbalogo', sectorId: 'sector-1' },
      ])),
    } as unknown as TerritoryHttpService;

    const service = new TerritoryService(api);
    await service.loadApiUnits();

    expect(service.getApiChildren('sector-1').map((unit) => unit.name)).toEqual(['Bilbalogo']);
    expect(service.getApiDescendants('sector-1').map((unit) => unit.name)).toEqual(['Bilbalogo']);
    expect(service.getApiChildren('bf').map((unit) => unit.name)).toEqual(['Ouagadougou']);
    expect(service.getApiUnit('quarter-1')?.ancestor_ids).toEqual([
      'bf',
      'city-1',
      'arr-1',
      'sector-1',
    ]);
    expect(service.getApiUnit('city-1')?.metadata['country_name']).toBe('Burkina Faso');
    expect(service.getApiUnit('sector-1')?.metadata['country_name']).toBe('Burkina Faso');
    expect(service.getApiUnit('quarter-1')?.metadata['country_name']).toBe('Burkina Faso');
    expect(service.getApiProfile('BF').allowed_relations).toContain(
      jasmine.objectContaining({ parent: 'COUNTRY', child: 'CITY' }),
    );
    expect(service.getApiProfile('BF').allowed_relations).toContain(
      jasmine.objectContaining({ parent: 'CITY', child: 'ARRONDISSEMENT' }),
    );
    expect(service.getApiProfile('BF').allowed_relations).toContain(
      jasmine.objectContaining({ parent: 'ARRONDISSEMENT', child: 'SECTOR' }),
    );
    expect(service.getApiProfile('BF').allowed_relations).toContain(
      jasmine.objectContaining({ parent: 'SECTOR', child: 'NEIGHBORHOOD' }),
    );
  });

  it('crée une ville en conservant la relation avec le pays parent', async () => {
    const createCitySpy = jasmine.createSpy().and.returnValue(of({
      id: 'city-new',
      _id: 'city-new',
      name: 'Koudougou',
      countryId: 'bf',
    }));
    const api = {
      getCountries: jasmine.createSpy().and.returnValue(of([
        { id: 'bf', _id: 'bf', name: 'Burkina Faso', code: 'BF' },
      ])),
      getAllCities: jasmine.createSpy().and.returnValue(of([
        { id: 'city-new', _id: 'city-new', name: 'Koudougou', countryId: 'bf' },
      ])),
      getAllArrondissements: jasmine.createSpy().and.returnValue(of([])),
      getAllSectors: jasmine.createSpy().and.returnValue(of([])),
      getAllNeighborhoods: jasmine.createSpy().and.returnValue(of([])),
      createCity: createCitySpy,
    } as unknown as TerritoryHttpService;

    const service = new TerritoryService(api);
    await service.loadApiUnits();
    await service.createApiUnit({ typeCode: 'CITY', name: 'Koudougou', parentId: 'bf' });

    expect(createCitySpy).toHaveBeenCalledWith({ name: 'Koudougou', countryId: 'bf' });
    expect(service.getApiChildren('bf').map((unit) => unit.name)).toEqual(['Koudougou']);
  });
});
