import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { TerritoryService } from '../services/territory.service';
import { UnitsListComponent } from './units-list.component';

describe('UnitsListComponent pagination', () => {
  let fixture: ComponentFixture<UnitsListComponent>;
  let territory: jasmine.SpyObj<TerritoryService>;

  beforeEach(async () => {
    territory = jasmine.createSpyObj<TerritoryService>(
      'TerritoryService',
      ['loadApiUnits', 'getApiUnits', 'apiListUnits', 'getApiChildren'],
    );
    territory.loadApiUnits.and.resolveTo([]);
    territory.getApiUnits.and.returnValue([]);
    territory.apiListUnits.and.returnValue({ data: [], total: 0 });
    territory.getApiChildren.and.returnValue([]);

    await TestBed.configureTestingModule({
      imports: [UnitsListComponent],
      providers: [
        provideRouter([]),
        { provide: TerritoryService, useValue: territory },
        { provide: AuthService, useValue: { getCurrentUser: () => ({ role: 'super_admin' }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UnitsListComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('resets to page one and reloads when the page size changes', async () => {
    fixture.componentInstance.page.set(3);

    fixture.componentInstance.onPageSizeChange(10);
    await fixture.whenStable();

    expect(fixture.componentInstance.page()).toBe(1);
    expect(fixture.componentInstance.pageSize()).toBe(10);
    expect(territory.apiListUnits).toHaveBeenCalledWith(jasmine.objectContaining({
      page: 1,
      pageSize: 10,
    }));
  });

  it('calculates the visible range and a window of page numbers', () => {
    const component = fixture.componentInstance;
    component.total.set(120);
    component.page.set(4);

    expect(component.debutItem()).toBe(46);
    expect(component.finItem()).toBe(60);
    expect(component.numerosDePages()).toEqual([2, 3, 4, 5, 6]);
  });
});
