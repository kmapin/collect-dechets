import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TerritoryService } from '../services/territory.service';
import { TerritorialUnit, TYPE_LABELS } from '../models/models';
import { PageHeaderComponent } from '../../../shared/decoupage-territorial/page-header.component';
import { TypeBadgeComponent } from '../../../shared/decoupage-territorial/type-badge.component';
import { StatusPillComponent } from '../../../shared/decoupage-territorial/status-pill.component';
import { formatDate } from '../services/territorial-utils';
import { Pencil, ChevronDown, ChevronRight, Ban, CheckCircle2, AlertTriangle, Plus } from 'lucide-angular';
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
  unit = signal<TerritorialUnit | null>(null);
  ancestors = signal<TerritorialUnit[]>([]);
  tree = signal<TreeNode | null>(null);
  children = signal<TerritorialUnit[]>([]);
  loading = signal(true);
  actionError = signal<string | null>(null);
  actionWarning = signal<string | null>(null);
  TYPE_LABELS = TYPE_LABELS;
  icons = { Pencil, ChevronDown, ChevronRight, Ban, CheckCircle2, AlertTriangle, Plus };

  constructor(
    private route: ActivatedRoute,
    public territory: TerritoryService
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    await this.load(id);
  }

  async load(id: string) {
    this.loading.set(true);
    try {
      const unit = this.territory.getUnit(id);
      if (!unit) {
        this.unit.set(null);
        return;
      }
      this.unit.set(unit);
      this.ancestors.set(this.territory.getAncestors(unit.ancestor_ids));
      this.children.set(this.territory.getChildren(id));

      const descendants = this.territory.getDescendants(id);
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
    } finally {
      this.loading.set(false);
    }
  }

  toggle(node: TreeNode) {
    node.expanded = !node.expanded;
  }

  async toggleActive() {
    const unit = this.unit();
    if (!unit) return;
    this.actionError.set(null);
    this.actionWarning.set(null);

    if (unit.active) {
      const childCount = this.territory.countChildren(unit.id);
      if (childCount > 0) {
        this.actionWarning.set(
          `Cette unité a ${childCount} subdivision(s). La désactivation ne désactive pas automatiquement les enfants : pensez à les traiter si nécessaire.`
        );
      }
      this.territory.setUnitActive(unit.id, false);
      this.territory.logAudit('DEACTIVATE', 'territorial_units', unit.id, unit.name, {});
    } else {
      this.territory.setUnitActive(unit.id, true);
      this.territory.logAudit('ACTIVATE', 'territorial_units', unit.id, unit.name, {});
    }
    await this.load(unit.id);
  }

  allowedChildrenTypes(unit: TerritorialUnit): { code: string; label: string }[] {
    const profile = this.territory.getProfile(unit.country_code);
    if (!profile) return [];
    return profile.allowed_relations
      .filter((r) => r.parent === unit.type_code)
      .map((r) => ({
        code: r.child,
        label: profile.types.find((t) => t.code === r.child)?.label ?? r.child,
      }));
  }

  fmt = formatDate;
}
