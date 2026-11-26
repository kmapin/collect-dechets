import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { TerritorialProfile, TerritorialUnit } from '../models/models';
import { TerritoryService } from '../services/territory.service';
import { UnitFormComponent } from './unit-form.component';

describe('UnitFormComponent', () => {
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
      active: true,
      sort_order: 0,
      metadata: {},
      created_at: '',
      updated_at: '',
      created_by: null,
      updated_by: null,
    };
    const profile: TerritorialProfile = {
      id: 'profile-1',
      country_code: 'BF',
      country_name: 'Burkina Faso',
      types: [{ code: 'NEIGHBORHOOD', label: 'Quartier', order: 4, optional: true }],
      allowed_relations: [{ parent: 'SECTOR', child: 'NEIGHBORHOOD' }],
      active: true,
      created_at: '',
      updated_at: '',
    };
    const route = {
      snapshot: {
        paramMap: convertToParamMap({ id: unit.id }),
        queryParamMap: convertToParamMap({}),
      },
    } as ActivatedRoute;
    const territory = {
      loadApiUnits: jasmine.createSpy().and.resolveTo([]),
      getApiProfiles: () => [profile],
      getApiProfile: () => profile,
      getApiUnit: (id: string) => id === unit.id ? unit : null,
    } as unknown as TerritoryService;

    const component = new UnitFormComponent(route, {} as Router, territory);
    await component.ngOnInit();

    expect(component.parentId).toBe('sector-1');
    expect(component.canSubmit).toBeFalse();

    component.latitude.set(12.36049287151976);
    component.longitude.set(-1.4838275313377383);
    expect(component.canSubmit).toBeTrue();
  });
});
