import { Routes } from '@angular/router';
import { ClientDataService } from './data-access/contracts/client-data.service';
import { FactureDataService } from './data-access/contracts/facture-data.service';
import { FinanceDataService } from './data-access/contracts/finance-data.service';
import { AgentDataService } from './data-access/contracts/agent-data.service';
import { CLIENT_DATA_SERVICE } from './data-access/tokens/client-data.token';
import { FACTURE_DATA_SERVICE } from './data-access/tokens/facture-data.token';
import { FINANCE_DATA_SERVICE } from './data-access/tokens/finance-data.token';
import { AGENT_DATA_SERVICE } from './data-access/tokens/agent-data.token';
import { SESSION_SERVICE } from './data-access/tokens/session.token';
import { EXPORT_SERVICE } from './data-access/tokens/export.token';
import { ClientDataHttpService } from './data-access/http/client-data.http.service';
import { FactureDataHttpService } from './data-access/http/facture-data.http.service';
import { FinanceDataHttpService } from './data-access/http/finance-data.http.service';
import { AgentDataHttpService } from './data-access/http/agent-data.http.service';
import { SessionHttpService } from './data-access/http/session.http.service';
import { ExportClientService } from './data-access/export/export-client.service';
import { financeAccessGuard } from './guards/finance-access.guard';
import { financePermissionGuard } from './guards/finance-permission.guard';

// financeAccessGuard is attached to each protected child (not to the shell route itself,
// and not to the `dashboard/financial` mount in app.routes.ts): it injects SESSION_SERVICE,
// which is only resolvable from this route's own injector (providers below) or a
// descendant's — see ARCHITECTURE.md §7 for why the guard placement differs slightly
// from a literal reading of "mount finance routes with the guard".

// Nettoyage 100% mocks : tous les seams étaient déjà résolus en Http (environment
// useMocksOverrides valait déjà false partout), donc plus aucun besoin du helper
// mockOuHttp()/environment.useMocks — chaque token est câblé en dur sur son HttpService,
// comme déjà fait pour Client/Facture. Voir EditRecapFront.md pour le détail complet.
export const FINANCIAL_DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    providers: [
      { provide: CLIENT_DATA_SERVICE, useClass: ClientDataHttpService },
      { provide: FACTURE_DATA_SERVICE, useClass: FactureDataHttpService },
      { provide: FINANCE_DATA_SERVICE, useClass: FinanceDataHttpService },
      { provide: AGENT_DATA_SERVICE, useClass: AgentDataHttpService },
      { provide: SESSION_SERVICE, useClass: SessionHttpService },
      // EXPORT_SERVICE n'a pas de contrepartie Http : export/impression restent client-side
      // par design (INTEGRATION.md §4), ce n'est pas un mock — voir export-client.service.ts.
      { provide: EXPORT_SERVICE, useClass: ExportClientService },
    ],
    loadComponent: () => import('./features/shell/finance-layout').then(m => m.FinanceLayout),
    children: [
      { path: '', redirectTo: 'statistiques', pathMatch: 'full' },
      {
        // Cible de redirection du guard — jamais elle-même gardée (boucle sinon).
        path: 'acces-refuse',
        loadComponent: () =>
          import('./features/shell/finance-access-denied').then(m => m.FinanceAccessDenied),
        title: 'Accès restreint',
      },
      {
        path: 'statistiques', // F1 (Prompt 7) — F2 charts/export ajoutés au Prompt 8
        canActivate: [financeAccessGuard, financePermissionGuard],
        data: { permissions: ['dashboard.view'] },
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
        title: 'Tableau de bord financier',
      },
      {
        path: 'payments', // F3
        canActivate: [financeAccessGuard, financePermissionGuard],
        data: { permissions: ['payments.view'] },
        loadComponent: () => import('./features/payments/payments.component').then(m => m.PaymentsComponent),
        title: 'Paiements',
      },
      {
        path: 'withdrawals', // F4
        canActivate: [financeAccessGuard, financePermissionGuard],
        data: { permissions: ['withdrawals.view'] },
        loadComponent: () => import('./features/withdrawals/withdrawals.component').then(m => m.WithdrawalsComponent),
        title: 'Retraits',
      },
      {
        path: 'clients', // F6
        canActivate: [financeAccessGuard, financePermissionGuard],
        data: { permissions: ['clients.view'] },
        loadComponent: () => import('./features/clients/client-list.component').then(m => m.ClientListComponent),
        title: 'Clients',
      },
      {
        path: 'clients/:idClient', // F7/F8
        canActivate: [financeAccessGuard, financePermissionGuard],
        data: { permissions: ['clients.view'] },
        loadComponent: () => import('./features/client-sheet/client-sheet.component').then(m => m.ClientSheetComponent),
        title: 'Fiche client',
      },
      {
        path: 'monthly-tracking', // F12
        canActivate: [financeAccessGuard, financePermissionGuard],
        data: { permissions: ['monthly_tracking.view'] },
        loadComponent: () =>
          import('./features/monthly-tracking/monthly-tracking.component').then(m => m.MonthlyTrackingComponent),
        title: 'Suivi mensuel',
      },
      {
        path: 'statement', // F10
        canActivate: [financeAccessGuard, financePermissionGuard],
        data: { permissions: ['statements.view'] },
        loadComponent: () => import('./features/statement/statement.component').then(m => m.StatementComponent),
        title: 'Relevé',
      },
      {
        path: 'agent-payment', // F5
        canActivate: [financeAccessGuard, financePermissionGuard],
        data: { permissions: ['agent_payments.view'] },
        loadComponent: () =>
          import('./features/agent-payment/agent-payment.component').then(m => m.AgentPaymentComponent),
        title: 'Paiement agents',
      },
      {
        // F11 admin — RBAC financier réel : clé 'roles.view', implicite pour
        // Role.ADMINISTRATEUR (voir PERMISSIONS_GOUVERNANCE), assignable en lecture seule
        // à un autre rôle par un administrateur (setPermissions).
        path: 'roles-admin',
        canActivate: [financeAccessGuard, financePermissionGuard],
        data: { permissions: ['roles.view'] },
        loadComponent: () => import('./features/roles-admin/roles-admin.component').then(m => m.RolesAdminComponent),
        title: 'Rôles & droits',
      },
      { path: '**', redirectTo: 'statistiques' },
    ],
  },
];

// Re-exported so feature components can type-inject via the abstract contracts without
// importing from data-access/contracts directly in every file.
export type { ClientDataService, FactureDataService, FinanceDataService, AgentDataService };
