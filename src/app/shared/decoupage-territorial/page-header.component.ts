import { Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Breadcrumb, BreadcrumbItem } from '../breadcrumb/breadcrumb';
import { AuthService } from '../../services/auth.service';
import { dashboardLabelForRole, dashboardRouteForRole } from '../notification-route.util';
import { TerritorialNavigationComponent } from './territorial-navigation.component';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [RouterLink, Breadcrumb, TerritorialNavigationComponent],
  template: `
    <header class="page-layout-header">
      <div class="page-layout-breadcrumb">
        <app-breadcrumb [items]="breadcrumbItems" variant="onColor" />
      </div>
      <div class="page-layout-header__inner">
      <div class="header-left">
        @if (backLink) {
          <a [routerLink]="backLink" class="back-link">
            <span aria-hidden="true">←</span>
            <span>Retour</span>
          </a>
        }
        <div class="heading-copy">
          <h1>{{ title }}</h1>
          @if (subtitle) {
            <p class="subtitle">{{ subtitle }}</p>
          }
        </div>
      </div>
      <div class="header-actions">
        <ng-content />
      </div>
      </div>
    </header>
    <app-territorial-navigation />
  `,
  styles: [
    `
      :host {
        display: block;
        position: relative;
        left: 50%;
        width: 100vw;
        margin-top: calc(0px - var(--territorial-page-gutter, 24px));
        margin-left: -50vw;
        margin-bottom: 24px;
      }

      .page-layout-header {
        padding: 22px var(--territorial-page-gutter, 24px);
        color: #fff;
        background: linear-gradient(135deg, #3b82f6 0%, #4caf50 100%);
      }

      .page-layout-breadcrumb {
        width: min(1400px, 100%);
        margin: 0 auto 6px;
      }

      .page-layout-header__inner {
        width: min(1400px, 100%);
        min-height: 84px;
        margin: 0 auto;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 24px;
        flex-wrap: wrap;
      }

      .header-left {
        display: flex;
        align-items: center;
        gap: 16px;
        min-width: 0;
        flex: 1;
      }

      .heading-copy {
        min-width: 0;
      }

      h1 {
        margin: 0;
        color: #fff;
        font-size: clamp(1.5rem, 3vw, 2.5rem);
        font-weight: 700;
        line-height: 1.2;
        overflow-wrap: anywhere;
      }

      .subtitle {
        max-width: 760px;
        margin: 6px 0 0;
        color: rgba(255, 255, 255, 0.9);
        font-size: clamp(0.875rem, 1.3vw, 1.1rem);
        line-height: 1.5;
      }

      .back-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        min-height: 38px;
        padding: 0 12px;
        border: 1px solid rgba(255, 255, 255, 0.4);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.16);
        color: #fff;
        text-decoration: none;
        font-size: 13px;
        font-weight: 600;
        white-space: nowrap;
        transition: background 0.15s ease;

        &:hover {
          background: rgba(255, 255, 255, 0.28);
        }

        &:focus-visible {
          outline: 2px solid #fff;
          outline-offset: 3px;
        }
      }

      .header-actions {
        display: flex;
        gap: 8px;
        align-items: center;
        justify-content: flex-end;
        flex-wrap: wrap;
      }

      :host ::ng-deep .header-actions .btn {
        min-height: 40px;
        border-radius: 8px;
      }

      :host ::ng-deep .header-actions .btn-primary {
        background: #15803d;
        border-color: #15803d;
        box-shadow: 0 2px 8px rgba(15, 82, 64, 0.2);

        &:hover:not(:disabled) {
          background: #166534;
          border-color: #166534;
        }
      }

      :host ::ng-deep .header-actions .btn-secondary {
        border-color: rgba(255, 255, 255, 0.65);
        background: rgba(255, 255, 255, 0.14);
        color: #fff;

        &:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.26);
        }
      }

      @media (max-width: 640px) {
        .page-layout-header {
          padding-block: 18px;
        }

        .page-layout-header__inner,
        .header-left {
          align-items: flex-start;
        }

        .page-layout-header__inner {
          flex-direction: column;
          gap: 14px;
        }

        .header-actions {
          width: 100%;
          justify-content: flex-start;
        }
      }
    `,
  ],
})
export class PageHeaderComponent {
  private readonly auth = inject(AuthService);

  @Input() title = '';
  @Input() subtitle = '';
  @Input() backLink: string | null = null;

  get breadcrumbItems(): BreadcrumbItem[] {
    if (!this.title) {
      return [];
    }

    const role = this.auth.getCurrentUser()?.role;
    const dashboard: BreadcrumbItem = {
      label: dashboardLabelForRole(role),
      route: dashboardRouteForRole(role),
      icon: 'home',
    };
    if (this.title === 'Unités territoriales') {
      return [dashboard, { label: this.title }];
    }

    const parent: BreadcrumbItem = this.title.startsWith('Prévisualisation')
      ? { label: 'Importer des données territoriales', route: '/territorial/import' }
      : { label: 'Unités territoriales', route: '/territorial/units' };

    return [dashboard, parent, { label: this.title }];
  }
}
