import { Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface MultiSelectOption {
  value: string | number;
  label: string;
}

/** Même convention que territory-select.ts::toTerritoryOptions — accepte une liste de
 * strings brutes (quartiers, etc.) ou d'objets {name}. */
export function toMultiSelectOptions(items: Array<{ name: string } | string> | null | undefined): MultiSelectOption[] {
  return (items || []).map((i) => (typeof i === 'string' ? { value: i, label: i } : { value: i.name, label: i.name }));
}

/**
 * Multi-sélection avec puces + recherche locale — même mécanique d'ouverture/fermeture
 * que app-territory-select (mousedown+preventDefault sur les options pour éviter la
 * course blur/click), déclinée pour plusieurs valeurs au lieu d'une seule. Remplace
 * p-multiSelect (PrimeNG) qui avait un défaut d'animation à l'ouverture et une couleur de
 * focus non alignée avec le reste de l'appli.
 *
 * Le panneau est en `position: fixed`, coordonnées calculées en JS (getBoundingClientRect)
 * plutôt qu'en `position: absolute` classique : ce composant est utilisé dans des drawers
 * au corps `overflow-y: auto` (ex. "Définir les zones couvertes") — un panneau absolu
 * imbriqué s'y retrouve tronqué par ce overflow dès qu'il dépasse la zone visible/
 * défilée, exactement le bug déjà rencontré avec le sélecteur de téléphone
 * (appPhoneInput/attachDropdownToBody) et p-multiSelect (appendTo="body"). `position:
 * fixed` échappe au clipping de l'ancêtre scrollable sans avoir à déplacer le nœud DOM
 * dans <body> (jamais de `transform`/`filter` sur les ancêtres drawer de cette appli,
 * vérifié — sinon `position: fixed` resterait piégé dans leur contexte).
 */
@Component({
  selector: 'app-multi-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './multi-select.html',
  styleUrl: './multi-select.scss',
})
export class MultiSelectComponent implements OnDestroy {
  @Input() options: MultiSelectOption[] = [];
  @Input() value: Array<string | number> = [];
  @Input() placeholder = 'Sélectionner…';
  @Input() searchPlaceholder = 'Rechercher…';
  @Input() disabled = false;

  @Output() valueChange = new EventEmitter<Array<string | number>>();

  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('control') controlRef?: ElementRef<HTMLDivElement>;

  search = '';
  dropdownOpen = false;
  dropdownStyle: { top: string; left: string; width: string } = { top: '0px', left: '0px', width: '0px' };

  private readonly onViewportChange = () => this.updateDropdownPosition();

  get selectedOptions(): MultiSelectOption[] {
    return this.options.filter((o) => this.value.includes(o.value));
  }

  get suggestions(): MultiSelectOption[] {
    const term = this.search.trim().toLowerCase();
    if (!term) return this.options;
    return this.options.filter((o) => o.label.toLowerCase().includes(term));
  }

  isSelected(opt: MultiSelectOption): boolean {
    return this.value.includes(opt.value);
  }

  /** mousedown sur le fond du contrôle (pas sur l'input/un chip) : sans preventDefault,
   * le comportement par défaut du navigateur reprend la main APRÈS ce handler et retire
   * aussitôt le focus qu'on vient de donner à l'input (la cible du mousedown — ce <div> —
   * n'est elle-même pas focusable), ce qui déclenche un blur -> fermeture immédiate.
   * Repro isolée (hors app) confirmée avant ce correctif : la pastille s'ouvrait et se
   * refermait dans le même clic, rendant le composant inutilisable au clic. */
  onControlMouseDown(event: MouseEvent): void {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    this.focusInput();
  }

  focusInput(): void {
    if (this.disabled) return;
    this.openDropdown();
    this.searchInputRef?.nativeElement.focus();
  }

  openDropdown(): void {
    if (this.disabled) return;
    this.dropdownOpen = true;
    this.updateDropdownPosition();
    // capture=true : attrape aussi le scroll d'un ancêtre non-window (ex. .drawer-body),
    // qui ne remonte jamais jusqu'à window en phase de bulles.
    document.addEventListener('scroll', this.onViewportChange, true);
    window.addEventListener('resize', this.onViewportChange);
  }

  closeDropdown(): void {
    // Délai court pour laisser le (mousedown) sur une <li>/un chip s'exécuter avant la
    // fermeture (même motif que territory-select.ts::closeDropdown).
    setTimeout(() => {
      this.dropdownOpen = false;
      this.detachViewportListeners();
    }, 150);
  }

  private updateDropdownPosition(): void {
    const el = this.controlRef?.nativeElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    this.dropdownStyle = {
      top: `${rect.bottom + 4}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
    };
  }

  private detachViewportListeners(): void {
    document.removeEventListener('scroll', this.onViewportChange, true);
    window.removeEventListener('resize', this.onViewportChange);
  }

  toggle(opt: MultiSelectOption): void {
    if (this.disabled) return;
    const next = this.isSelected(opt) ? this.value.filter((v) => v !== opt.value) : [...this.value, opt.value];
    this.value = next;
    this.valueChange.emit(next);
  }

  removeChip(value: string | number): void {
    if (this.disabled) return;
    const next = this.value.filter((v) => v !== value);
    this.value = next;
    this.valueChange.emit(next);
  }

  ngOnDestroy(): void {
    this.detachViewportListeners();
  }
}
