import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { Admin } from '../../../services/admin';
import { AgencyService } from '../../../services/agency.service';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';
import { TerritoryHttpService } from '../../../services/territory-http.service';
import { Arrondissement, City, Quartier, Sector } from '../../../models/countries-org.model';
import { RegisterResponse, UserRole } from '../../../models/user.model';
import { Register } from './register';

describe('Register - adresse de localisation', () => {
  let fixture: ComponentFixture<Register>;
  let component: Register;
  let territoryService: jasmine.SpyObj<TerritoryHttpService>;
  let authService: jasmine.SpyObj<AuthService>;

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
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['register']);
    authService.register.and.returnValue(of({ success: false, error: 'Erreur de test' }));

    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        { provide: AuthService, useValue: authService },
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

  it('avance et recule entre les étapes sans perdre les informations saisies', () => {
    const form = { controls: {}, valid: true } as NgForm;
    component.userData.firstName = 'Aïcha';
    component.userData.lastName = 'Diallo';
    component.userData.phone = '70123456';

    component.nextStep(form);
    expect(component.currentStep).toBe(2);
    component.nextStep(form);
    expect(component.currentStep).toBe(3);

    component.previousStep();
    expect(component.currentStep).toBe(2);
    expect(component.userData.firstName).toBe('Aïcha');
    expect(component.userData.lastName).toBe('Diallo');
    expect(component.userData.phone).toBe('70123456');
  });

  it('bloque la progression et indique les champs requis de l’étape personnelle', () => {
    const form = { controls: {}, valid: true } as NgForm;
    component.currentStep = 2;

    component.nextStep(form);

    expect(component.currentStep).toBe(2);
    expect(component.stepFieldErrors['firstName']).toBeTruthy();
    expect(component.stepFieldErrors['lastName']).toBeTruthy();
    expect(component.stepFieldErrors['phone']).toBeTruthy();
  });

  it('valide les informations propres à une agence avant de poursuivre', () => {
    const form = { controls: {}, valid: true } as NgForm;
    component.currentStep = 2;
    component.userData.role = UserRole.MANAGER;
    component.userData.firstName = 'Amadou';
    component.userData.lastName = 'Traoré';
    component.userData.phone = '70123456';

    component.nextStep(form);
    expect(component.currentStep).toBe(2);
    expect(component.stepFieldErrors['agencyName']).toBeTruthy();
    expect(component.stepFieldErrors['agencyDescription']).toBeTruthy();

    component.userData.agencyName = 'Collecte';
    component.userData.agencyDescription = 'Collecte des déchets';
    component.userData.slogan = 'Un quartier plus propre';
    component.nextStep(form);
    expect(component.currentStep).toBe(3);
  });

  it('exige confirmation du mot de passe et acceptation des conditions à la dernière étape', () => {
    const form = { controls: {}, valid: true } as NgForm;
    component.currentStep = 4;
    component.userData.password = 'motdepasse123';
    component.userData.confirmPassword = 'different123';
    component.userData.acceptTerms = false;

    component.submitCurrentStep(form);

    expect(component.currentStep).toBe(4);
    expect(component.stepFieldErrors['confirmPassword']).toBeTruthy();
    expect(component.stepFieldErrors['acceptTerms']).toBeTruthy();
    expect(component.isLoading).toBeFalse();
  });

  it('ne soumet qu’une fois et seulement après validation de la dernière étape', () => {
    const form = { controls: {}, valid: true } as NgForm;
    const response = new Subject<RegisterResponse>();
    authService.register.and.returnValue(response.asObservable());
    component.userData.firstName = 'Aïcha';
    component.userData.lastName = 'Diallo';
    component.userData.phone = '70123456';
    component.userData.password = 'motdepasse123';
    component.userData.confirmPassword = 'motdepasse123';
    component.userData.acceptTerms = true;
    component.onCityChange(cityC.name);
    component.currentStep = 3;

    component.onRegister();
    expect(authService.register).not.toHaveBeenCalled();

    component.currentStep = 4;
    component.submitCurrentStep(form);
    component.submitCurrentStep(form);

    expect(authService.register).toHaveBeenCalledTimes(1);
    expect(component.isLoading).toBeTrue();
    response.next({ success: false, error: 'Erreur de test' });
    response.complete();
    expect(component.isLoading).toBeFalse();
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
