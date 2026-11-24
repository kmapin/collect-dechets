import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-status-pill',
  standalone: true,
  template: `
    <span class="pill" [class.active]="active" [class.inactive]="!active">
      <span class="dot"></span>
      {{ active ? 'Actif' : 'Inactif' }}
    </span>
  `,
  styles: [
    `
      .pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 3px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
      }
      .pill.active {
        background: var(--color-success-100);
        color: var(--color-success-500);
      }
      .pill.inactive {
        background: var(--color-neutral-100);
        color: var(--color-neutral-500);
      }
      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
      }
    `,
  ],
})
export class StatusPillComponent {
  @Input() active = true;
}
