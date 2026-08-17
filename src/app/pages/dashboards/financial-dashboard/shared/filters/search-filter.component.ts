import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-filter',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './search-filter.component.html',
  styleUrl: './search-filter.component.scss',
})
export class SearchFilterComponent {
  @Input() placeholder = 'Rechercher…';
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();
  // Permet à un consommateur d'afficher une liste par défaut (ex. tous les clients de
  // l'agence) au clic dans le champ, avant même la première frappe.
  @Output() focused = new EventEmitter<void>();

  onInput(valeur: string): void {
    this.value = valeur;
    this.valueChange.emit(valeur);
  }
}
