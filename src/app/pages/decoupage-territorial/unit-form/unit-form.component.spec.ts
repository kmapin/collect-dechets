import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { TerritorialUnit } from '../models/models';
import { TerritoryService } from '../services/territory.service';
import { UnitFormComponent } from './unit-form.component';

describe('UnitFormComponent', () => {
  it('surfaces API errors when loading units for the form', async () => {
    const route = {
      snapshot: {
        paramMap: convertToParamMap({}),
        queryParamMap: convertToParamMap({}),
      },
    } as ActivatedRoute;
    const territory = {
      loadApiUnits: jasmine.createSpy().and.rejectWith(new Error('API indisponible')),
    } as unknown as TerritoryService;
    const component = new UnitFormComponent(route, {} as Router, territory);

    await component.ngOnInit();

    expect(component.error()).toBe('API indisponible');
  });

  it('keeps the existing immediate parent selected when editing a unit', async () => {
    const unit: TerritorialUnit = {
      id: 'neighborhood-1',
      country_code: 'BF',
      type_code: 'NEIGHBORHOOD',
      name: 'Wemtenga',
      normalized_name: 'wemtenga',
      parent_id: 'sector-1',
      ancestor_ids: ['country-1', 'city-1', 'arrondissement-1', 'sector-1'],
      depth: 4,
      code: null,
      sort_order: 0,
      metadata: {},
      created_at: '',
      updated_at: '',
      created_by: null,
      updated_by: null,
    };
    const parents = ['Secteur 1', 'Secteur 2', 'Secteur 3'].map((name, index): TerritorialUnit => ({
      ...unit,
      id: `sector-${index + 1}`,
      type_code: 'SECTOR',
      name,
      normalized_name: name.toLowerCase(),
    }));
    const route = {
      snapshot: {
        paramMap: convertToParamMap({ id: unit.id }),
        queryParamMap: convertToParamMap({}),
      },
    } as ActivatedRoute;
    const territory = {
      loadApiUnits: jasmine.createSpy().and.resolveTo([]),
      getApiUnit: (id: string) => id === unit.id ? unit : null,
      getApiUnits: () => parents,
      getApiParentTypes: (type: string) => type === 'NEIGHBORHOOD' ? ['SECTOR'] : [],
      getApiChildTypes: () => [],
    } as unknown as TerritoryService;

    const component = new UnitFormComponent(route, {} as Router, territory);
    await component.ngOnInit();

    expect(component.parentId).toBe('sector-1');
    component.toggleParentDropdown();
    component.parentSearch.set('secteur 2');
    expect(component.filteredParentCandidates.map((parent) => parent.id)).toEqual(['sector-2']);
    component.selectParent(parents[1]);
    expect(component.parentId).toBe('sector-2');
    expect(component.parentDropdownOpen()).toBeFalse();
    component.selectParent(parents[0]);
    expect(component.parentId).toBe('sector-1');
    expect(component.canSubmit).toBeFalse();
  });
});
