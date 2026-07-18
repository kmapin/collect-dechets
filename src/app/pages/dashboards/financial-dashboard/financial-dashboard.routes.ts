import { Type } from '@angular/core';
import { Routes } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { ClientDataService } from './data-access/contracts/client-data.service';
import { FactureDataService } from './data-access/contracts/facture-data.service';
import { FinanceDataService } from './data-access/contracts/finance-data.service';
import { AgentDataService } from './data-access/contracts/agent-data.service';
import { SessionService } from './data-access/contracts/session.service';
import { CLIENT_DATA_SERVICE } from './data-access/tokens/client-data.token';
import { FACTURE_DATA_SERVICE } from './data-access/tokens/facture-data.token';
import { FINANCE_DATA_SERVICE } from './data-access/tokens/finance-data.token';
import { AGENT_DATA_SERVICE } from './data-access/tokens/agent-data.token';
import { SESSION_SERVICE } from './data-access/tokens/session.token';
import { EXPORT_SERVICE } from './data-access/tokens/export.token';
import { MockConfigService } from './data-access/mock/mock-config.service';
import { ClientDataMockService } from './data-access/mock/client-data.mock.service';
import { FactureDataMockService } from './data-access/mock/facture-data.mock.service';
import { FinanceDataMockService } from './data-access/mock/finance-data.mock.service';
import { AgentDataMockService } from './data-access/mock/agent-data.mock.service';
import { SessionMockService } from './data-access/mock/session.mock.service';
import { ExportMockService } from './data-access/mock/export.mock.service';
import { ClientDataHttpService } from './data-access/http/client-data.http.service';
import { FactureDataHttpService } from './data-access/http/facture-data.http.service';
import { FinanceDataHttpService } from './data-access/http/finance-data.http.service';
import { AgentDataHttpService } from './data-access/http/agent-data.http.service';
import { SessionHttpService } from './data-access/http/session.http.service';
import { financeAccessGuard } from './guards/finance-access.guard';
import { financeAdminGuard } from './guards/finance-admin.guard';

// financeAccessGuard is attached to each protected child (not to the shell route itself,
// and not to the `dashboard/financial` mount in app.routes.ts): it injects SESSION_SERVICE,
// which is only resolvable from this route's own injector (providers below) or a
// descendant's — see ARCHITECTURE.md §7 for why the guard placement differs slightly
// from a literal reading of "mount finance routes with the guard".

// Prompt 17 — provider factory: centralizes the mock↔Http choice per contract behind
// environment.useMocks. Stays "mock" for the entire MVP (useMocks is never flipped this
// iteration) — see INTEGRATION.md for the endpoint map behind each Http class.
function mockOuHttp<T>(mock: Type<T>, http: Type<T>): Type<T> {
  return environment.useMocks ? mock : http;
}

export const FINANCIAL_DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    providers: [
      MockConfigService,
      { provide: CLIENT_DATA_SERVICE, useClass: mockOuHttp<ClientDataService>(ClientDataMockService, ClientDataHttpService) },
      { provide: FACTURE_DATA_SERVICE, useClass: mockOuHttp<FactureDataService>(FactureDataMockService, FactureDataHttpService) },
      { provide: FINANCE_DATA_SERVICE, useClass: mockOuHttp<FinanceDataService>(FinanceDataMockService, FinanceDataHttpService) },
      { provide: AGENT_DATA_SERVICE, useClass: mockOuHttp<AgentDataService>(AgentDataMockService, AgentDataHttpService) },
      { provide: SESSION_SERVICE, useClass: mockOuHttp<SessionService>(SessionMockService, SessionHttpService) },
      // EXPORT_SERVICE has no Http counterpart — exports stay client-side even after
      // integration (INTEGRATION.md §4).
      { provide: EXPORT_SERVICE, useClass: ExportMockService },
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
        canActivate: [financeAccessGuard],
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
        title: 'Tableau de bord financier',
      },
      {
        path: 'payments', // F3
        canActivate: [financeAccessGuard],
        loadComponent: () => import('./features/payments/payments.component').then(m => m.PaymentsComponent),
        title: 'Paiements',
      },
      {
        path: 'withdrawals', // F4
        canActivate: [financeAccessGuard],
        loadComponent: () => import('./features/withdrawals/withdrawals.component').then(m => m.WithdrawalsComponent),
        title: 'Retraits',
      },
      {
        path: 'clients', // F6
        canActivate: [financeAccessGuard],
        loadComponent: () => import('./features/clients/client-list.component').then(m => m.ClientListComponent),
        title: 'Clients',
      },
      {
        path: 'clients/:idClient', // F7/F8
        canActivate: [financeAccessGuard],
        loadComponent: () => import('./features/client-sheet/client-sheet.component').then(m => m.ClientSheetComponent),
        title: 'Fiche client',
      },
      {
        path: 'monthly-tracking', // F12
        canActivate: [financeAccessGuard],
        loadComponent: () =>
          import('./features/monthly-tracking/monthly-tracking.component').then(m => m.MonthlyTrackingComponent),
        title: 'Suivi mensuel',
      },
      {
        path: 'statement', // F10
        canActivate: [financeAccessGuard],
        loadComponent: () => import('./features/statement/statement.component').then(m => m.StatementComponent),
        title: 'Relevé',
      },
      {
        path: 'agent-payment', // F5 — Comptable ET Administrateur (spec §1.11)
        canActivate: [financeAccessGuard],
        loadComponent: () =>
          import('./features/agent-payment/agent-payment.component').then(m => m.AgentPaymentComponent),
        title: 'Paiement agents',
      },
      {
        // F11 admin — réservé à l'Administrateur (spec §1.11 : "Roles admin denied" pour
        // le Comptable) — financeAdminGuard s'ajoute à financeAccessGuard.
        path: 'roles-admin',
        canActivate: [financeAccessGuard, financeAdminGuard],
        loadComponent: () => import('./features/roles-admin/roles-admin.component').then(m => m.RolesAdminComponent),
        title: 'Rôles & droits',
      },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];

// Re-exported so feature components can type-inject via the abstract contracts without
// importing from data-access/contracts directly in every file.
export type { ClientDataService, FactureDataService, FinanceDataService, AgentDataService };
