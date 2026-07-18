import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type PeriodSelectorMode = 'court' | 'long';

@Component({
  selector: 'app-period-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './period-selector.component.html',
  styleUrl: './period-selector.component.scss',
})
export class PeriodSelectorComponent {
  @Input() mode: PeriodSelectorMode = 'court';
  @Output() modeChange = new EventEmitter<PeriodSelectorMode>();

  choisir(mode: PeriodSelectorMode): void {
    if (mode === this.mode) return;
    this.mode = mode;
    this.modeChange.emit(mode);
  }
}
