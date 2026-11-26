import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { API_UNIT_TYPE_CODES, TerritoryService } from '../services/territory.service';
import { TerritorialUnit, TYPE_LABELS } from '../models/models';
import { PageHeaderComponent } from '../../../shared/decoupage-territorial/page-header.component';
import { TypeBadgeComponent } from '../../../shared/decoupage-territorial/type-badge.component';
import { formatDate } from '../services/territorial-utils';
import { Search, Plus, Eye, Pencil, ChevronLeft, ChevronRight, RefreshCw, Map as MapIcon } from 'lucide-angular';
import { IconComponent } from '../../../shared/decoupage-territorial//icon.component';

@Component({
  selector: 'app-units-list',
  standalone: true,
  imports: [
    RouterLink,
    PageHeaderComponent,
    TypeBadgeComponent,
    IconComponent,
  ],
  templateUrl: './units-list.component.html',
  styleUrl: './units-list.component.scss',
})
export class UnitsListComponent {
  units = signal<TerritorialUnit[]>([]);
  total = signal(0);
  loading = signal(false);
  error = signal<string | null>(null);

  countries: TerritorialUnit[] = [];
  selectedCountry = signal('');
  searchText = signal('');
  selectedType = signal('');
  page = signal(1);
  pageSize = signal(15);

  constructor(public territory: TerritoryService) {
    void this.initialize();
  }

  private async initialize() {
    try {
      await this.territory.loadApiUnits();
      this.countries = this.territory.getApiUnits().filter((unit) => unit.type_code === 'COUNTRY');
      if (this.countries.length > 0) this.selectedCountry.set(this.countries[0].country_code);
      this.load();
    } catch (e: any) {
      this.error.set(e?.message || 'Impossible de charger les données territoriales.');
      this.loading.set(false);
    }
  }

  get typeOptions() {
    return API_UNIT_TYPE_CODES.map((code) => ({
      code,
      label: TYPE_LABELS[code] ?? code,
    }));
  }

  get typeLabel(): typeof TYPE_LABELS {
    return TYPE_LABELS;
  }

  icons = { Search, Plus, Eye, Pencil, ChevronLeft, ChevronRight, RefreshCw, MapIcon };

  async load() {
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.territory.loadApiUnits();
      const result = this.territory.apiListUnits({
        search: this.searchText() || undefined,
        countryCode: this.selectedCountry() || undefined,
        typeCode: this.selectedType() || undefined,
        page: this.page(),
        pageSize: this.pageSize(),
      });
      this.units.set(result.data);
      this.total.set(result.total);
    } catch (e: any) {
      this.error.set(e.message);
    } finally {
      this.loading.set(false);
    }
  }

  onSearch(value: string) {
    this.searchText.set(value);
    this.page.set(1);
    this.load();
  }

  onCountryChange(value: string) {
    this.selectedCountry.set(value);
    this.selectedType.set('');
    this.page.set(1);
    this.load();
  }

  onTypeChange(value: string) {
    this.selectedType.set(value);
    this.page.set(1);
    this.load();
  }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    this.load();
  }

  onPageSizeChange(size: number) {
    if (!Number.isInteger(size) || size < 1 || size === this.pageSize()) return;
    this.pageSize.set(size);
    this.page.set(1);
    this.load();
  }

  numerosDePages(): number[] {
    const maxAffiches = 5;
    const moitie = Math.floor(maxAffiches / 2);
    let debut = Math.max(1, this.page() - moitie);
    const fin = Math.min(this.totalPages(), debut + maxAffiches - 1);
    if (fin - debut + 1 < maxAffiches) {
      debut = Math.max(1, fin - maxAffiches + 1);
    }

    const pages: number[] = [];
    for (let numero = debut; numero <= fin; numero++) pages.push(numero);
    return pages;
  }

  debutItem(): number {
    return this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1;
  }

  finItem(): number {
    return Math.min(this.page() * this.pageSize(), this.total());
  }

  totalPages() {
    return Math.max(1, Math.ceil(this.total() / this.pageSize()));
  }

  fmt = formatDate;
}
