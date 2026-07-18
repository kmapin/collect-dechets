# INTEGRATION — Financial Dashboard: swapping mocks for a real backend

This module (`src/app/pages/dashboards/financial-dashboard/`) is built entirely against
abstract contracts + `InjectionToken`s (see `ARCHITECTURE.md` §3). No component,
directive, or feature service anywhere in this module imports `HttpClient` or a concrete
`*MockService`/`*HttpService` class — verified with:

```bash
grep -rE "HttpClient|MockService|HttpService" src/app/pages/dashboards/financial-dashboard/features
# → no matches
```

Every seam below is a **one-line change** in
`financial-dashboard.routes.ts`'s `providers` array. `environment.useMocks` stays `true`
for the whole MVP — flipping it is a future, separate decision, not performed by this
prompt.

## 1. Seams (token → mock → future Http class)

| Contract | Token | Mock (wired today) | Future Http (inert skeleton, not wired) |
|---|---|---|---|
| `ClientDataService` | `CLIENT_DATA_SERVICE` | `ClientDataMockService` | `ClientDataHttpService` |
| `FactureDataService` | `FACTURE_DATA_SERVICE` | `FactureDataMockService` | `FactureDataHttpService` |
| `FinanceDataService` | `FINANCE_DATA_SERVICE` | `FinanceDataMockService` | `FinanceDataHttpService` |
| `AgentDataService` | `AGENT_DATA_SERVICE` | `AgentDataMockService` | `AgentDataHttpService` |
| `SessionService` | `SESSION_SERVICE` | `SessionMockService` | `SessionHttpService` |
| `ExportService` | `EXPORT_SERVICE` | `ExportMockService` | **none** — see §4 |

All contracts live in `data-access/contracts/*.service.ts`, tokens in
`data-access/tokens/*.token.ts`, mocks in `data-access/mock/*.mock.service.ts`, and the
inert Http skeletons in `data-access/http/*.http.service.ts`.

## 2. The exact diff to switch one seam

Today, in `financial-dashboard.routes.ts`:

```ts
{ provide: CLIENT_DATA_SERVICE, useClass: ClientDataMockService },
```

Future diff (once a real backend exists and `environment.useMocks` is meant to be
toggled per environment):

```ts
import { ClientDataHttpService } from './data-access/http/client-data.http.service';
// ...
{ provide: CLIENT_DATA_SERVICE, useClass: environment.useMocks ? ClientDataMockService : ClientDataHttpService },
```

Repeat for each of the five data seams (not `EXPORT_SERVICE`, see §4). No other file
changes — no component, guard, or template touches a concrete class either now or after
the switch, because they all inject the token.

## 3. Endpoint map

Base URL: `${environment.apiUrl}/finance`. All endpoints below are **assumed**, not
confirmed against a real backend contract (none exists yet) — adjust paths/verbs once one
does; only the request/response *shape* consumed by each Http skeleton matters for now.

| Method & path | Used by | Notes |
|---|---|---|
| `GET /finance/clients?page=&pageSize=&statut=&search=` | `ClientDataHttpService.getClients` | F6 |
| `GET /finance/clients/:idClient` | `ClientDataHttpService.getClient` | F7/F8 |
| `GET /finance/factures?page=&pageSize=&idClient=&statut=` | `FactureDataHttpService.getFactures` | — |
| `GET /finance/factures/client/:idClient` | `FactureDataHttpService.getFacturesClient` | F8 |
| `GET /finance/factures/situation-clients` | `FactureDataHttpService.getSituationClients` | F6 (badge retard) |
| `GET /finance/factures/suivi-mensuel?mois=&annee=&page=&pageSize=&impayeesSeulement=` | `FactureDataHttpService.getSuiviMensuel` | F12 |
| `GET /finance/factures/releve/:idClient?debutMois=&debutAnnee=&finMois=&finAnnee=` | `FactureDataHttpService.getReleve` | F10 |
| `POST /finance/factures/generer { mois, annee }` | `FactureDataHttpService.genererFacturesDuMois` | F9 (déclenchement manuel MVP → job planifié réel côté backend) |
| `GET /finance/dashboard/kpi?mois=&annee=` | `FinanceDataHttpService.getDashboardKpi` | F1 |
| `GET /finance/dashboard/stats?debutMois=&debutAnnee=&finMois=&finAnnee=` | `FinanceDataHttpService.getStats` | F2 |
| `GET /finance/dashboard/repartition-mode?debutMois=&debutAnnee=&finMois=&finAnnee=` | `FinanceDataHttpService.getRepartitionModePaiement` | F2 |
| `GET /finance/paiements?page=&pageSize=&idClient=&search=` | `FinanceDataHttpService.getPaiements` | F3 |
| `GET /finance/retraits?page=&pageSize=&search=&mois=&annee=` | `FinanceDataHttpService.getRetraits` | F4 |
| `POST /finance/retraits { montant, motif }` | `FinanceDataHttpService.enregistrerRetrait` | F4 |
| `GET /finance/agents?page=&pageSize=` | `AgentDataHttpService.getAgents` | F5 |
| `GET /finance/agents/paiements?page=&pageSize=&idAgent=` | `AgentDataHttpService.getPaiementsAgent` | F5 |
| `POST /finance/agents/paiements { idAgent, montant }` | `AgentDataHttpService.payerAgent` | F5 — RG10 solde impact still TBC |
| `GET /finance/session/moi` | `SessionHttpService` (constructor) | Real session — replaces the demo default-role bootstrap |
| `GET /finance/session/utilisateurs` | `SessionHttpService.getUtilisateurs` | F11 admin |
| `PATCH /finance/session/utilisateurs/:id/droits-finance` | `SessionHttpService.toggleDroitsFinance` | F11 admin |

## 4. `ExportService` has no future Http counterpart

F2/F10/F12 exports (CSV, print/PDF) are **client-side only per the MVP spec** — there is
no server-rendered export in scope (DISCOVERY.md §7, ARCHITECTURE.md §5). `ExportMockService`
already does the real work (Blob/`window.print()`), so there is nothing to "swap" — it
stays as-is even after every other seam above is flipped to Http. If a future iteration
adds server-rendered Excel/PDF, that would be a **new** contract method, not a mock→Http
swap of the existing one.

## 5. DTO ↔ model boundary

Each Http skeleton calls a mapper in `data-access/http/mappers/*.mapper.ts`
(`mapClientDto`, `mapFactureDto`, `mapSuiviAbonneMensuelDto`, `mapLigneReleveDto`,
`mapDashboardKpiDto`, `mapPaiementListeDto`, `mapRetraitDto`, `mapAgentDto`,
`mapPaiementAgentDto`, `mapSessionUtilisateurDto`, `mapUtilisateurDto`) instead of using
the raw HTTP response directly. Today every mapper is an identity pass-through (`dto as
Model`) because **no real backend DTO shape exists to map from yet** — replace the body
of the relevant mapper(s) with real field-renaming/coercion logic once the backend
contract is known. Components never see DTOs; they only ever see the domain models from
`financial-dashboard/models/`.

## 6. Verification performed this iteration

- `ng build --configuration=development` succeeds with the Http skeletons present but
  unwired (they compile — including `strictTemplates`/`strictInjectionParameters` — but
  are never instantiated by Angular DI since no provider references them).
- `environment.ts` / `environment.prod.ts` already expose `useMocks: true` (added in
  Prompt 4, alongside the mock provider wiring) — unchanged this iteration, per the
  constraint that `useMocks` stays `true` and no HTTP call executes in this MVP.
- No backend code was read or modified.
