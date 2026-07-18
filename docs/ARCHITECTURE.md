# ARCHITECTURE — Financial Dashboard module (mock-data MVP)

Defines the folder structure, the swappable mock data layer, routing, and module
boundaries for the new Financial Dashboard module. Builds on `docs/DISCOVERY.md`.
No screen logic yet — this prompt only scaffolds structure and one placeholder route.

## 1. Module path

`src/app/pages/dashboards/financial-dashboard/` — grouped with the other dashboards
(`admin-dashboard`, `agency-finance`, `client-dashboard`, ...), mounted at route
`dashboard/financial` in `src/app/app.routes.ts` via `loadChildren`. No sidebar (explicit
requirement) — the shell built in Prompt 6 uses the tabs pattern documented in
`DISCOVERY.md` §2.

## 2. Folder tree

```
pages/dashboards/financial-dashboard/
  financial-dashboard.routes.ts        → FINANCIAL_DASHBOARD_ROUTES (root Routes array for this module)
  financial-dashboard-placeholder.ts   → temporary route target, removed/superseded in Prompt 6

  models/                              → Prompt 3: entity interfaces, enums, view models, barrel (index.ts)

  data-access/
    contracts/                         → Prompt 4: abstract classes/interfaces — one per domain
                                          (client-data.service.ts, finance-data.service.ts,
                                          facture-data.service.ts, agent-data.service.ts,
                                          session.service.ts, export.service.ts)
    tokens/                            → Prompt 4: one InjectionToken<Contract> per contract, *.token.ts
    mock/                              → Prompt 4/5: *.mock.service.ts implementations,
                                          mock-config.service.ts, simulate.util.ts, data/*.data.ts (Prompt 5)

  features/
    dashboard/                         → Prompt 7/8: F1 KPI cards, F2 charts, charts/ subfolder
    payments/                          → Prompt 9: F3 payments history table
    withdrawals/                       → Prompt 9: F4 withdrawals history table
    clients/                           → Prompt 10: F6 client list
    client-sheet/                      → Prompt 11: F7/F8 client detail, tabs/ subfolder (info, billing)
    monthly-tracking/                  → Prompt 12: F12 month-by-month paid/unpaid tracker
    statement/                         → Prompt 13: F10 relevé + print/export
    agent-payment/                     → Prompt 14: F5 agent-payment prototype
    roles-admin/                       → Prompt 14: F11 roles/rights admin screen
    shell/                             → Prompt 6: finance-layout (tabs nav, no sidebar) — added then, not now

  shared/                              → cross-feature UI: kpi-card, data-table, status-badge,
                                          period-selector, month-selector, state components
                                          (skeleton/empty/error) — each added by the prompt that first needs it

  guards/                              → Prompt 6: finance-access.guard.ts (mock-session RBAC gate)
  utils/                               → Prompt 7: money.util.ts (centralized XOF/FCFA + fr-FR formatting)
```

Folders scaffolded now (Prompt 2) contain a `.gitkeep` placeholder only:
`models/`, `data-access/contracts/`, `data-access/tokens/`, `data-access/mock/`,
`features/dashboard/`, `features/payments/`, `features/withdrawals/`, `features/clients/`,
`features/client-sheet/`, `features/monthly-tracking/`, `features/statement/`,
`features/agent-payment/`, `features/roles-admin/`, `shared/`.

`features/shell/`, `guards/`, and `utils/` are **not** pre-created — they are added by the
prompt that first populates them (6, 6, 7 respectively) to avoid empty scaffolding drift.

## 3. Swappable data layer — the seam

Dependency inversion via abstract contract + `InjectionToken`, one pair per domain.
Components inject the **token**, never a concrete class:

```ts
// data-access/contracts/client-data.service.ts
export abstract class ClientDataService {
  abstract getClients(params?: { page?: number; pageSize?: number; filter?: ClientFilter }): Observable<Page<Client>>;
  abstract getClient(id: string): Observable<Client>;
}

// data-access/tokens/client-data.token.ts
export const CLIENT_DATA_SERVICE = new InjectionToken<ClientDataService>('CLIENT_DATA_SERVICE');

// data-access/mock/client-data.mock.service.ts
@Injectable()
export class ClientDataMockService implements ClientDataService { /* returns Observable<T> via simulateResponse(...) */ }
```

Provider wiring happens at the **route level** (route-level providers on the finance route
tree, not app-wide), so the finance module's DI is self-contained:

```ts
// financial-dashboard.routes.ts (final shape, wired in Prompt 4)
{
  path: '',
  providers: [
    { provide: CLIENT_DATA_SERVICE, useClass: environment.useMocks ? ClientDataMockService : ClientDataHttpService },
    // ...one line per contract
  ],
  children: [ /* ... */ ],
}
```

