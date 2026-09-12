import { AfterViewInit, Directive, ElementRef, Input, OnDestroy, booleanAttribute } from '@angular/core';
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator } from '@angular/forms';
import intlTelInput from 'intl-tel-input/intlTelInputWithUtils';
import type { Iso2, Iti } from 'intl-tel-input';

// Directive cosmétique (drapeau, indicatif séparé, placeholder = numéro d'exemple du
// pays sélectionné) : elle ne touche jamais à la valeur portée par ngModel/formControl,
// qui reste le numéro national tel que tapé — exactement comme avant l'intégration de
// la librairie. Se pose sur n'importe quel <input> (ngModel, formControlName, y compris
// dans une *ngFor ou un FormArray : chaque occurrence instancie sa propre directive).
//
// [validatePhone] est un opt-in séparé : par défaut la directive ne valide rien (les
// champs déjà en prod avant son ajout — register/profile/team-create/... — n'avaient
// souvent aucune validation stricte de format, et le comportement doit rester identique
// pour eux). Là où on veut que le champ soit invalide tant que ce n'est pas un vrai
// numéro pour le pays sélectionné (ex: mobile-money-form, où un regex maison figé sur un
// seul format faisait échouer des numéros pourtant valides), on active `validatePhone`.
@Directive({
  selector: 'input[appPhoneInput]',
  standalone: true,
  exportAs: 'appPhoneInput',
  providers: [{ provide: NG_VALIDATORS, useExisting: PhoneInputDirective, multi: true }],
})
export class PhoneInputDirective implements AfterViewInit, OnDestroy, Validator {
  @Input() initialCountry: Iso2 = 'bf' as Iso2;
  @Input({ transform: booleanAttribute }) validatePhone = false;

  private iti?: Iti;
  private onValidatorChange?: () => void;
  private readonly onCountryChange = () => this.onValidatorChange?.();

  constructor(private el: ElementRef<HTMLInputElement>) {}

  ngAfterViewInit(): void {
    this.iti = intlTelInput(this.el.nativeElement, {
      initialCountry: this.initialCountry,
      separateDialCode: true,
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
