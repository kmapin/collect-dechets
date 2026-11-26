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
    expect('active' in service.getApiUnit('quarter-1')!).toBeFalse();
    expect(service.getApiParentTypes('NEIGHBORHOOD')).toEqual([
      'CITY',
      'ARRONDISSEMENT',
      'SECTOR',
    ]);
    expect(service.getApiChildTypes('SECTOR')).toEqual(['NEIGHBORHOOD']);
    expect(service.apiListUnits({ countryCode: 'BF', typeCode: 'NEIGHBORHOOD' }).total).toBe(1);
  });

  it('crée une ville en conservant la relation avec le pays parent', async () => {
    const createCitySpy = jasmine.createSpy().and.returnValue(of({
      id: 'city-new',
      _id: 'city-new',
      name: 'Koudougou',
      countryId: 'bf',
      latitude: 12.25,
      longitude: -2.37,
    }));
    const api = {
      getCountries: jasmine.createSpy().and.returnValue(of([
        { id: 'bf', _id: 'bf', name: 'Burkina Faso', code: 'BF' },
      ])),
      getAllCities: jasmine.createSpy().and.returnValue(of([
        { id: 'city-new', _id: 'city-new', name: 'Koudougou', countryId: 'bf', latitude: 12.25, longitude: -2.37 },
      ])),
      getAllArrondissements: jasmine.createSpy().and.returnValue(of([])),
      getAllSectors: jasmine.createSpy().and.returnValue(of([])),
      getAllNeighborhoods: jasmine.createSpy().and.returnValue(of([])),
      createCity: createCitySpy,
    } as unknown as TerritoryHttpService;

    const service = new TerritoryService(api);
    await service.loadApiUnits();
    await service.createApiUnit({
      typeCode: 'CITY',
      name: 'Koudougou',
      parentId: 'bf',
      latitude: 12.25,
      longitude: -2.37,
    });

    expect(createCitySpy).toHaveBeenCalledWith({
      name: 'Koudougou',
      countryId: 'bf',
      latitude: 12.25,
      longitude: -2.37,
    });
    expect(service.getApiChildren('bf').map((unit) => unit.name)).toEqual(['Koudougou']);
    expect(service.getApiUnit('city-new')?.metadata).toEqual(jasmine.objectContaining({
      latitude: 12.25,
      longitude: -2.37,
    }));
  });

  it('ne renvoie pas le parent d’un quartier quand le rattachement ne change pas', async () => {
    const updateNeighborhoodSpy = jasmine.createSpy().and.returnValue(of({
      id: 'neighborhood-1',
      _id: 'neighborhood-1',
      name: 'Bilbalogo modifié',
      sectorId: 'sector-1',
      latitude: 12.3,
      longitude: -1.5,
    }));
    const api = {
      getCountries: jasmine.createSpy().and.returnValue(of([
        { id: 'bf', _id: 'bf', name: 'Burkina Faso', code: 'BF' },
      ])),
      getAllCities: jasmine.createSpy().and.returnValue(of([
        { id: 'city-1', _id: 'city-1', name: 'Ouagadougou', countryId: 'bf' },
      ])),
      getAllArrondissements: jasmine.createSpy().and.returnValue(of([])),
      getAllSectors: jasmine.createSpy().and.returnValue(of([
        { id: 'sector-1', _id: 'sector-1', name: 'Secteur 1', cityId: 'city-1' },
      ])),
      getAllNeighborhoods: jasmine.createSpy().and.returnValue(of([
        { id: 'neighborhood-1', _id: 'neighborhood-1', name: 'Bilbalogo', sectorId: 'sector-1' },
      ])),
      updateNeighborhood: updateNeighborhoodSpy,
    } as unknown as TerritoryHttpService;

    const service = new TerritoryService(api);
    await service.loadApiUnits();
    await service.updateApiUnit('neighborhood-1', 'NEIGHBORHOOD', {
      name: 'Bilbalogo modifié',
      parentId: 'sector-1',
      latitude: 12.3,
      longitude: -1.5,
    });

    expect(updateNeighborhoodSpy).toHaveBeenCalledWith('neighborhood-1', {
      name: 'Bilbalogo modifié',
      latitude: 12.3,
      longitude: -1.5,
    });
  });

  it('supprime une unité via l’API puis recharge les listes', async () => {
    const deleteNeighborhoodSpy = jasmine.createSpy().and.returnValue(of(undefined));
    const neighborhoodsSpy = jasmine.createSpy().and.returnValues(
      of([{ id: 'neighborhood-1', _id: 'neighborhood-1', name: 'Bilbalogo', sectorId: 'sector-1' }]),
      of([]),
    );
    const api = {
      getCountries: jasmine.createSpy().and.returnValue(of([
        { id: 'bf', _id: 'bf', name: 'Burkina Faso', code: 'BF' },
      ])),
      getAllCities: jasmine.createSpy().and.returnValue(of([])),
      getAllArrondissements: jasmine.createSpy().and.returnValue(of([])),
      getAllSectors: jasmine.createSpy().and.returnValue(of([
        { id: 'sector-1', _id: 'sector-1', name: 'Secteur 1', cityId: 'city-1' },
      ])),
      getAllNeighborhoods: neighborhoodsSpy,
      deleteNeighborhood: deleteNeighborhoodSpy,
    } as unknown as TerritoryHttpService;

    const service = new TerritoryService(api);
    await service.loadApiUnits();
    await service.deleteApiUnit('neighborhood-1', 'NEIGHBORHOOD');

    expect(deleteNeighborhoodSpy).toHaveBeenCalledWith('neighborhood-1');
    expect(neighborhoodsSpy).toHaveBeenCalledTimes(2);
    expect(service.getApiUnit('neighborhood-1')).toBeNull();
  });
});
