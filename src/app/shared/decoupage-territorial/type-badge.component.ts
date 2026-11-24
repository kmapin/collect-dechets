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
        padding: 3px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
        white-space: nowrap;
      }
      .badge-country {
        background: var(--color-primary-100);
        color: var(--color-primary-700);
      }
      .badge-region {
        background: #e3eefc;
        color: #1c4e8a;
      }
      .badge-province {
        background: #eaf3ec;
        color: #2a6b3f;
      }
      .badge-city {
        background: var(--color-accent-100);
        color: var(--color-accent-600);
      }
      .badge-arrondissement {
        background: #fce8e8;
        color: #a02828;
      }
      .badge-sector,
      .badge-village,
      .badge-neighborhood {
        background: var(--color-neutral-100);
        color: var(--color-neutral-600);
      }
      .badge-custom {
        background: #f0e9f7;
        color: #6b3a8a;
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
