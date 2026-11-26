import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-type-badge',
  standalone: true,
  template: `<span class="badge" [class]="'badge-' + colorClass">{{ label }}</span>`,
  styles: [
    `
      .badge {
        display: inline-flex;
        align-items: center;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
        line-height: 1.3;
        white-space: nowrap;
      }
      .badge-country {
        background: #eff6ff;
        color: #1d4ed8;
      }
      .badge-region {
        background: #eef2ff;
        color: #4338ca;
      }
      .badge-province {
        background: #ecfdf5;
        color: #047857;
      }
      .badge-city {
        background: #ecfdf5;
        color: #15803d;
      }
      .badge-arrondissement {
        background: #fff7ed;
        color: #c2410c;
      }
      .badge-sector,
      .badge-village,
      .badge-neighborhood {
        background: #f1f5f9;
        color: #475569;
      }
      .badge-custom {
        background: #faf5ff;
        color: #7e22ce;
      }
    `,
  ],
})
export class TypeBadgeComponent {
  @Input() typeCode = '';
  @Input() label = '';

  get colorClass(): string {
    return this.typeCode.toLowerCase();
  }
}
