import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Periode } from '../../models';
import { decalerPeriode, labelPeriodeFr } from '../../utils/periode.util';

@Component({
  selector: 'app-month-selector',
  standalone: true,
  imports: [],
  templateUrl: './month-selector.component.html',
  styleUrl: './month-selector.component.scss',
})
export class MonthSelectorComponent {
  @Input({ required: true }) periode!: Periode;
  @Output() periodeChange = new EventEmitter<Periode>();

  get label(): string {
    return labelPeriodeFr(this.periode);
  }

  precedent(): void {
    this.periodeChange.emit(decalerPeriode(this.periode, -1));
  }

  suivant(): void {
    this.periodeChange.emit(decalerPeriode(this.periode, 1));
  }
}
