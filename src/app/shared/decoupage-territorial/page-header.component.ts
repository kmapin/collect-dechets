import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-layout-header">
      <div class="header-left">
        @if (backLink) {
          <a [routerLink]="backLink" class="back-link">← Retour</a>
        }
        <h1>{{ title }}</h1>
        @if (subtitle) {
          <p class="subtitle">{{ subtitle }}</p>
        }
      </div>
      <div class="header-actions">
        <ng-content />
      </div>
    </div>
  `,
  styles: [
    `
      .page-layout-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        margin-bottom: 24px;
        flex-wrap: wrap;
      }
      h1 {
        font-size: 24px;
        font-weight: 600;
      }
      .subtitle {
        margin: 6px 0 0;
        color: var(--color-neutral-500);
        font-size: 14px;
      }
      .back-link {
        display: inline-block;
        margin-bottom: 8px;
        color: var(--color-primary-600);
        text-decoration: none;
        font-size: 13px;
        font-weight: 500;
        &:hover {
          text-decoration: underline;
        }
      }
      .header-actions {
        display: flex;
        gap: 10px;
        align-items: center;
        flex-wrap: wrap;
      }
    `,
  ],
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() backLink: string | null = null;
}
