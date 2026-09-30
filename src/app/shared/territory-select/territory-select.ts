import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface TerritoryOption {
  value: string | number;
  label: string;
}

/** Transforme une liste de territoires ({name} — TerritoryHttpService — ou string brute)
 * en options pour app-territory-select. Pour un id numérique, mapper manuellement au
 * call site (ex. secteur filtré par id) plutôt que d'étendre cette fonction. */
export function toTerritoryOptions(items: Array<{ name: string } | string> | null | undefined): TerritoryOption[] {
  return (items || []).map((i) => (typeof i === 'string' ? { value: i, label: i } : { value: i.name, label: i.name }));
}

/** Variante par id (ex. quartiers-management.ts, formulaire qui stocke cityId/
 * arrondissementId/sectorId plutôt que les noms). */
export function toTerritoryOptionsById(items: Array<{ id: string | number; name: string }> | null | undefined): TerritoryOption[] {
  return (items || []).map((i) => ({ value: i.id, label: i.name }));
}

/**
 * Remplace un `<select>` à liste longue (villes, arrondissements, secteurs, quartiers)
 * par un champ texte filtrable — même interaction que le sélecteur de collecteur
 * d'admin-dashboard.html (recherche locale sur une liste déjà chargée, clic pour
 * choisir, "×" pour effacer). Value-agnostique (string ou number) pour couvrir aussi
 * bien les selects "par nom" que "par id" existants.
 */
@Component({
  selector: 'app-territory-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './territory-select.html',
  styleUrl: './territory-select.scss',
})
export class TerritorySelectComponent {
  @Input() options: TerritoryOption[] = [];
  @Input() value: string | number | null = null;
  @Input() placeholder = 'Rechercher…';
  @Input() disabled = false;
  /** Libellé d'une option "toutes/tous" en tête de liste (barres de filtre) — absent
   * (undefined/null) pour un champ de formulaire où une sélection est requise. */
  @Input() allLabel: string | null = null;

  @Output() valueChange = new EventEmitter<string | number | null>();

  search = '';
  dropdownOpen = false;

  get displayLabel(): string {
    if (this.value === null || this.value === undefined || this.value === '') return '';
    return this.options.find((o) => o.value === this.value)?.label ?? '';
  }

  get suggestions(): TerritoryOption[] {
    const term = this.search.trim().toLowerCase();
    if (!term) return this.options;
    return this.options.filter((o) => o.label.toLowerCase().includes(term));
  }

  openDropdown(): void {
    if (this.disabled) return;
    this.search = '';
    this.dropdownOpen = true;
  }

  closeDropdown(): void {
    // Délai court pour laisser le (click) sur une <li> s'exécuter avant la fermeture.
    setTimeout(() => (this.dropdownOpen = false), 150);
  }

  choose(opt: TerritoryOption | null): void {
    this.value = opt ? opt.value : null;
    this.search = '';
    this.dropdownOpen = false;
    this.valueChange.emit(this.value);
  }

  clear(): void {
    this.choose(null);
  }
}
