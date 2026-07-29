# INTEGRATION — Financial Dashboard: backend integration (mocks removed)

> **Statut final (nettoyage 100% mocks) : les 6 seams ci-dessous sont toutes branchées en
> dur sur leur `*HttpService` réel. Plus aucun `*MockService`, plus de bascule
> `environment.useMocks`/`useMocksOverrides` (retirée des deux fichiers d'environnement) —
> voir `EditRecapFront.md` pour le détail complet de cette passe de nettoyage.** Les
> sections ci-dessous datent de l'intégration progressive (Prompts 4 à F5) et sont
> conservées pour l'historique du raisonnement, mais la mécanique mock↔Http qu'elles
> décrivent n'existe plus dans le code.

This module (`src/app/pages/dashboards/financial-dashboard/`) is built entirely against
abstract contracts + `InjectionToken`s (see `ARCHITECTURE.md` §3). No component,
directive, or feature service anywhere in this module imports `HttpClient` or a concrete
`*MockService`/`*HttpService` class — verified with:

```bash
grep -rE "HttpClient|MockService|HttpService" src/app/pages/dashboards/financial-dashboard/features
# → no matches
```

## 1. Seams (token → Http class)

| Contract | Token | Implémentation |
|---|---|---|
| `ClientDataService` | `CLIENT_DATA_SERVICE` | `ClientDataHttpService` — backend complet (2 endpoints) |
| `FactureDataService` | `FACTURE_DATA_SERVICE` | `FactureDataHttpService` — backend complet (4 endpoints) |
| `FinanceDataService` | `FINANCE_DATA_SERVICE` | `FinanceDataHttpService` — backend complet (6 endpoints, `enregistrerRetrait` inclus) |
| `AgentDataService` | `AGENT_DATA_SERVICE` | `AgentDataHttpService` — backend complet (3 endpoints) |
| `SessionService` | `SESSION_SERVICE` | `SessionHttpService` — backend complet (4 endpoints) |
| `ExportService` | `EXPORT_SERVICE` | `ExportClientService` (`data-access/export/`) — **pas un mock**, client-side par design, voir §4 |

Tous les `*MockService` et leur infrastructure (`MockConfigService`, `simulate.util.ts`,
`data-access/mock/data/*.ts`) ont été supprimés définitivement. Contrats dans
`data-access/contracts/*.service.ts`, tokens dans `data-access/tokens/*.token.ts`,
implémentations réelles dans `data-access/http/*.http.service.ts` (+ `data-access/export/`
pour Export).

## 2. (Historique) Ancien mécanisme de bascule mock↔Http

Cette section décrivait l'ancien helper `mockOuHttp()` piloté par
`environment.useMocks`/`useMocksOverrides`. Les deux clés ont été retirées de
`environment.ts`/`environment.prod.ts` et la fonction supprimée de
`financial-dashboard.routes.ts` : il n'y a plus de bascule, chaque token pointe
directement sur son implémentation Http réelle (voir §1).

## 3. Endpoint map

Base URL: `${environment.apiUrl}/finance`. Tous les endpoints ci-dessous sont **confirmés
réels** (route + controller + requête Mongoose vérifiés) — voir `EditRecap.md` (backend)
pour le détail par domaine.

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
| `POST /finance/retraits { montant, customerMsisdn, operator, motif? }` | `FinanceDataHttpService.enregistrerRetrait` | F4 — contrat étendu lors du nettoyage 100% mocks (aucun composant ne l'appelait encore, extension sans risque) |
| `GET /finance/agents?page=&pageSize=` | `AgentDataHttpService.getAgents` | F5 |
| `GET /finance/agents/paiements?page=&pageSize=&idAgent=` | `AgentDataHttpService.getPaiementsAgent` | F5 |
| `POST /finance/agents/paiements { idAgent, montant }` | `AgentDataHttpService.payerAgent` | F5 — RG10 solde impact still TBC |
| `GET /finance/session/moi` | `SessionHttpService` (constructor) | Real session — replaces the demo default-role bootstrap |
| `GET /finance/session/utilisateurs` | `SessionHttpService.getUtilisateurs` | F11 admin |
| `PATCH /finance/session/utilisateurs/:id/droits-finance` | `SessionHttpService.toggleDroitsFinance` | F11 admin |

## 4. `ExportService` has no Http counterpart

F2/F10/F12 exports (CSV, print/PDF) are **client-side only per the MVP spec** — there is
no server-rendered export in scope (DISCOVERY.md §7, ARCHITECTURE.md §5). `ExportClientService`
(`data-access/export/export-client.service.ts`, renamed from `ExportMockService` during the
100%-mocks cleanup — it never simulated anything, the old name was misleading) does the
real work (Blob/`window.print()`), so there is nothing to "swap". If a future iteration
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

## 7. Nettoyage final 100% mocks

- Tous les `*.mock.service.ts` supprimés (`finance-data`, `agent-data`, `session` —
  `client`/`facture` l'étaient déjà) ainsi que `MockConfigService`, `simulate.util.ts` et
  les 10 fichiers de `data-access/mock/data/*.ts` (dont `scenarios.ts`, déjà orphelin).
- `RoleSwitcherComponent` et `MockScenarioPanelComponent` (démo UI, jamais destinés à la
  prod) supprimés avec leurs références dans `finance-layout.ts`/`.html`.
- `SessionService.switchRole` retiré du contrat (code mort une fois son seul appelant —
  le role-switcher — supprimé) ; le rôle vient désormais uniquement de `GET
  /finance/session/moi`.
- `FinanceDataService.enregistrerRetrait` étendu à `{ montant, customerMsisdn, operator,
  motif? }` (le contrat réel du backend) et branché en HTTP réel — plus aucune méthode ne
  dépend d'un mock.
- `environment.ts`/`environment.prod.ts` : `useMocks`/`useMocksOverrides` retirés.
- `npx tsc --noEmit` : `EXIT 0` après l'ensemble de ces suppressions.
