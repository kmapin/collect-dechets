import { Injectable, signal, computed } from '@angular/core';
import { TeamFilter } from '../models/team.model';

@Injectable({ providedIn: 'root' })
export class TeamStore {

  // ── View state ────────────────────────────────────────────
  viewMode    = signal<'table' | 'grid'>('table');
  showFilters = signal(false);
  currentPage = signal(1);
  readonly pageSize = 8;

  // ── Filter state ──────────────────────────────────────────
  filter = signal<TeamFilter>({
    search: '',
    status: '',
    hasVehicle: null,
    sortBy: 'name',
    sortDir: 'asc',
  });

  // ── Active filter count (for badge) ──────────────────────
  activeFilterCount = computed(() => {
    const f = this.filter();
    let n = 0;
    if (f.status)             n++;
    if (f.hasVehicle !== null) n++;
    if (f.search)             n++;
    return n;
  });

  // ── Patch filter helpers ──────────────────────────────────
  setSearch(v: string): void {
    this.filter.update(f => ({ ...f, search: v }));
    this.currentPage.set(1);
  }

  setStatus(v: string): void {
    const cur = this.filter().status;
    this.filter.update(f => ({ ...f, status: cur === v ? '' : v as TeamFilter['status'] }));
    this.currentPage.set(1);
  }

  setHasVehicle(v: boolean | null): void {
    this.filter.update(f => ({ ...f, hasVehicle: v }));
    this.currentPage.set(1);
  }

  setSortBy(v: TeamFilter['sortBy']): void {
    this.filter.update(f => ({ ...f, sortBy: v }));
  }

  toggleSortDir(): void {
    this.filter.update(f => ({ ...f, sortDir: f.sortDir === 'asc' ? 'desc' : 'asc' }));
  }

  clearFilters(): void {
    this.filter.set({ search: '', status: '', hasVehicle: null, sortBy: 'name', sortDir: 'asc' });
    this.currentPage.set(1);
  }
}
