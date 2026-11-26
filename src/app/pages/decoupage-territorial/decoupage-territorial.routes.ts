import { Routes } from '@angular/router';
import { UnitsListComponent } from './units-list/units-list.component';
import { UnitDetailComponent } from './territorial-detail/unit-detail.component';
import { UnitFormComponent } from './unit-form/unit-form.component';
import { ImportPageComponent } from './territorial-import/import-page/import-page.component';
import { ImportHistoryComponent } from './territorial-import/import-history/import-history.component';
import { ImportPreviewComponent } from './territorial-import/import-preview/import-preview.component';
import { AuditLogComponent } from './audit-log/audit-log.component';
import { TERRITORIAL_IMPORT_HISTORY_AUDIT_ENABLED } from './feature-visibility';

export const DECOUPAGE_TERRITORIAL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./decoupage-layout/decoupage-layout').then(m => m.DecoupageLayout),
    children: [
      { path: '', redirectTo: 'units', pathMatch: 'full' },
      { path: 'units', component: UnitsListComponent },
      { path: 'units/new', component: UnitFormComponent },
      { path: 'units/:id', component: UnitDetailComponent },
      { path: 'units/:id/edit', component: UnitFormComponent },
      { path: 'import', component: ImportPageComponent },
      {
        path: 'import/history',
        ...(TERRITORIAL_IMPORT_HISTORY_AUDIT_ENABLED
          ? { component: ImportHistoryComponent }
          : { redirectTo: 'import', pathMatch: 'full' as const }),
      },
      { path: 'import/:id/preview', component: ImportPreviewComponent },
      {
        path: 'audit',
        ...(TERRITORIAL_IMPORT_HISTORY_AUDIT_ENABLED
          ? { component: AuditLogComponent }
          : { redirectTo: 'units', pathMatch: 'full' as const }),
      },
    ]
  }
];

