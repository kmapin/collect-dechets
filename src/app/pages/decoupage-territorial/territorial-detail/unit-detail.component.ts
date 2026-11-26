import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, map } from 'rxjs';
import { TerritoryService } from '../services/territory.service';
import { TerritorialUnit, TYPE_LABELS } from '../models/models';
import { PageHeaderComponent } from '../../../shared/decoupage-territorial/page-header.component';
import { TypeBadgeComponent } from '../../../shared/decoupage-territorial/type-badge.component';
import { StatusPillComponent } from '../../../shared/decoupage-territorial/status-pill.component';
import { formatDate } from '../services/territorial-utils';
import { Pencil, ChevronDown, ChevronRight, Ban, CheckCircle2, AlertTriangle, Plus, Trash2 } from 'lucide-angular';
import { IconComponent } from '../../../shared/decoupage-territorial/icon.component';

interface TreeNode {
  unit: TerritorialUnit;
  children: TreeNode[];
  expanded: boolean;
}

@Component({
  selector: 'app-unit-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent, TypeBadgeComponent, StatusPillComponent, IconComponent],
  templateUrl: './unit-detail.component.html',
  styleUrl: './unit-detail.component.scss',
})
export class UnitDetailComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private loadSequence = 0;

  unit = signal<TerritorialUnit | null>(null);
  ancestors = signal<TerritorialUnit[]>([]);
  tree = signal<TreeNode | null>(null);
  children = signal<TerritorialUnit[]>([]);
  loading = signal(true);
  actionError = signal<string | null>(null);
  actionWarning = signal<string | null>(null);
  TYPE_LABELS = TYPE_LABELS;
  icons = { Pencil, ChevronDown, ChevronRight, Ban, CheckCircle2, AlertTriangle, Plus, Trash2 };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public territory: TerritoryService
  ) {}

  ngOnInit() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id') ?? ''),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((id) => void this.load(id));
  }

  async load(id: string) {
    const sequence = ++this.loadSequence;
    this.loading.set(true);
    this.actionError.set(null);
    this.actionWarning.set(null);
    this.unit.set(null);
    this.ancestors.set([]);
    this.children.set([]);
    this.tree.set(null);

    try {
      await this.territory.loadApiUnits();
      if (sequence !== this.loadSequence) return;

      const unit = this.territory.getApiUnit(id);
      if (!unit) {
        return;
      }
      this.unit.set(unit);
      this.ancestors.set(this.territory.getApiAncestors(unit));
      this.children.set(this.territory.getApiChildren(id));

      const descendants = this.territory.getApiDescendants(id);
      const root: TreeNode = { unit, children: [], expanded: true };
      const nodeMap = new Map<string, TreeNode>([[id, root]]);
      for (const d of descendants) {
        nodeMap.set(d.id, { unit: d, children: [], expanded: false });
      }
      for (const d of descendants) {
        const node = nodeMap.get(d.id)!;
        if (d.parent_id && nodeMap.has(d.parent_id)) {
          nodeMap.get(d.parent_id)!.children.push(node);
        }
      }
      this.tree.set(root);
    } catch (e: unknown) {
      if (sequence === this.loadSequence) {
        this.actionError.set(
          e instanceof Error ? e.message : 'Impossible de charger cette unité territoriale.',
        );
      }
    } finally {
      if (sequence === this.loadSequence) this.loading.set(false);
    }
  }

  toggle(node: TreeNode) {
    node.expanded = !node.expanded;
  }

  async toggleActive() {
    this.actionError.set(null);
    this.actionWarning.set(
      'Le contrat API ne fournit pas de champ actif/inactif pour ces unités territoriales.',
    );
  }

  async deleteUnit() {
    const unit = this.unit();
    if (!unit) return;
    if (!window.confirm(`Supprimer « ${unit.name} » ? Cette action est irréversible.`)) return;

    this.actionError.set(null);
    try {
      await this.territory.deleteApiUnit(
        unit.id,
        unit.type_code as 'COUNTRY' | 'CITY' | 'ARRONDISSEMENT' | 'SECTOR' | 'NEIGHBORHOOD',
      );
      await this.router.navigate(['/territorial/units']);
    } catch (e: any) {
      this.actionError.set(e?.message || 'Impossible de supprimer cette unité territoriale.');
    }
  }

  allowedChildrenTypes(unit: TerritorialUnit): { code: string; label: string }[] {
    const profile = this.territory.getApiProfile(unit.country_code);
    return profile.allowed_relations
      .filter((r) => r.parent === unit.type_code)
      .map((r) => ({
        code: r.child,
        label: profile.types.find((t) => t.code === r.child)?.label ?? r.child,
      }));
  }

  fmt = formatDate;
}
