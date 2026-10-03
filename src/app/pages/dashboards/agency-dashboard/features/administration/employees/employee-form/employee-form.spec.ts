import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { EmployeeForm } from './employee-form';
import { EmployeeAdministrationService } from '../employee-administration.service';
import { NotificationService } from '../../../../../../../services/notification.service';
import { TerritoryHttpService } from '../../../../../../../services/territory-http.service';
import { Employee } from '../employee.model';

describe('EmployeeForm', () => {
  let employeeServiceSpy: jasmine.SpyObj<EmployeeAdministrationService>;
  let notificationSpy: jasmine.SpyObj<NotificationService>;
  let territoryServiceSpy: jasmine.SpyObj<TerritoryHttpService>;

  const VILLES = [{ id: 'city-1', name: 'Ouagadougou' }];
  const ARRONDISSEMENTS = [
    { id: 'arr-1', name: 'Arrondissement 1', cityId: 'city-1' },
    { id: 'arr-2', name: 'Arrondissement 2', cityId: 'city-1' },
  ];
  const SECTEURS = [
    { id: 'sec-1', name: 'Secteur 1', arrondissementId: 'arr-1' },
    { id: 'sec-2', name: 'Secteur 2', arrondissementId: 'arr-1' },
  ];
  const QUARTIERS = [
    { id: 'qua-1', name: 'Quartier A', sectorId: 'sec-1' },
    { id: 'qua-2', name: 'Quartier B', sectorId: 'sec-1' },
  ];

  function creerComposant(employee: Employee | null): EmployeeForm {
    employeeServiceSpy = jasmine.createSpyObj<EmployeeAdministrationService>('EmployeeAdministrationService', ['create', 'update']);
    notificationSpy = jasmine.createSpyObj<NotificationService>('NotificationService', ['showSuccess', 'showError']);
    territoryServiceSpy = jasmine.createSpyObj<TerritoryHttpService>('TerritoryHttpService', [
      'getAllCities', 'getAllArrondissements', 'getAllSectors', 'getAllNeighborhoods',
    ]);
    territoryServiceSpy.getAllCities.and.returnValue(of(VILLES as any));
    territoryServiceSpy.getAllArrondissements.and.returnValue(of(ARRONDISSEMENTS as any));
    territoryServiceSpy.getAllSectors.and.returnValue(of(SECTEURS as any));
    territoryServiceSpy.getAllNeighborhoods.and.returnValue(of(QUARTIERS as any));

    const composant = new EmployeeForm(new FormBuilder(), employeeServiceSpy, notificationSpy, territoryServiceSpy);
    composant.employee = employee;
    composant.ngOnChanges({ employee: {} as any });
    composant.ngOnInit();
    return composant;
  }

  it('création : charge les villes au démarrage, aucune sélection géographique présélectionnée', () => {
    const composant = creerComposant(null);

    expect(territoryServiceSpy.getAllCities).toHaveBeenCalled();
    expect(composant.villesOptions).toEqual([{ value: 'city-1', label: 'Ouagadougou' }]);
    expect(composant.selectedVilleId).toBeNull();
    expect(composant.arrondissementsOptions).toEqual([]);
  });

  it('changerVille() renseigne address.city (nom) et charge les arrondissements de cette ville', () => {
    const composant = creerComposant(null);

    composant.changerVille('city-1');

    expect(composant.form.get('address')?.get('city')?.value).toBe('Ouagadougou');
    expect(composant.arrondissementsOptions).toEqual([
      { value: 'arr-1', label: 'Arrondissement 1' },
      { value: 'arr-2', label: 'Arrondissement 2' },
    ]);
  });

  it('changerVille() réinitialise les niveaux enfants (id + nom + options)', () => {
    const composant = creerComposant(null);
    composant.changerVille('city-1');
    composant.changerArrondissement('arr-1');
    composant.changerSecteur('sec-1');

    composant.changerVille('city-1');

    expect(composant.selectedArrondissementId).toBeNull();
    expect(composant.selectedSecteurId).toBeNull();
    expect(composant.selectedQuartierId).toBeNull();
    expect(composant.form.get('address')?.get('arrondissement')?.value).toBe('');
    expect(composant.form.get('address')?.get('sector')?.value).toBe('');
    expect(composant.form.get('address')?.get('neighborhood')?.value).toBe('');
  });

  it('cascade complète Ville -> Arrondissement -> Secteur -> Quartier renseigne les 4 noms', () => {
    const composant = creerComposant(null);

    composant.changerVille('city-1');
    composant.changerArrondissement('arr-1');
    composant.changerSecteur('sec-1');
    composant.changerQuartier('qua-1');

    const adresse = composant.form.get('address')?.value;
    expect(adresse.city).toBe('Ouagadougou');
    expect(adresse.arrondissement).toBe('Arrondissement 1');
    expect(adresse.sector).toBe('Secteur 1');
    expect(adresse.neighborhood).toBe('Quartier A');
  });

  it("édition : résout les NOMS existants de l'employé vers leurs ids Territory pour présélectionner les selects", () => {
    const employe = {
      _id: 'e1',
      firstName: 'Awa',
      lastName: 'Traoré',
      phone: '70000000',
      role: 'collector',
      status: 'active',
      agencyId: 'ag1',
      address: {
        city: 'Ouagadougou',
        arrondissement: 'Arrondissement 1',
        sector: 'Secteur 1',
        neighborhood: 'Quartier A',
      },
    } as any as Employee;

    const composant = creerComposant(employe);

    expect(composant.selectedVilleId).toBe('city-1');
    expect(composant.selectedArrondissementId).toBe('arr-1');
    expect(composant.selectedSecteurId).toBe('sec-1');
    expect(composant.selectedQuartierId).toBe('qua-1');
    expect(composant.arrondissementsOptions.length).toBe(2);
    expect(composant.secteursOptions.length).toBe(2);
    expect(composant.quartiersOptions.length).toBe(2);
  });

  it("édition : nom d'adresse inconnu des territoires chargés -> aucune présélection, pas d'erreur", () => {
    const employe = {
      _id: 'e2',
      firstName: 'B',
      lastName: 'C',
      phone: '70000001',
      role: 'collector',
      status: 'active',
      agencyId: 'ag1',
      address: { city: 'Ville Inconnue', arrondissement: 'X', sector: 'Y', neighborhood: 'Z' },
    } as any as Employee;

    const composant = creerComposant(employe);

    expect(composant.selectedVilleId).toBeNull();
    expect(composant.selectedArrondissementId).toBeNull();
    expect(composant.selectedSecteurId).toBeNull();
    expect(composant.selectedQuartierId).toBeNull();
  });

  it('soumettre() (création) envoie les NOMS résolus (jamais les ids Territory) dans address', () => {
    const composant = creerComposant(null);
    employeeServiceSpy.create.and.returnValue(of({ _id: 'e1', firstName: 'A', lastName: 'B' } as any));

    composant.form.patchValue({ firstName: 'Awa', lastName: 'Traoré', phone: '70000000', role: 'collector', password: 'secret1', confirmPassword: 'secret1' });
    composant.changerVille('city-1');
    composant.changerArrondissement('arr-1');
    composant.changerSecteur('sec-1');
    composant.changerQuartier('qua-1');

    composant.soumettre();

    expect(employeeServiceSpy.create).toHaveBeenCalledWith(
      jasmine.objectContaining({
        address: jasmine.objectContaining({
          city: 'Ouagadougou',
          arrondissement: 'Arrondissement 1',
          sector: 'Secteur 1',
          neighborhood: 'Quartier A',
        }),
      }),
    );
  });

  it('une panne du service territoire laisse le formulaire utilisable (aucune option, pas de crash)', () => {
    employeeServiceSpy = jasmine.createSpyObj<EmployeeAdministrationService>('EmployeeAdministrationService', ['create', 'update']);
    notificationSpy = jasmine.createSpyObj<NotificationService>('NotificationService', ['showSuccess', 'showError']);
    territoryServiceSpy = jasmine.createSpyObj<TerritoryHttpService>('TerritoryHttpService', [
      'getAllCities', 'getAllArrondissements', 'getAllSectors', 'getAllNeighborhoods',
    ]);
    territoryServiceSpy.getAllCities.and.returnValue(throwError(() => new Error('boom')));
    territoryServiceSpy.getAllArrondissements.and.returnValue(of([]));
    territoryServiceSpy.getAllSectors.and.returnValue(of([]));
    territoryServiceSpy.getAllNeighborhoods.and.returnValue(of([]));

    const composant = new EmployeeForm(new FormBuilder(), employeeServiceSpy, notificationSpy, territoryServiceSpy);
    expect(() => composant.ngOnInit()).not.toThrow();
    expect(composant.villesOptions).toEqual([]);
  });
});
