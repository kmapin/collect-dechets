import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TerritorySelectComponent } from './territory-select';

describe('TerritorySelectComponent', () => {
  let fixture: ComponentFixture<TerritorySelectComponent>;
  let component: TerritorySelectComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TerritorySelectComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TerritorySelectComponent);
    component = fixture.componentInstance;
    component.options = [
      { value: 'city-1', label: 'Ville 1' },
      { value: 'city-2', label: 'Ville 2' },
    ];
    component.value = 'city-1';
    fixture.detectChanges();
  });

  it('garde le menu ouvert après effacement pendant que le champ conserve le focus', () => {
    const input = fixture.nativeElement.querySelector('.ts-input') as HTMLInputElement;
    const clearButton = fixture.nativeElement.querySelector('.ts-clear') as HTMLButtonElement;
    const valueChange = spyOn(component.valueChange, 'emit');

    input.focus();
    fixture.detectChanges();
    clearButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(document.activeElement).toBe(input);
    expect(component.value).toBeNull();
    expect(component.dropdownOpen).toBe(true);
    expect(valueChange).toHaveBeenCalledWith(null);
    expect(fixture.nativeElement.querySelector('.ts-dropdown')).not.toBeNull();
  });

  it('applique la variante formulaire sans changer la variante compacte par défaut', () => {
    const input = fixture.nativeElement.querySelector('.ts-input') as HTMLInputElement;
    expect(input.classList.contains('ts-input--form')).toBe(false);

    component.appearance = 'form';
    fixture.detectChanges();

    expect(input.classList.contains('ts-input--form')).toBe(true);
  });
});
