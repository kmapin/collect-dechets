import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { TerritorialUnit } from '../models/models';
import { TerritoryService } from '../services/territory.service';
import { UnitDetailComponent } from './unit-detail.component';

describe('UnitDetailComponent', () => {
  let fixture: ComponentFixture<UnitDetailComponent>;
  let routeIds: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let getApiUnit: jasmine.Spy;

  const makeUnit = (id: string, name: string): TerritorialUnit => ({
    id,
    country_code: 'BF',
    type_code: 'CITY',
    name,
    normalized_name: name.toLowerCase(),
    parent_id: null,
    ancestor_ids: [],
    depth: 0,
    code: null,
    active: true,
    sort_order: 0,
    metadata: {},
    created_at: '',
    updated_at: '',
    created_by: null,
    updated_by: null,
  });

  beforeEach(async () => {
    routeIds = new BehaviorSubject(convertToParamMap({ id: 'city-1' }));
    getApiUnit = jasmine.createSpy('getApiUnit').and.callFake((id: string) =>
      makeUnit(id, id === 'city-1' ? 'Ouagadougou' : 'Bobo-Dioulasso'),
    );

    await TestBed.configureTestingModule({
      imports: [UnitDetailComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: routeIds.asObservable() } },
        {
          provide: TerritoryService,
          useValue: {
            loadApiUnits: jasmine.createSpy().and.resolveTo([]),
            getApiUnit,
            getApiAncestors: () => [],
            getApiChildren: () => [],
            getApiDescendants: () => [],
            getApiProfile: () => ({ allowed_relations: [], types: [] }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UnitDetailComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('reloads the detail when navigating to another unit id', async () => {
    routeIds.next(convertToParamMap({ id: 'city-2' }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(getApiUnit.calls.allArgs()).toEqual([['city-1'], ['city-2']]);
    expect(fixture.nativeElement.textContent).toContain('Bobo-Dioulasso');
  });
});
