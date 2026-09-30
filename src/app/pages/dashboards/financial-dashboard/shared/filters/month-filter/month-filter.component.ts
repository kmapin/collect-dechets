import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Periode } from '../../models';

// Sélecteur de mois natif (<input type="month">) — F4 : filtre des retraits par période.
@Component({
  selector: 'app-month-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './month-filter.component.html',
  styleUrl: './month-filter.component.scss',
})
export class MonthFilterComponent {
  @Input() label = 'Filtrer par mois';
  @Output() periodeChange = new EventEmitter<Periode | null>();

  valeur = ''; // format natif "YYYY-MM"

  onChange(valeur: string): void {
    this.valeur = valeur;
    if (!valeur) {
      this.periodeChange.emit(null);
      return;
    }
    const [annee, mois] = valeur.split('-').map(Number);
    this.periodeChange.emit({ annee, mois });
  }

  effacer(): void {
    this.valeur = '';
    this.periodeChange.emit(null);
  }
}
