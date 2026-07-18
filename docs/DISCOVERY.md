# DISCOVERY — Financial Dashboard module (mock-data MVP)

Read-only audit of the existing Angular codebase (`collect-dechets`), reconciled with the
Financial Dashboard functional spec (F1–F12). Goal: let Prompt 2 (architecture) start with
zero further exploration.

## 1. Stack & project conventions

- **Angular 20**, standalone components only (`angular.json` schematics force
  `standalone: true` for components/directives/pipes — no `NgModule` anywhere in `src/app`).
- **TypeScript strict mode** (`tsconfig.json`): `strict`, `noImplicitOverride`,
  `noPropertyAccessFromIndexSignature`, `noImplicitReturns`, `strictTemplates`,
  `strictStandalone`. New code must satisfy these (no implicit `any` leaking into templates).
- **No lint/prettier config** in the repo (only noise under `node_modules`). Nothing beyond
  tsconfig strictness and Angular CLI defaults to honor.
- **State management**: no NgRx. Convention is Angular **signals** for module-local state
  (`signal()`, `computed()`, `.asReadonly()`) combined with **RxJS `Observable`** for
  service method return types — see `planning.service.ts`. This matches the spec's
  requirement that mock services return `Observable<T>`.
- **Routing**: root routes in `src/app/app.routes.ts`, all `loadComponent`/`loadChildren`
  (lazy). Feature modules (`planning`, `teams`) are mounted via:
  ```ts
  { path: 'planning', loadChildren: () => import('./pages/planning/planning.routes').then(m => m.PLANNING_ROUTES) }
  ```
  Route guards are plain `CanActivateFn` functions in `src/app/core/guards/auth.guard.ts`
  (`authGuard`, `clientGuard`, `managerGuard`, `adminGuard`, `municipalityGuard`,
  `adminOrManagerGuard`), reading `AuthService.isAuthenticated$` /
  `hasRole`/`hasMinimumRole` against the **real** `UserRole` enum.
- **Naming**: kebab-case folders/files, `xxx.ts` / `xxx.html` / `xxx.scss` triplets
  (no `.component.ts` suffix on the filename). Class names are mixed: some drop the
  "Component" suffix (`PlanningLayout`, `AdminDashboard`), some keep it
  (`AppSidebarComponent`, `LoadingSpinnerComponent`, `PlanningCalendarComponent`). Either
  is acceptable in this codebase; prefer dropping the suffix for top-level pages/layouts,
  keep it for small reusable widgets, to match the closest precedent.
- **Styling**: no shared design-system/tokens file. Each component ships its own SCSS.
  Dependencies present: Angular Material (light use — `MatIconModule`, `MatCardModule`),
  **PrimeNG 20** (heavily used in `agency-finance` and elsewhere: Table, Chart, Dialog,
  Select, InputNumber, Skeleton, Tooltip, Card, Divider, ProgressBar, Toast), Tailwind 4
  and Flowbite are devDependency/dependency but not obviously wired into `angular.json`
  styles — treat as available but unconfirmed; don't rely on Tailwind utility classes
  without checking `styles.scss` first if a later prompt wants them.
- **Charts**: `chart.js` v4 is a direct dependency. Two coexisting patterns:
  - Direct `Chart.js` API via `@ViewChild` + `new Chart(el, config)` (`admin-dashboard.ts`).
  - PrimeNG `p-chart` wrapper (`agency-finance.ts`).
  Either is valid; **recommend direct Chart.js** (lighter, no extra PrimeNG module wiring)
  unless the finance module ends up needing PrimeNG tables/dialogs anyway, in which case
  `p-chart` keeps the import surface consistent.
- **PDF/CSV export**: `jspdf` + `jspdf-autotable` already a dependency and already used in
  `agency-finance.ts` — reuse this for the statement/export screens (F2, F10), client-side
  only, per the mock-only constraint.
- **Date formatting**: `src/app/shared/format.util.ts` exports `formatFrDate`,
  `formatFrDateTime`, `formatFrTime` (fr-FR, no raw ISO strings in templates). Reuse this;
  do not write new date formatters.
