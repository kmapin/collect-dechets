import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { TerritorialUnit } from '../models/models';
import { TerritoryService } from '../services/territory.service';
import { ConfirmDialogService } from '../../../services/confirm-dialog.service';
import { UnitDetailComponent } from './unit-detail.component';

describe('UnitDetailComponent', () => {
  let fixture: ComponentFixture<UnitDetailComponent>;
  let routeIds: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let getApiUnit: jasmine.Spy;
  let deleteApiUnit: jasmine.Spy;
  let confirm: jasmine.Spy;

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
    deleteApiUnit = jasmine.createSpy('deleteApiUnit').and.resolveTo(undefined);
    confirm = jasmine.createSpy('confirm').and.resolveTo(false);

    await TestBed.configureTestingModule({
      imports: [UnitDetailComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: routeIds.asObservable() } },
        { provide: ConfirmDialogService, useValue: { confirm } },
        {
          provide: TerritoryService,
          useValue: {
            loadApiUnits: jasmine.createSpy().and.resolveTo([]),
            deleteApiUnit,
            getApiUnit,
            getApiAncestors: () => [],
            getApiChildren: () => [],
            getApiDescendants: () => [],
            getApiChildTypes: () => [],
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
    expect(fixture.nativeElement.querySelector('.unit-location-map')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-status-pill')).toBeNull();
  });

  it('uses the shared confirmation dialog before deleting a unit', async () => {
    await fixture.componentInstance.deleteUnit();

    expect(confirm).toHaveBeenCalledWith(jasmine.objectContaining({
      variant: 'danger',
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler',
    }));
    expect(deleteApiUnit).not.toHaveBeenCalled();
  });

  it('shows the location map when both coordinates are available', async () => {
    getApiUnit.and.callFake((id: string) => ({
      ...makeUnit(id, 'Ouagadougou'),
      metadata: { latitude: 12.3714, longitude: -1.5197 },
    }));

    routeIds.next(convertToParamMap({ id: 'city-with-coordinates' }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.unit-location-map')).not.toBeNull();
    const googleMapsLink = fixture.nativeElement.querySelector('.coordinates-map-section a') as HTMLAnchorElement;
    expect(googleMapsLink.href).toBe(
      'https://www.google.com/maps/search/?api=1&query=12.3714,-1.5197',
    );
    expect(googleMapsLink.target).toBe('_blank');
  });

  it('does not show a zero-subdivision message for a neighborhood', async () => {
    getApiUnit.and.callFake((id: string) => ({
      ...makeUnit(id, 'Wemtenga'),
      type_code: 'NEIGHBORHOOD',
    }));

    routeIds.next(convertToParamMap({ id: 'neighborhood-1' }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('subdivision(s) directe(s)');
    expect(fixture.nativeElement.querySelector('.no-children')).toBeNull();
  });

  it('does not show a child count beside a neighborhood in the parent tree', async () => {
    const sector: TerritorialUnit = {
      ...makeUnit('sector-1', 'Secteur 1'),
      type_code: 'SECTOR',
    };
    const neighborhood: TerritorialUnit = {
      ...makeUnit('neighborhood-1', 'Bilbalogo'),
      type_code: 'NEIGHBORHOOD',
      parent_id: sector.id,
    };
    getApiUnit.and.callFake((id: string) => id === sector.id ? sector : neighborhood);

    routeIds.next(convertToParamMap({ id: sector.id }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.children.set([neighborhood]);
    component.tree.set({
      unit: sector,
      expanded: true,
      children: [{ unit: neighborhood, children: [], expanded: false }],
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Bilbalogo');
    expect(fixture.nativeElement.querySelector('.tree-item .tree-count')).toBeNull();
  });
});
