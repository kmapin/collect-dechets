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

  onInput(valeur: string): void {
    this.value = valeur;
    this.valueChange.emit(valeur);
  }
}