- **Currency formatting**: **no shared utility exists**. Current code inline-formats with
  `.toLocaleString('fr-FR')` and hardcodes `currency: 'XOF'` ad hoc
  (`finance.service.ts`). Per spec §1.12/§5, a single `formatCurrencyXof` (or similar)
  util must be created for the new module — this is new code, not a refactor of existing
  currency handling.
- **Mock data conventions**: flat exported arrays/constants under `src/app/data/*.mock.ts`
  or `*.ts` (`countries-org.mock.ts`, `mock-data.ts`). No scenario-switch mechanism
  (success/empty/error/slow) exists anywhere in the codebase today — this is net-new for
  the finance module, matching the spec's Mock Data Strategy (§5).
- **DI tokens**: no `InjectionToken` usage anywhere in `src/app`. All services are
  `@Injectable({ providedIn: 'root' })` singletons injected by class. The spec's
  "swap-ready contract via `InjectionToken`" (§6) has **no precedent in this codebase** —
  it will be a new, self-contained pattern introduced only inside the finance module,
  not retrofitted onto existing services.

## 2. Tabs pattern (confirmed — no library)

No Angular Material Tabs, no PrimeNG TabView anywhere. Dashboards use a hand-rolled
"buttons + active id" pattern, e.g. `admin-dashboard.ts`:

```ts
activeTab = 'overview';
tabs = [{ id: 'overview', label: "Vue d'ensemble", icon: 'dashboard', badge: null }, ...];
switchTab(tabId: string): void {
  if (this.activeTab === tabId) return;
  this.activeTab = tabId;
  this.loadTabData(tabId); // load-on-demand per tab
}
```

```html
<div class="tabs-navigation">
  <button *ngFor="let tab of tabs" class="tab-btn" [class.active]="activeTab === tab.id" (click)="switchTab(tab.id)">
    <i class="material-icons">{{ tab.icon }}</i>{{ tab.label }}
    <span *ngIf="getTabBadge(tab.id) > 0" class="tab-badge">{{ getTabBadge(tab.id) }}</span>
  </button>
</div>
<div class="tab-content">
  <div *ngIf="activeTab === 'overview'">...</div>
</div>
```

CSS classes to reuse/mirror: `.tabs-navigation`, `.tab-btn`, `.tab-btn.active`, `.tab-badge`,
`.tab-content` (see `admin-dashboard.scss` lines ~214–266 plus responsive breakpoints).
**This is exactly the pattern the user wants for the Financial Dashboard** — tabs, no
sidebar. Use `switchTab`/`loadTabData`/`tabs[]` idiom, not a UI library.

## 3. Existing finance/client/payment code — DO NOT DUPLICATE

A separate, already-mounted "Agency Finance" dashboard exists and is **out of scope** for
this new module (decision already made: build an isolated new module, don't touch this):

- `src/app/pages/dashboards/agency-finance/agency-finance.{ts,html,scss}` — route
  `dashboard/agency/finance`, guarded by `adminOrManagerGuard`, real `HttpClient` calls
  with `catchError` → private `mock*()` fallbacks, PrimeNG UI, jsPDF export.
- `src/app/models/finance.model.ts` — `FinancialSummary`, `PaymentTransaction`,
  `WithdrawalRequest/Record`, `PaymentMethod` (Orange/Moov/Telecel Money — **agency payout
  operators, not the spec's `Espèces|MobileMoney|Autre` client payment modes** — same
  name, different domain, do not import), `FinanceFilters`,
  `PaginatedFinanceResponse<T>`.
- `src/app/services/finance.service.ts` — `getFinancialSummary`, `getTransactions`,
  `getChartData`, `requestWithdrawal`, `getWithdrawals`, `payment$`.
- `src/app/services/client.service.ts`, `src/app/pages/dashboards/client-dashboard/`,
  `src/app/services/payment/payment.service.ts`, `src/app/models/payment/*.model.ts`,
  `src/app/pages/payment/{mobile-money-form,otp-input,payment-status}` — real client/mobile-
  money payment flow, unrelated to the abonné-billing spec.

None of these are to be imported, extended, or renamed for the new module — new model/service
names must not collide (e.g. do not reuse `PaymentMethod`, `FinancialSummary` names as-is).

## 4. RBAC — real vs mock, and the gap

The real `UserRole` enum (`src/app/models/user.model.ts`) is:
`CLIENT | MANAGER | COLLECTOR | MUNICIPALITY | SUPER_ADMIN`.

The spec's finance roles (**Comptable, Manager terrain, Administrateur**, implicitly
"Agent collecteur" out of scope) **do not map 1:1** onto this enum — there is no
`Comptable`/accountant concept anywhere in the real auth model, and RBAC enforcement here
is real (backend-checked in spirit, guard-checked in code) — touching it would violate the
"don't modify existing business logic / don't touch real auth" constraint.

