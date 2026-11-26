import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TerritorialNavigationComponent } from './territorial-navigation.component';

describe('TerritorialNavigationComponent', () => {
  let fixture: ComponentFixture<TerritorialNavigationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TerritorialNavigationComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(TerritorialNavigationComponent);
    fixture.detectChanges();
  });

  it('shows units and import links without exposing history or audit', () => {
    const navigation = (fixture.nativeElement as HTMLElement).querySelector('nav');
    const navigationText = navigation?.textContent ?? '';

    expect(navigationText).toContain('Unités territoriales');
    expect(navigationText).toContain('Importer Excel / CSV');
    expect(navigationText).not.toContain('Historique des imports');
    expect(navigationText).not.toContain("Journal d'audit");
  });
});
