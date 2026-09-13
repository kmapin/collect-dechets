import { AfterViewInit, Directive, ElementRef, Input, OnDestroy, booleanAttribute } from '@angular/core';
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator } from '@angular/forms';
import intlTelInput from 'intl-tel-input/intlTelInputWithUtils';
import type { Iso2, Iti } from 'intl-tel-input';


@Directive({
  selector: 'input[appPhoneInput]',
  standalone: true,
  exportAs: 'appPhoneInput',
  providers: [{ provide: NG_VALIDATORS, useExisting: PhoneInputDirective, multi: true }],
})
export class PhoneInputDirective implements AfterViewInit, OnDestroy, Validator {
  @Input() initialCountry: Iso2 = 'bf' as Iso2;
  @Input({ transform: booleanAttribute }) validatePhone = false;
  @Input({ transform: booleanAttribute }) attachDropdownToBody = false;

  private iti?: Iti;
  private onValidatorChange?: () => void;
  private readonly onCountryChange = () => this.onValidatorChange?.();

  constructor(private el: ElementRef<HTMLInputElement>) {}

  ngAfterViewInit(): void {
    this.iti = intlTelInput(this.el.nativeElement, {
      initialCountry: this.initialCountry,
      separateDialCode: true,
      ...(this.attachDropdownToBody ? { dropdownParent: document.body } : {}),
    });
    // Changer de pays ne modifie pas la valeur de l'input (separateDialCode), donc
    // Angular ne relance pas les validators tout seul dans ce cas précis.
    this.el.nativeElement.addEventListener('countrychange', this.onCountryChange);
  }

  /** Numéro complet (indicatif + national) selon intl-tel-input, si besoin côté appelant. */
  getNumber(): string {
    return this.iti?.getNumber() || this.el.nativeElement.value;
  }

  validate(control: AbstractControl): ValidationErrors | null {
    if (!this.validatePhone || !this.iti) return null;
    const value = control.value;
    if (value === null || value === undefined || value === '') return null;
    return this.iti.isValidNumber() ? null : { invalidPhone: true };
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  ngOnDestroy(): void {
    this.el.nativeElement.removeEventListener('countrychange', this.onCountryChange);
    this.iti?.destroy();
  }
}
