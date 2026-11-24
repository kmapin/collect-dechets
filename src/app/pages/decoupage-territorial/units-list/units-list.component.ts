import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TerritoryService } from '../services/territory.service';
import { ImportParserService } from '../services/import-parser.service';
import { TerritorialUnit, TerritorialProfile, TYPE_LABELS } from '../models/models';
import { PageHeaderComponent } from '../../../shared/decoupage-territorial/page-header.component';
import { TypeBadgeComponent } from '../../../shared/decoupage-territorial/type-badge.component';
import { StatusPillComponent } from '../../../shared/decoupage-territorial/status-pill.component';
import { formatDate } from '../services/territorial-utils';
import { Search, Plus, Download, Eye, Pencil, ChevronLeft, ChevronRight, RefreshCw, Map as MapIcon } from 'lucide-angular';
import { IconComponent } from '../../../shared/decoupage-territorial//icon.component';

@Component({
  selector: 'app-units-list',
  standalone: true,
  imports: [
    RouterLink,
    PageHeaderComponent,
    TypeBadgeComponent,
    StatusPillComponent,
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

  profiles: TerritorialProfile[];
  selectedCountry = signal('');
  searchText = signal('');
  selectedType = signal('');
  activeFilter = signal<'all' | 'active' | 'inactive'>('all');
  page = signal(1);
  pageSize = 15;

  Math = Math;

  constructor(public territory: TerritoryService, private parser: ImportParserService) {
    this.profiles = this.territory.getProfiles();
    if (this.profiles.length > 0) this.selectedCountry.set(this.profiles[0].country_code);
    this.load();
  }

  get typeOptions() {
    const profile = this.profiles.find((p) => p.country_code === this.selectedCountry());
    return profile?.types ?? [];
  }

  get typeLabel(): typeof TYPE_LABELS {
    return TYPE_LABELS;
  }

  icons = { Search, Plus, Download, Eye, Pencil, ChevronLeft, ChevronRight, RefreshCw, MapIcon };

  load() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = this.territory.listUnits({
        search: this.searchText() || undefined,
        countryCode: this.selectedCountry() || undefined,
        typeCode: this.selectedType() || undefined,
        activeOnly: this.activeFilter() === 'active' ? true : this.activeFilter() === 'inactive' ? false : undefined,
        page: this.page(),
        pageSize: this.pageSize,
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

  onActiveFilter(value: 'all' | 'active' | 'inactive') {
    this.activeFilter.set(value);
    this.page.set(1);
    this.load();
  }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
    this.load();
  }

  totalPages() {
    return Math.max(1, Math.ceil(this.total() / this.pageSize));
  }

  downloadTemplate() {
    const profile = this.profiles.find((p) => p.country_code === this.selectedCountry());
    if (!profile) return;
    this.parser.generateTemplate(profile).then((blob) => {
      this.parser.downloadBlob(blob, `modele-territorial-${profile.country_code}.csv`);
    });
  }

  fmt = formatDate;
}