**The mock→Http swap is that one line, per contract** (`useClass` target), gated by
`environment.useMocks` — introduced in Prompt 4, defaulting to `true` and never flipped
in this MVP (Prompt 17 documents the flip, doesn't perform it). No component ever imports
`ClientDataMockService`, `ClientDataHttpService`, or `HttpClient` directly — only the
abstract `ClientDataService` contract.

## 4. Observable method signatures — pagination/filter convention

Every list-returning contract method accepts an **optional** params object and returns a
generic paginated wrapper, so a future `HttpClient` implementation needs no signature
change:

```ts
interface Page<T> { items: T[]; total: number; page: number; pageSize: number; }
getX(params?: { page?: number; pageSize?: number; filter?: XFilter; periode?: Periode }): Observable<Page<X>>;
```

`Page<T>` and `Periode` are defined in `models/page.model.ts` and `models/periode.model.ts`
(Prompt 3). Detail/action methods (`getClient(id)`, `requestWithdrawal(payload)`, ...)
return a bare `Observable<T>`, no wrapper.

## 5. Shared UI location

Cross-cutting presentational components live in `financial-dashboard/shared/` (module-local,
not the app-wide `src/app/shared/`, since they're finance-specific: KPI card, data-table,
status badge, period/month selectors, loading/empty/error state components). The app-wide
`src/app/shared/format.util.ts` (fr-FR dates) **is** reused as-is from feature components.
The new currency util (`finance/utils/money.util.ts`, Prompt 7) is module-local because no
other module currently needs XOF formatting in a shared location — promote it to
`src/app/shared/` later only if a second module needs it.

## 6. Routing tree (target shape, built incrementally)

```
/dashboard/financial                         → redirect → dashboard
/dashboard/financial/dashboard               → F1/F2 (Prompt 7/8)
/dashboard/financial/payments                → F3 (Prompt 9)
/dashboard/financial/withdrawals             → F4 (Prompt 9)
/dashboard/financial/clients                 → F6 (Prompt 10)
/dashboard/financial/clients/:idClient       → F7/F8 (Prompt 11)
/dashboard/financial/monthly-tracking        → F12 (Prompt 12)
/dashboard/financial/statement               → F10 (Prompt 13)
/dashboard/financial/agent-payment           → F5 (Prompt 14)
/dashboard/financial/roles-admin             → F11 admin (Prompt 14)
```

Today (Prompt 2), `FINANCIAL_DASHBOARD_ROUTES` has a single placeholder route at `''`
(`financial-dashboard-placeholder.ts`). Prompt 6 replaces it with the shell + full children
tree above, each `loadComponent`, lazy.

## 7. RBAC guard placement

- The route mount in `app.routes.ts` (`dashboard/financial`) carries **no guard** —
  intentionally. `SESSION_SERVICE` is only provided inside `FINANCIAL_DASHBOARD_ROUTES`'s
  own route-level `providers` (§3), so a guard placed at the outer `app.routes.ts` entry
  would not be able to inject it (that entry has no environment injector of its own beyond
  the app root). Implemented instead (Prompt 6): `financial-dashboard/guards/finance-access.guard.ts`,
  a `CanActivateFn` reading the **mock** session service (`SessionService` contract /
  `SessionMockService`), never `AuthService`/`UserRole` (DISCOVERY §4).
- The guard is attached individually to each protected child route (`dashboard`, `payments`,
  `withdrawals`, `clients`, `clients/:idClient`, `monthly-tracking`, `statement`,
  `agent-payment`, `roles-admin`) inside `financial-dashboard.routes.ts`, not to the shell
  route itself and not to `acces-refuse` (which must stay reachable to avoid a redirect
  loop). Per Prompt 6's acceptance criteria this is an all-or-nothing gate: any role
  without `droitsFinance` is blocked from the entire module, including the client list —
  a deliberate simplification of the finer-grained matrix in spec §1.11 (which would let
  Manager terrain see a finance-stripped client list). Revisit if the product needs that
  nuance later.
- `roles-admin` additionally needs an Administrateur-only gate (Comptable has
  `droitsFinance: true` but should NOT reach Roles admin per §1.11) — added in Prompt 14.
  Until then it is nav-hidden (`finance-nav.config.ts`) but technically deep-linkable by a
  Comptable session.

## 8. Currency/i18n util location

`financial-dashboard/utils/money.util.ts` (Prompt 7): single `formatCurrencyXof(amount)`
(or equivalently named) function, XOF/FCFA + `fr-FR` grouping, centralizing what is
currently inlined ad hoc in `finance.service.ts` (unrelated existing module, not reused).
All KPI cards, tables, and the statement screen call this one function — no inline
`toLocaleString` for money anywhere in the new module.

## 9. What this prompt does NOT do

No models, no contracts, no mock services, no datasets, no real screens, no guard, no
provider wiring yet — all deliberately deferred to Prompts 3–17 per the plan above. The
only executable additions in this prompt are the route mount and the placeholder component,
proving the lazy-load path works end to end.
