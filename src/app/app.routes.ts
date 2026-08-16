import { Routes } from "@angular/router";
import { adminGuard,adminOrManagerGuard,managerGuard, authGuard, clientGuard, municipalityGuard }  from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: "",
    loadComponent: () => import("./pages/home/home").then((c) => c.Home),
  },

  {
    path: "agencies",
    loadComponent: () =>
      import("./pages/agencies/agencies").then((c) => c.Agencies),
  },

  {
    path: "agencies/:id",
    loadComponent: () =>
      import("./pages/agency-details/agency-details").then(
        (c) => c.AgencyDetails,
      ),
  },

  {
    path: "waste-types",
    loadComponent: () =>
      import("./pages/waste-types/waste-types").then((c) => c.WasteTypes),
  },

  {
    path: "faq",
    loadComponent: () => import("./pages/faq/faq").then((c) => c.Faq),
  },

  {
    path: "login",
    loadComponent: () =>
      import("./pages/auth/login/login").then((c) => c.Login),
  },

  {
    path: "register",
    loadComponent: () =>
      import("./pages/auth/register/register").then((c) => c.Register),
  },

  {
    path: "forgot-password",
    loadComponent: () =>
      import("./pages/auth/forgot-password/forgot-password").then(
        (c) => c.ForgotPassword,
      ),
  },

  {
    path: "about",
    loadComponent: () => import("./pages/about/about").then((c) => c.About),
  },

  {
    path: "contact",
    loadComponent: () =>
      import("./pages/contact/contact").then((c) => c.Contact),
  },

  {
    path: "help",
    loadComponent: () => import("./pages/help/help").then((c) => c.Help),
  },

  {
    path: "privacy",
    loadComponent: () =>
      import("./pages/privacy/privacy").then((c) => c.Privacy),
  },

  {
    path: "terms",
    loadComponent: () => import("./pages/terms/terms").then((c) => c.Terms),
  },

  {
    path: "profile",
    loadComponent: () =>
      import("./pages/profile/profile").then((c) => c.Profile),
  },

  {
    canActivate: [authGuard],
    path: "subscription",
    loadComponent: () =>
      import("./pages/subscription/subscription").then((c) => c.Subscription),
  },

  // Mêmes règles d'accès que la vue Abonnement équivalente ci-dessus (Phase 6,
  // CONCEPTION_ABONNEMENT_CONTRAT.md §6.2).
  {
    canActivate: [authGuard],
    path: "contrat",
    loadComponent: () =>
      import("./pages/contrat/contrat").then((c) => c.ContratPage),
  },

  {
    path: "schedule",
    loadComponent: () =>
      import("./pages/schedule/schedule").then((c) => c.Schedule),
  },

  {
    path: "report",
    loadComponent: () => import("./pages/report/report").then((c) => c.Report),
  },

  // ================= MODULE PLANNING =================

  {
    // canActivate: [adminOrManagerGuard],
    path: 'planning',
    loadChildren: () =>
      import('./pages/planning/planning.routes').then(m => m.PLANNING_ROUTES),
  },

  // ================= MODULE ÉQUIPES =================

  {
    // canActivate: [adminOrManagerGuard],
    path: 'teams',
    loadChildren: () =>
      import('./pages/teams/teams.routes').then(m => m.TEAMS_ROUTES),
  },

  // ================= DASHBOARDS =================

  {
    canActivate: [clientGuard],
    path: "dashboard/client",
    loadComponent: () =>
      import("./pages/dashboards/client-dashboard/client-dashboard").then(
        (c) => c.ClientDashboard,
      ),
  },

  {
    canActivate: [adminOrManagerGuard],
    path: "dashboard/agency",
    loadComponent: () =>
      import("./pages/dashboards/agency-dashboard/agency-dashboard").then(
        (c) => c.AgencyDashboard,
      ),
  },

  {
    canActivate: [adminOrManagerGuard],
    path: "dashboard/agency/finance",
    loadComponent: () =>
      import("./pages/dashboards/agency-finance/agency-finance").then(
        (c) => c.AgencyFinance,
      ),
  },

  {
    canActivate: [adminOrManagerGuard],
    path: "notification-settings",
    loadComponent: () =>
      import("./pages/notification-settings/notification-settings").then(
        (c) => c.NotificationSettingsComponent,
      ),
  },

  // ================= MODULE FINANCIAL DASHBOARD (mock-data MVP) =================
  // RBAC is enforced per-child inside financial-dashboard.routes.ts (financeAccessGuard,
  // mock session — never the real auth guards), not here: the guard needs SESSION_SERVICE,
  // which is only provided inside that module's own route tree. See ARCHITECTURE.md §7.

  {
    path: "dashboard/financial",
    loadChildren: () =>
      import("./pages/dashboards/financial-dashboard/financial-dashboard.routes").then(
        (m) => m.FINANCIAL_DASHBOARD_ROUTES,
      ),
  },

  {
    path: "dashboard/collector",
    loadComponent: () =>
      import("./pages/dashboards/collector-dashboard/collector-dashboard").then(
        (c) => c.CollectorDashboard,
      ),
  },

  {
    canActivate: [municipalityGuard],
    path: "dashboard/municipality",
    loadComponent: () =>
      import("./pages/dashboards/municipality-dashboard/municipality-dashboard").then(
        (c) => c.MunicipalityDashboard,
      ),
  },

  {
    canActivate: [adminGuard],
    path: "dashboard/admin",
    loadComponent: () =>
      import("./pages/dashboards/admin-dashboard/admin-dashboard").then(
        (c) => c.AdminDashboard,
      ),
  },

  // ================= AUTRES =================

  {
    canActivate: [adminOrManagerGuard],
    path: "edit-agency/:id",
    loadComponent: () =>
      import("./pages/auth/register/register").then((c) => c.Register),
  },

  {
    path: "chat",
    loadComponent: () => import("./pages/chat/chat").then((c) => c.Chat),
  },

  { path: "**", redirectTo: "" },
];