**Resolution for Prompt 2+**: the finance module must ship its **own mock session/role
concept**, local to the module (e.g. a `FinanceRole` type + a demo role-switcher
component/service), completely decoupled from `AuthService`/`UserRole`/`auth.guard.ts`.
The module's outer route can still sit behind the real `adminOrManagerGuard` (or no guard,
per decision in Prompt 2) as a coarse gate, but tab-level/finance-specific access must be
driven by the new mock role, not the real one. This is exactly what MVP spec §2 asks for
("UI-level RBAC via a demo role switcher + route guards reading a mock user").

## 5. Recommended module location & shape

`src/app/pages/dashboards/financial-dashboard/` (new, standalone) — grouped with the other
dashboards (`admin-dashboard`, `agency-finance`, `client-dashboard`, ...) rather than as a
top-level module like `planning`/`teams`, since this is a dashboard. Same internal shape as
`pages/planning/` (routes file + layout + local `models/`/`services/`), but **without**
`AppSidebarComponent` (explicit user requirement — tabs instead):

```
pages/dashboards/financial-dashboard/
  financial-dashboard.routes.ts        → FINANCIAL_DASHBOARD_ROUTES, loadComponent children
  financial-dashboard-layout/          → shell: header + tabs nav + <router-outlet>, NO sidebar
  dashboard/                            → F1 KPI cards + F2 charts
  payments-history/                     → F3
  withdrawals-history/                  → F4
  agent-payment/                        → F5
  clients/
    client-list/                        → F6
    client-sheet/ (info + billing tabs) → F7, F8
  monthly-tracking/                     → F12
  statement/                            → F10
  roles-admin/                          → F11 admin screen
  models/*.model.ts                     → Client, Abonnement, Facture, Paiement, Retrait, Agent, PaiementAgent, FinanceRole
  services/                             → abstract contracts (InjectionToken) + mock implementations
  mock/                                 → seeded datasets, generators, scenario/mock-config service
```

Mounted in `app.routes.ts` next to the other dashboards:
```ts
{ path: 'dashboard/financial', loadChildren: () => import('./pages/dashboards/financial-dashboard/financial-dashboard.routes').then(m => m.FINANCIAL_DASHBOARD_ROUTES) }
```
(Exact path segment and guard are open decisions for Prompt 2 — flagged, not assumed.)

## 6. F1–F12 reuse vs. new

| # | Feature | Reuse | New |
|---|---|---|---|
| F1 | Dashboard KPIs | Chart.js dependency, `.tab-*` CSS pattern | KPI cards, new mock `FinanceSummary` model/service |
| F2 | Long-term stats + export | `jspdf`/`jspdf-autotable`, Chart.js | Chart configs, CSV export util |
| F3 | Payments history | PrimeNG Table (optional) | New `Paiement` model/service, filters |
| F4 | Withdrawals history | same as F3 | New `Retrait` model/service |
| F5 | Pay agents (prototype) | form patterns from existing dashboards | New `Agent`/`PaiementAgent` model, no posting logic (stub) |
| F6 | Client list | none directly (existing `client.service.ts` is real-API, different shape) | New `Client` model/mock service, status badges |
| F7 | Client sheet · Info | `formatFrDate` util | New tab component |
| F8 | Client sheet · Billing | same | New `Facture` model, tab component |
| F9 | Auto invoice generation | — | Mock-only: pre-generated dataset + manual "simulate generation" button, no scheduler |
| F10 | Statement / relevé | `jspdf`/`jspdf-autotable` | New on-demand table + print/export |
| F11 | RBAC UI | none (real RBAC is off-limits, see §4) | New mock `FinanceRole` + role switcher + local guards |
| F12 | Monthly subscriber tracking | `formatFrDate` | New month-picker + paid/unpaid list |

