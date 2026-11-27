import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Admin } from '../../../services/admin';
import { AgencyService } from '../../../services/agency.service';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';
import { TerritoryHttpService } from '../../../services/territory-http.service';
import { Arrondissement, City, Quartier, Sector } from '../../../models/countries-org.model';
import { Register } from './register';

describe('Register - adresse de localisation', () => {
  let fixture: ComponentFixture<Register>;
  let component: Register;
  let territoryService: jasmine.SpyObj<TerritoryHttpService>;

  const cityA: City = {
    id: 'city-a',
    name: 'Ville A',
    country: { id: 'country-1', name: 'Pays' },
  };
  const cityB: City = {
    id: 'city-b',
    name: 'Ville B',
    country: { id: 'country-1', name: 'Pays' },
  };
  const cityC: City = {
    id: 'city-c',
    name: 'Ville C',
    country: { id: 'country-1', name: 'Pays' },
  };
  const arrondissementA: Arrondissement = {
    id: 'arr-a',
    name: 'Arrondissement A',
    city: cityA,
  };
  const secteurA: Sector = {
    id: 'sector-a',
    name: 'Secteur A',
    arrondissementId: arrondissementA.id,
    arrondissement: arrondissementA,
  };
  const secteurB = {
    id: 'sector-b',
    name: 'Secteur B',
    cityId: cityB.id,
  } as Sector;
  const quartierA: Quartier = {
    id: 'neighborhood-a',
    name: 'Quartier A',
    sectorId: secteurA.id,
    sector: secteurA,
  };
  const quartierDirectC = {
    id: 'neighborhood-c',
    name: 'Quartier direct',
    cityId: cityC.id,
  } as Quartier;
  beforeEach(async () => {
    territoryService = jasmine.createSpyObj<TerritoryHttpService>('TerritoryHttpService', [
      'getAllCities',
      'getArrondissementsByCity',
      'getAllSectors',
      'getSectorsByArrondissement',
      'getNeighborhoodsBySector',
      'getAllNeighborhoods',
    ]);
    territoryService.getAllCities.and.returnValue(of([cityA, cityB, cityC]));
    territoryService.getArrondissementsByCity.and.callFake((id: string) =>
      of(id === cityA.id ? [arrondissementA] : []),
    );
    territoryService.getAllSectors.and.returnValue(of([secteurB]));
    territoryService.getSectorsByArrondissement.and.returnValue(of([secteurA]));
    territoryService.getNeighborhoodsBySector.and.callFake((id: string) =>
      of(id === secteurA.id ? [quartierA] : []),
    );
    territoryService.getAllNeighborhoods.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        { provide: AuthService, useValue: {} },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        { provide: NotificationService, useValue: { showError: jasmine.createSpy('showError') } },
        { provide: Admin, useValue: { cleanData: jasmine.createSpy('cleanData') } },
        { provide: ActivatedRoute, useValue: { snapshot: { params: {} } } },
        { provide: AgencyService, useValue: {} },
        { provide: TerritoryHttpService, useValue: territoryService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    component.ngOnInit();
  });

  it('charge la hiérarchie Ville → Arrondissement → Secteur → Quartier', () => {
    component.userData.address.city = cityA.name;
    component.onCityChange(cityA.name);

    expect(component.arrondissementss.map((item) => item.name)).toEqual([arrondissementA.name]);
    expect(component.secteurss).toEqual([]);

    component.userData.address.arrondissement = arrondissementA.name;
    component.onArrondissementChange(arrondissementA.name);
    expect(component.secteurss.map((item) => item.name)).toEqual([secteurA.name]);

    component.userData.address.sector = secteurA.name;
    component.onSecteurChange(secteurA.name);
    expect(component.quartierss.map((item) => item.name)).toEqual([quartierA.name]);
  });

  it('n’impose pas d’arrondissement et charge les secteurs rattachés directement à la ville', () => {
    component.userData.address.city = cityB.name;
    component.onCityChange(cityB.name);

    expect(component.arrondissementss).toEqual([]);
    expect(component.userData.address.arrondissement).toBe('');
    expect(component.secteurss.map((item) => item.name)).toEqual([secteurB.name]);

    component.userData.address.sector = secteurB.name;
    component.onSecteurChange(secteurB.name);
    expect(component.quartierss).toEqual([]);
  });

  it('réinitialise le secteur et le quartier quand leurs parents sont effacés', () => {
    component.userData.address.city = cityA.name;
    component.onCityChange(cityA.name);
    component.userData.address.arrondissement = arrondissementA.name;
    component.onArrondissementChange(arrondissementA.name);
    component.userData.address.sector = secteurA.name;
    component.onSecteurChange(secteurA.name);
    component.userData.address.arrondissement = '';
    component.onArrondissementChange('');

    expect(component.userData.address.sector).toBe('');
    expect(component.userData.address.neighborhood).toBe('');
    expect(component.secteurss).toEqual([]);
    expect(component.quartierss).toEqual([]);
  });

  it('propose les quartiers rattachés directement à la ville quand elle n’a pas de secteur', () => {
    territoryService.getAllNeighborhoods.and.returnValue(of([quartierDirectC]));
    component.userData.address.city = cityC.name;
    component.onCityChange(cityC.name);

    expect(component.secteurss).toEqual([]);
    expect(component.quartierss.map((item) => item.name)).toEqual([quartierDirectC.name]);
  });

  it('réinitialise les sélections enfants au changement de ville et n’invente pas de subdivision', () => {
    component.userData.address.city = cityA.name;
    component.userData.address.arrondissement = arrondissementA.name;
    component.userData.address.sector = secteurA.name;
    component.userData.address.neighborhood = quartierA.name;
    component.userData.address.city = cityC.name;
    component.onCityChange(cityC.name);

    expect(component.userData.address.arrondissement).toBe('');
    expect(component.userData.address.sector).toBe('');
    expect(component.userData.address.neighborhood).toBe('');
    expect(component.arrondissementss).toEqual([]);
    expect(component.secteurss).toEqual([]);
    expect(component.quartierss).toEqual([]);
  });

  it('restaure une adresse existante seulement si chaque sélection existe encore', () => {
    component.userData.address.city = cityA.name;
    component.userData.address.arrondissement = arrondissementA.name;
    component.userData.address.sector = secteurA.name;
    component.userData.address.neighborhood = quartierA.name;
    component.getAllCountries();

    expect(component.userData.address.arrondissement).toBe(arrondissementA.name);
    expect(component.userData.address.sector).toBe(secteurA.name);
    expect(component.userData.address.neighborhood).toBe(quartierA.name);
  });

  it('signale une erreur API de chargement territorial sans conserver de subdivisions périmées', () => {
    territoryService.getArrondissementsByCity.and.returnValue(throwError(() => new Error('API indisponible')));
    component.userData.address.city = cityA.name;
    component.userData.address.arrondissement = arrondissementA.name;
    component.onCityChange(cityA.name);

    expect(component.territoryError).toContain('Impossible de charger');
    expect(component.arrondissementss).toEqual([]);
    expect(component.userData.address.arrondissement).toBe('');
  });
});
