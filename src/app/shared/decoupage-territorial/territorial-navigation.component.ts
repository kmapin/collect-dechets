import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FileSpreadsheet, History, Map, ScrollText } from 'lucide-angular';
import { IconComponent } from './icon.component';
import { TERRITORIAL_IMPORT_HISTORY_AUDIT_ENABLED } from './feature-visibility';

@Component({
  selector: 'app-territorial-navigation',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  template: `
    <nav class="topbar-nav" aria-label="Navigation principale">
      @for (item of navItems; track item.path) {
        <a
          [routerLink]="item.path"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: item.exact }"
          class="nav-item"
        >
          <app-icon [icon]="item.icon" [size]="16" />
          <span>{{ item.label }}</span>
        </a>
      }
    </nav>
  `,
  styles: [
    `
      :host {
        display: block;
        padding: 10px var(--territorial-page-gutter, 24px) 0;
      }

      .topbar-nav {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        width: min(1400px, 100%);
        min-height: 56px;
        margin: 0 auto;
        padding: 5px;
        border: 1px solid var(--territorial-border, #e2e8f0);
        border-radius: 12px;
        background: #fff;
        box-shadow: var(--territorial-shadow, 0 1px 4px rgba(0, 0, 0, 0.06));
        overflow-x: auto;
        scrollbar-width: none;
      }

      .topbar-nav::-webkit-scrollbar {
        display: none;
      }

      .nav-item {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 44px;
        padding: 0 16px;
        border-radius: 8px;
        color: var(--territorial-text-secondary, #475569);
        text-decoration: none;
        font-size: 13px;
        font-weight: 600;
        white-space: nowrap;
        transition: color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
      }

      .nav-item:hover {
        color: var(--territorial-text-primary, #0f172a);
        background: #f1f5f9;
      }

      .nav-item.active {
        color: #fff;
        background: var(--territorial-blue, #3b82f6);
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.24);
      }

      .nav-item:focus-visible {
        outline: 2px solid var(--territorial-blue, #3b82f6);
        outline-offset: 2px;
      }

      @media (max-width: 768px) {
        :host {
          padding: 8px 16px 0;
        }

        .topbar-nav {
          justify-content: center;
          min-height: 52px;
        }

        .nav-item {
          min-height: 42px;
          padding: 0 12px;
          font-size: 13px;
        }
      }

      @media (max-width: 480px) {
        :host {
          padding-inline: 12px;
        }

        .topbar-nav {
          justify-content: flex-start;
        }

        .nav-item {
          gap: 6px;
          padding-inline: 10px;
          font-size: 12px;
        }
      }
    `,
  ],
})
export class TerritorialNavigationComponent {
  private readonly icons = { Map, FileSpreadsheet, History, ScrollText };

  readonly navItems = [
    { path: '/territorial/units', label: 'Unités territoriales', icon: this.icons.Map, exact: false },
    { path: '/territorial/import', label: 'Importer Excel / CSV', icon: this.icons.FileSpreadsheet, exact: false },
    ...(TERRITORIAL_IMPORT_HISTORY_AUDIT_ENABLED
      ? [
          { path: '/territorial/import/history', label: 'Historique des imports', icon: this.icons.History, exact: false },
          { path: '/territorial/audit', label: "Journal d'audit", icon: this.icons.ScrollText, exact: false },
        ]
      : []),
  ];
}