## 7. Ambiguities (spec §1.12) — keep config-driven, do not hardcode

All of the following must live in a single mock-config/constants file inside the new module
(not scattered across components), each visibly marked TBC in a code comment and easy to
flip for demos:

- Billing location: client-sheet tab vs. standalone finance "Client" section — **default:
  client-sheet tab** (F7/F8), configurable.
- Tariff model: flat vs. per-client/per-service amount — dataset must include a few
  per-client overrides to exercise this even if UI defaults to flat.
- Export formats/scope: Excel/CSV/PDF — MVP ships PDF (jsPDF, already a dependency) + CSV;
  Excel deferred.
- Agent remuneration model (fixed/per-task/commission) and its solde impact — F5 is a
  UI-only prototype, no real posting.
- Mandatory vs optional client fields — spec only guarantees `nom`, `prenom`, `statut`;
  `quartier`/`telephone` optional per data model (§1.7) — validation must reflect that.
- Payment modes & invoice↔payment reconciliation, partial payments — undefined; mock
  service treats a facture as binary payée/impayée (RG3), no partial state.
- "Retard" threshold (from when is a client "1 mois de retard"?) — default: any unpaid
  invoice for a past period counts as 1 month late, cumulative — configurable constant.
- Formulas for solde disponible / revenus nets / en attente — RG5/RG7 give a directional
  definition only; implement literally as specified (`solde = paiements − retraits`,
  `en attente = somme due par comptes en retard`) and flag as TBC in the KPI component.
- Invoice generation frequency/day, inactive-client handling — mock dataset pre-generates
  invoices only for `Actif` clients (RG1), day-of-month is a config constant.
- Statement scope: full history vs. selectable range — default: selectable date range,
  falls back to full history if unset.
- Client-info editing: allowed or read-only — MVP default: **read-only** (spec doesn't
  request an edit flow explicitly; F7 constraints say "edit TBC") — a later prompt can add
  an edit form if requested.
- Currency: **XOF/FCFA** assumed (matches existing `finance.service.ts` mock), centralized
  in one new util, never inlined.

## 8. Mock-only rule (recorded)

No `HttpClient` in the new module. All new services return `Observable<T>` via
`of(data).pipe(delay(ms))` (or similar), so component code is structurally identical to a
future `HttpClient` version. Existing real services (`AuthService`, `ClientService`,
`FinanceService`, `PlanningService`, etc.) are **not called, not modified, not extended**
by this module.

## 9. Open decisions for Prompt 2 (architecture)

1. Exact mounted route path/segment and outer guard (new dedicated guard vs. none vs. reuse
   `adminOrManagerGuard` as coarse gate).
2. Chart approach: direct Chart.js vs. PrimeNG `p-chart` (recommend direct Chart.js).
3. Table approach: plain HTML tables (matches most of the codebase) vs. PrimeNG `p-table`
   (matches `agency-finance` only) — recommend plain HTML/CSS tables for consistency with
   the majority pattern and to avoid pulling PrimeNG modules into a not-yet-PrimeNG-heavy
   module, unless pagination/sorting complexity argues otherwise.
4. Whether `InjectionToken`-based service swapping is worth the ceremony for a mock-only
   MVP, or whether a simpler "one mock service class per domain, swap the class later"
   is sufficient — spec §6 asks for tokens; recommend implementing them since the cost is
   low and it's the explicit target integration seam.
