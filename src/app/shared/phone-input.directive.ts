import { AfterViewInit, Directive, ElementRef, Input, OnDestroy } from '@angular/core';
import intlTelInput from 'intl-tel-input/intlTelInputWithUtils';
import type { Iso2, Iti } from 'intl-tel-input';

// Directive purement cosmétique : elle habille le champ natif (drapeau, indicatif
// séparé, placeholder = numéro d'exemple du pays sélectionné) sans jamais toucher
// à la valeur portée par ngModel/formControl, qui reste le numéro national tel que
// tapé — exactement comme avant l'intégration de la librairie. Se pose sur
// n'importe quel <input> (ngModel, formControlName, y compris dans une *ngFor ou
// un FormArray : chaque occurrence instancie sa propre directive).
@Directive({
  selector: 'input[appPhoneInput]',
  standalone: true,
  exportAs: 'appPhoneInput',
})
export class PhoneInputDirective implements AfterViewInit, OnDestroy {
  @Input() initialCountry: Iso2 = 'bf' as Iso2;

  private iti?: Iti;

  constructor(private el: ElementRef<HTMLInputElement>) {}

  ngAfterViewInit(): void {
    this.iti = intlTelInput(this.el.nativeElement, {
      initialCountry: this.initialCountry,
      separateDialCode: true,
    });
  }

  /** Numéro complet (indicatif + national) selon intl-tel-input, si besoin côté appelant. */
  getNumber(): string {
    return this.iti?.getNumber() || this.el.nativeElement.value;
  }

  ngOnDestroy(): void {
    this.iti?.destroy();
  }
}
