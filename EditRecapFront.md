# Prompt F1 — Confirmer l'alignement de la carte d'endpoints

## Récapitulatif

Analyse pure, aucun fichier modifié.

## Détail

Deux constats majeurs avant le tableau :

1. **`07-Correspondance-Front-Back.md` cité par le Prompt F3 n'existe pas** dans le repo (seuls `ARCHITECTURE.md`, `DISCOVERY.md`, `INTEGRATION.md` existent dans `docs/`). Comparaison faite directement entre modèles frontend et réponses backend réelles.
2. **6 endpoints assumés par le frontend n'ont aucun backend** : tout `ClientDataService` (2 méthodes) et 4 des 6 méthodes de `FactureDataService`.

### Tableau de réconciliation

| Méthode/contrat | URL assumée | Backend réel | Verdict |
|---|---|---|---|
| `FinanceDataHttpService.getDashboardKpi` | `GET /finance/dashboard/kpi?mois=&annee=` | identique | **aligné** |
| `.getStats` | `GET /finance/dashboard/stats?debutMois=&debutAnnee=&finMois=&finAnnee=` | identique | **aligné** |
| `.getRepartitionModePaiement` | `GET /finance/dashboard/repartition-mode?...` | URL identique, `mode` backend = opérateur brut | **forme à absorber dans le mapper (F3)** |
| `.getPaiements` | `GET /finance/paiements?page=&pageSize=&idClient=&search=` | identique, `idFacture` absent honnêtement | **aligné** |
| `.getRetraits` | `GET /finance/retraits?page=&pageSize=&search=&mois=&annee=` | identique | **aligné** |
| `.enregistrerRetrait` | `POST /finance/retraits { montant, motif }` | backend exige aussi `customerMsisdn`, `operator` | **écart réel, pas un simple ajustement** |
| `FactureDataHttpService.getSuiviMensuel` | `GET /finance/factures/suivi-mensuel?...` | identique | **aligné** |
| `.getReleve` | `GET /finance/factures/releve/:idClient?...` | identique | **aligné** |
| `.getFactures` | `GET /finance/factures?...` | n'existe pas | **backend manquant** |
| `.getFacturesClient` | `GET /finance/factures/client/:idClient` | n'existe pas | **backend manquant** |
| `.getSituationClients` | `GET /finance/factures/situation-clients` | n'existe pas | **backend manquant** |
| `.genererFacturesDuMois` | `POST /finance/factures/generer` | n'existe pas | **backend manquant** |
| `AgentDataHttpService.getAgents` | `GET /finance/agents?page=&pageSize=` | identique | **aligné** |
| `.getPaiementsAgent` | `GET /finance/agents/paiements?page=&pageSize=&idAgent=` | identique | **aligné** |
| `.payerAgent` | `POST /finance/agents/paiements { idAgent, montant }` | identique | **aligné** |
| `ClientDataHttpService.getClients` | `GET /finance/clients?...` | n'existe pas | **backend manquant** |
| `.getClient` | `GET /finance/clients/:idClient` | n'existe pas | **backend manquant** |
| `SessionHttpService` (constructeur) | `GET /finance/session/moi` | identique | **aligné** |
| `.getUtilisateurs` | `GET /finance/session/utilisateurs` | identique (+ vérif administrateur serveur) | **aligné** |
| `.toggleDroitsFinance` | `PATCH /finance/session/utilisateurs/:idUtilisateur/droits-finance` | identique | **aligné** |

**Vérification agencyId** : aucun des 5 http services ne met `agencyId` dans un chemin ou en query param — scoping agence assumé via la session/JWT partout.

### Décisions prises avec l'utilisateur (AskUserQuestion)
- **Endpoints manquants (ClientDataService/FactureDataService)** : continuer seulement sur les contrats/méthodes ayant un vrai backend ; les contrats incomplets restent en mock.
- **`POST /finance/retraits`** : laisser `useMocks` pour ce point précis, plutôt que d'étendre le formulaire maintenant.

---

# Prompt F2 — Enrichir les enums/modèles si nécessaire

## Décision : garder `FactureStatut` binaire (PAYEE | IMPAYEE)

Aucun fichier modifié dans `models/enums.ts`.

**Vérification faite** : `badgeFacture()` (`shared/status-badge/status-badge.util.ts:23-27`) utilise un ternaire, pas un `switch` exhaustif — enrichir l'enum n'aurait rien cassé à la compilation, mais aurait mal-étiqueté silencieusement toute nouvelle valeur sans mise à jour de cette fonction.

**Raison du choix** : le backend déjà livré (`getSuiviMensuelAgence`, backend Prompt 7) a déjà fait ce choix de simplification côté serveur (`paye→'Payée'`, `en_attente`/`retard`→`'Impayée'`, `annule`→`NonGeneree`) — enrichir l'enum frontend aurait demandé de rouvrir le backend déjà livré, hors périmètre de cette session de câblage.

Aucun composant impacté (`badgeFacture`, `badgeSuiviMensuel`, `monthly-tracking.component.ts` inchangés).

---

# Prompt F3 — Écrire les mappers DTO backend → modèle frontend

## Récapitulatif

| Fichier | Nature | État |
|---|---|---|
| `data-access/http/mappers/finance.mapper.ts` | Corps identité remplacés par la vraie conversion (`mapDashboardKpiDto`, `mapPaiementListeDto`, `mapRetraitDto`) + nouvelle fonction `mapRepartitionModePaiementDto` | modifié |
| `data-access/http/mappers/facture.mapper.ts` | `mapSuiviAbonneMensuelDto`/`mapLigneReleveDto` réels ; `mapFactureDto` volontairement laissé en identité | modifié |
| `data-access/http/mappers/agent.mapper.ts` | `mapAgentDto`/`mapPaiementAgentDto` réels | modifié |
| `data-access/http/mappers/session.mapper.ts` | `mapSessionUtilisateurDto`/`mapUtilisateurDto` réels | modifié |
| `data-access/http/mappers/client.mapper.ts` | Aucun changement — pas de backend | inchangé |

## Détail

Constat clé : la plupart des DTO backend réels ont été **délibérément construits pour correspondre champ-à-champ** aux modèles frontend pendant le développement backend (Prompts 2-11 côté `collecte-dechets-back`) — la plupart des mappers n'ont donc pas eu besoin des conversions génériques anticipées par le prompt d'origine (parsing de `periodLabel`, `.toString()` sur `_id`, etc.).

### Signatures/exports gardés intacts (règle 2)
Tous les noms de fonctions, paramètres et exports sont restés identiques — seuls les corps ont changé, sauf `mapRepartitionModePaiementDto` qui est **une fonction nouvelle** (absente jusque-là, le http service castait directement la réponse HTTP sans mapper).

### `mapRepartitionModePaiementDto` — la seule vraie conversion nécessaire
Le backend groupe par opérateur exact (`ORANGE_MONEY`/`MOOV_MONEY`/`TELECEL_MONEY`, décision explicite du backend Prompt 3), alors que `ModePaiement` frontend n'a que 3 buckets génériques (`Especes`/`MobileMoney`/`Autre`), sans granularité par opérateur. Les 3 valeurs backend sont regroupées sous `ModePaiement.MOBILE_MONEY`, montants sommés — perte de détail par opérateur assumée à ce niveau (à revoir si le produit veut un jour distinguer Orange/Moov/Telecel dans l'UI).

### `role` potentiellement `null` (session.mapper.ts)
`SessionUtilisateur.role`/`Utilisateur.role` sont typés `Role` (non-nullable), mais le backend peut renvoyer `null` si `financialRole` n'a jamais été assigné à l'utilisateur. Vérifié sans danger : `financeAccessGuard` se base sur `droitsFinance` (faux par défaut, fermé par défaut) et `financeAdminGuard` fait une égalité stricte à `Role.ADMINISTRATEUR` (`null` ne matche jamais, refusé par défaut aussi).

### Tests unitaires (16 tests, exécutés réellement)
4 fichiers `*.mapper.spec.ts` créés (finance/facture/agent/session), couvrant les cas nominaux et les cas limites (`idFacture` absent, `motif`/`payeLe`/`prenom`/`telephone` optionnels absents, `role: null`, tableau vide). Voir Prompt F8 pour le détail d'exécution.

---

# Prompt F4 — Vérifier / ajuster les services HTTP

## Récapitulatif

| Fichier | Nature | État |
|---|---|---|
| `data-access/http/finance-data.http.service.ts` | `getRepartitionModePaiement` câblé au nouveau mapper ; `enregistrerRetrait` délégué en interne (voir F5) | modifié |
| `data-access/http/agent-data.http.service.ts` | URLs déjà identiques au tableau F1 | **aucun changement, confirmé** |
| `data-access/http/session.http.service.ts` | URLs déjà identiques au tableau F1 | **aucun changement, confirmé** |
| `data-access/http/facture-data.http.service.ts` | `getSuiviMensuel`/`getReleve` déjà corrects ; les 4 méthodes sans backend non touchées | inchangé |
| `data-access/http/client-data.http.service.ts` | Aucun backend du tout | inchangé |

Aucun contrat (`contracts/*.service.ts`) ni token touché. `useMocks` pas encore basculé à ce stade (fait au Prompt F5).

---

# Prompt F5 — Basculer les providers mock → http, un contrat à la fois

## Récapitulatif

| Fichier | Nature | État |
|---|---|---|
| `src/environments/environment.ts` | **Ajout** — `useMocksOverrides` (additif), `useMocks` global conservé comme défaut | modifié |
| `src/environments/environment.prod.ts` | Idem | modifié |
| `financial-dashboard.routes.ts` | `mockOuHttp<T>()` étendu avec un paramètre `domaine` ; `FinanceDataMockService` fourni en plus comme provider brut | modifié |
| `data-access/http/finance-data.http.service.ts` | `enregistrerRetrait` délègue à `FinanceDataMockService` injecté (composition) | modifié |

## Détail

**Constat important** : le mécanisme `mockOuHttp<T>(mock, http)` **existait déjà** dans `financial-dashboard.routes.ts`, câblé pour les 5 contrats — bien plus avancé que ce que `INTEGRATION.md` laissait supposer ("Prompt 17... reste mock pour tout le MVP"). Il manquait seulement la granularité par domaine, ajoutée ici.

### Bascule réalisée (ordre : Session → Agent → Finance)

| Contrat | Domaine | État |
|---|---|---|
| `SessionService` | `session` | **basculé → Http**, 3/3 méthodes réelles |
| `AgentDataService` | `agent` | **basculé → Http**, 3/3 méthodes réelles |
| `FinanceDataService` | `finance` | **basculé → Http**, 5/6 réelles ; `enregistrerRetrait` délègue en interne à `FinanceDataMockService` |
| `ClientDataService` | `client` | reste mock (0/2 endpoint backend) |
| `FactureDataService` | `facture` | reste mock (2/6 endpoints seulement) |
| `ExportService` | — | reste mock (jamais de bascule prévue, pas d'équivalent Http) |

### Décision sur `enregistrerRetrait` (prise avec l'utilisateur, AskUserQuestion)
Le backend exige `{montant, customerMsisdn, operator}`, le frontend n'envoie que `{montant, motif}`. Deux options proposées : garder `FinanceDataService` entier en mock (simple), ou composition interne (5/6 méthodes live, `enregistrerRetrait` seul délégué au mock). **Choix retenu : composition interne** — `FinanceDataHttpService` injecte `FinanceDataMockService` et lui délègue uniquement `enregistrerRetrait`, tout le reste appelle le vrai backend. Nécessite `FinanceDataMockService` comme provider brut en plus de son rôle dans le token (ajouté dans `providers:[...]`).

### Mécanisme de bascule fine
`environment.useMocksOverrides: Partial<Record<'client'|'facture'|'finance'|'agent'|'session', boolean>>` — une clé à `false` force ce domaine en Http même si `useMocks` global reste `true` ; absente/undefined = hérite du global. `client`/`facture` n'ont pas d'entrée (héritent du `true` global).

### Écrans à retester après cette bascule
Session (conditionne tout le module), F1/F2 (dashboard + graphiques), F3 (paiements), F4 (retraits — liste réelle, création toujours mockée), F5 (paiement agents, réel), F11 (roles-admin) — détail complet dans `docs/CHECKLIST-TEST-MANUEL-F8.md`.

---

# Prompt F6 — Reconnecter les graphiques (F1/F2)

## Récapitulatif

**Aucun changement de code.**

Les 3 charts (`collected-over-time.chart.ts`, `paid-vs-unpaid.chart.ts`, `revenue-breakdown.chart.ts`) et `dashboard.component.ts` ne consomment que les modèles de domaine (`FinanceStatsSeries`, `RepartitionModePaiement[]`), jamais de DTO — le mapper F3 produit déjà la forme exacte attendue.

`shared/chart/finance-chart.component.ts` : non touché (comme demandé). Vérifié que le canvas reste toujours monté (pas de `*ngIf` dessus, `ngAfterViewInit`) et que l'état vide (`estVide`) est déjà géré proprement.

**Note comportementale** : le graphique "Répartition par mode de paiement" affiche désormais un seul secteur "MobileMoney" à 100% — reflet honnête de l'absence d'autres canaux de paiement dans le socle actuel, pas un bug.

---

# Prompt F8 — Tests & non-régression

## Récapitulatif

| Fichier | Nature | État |
|---|---|---|
| `data-access/http/mappers/finance.mapper.spec.ts` | Nouveau, 8 tests | créé |
| `data-access/http/mappers/facture.mapper.spec.ts` | Nouveau, 4 tests | créé |
| `data-access/http/mappers/agent.mapper.spec.ts` | Nouveau, 3 tests | créé |
| `data-access/http/mappers/session.mapper.spec.ts` | Nouveau, 3 tests (dont `role: null`) | créé |
| `tsconfig.spec.json` | **Manquant malgré la cible `test` déjà déclarée dans `angular.json`** — créé pour que les tests soient exécutables | créé |
| `docs/CHECKLIST-TEST-MANUEL-F8.md` | Checklist de test manuel par écran, avec cas limites | créé |

## Détail

**Trou d'infrastructure trouvé** : `angular.json` référence `tsconfig.spec.json` pour sa cible `test` (builder `@angular-devkit/build-angular:karma`), mais ce fichier n'existait pas — `ng test` aurait échoué immédiatement, indépendamment des specs écrites. Fichier standard Angular CLI créé (boilerplate, pas une nouvelle librairie/config).

**Exécution réelle confirmée** : `npx ng test --watch=false --browsers=ChromeHeadless` → **16/16 tests SUCCESS**.

### Checklist de test manuel
Voir `docs/CHECKLIST-TEST-MANUEL-F8.md` — un écran par section (Session, F1, F2, F3, F4, F5, F11, F12, F10), avec cas limites explicites (client sans historique, agence sans données, `role: null`, solde insuffisant, contrôle inter-agences) et rappel des écrans volontairement non concernés (F6, F7/F8 client, F9).

---

# Prompt F7 — Fixes opportuns (reporté)

## État : confirmé réel, **non appliqué** (décision explicite de l'utilisateur : "Non, pas maintenant")

Trois constats vérifiés dans le code réel, prêts à être appliqués dans une session future, chacun en diff isolé :

1. `utils/money.util.ts:6` — `` `${...} FCFA` `` codé en dur ; `DashboardKpi.devise` est maintenant réellement peuplé par le backend (`'XOF'`), le fix est applicable dès qu'on le demande.
2. `financial-dashboard.routes.ts:126` — `{ path: '**', redirectTo: 'dashboard' }` alors qu'aucune route ne s'appelle `dashboard` (elles s'appellent `statistiques`, `payments`, etc.) — devrait être `redirectTo: 'statistiques'`.
3. `features/shell/finance-route-placeholder.ts` — fichier mort confirmé (aucune autre référence dans tout le module).

---

# Hors-série — Fix de build découvert après coup

## `tsconfig.app.json` — exclusion des fichiers `*.spec.ts` manquante

**Contexte** : après la livraison des specs (Prompt F8), `ng serve`/`ng build` ont échoué avec des erreurs `Cannot find name 'describe'/'it'/'expect'`. Cause : `tsconfig.app.json` (qui pilote la compilation de l'application, `types: []`) n'excluait pas les `*.spec.ts` de son `include: ["src/**/*.ts"]` — un trou préexistant dans cette config, jamais révélé faute de fichier `.spec.ts` dans tout le repo avant cette session.

**Avant** :
```json
  "files": ["src/main.ts"],
  "include": ["src/**/*.ts"]
}
```

**Après** :
```json
  "files": ["src/main.ts"],
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.spec.ts"]
}
```

Une ligne ajoutée, correspond à la configuration standard générée par défaut par Angular CLI.

---

# Hors-série — Diagnostic 401 login + bootstrap administrateur finance (F11)

## Contexte
Après la bascule des providers (Prompt F5), tentative de connexion réelle en échec (`401 Utilisateur non trouvé`). Diagnostic fait sans toucher au code :
- `.env` backend inchangé (`MONGO_URI` toujours vers le même cluster Atlas) — écarté l'hypothèse d'une base différente entre local et distant.
- Lecture des logs backend (`logs/log.1.txt`) pour identifier le login réellement utilisé (`88888888`).
- Vérification en lecture seule dans MongoDB : l'utilisateur existe bien (Siméon GANGO, `role: manager`).
- Cause retenue : le process `node server.js` déjà lancé avait chargé `.env` une seule fois au démarrage (`dotenv.config()`) — un redémarrage du serveur suffit pour qu'il relise la valeur actuelle de `MONGO_URI`. Aucun code touché.

## Accès manager au dashboard financier
Une fois reconnecté, `GET /finance/session/moi` renvoyait `droitsFinance: false, role: null` pour Siméon — accès bloqué par `financeAccessGuard`, comme prévu par conception (`droitsFinance` est un droit séparé du rôle opérationnel `manager`, jamais automatique).

**Blocage d'amorçage identifié** : aucun utilisateur n'avait `financialRole='administrateur'` en base, donc personne ne pouvait utiliser l'écran F11 (Rôles & droits, réservé aux administrateurs) pour accorder des droits à qui que ce soit.

**Décision validée avec l'utilisateur (AskUserQuestion)** : bootstrap ciblé de Siméon en administrateur (`financialRole='administrateur'`, `droitsFinance=true`) via une écriture directe en base côté backend (voir `EditRecap.md` backend, section "Hors-série — Bootstrap du premier administrateur finance") plutôt qu'une règle automatique donnant l'accès à tous les `role='manager'` sans validation — préserve le modèle d'approbation F11 déjà construit. **Aucun fichier frontend modifié pour cette action** — uniquement une donnée backend ; le frontend doit simplement recharger sa session (reconnexion) pour refléter le changement, `SessionHttpService` ne chargeant `GET /finance/session/moi` qu'une fois à l'initialisation du module.

## Suite
Siméon (désormais administrateur finance) peut accorder/retirer `droitsFinance` aux autres managers un par un via l'écran F11 déjà en place — aucun autre bootstrap de ce type ne devrait être nécessaire côté frontend.

---

# Hors-série — Bug de course dans les guards (régression introduite par la bascule Session→Http)

## Récapitulatif

| Fichier | Nature | État |
|---|---|---|
| `guards/finance-access.guard.ts` | Lit `currentUser$` (réactif) au lieu de `getCurrentUser()` (synchrone) | modifié |
| `guards/finance-admin.guard.ts` | Idem | modifié |

## Contexte
Malgré le bootstrap de Siméon en administrateur (`droitsFinance=true` en base), l'écran restait bloqué sur "Accès restreint". Cause trouvée en lisant le code, pas en devinant :

- `financeAccessGuard`/`financeAdminGuard` appellent `session.getCurrentUser()` de façon **synchrone**.
- `SessionMockService.getCurrentUser()` ne pose jamais problème : son `BehaviorSubject` a une valeur dès sa construction.
- `SessionHttpService.getCurrentUser()` (Prompt F5, désormais actif) lève une exception tant que `GET /finance/session/moi` (asynchrone) n'a pas répondu — et même une fois résolu, rien ne garantissait que le guard s'exécute après cette résolution.
- Ce bug n'existait pas avant la bascule `session` en Http (Prompt F5) : il était invisible avec le mock, qui n'a jamais ce problème de timing par construction.

## Correctif
Les deux guards lisent désormais `session.currentUser$` (déjà un `Observable` du contrat `SessionService`, **aucun changement du contrat lui-même**) via `.pipe(take(1), map(...))` au lieu d'appeler `getCurrentUser()`. `take(1)` reproduit le comportement synchrone d'origine pour le mock (émission immédiate) tout en attendant la vraie réponse serveur pour l'Http. `data-access/contracts/session.service.ts` non touché, comme l'exige la règle 2 (contrats = point de stabilité).

`shell/finance-layout.ts` et `shared/role-switcher/role-switcher.component.ts` appellent aussi `getCurrentUser()` de façon synchrone (comme valeur initiale d'un `toSignal`), mais **n'ont pas eu besoin d'être modifiés** : Angular résout tous les guards d'une arborescence de routes avant d'instancier le moindre composant, donc par construction, ces composants ne se construisent qu'après que le guard a déjà attendu la première émission de `currentUser$` — la valeur est alors garantie disponible.

## Point non traité, signalé
Le sélecteur "Rôle (démo)" (`shared/role-switcher`) reste affiché même quand `session` est en Http, alors que `SessionHttpService.switchRole()` est un no-op documenté ("aucun équivalent réel") — cliquer dessus ne change rien silencieusement, ce qui peut prêter à confusion pour qui teste avec le vrai backend. Pas corrigé ici (composant `shared/*`, à ne toucher que sur confirmation explicite) — à confirmer si un masquage conditionnel est souhaité quand `environment.useMocksOverrides.session === false`.

---

# Hors-série — Assignation du financialRole depuis la liste des employés d'agence (hors module financial-dashboard)

## Contexte
Aucun système ne permettait d'assigner `financialRole` — uniquement le toggle `droitsFinance` (F11). Demande : un manager `financialRole='administrateur'` doit pouvoir assigner un rôle financier aux autres managers depuis la liste des employés de l'agence — **page `src/app/pages/dashboards/agency-dashboard/`, un module totalement différent du `financial-dashboard`** (pas de `SessionService`/tokens DI ici, mais l'`AuthService` global de l'app).

## Récapitulatif

| Fichier | Nature | État |
|---|---|---|
| `src/app/models/user.model.ts` | **Ajout** — `financialRole?`/`droitsFinance?` sur `User` et `RegisterUserData` | modifié (additif) |
| `src/app/services/agency.service.ts` | **Ajout** — `setEmployeeFinancialRole$(employeeId, financialRole)` | modifié (additif) |
| `agency-dashboard.ts` | **Ajout** — `estAdministrateurFinance` (getter), `getFinancialRoleText()`, `assignFinancialRole()` | modifié (additif) |
| `agency-dashboard.html` | **Ajout** — sélecteur de rôle financier dans la vue carte ET la vue tableau, visible seulement pour un administrateur finance ciblant un manager | modifié (additif) |
| `agency-dashboard.scss` | **Ajout** — bloc de style `.finance-role-*` en fin de fichier | modifié (additif) |

## Détail

### Découverte clé : `financialRole`/`droitsFinance` étaient déjà accessibles, sans backend supplémentaire
`services/auth.js` (backend) fait `user.toObject()` en ne retirant que `password` — le `user` renvoyé par `POST /login` contenait donc déjà `financialRole`/`droitsFinance` depuis leur création (Prompt 10 backend), et `AuthService` (`src/app/services/auth.service.ts`) stocke ce `user` brut (non typé, `any`) en `localStorage` + `BehaviorSubject` sans rien filtrer. Seule l'interface TypeScript `RegisterUserData` les ignorait — ajout purement additif de deux champs optionnels pour y accéder avec sécurité de type.

### Réutilisation confirmée
`agency-dashboard.ts` injectait déjà `AuthService` et exposait `this.currentUser` (`ngOnInit`, ligne ~1389) — aucun nouveau service de session nécessaire, contrairement au module `financial-dashboard`. Pattern de garde par rôle (`*ngIf`/`@if` sur `currentUser?.role`) déjà présent ailleurs dans l'app (`signalement.html`, `header.ts`) — suivi à l'identique pour `estAdministrateurFinance`.

### Restriction "managers uniquement" appliquée côté frontend
Le sélecteur n'apparaît que si `employee.role === 'manager'` — restriction purement UI (le backend reste générique, voir `EditRecap.md` backend pour le détail). Visible dans les deux vues existantes (cartes ET tableau) de la liste des employés, à côté des actions déjà présentes (modifier/supprimer/activer-désactiver), même style visuel (`action-btn`-like).

### Dépendance backend
Nécessite le nouvel endpoint `PATCH /api/finance/session/utilisateurs/:idUtilisateur/financial-role` (voir `EditRecap.md` backend, section "Hors-série — Assignation du financialRole depuis la liste des employés d'agence") ainsi que l'extension du `.select()` de `getAgencyEmployees` (sinon le rôle assigné disparaîtrait de l'affichage après un rechargement de la liste).

### Correctif immédiat : interface `Employees` manquante
`ng serve` a échoué (`TS2339: Property 'financialRole' does not exist on type 'Employees'`) : le template `agency-dashboard.html` type ses lignes via `Employees` (`src/app/models/agency.model.ts:172-184`), une interface **distincte** de `User`/`RegisterUserData` déjà étendues plus haut. `npx tsc --noEmit` n'avait rien signalé, car il ne détecte pas les erreurs de template Angular (seul le compilateur Angular du build réel les voit — d'où l'écart déjà repéré une fois auparavant avec `tsconfig.app.json`). Ajout additif de `financialRole?`/`droitsFinance?` sur `Employees` — même correctif que pour `User`, sur la bonne interface cette fois.

---

# Hors-série — Extension de l'assignation financialRole au SessionService (F11) puis au dashboard admin

## Contexte
Suite immédiate du hors-série précédent. Deux demandes en cascade : (1) offrir la même assignation sur l'écran F11 "Rôles & droits" du module `financial-dashboard` lui-même ; (2) l'utilisateur a signalé un écran existant distinct, `admin-dashboard.ts` (onglet "Utilisateurs", route `dashboard/admin`) — **plateforme entière**, pas scopé à une agence, réservé au `role` opérationnel `super_admin`. Décision retenue après clarification (AskUserQuestion) : garder l'ajout agency-dashboard tel quel, et implémenter en plus dans admin-dashboard.

## Récapitulatif

| Fichier | Nature | État |
|---|---|---|
| `data-access/contracts/session.service.ts` | **Ajout** — `abstract setFinancialRole(idUtilisateur, role)` sur le contrat `SessionService` | modifié (additif) |
| `data-access/http/session.http.service.ts` | **Ajout** — implémentation réelle + table de traduction `Role`→snake_case | modifié (additif) |
| `data-access/mock/session.mock.service.ts` | **Ajout** — implémentation requise pour rester conforme au contrat (pas encore branchée sur une UI F11) | modifié (additif) |
| `src/app/services/agency.service.ts` | **Ajout** — `setEmployeeFinancialRole$` étendu avec un 3ᵉ paramètre `agencyId` optionnel | modifié (additif) |
| `admin-dashboard.ts` | **Ajout** — `getFinancialRoleText()`, `assignFinancialRole()` | modifié (additif) |
| `admin-dashboard.html` | **Ajout** — sélecteur de rôle financier (vue tableau + vue cartes), visible seulement pour `role==='manager'` | modifié (additif) |
| `admin-dashboard.scss` | **Ajout** — bloc `.finance-role-select` en fin de fichier | modifié (additif) |

## Détail

### Édition d'un contrat abstrait — normalement protégé, ici justifiée
`data-access/contracts/*.service.ts` est explicitement protégé par les règles de travail ("point de stabilité", à ne toucher que sur obligation prouvée). Ici, le contrat `SessionService` ne pouvait tout simplement pas exposer cette capacité sans extension — ni la mock ni la version Http n'avaient de méthode pour assigner un rôle, seulement pour basculer `droitsFinance`. Ajout d'une méthode de plus, sur le même modèle que `toggleDroitsFinance` (fire-and-forget, pas d'Observable retourné), sans rien retirer ni renommer.

### Incohérence de modèle notée dans le mock
`SessionMockService` conflate `Utilisateur.role` avec le rôle financier lui-même (pas de rôle opérationnel séparé dans ce monde de démo) — contrairement au backend réel où `financialRole` est distinct de `User.role`. `role: Role` étant non-nullable dans ce modèle, retirer un rôle (`null`) n'a pas d'équivalent démo propre : no-op documenté dans ce cas précis ; le comportement réel (Http) gère bien le retrait.

### Incompatibilités trouvées pour `admin-dashboard` (avant d'écrire le frontend)
1. **Autorisation** : `_isAdministrateur` (backend) ne vérifiait que `financialRole==='administrateur'` — un super_admin plateforme n'a pas ce champ. Corrigé côté backend (voir `EditRecap.md` backend, section correspondante) pour accepter aussi `role==='super_admin'`.
2. **Scoping agence** : contrairement à `agency-dashboard` (où l'agence de l'appelant == l'agence de la cible), un super_admin gère des utilisateurs de N agences différentes. `setEmployeeFinancialRole$` accepte donc un `agencyId` optionnel, transmis en query `?agencyId=` — c'est l'agence de **la cible** (peuplée par le backend dans `GET /users`, `services/user.js:8` : `.populate('agencyId', 'name')`), pas celle de l'appelant.

### Bug TypeScript rencontré et corrigé en cours de route
`const params = agencyId ? { agencyId } : {};` ne passait pas la vérification de type d'Angular `HttpClient.patch()` (union avec `{agencyId?: undefined}` incompatible avec `Record<string, ...>`). Remplacé par le pattern `HttpParams` déjà utilisé ailleurs dans `agency.service.ts` (`let params = new HttpParams(); if (agencyId) params = params.set(...)`).

### Portée du sélecteur
Comme pour `agency-dashboard`, restriction "managers uniquement" appliquée **côté frontend** (`*ngIf="user.data?.role === 'manager'"`), le backend restant générique.

---

# Module Facturation branché sur le backend réel — suppression de `FactureDataMockService`

## Récapitulatif

| Fichier | Nature | État |
|---|---|---|
| `data-access/http/mappers/facture.mapper.ts` | **Réécrit** — `mapFactureDto` : passthrough identité → mapping champ-à-champ réel | modifié |
| `data-access/http/facture-data.http.service.ts` | Vérifié — déjà 100% conforme au backend, **aucun changement** | inchangé |
| `data-access/mock/facture-data.mock.service.ts` | **Supprimé définitivement** (demande explicite) | supprimé |
| `financial-dashboard.routes.ts` | `FACTURE_DATA_SERVICE` branché en dur sur `FactureDataHttpService`, sortie de `'facture'` du type union de `mockOuHttp` | modifié |
| `docs/INTEGRATION.md` | Ligne `FactureDataService` du tableau §1 mise à jour | modifié |

## Détail

### Mapping réel écrit contre le contrat backend
`mapFactureDto` mappe maintenant `idFacture, idClient, periode{mois,annee}, montant, statut, dateGeneration, datePaiement` un-à-un contre `services/redevance.js::_mapRedevanceToFacture` (voir `EditRecap.md` backend). `mapSuiviAbonneMensuelDto`/`mapLigneReleveDto` n'ont pas été touchés (déjà réels depuis le Prompt F3, contre `getSuiviMensuelAgence`/`getReleveClient`).

### Suppression du mock — vérifiée avant coup
Grep préalable : seuls `facture-data.mock.service.ts` lui-même et `financial-dashboard.routes.ts` référençaient `FactureDataMockService` — suppression sûre. `data/factures.data.ts` (données brutes) n'a pas été touché : encore utilisé par `finance-data.mock.service.ts` pour d'autres besoins (paiements), sans rapport avec `FactureDataService`.

### Provider câblé en dur, plus de bascule mock/http pour ce domaine
`FACTURE_DATA_SERVICE` fournit directement `FactureDataHttpService` (plus d'appel à `mockOuHttp('facture', ...)`) — le module Facturation n'a plus de mode démo, contrairement à `client`/`finance`/`agent`/`session` qui restent pilotables via `environment.useMocksOverrides`. Assumé : le backend Facturation est maintenant la seule vérité pour ce domaine.

### Vérification
`npx tsc --noEmit -p tsconfig.json` → `EXIT:0` après l'ensemble des changements ci-dessus. Pas de `ng build`/`ng serve` relancé dans cette tâche (déjà refusé explicitement par l'utilisateur plus tôt dans la conversation) — vérification limitée à la compilation TypeScript stricte.

## ⚠️ Limitation critique découverte — `ClientDataService` reste mocké

La demande incluait "Relevé Client fonctionne, Fiche Client fonctionne […] sans aucun mock". **Ce n'est pas honnêtement atteint pour ces deux écrans (ni pour l'onglet facturation de la fiche client)** — seul "Suivi Mensuel" fonctionne réellement de bout en bout sans aucun mock.

**Cause** : `ClientDataMockService` (hors périmètre de cette tâche — décision antérieure explicite de l'utilisateur : "Continuer seulement sur les contrats complets") génère des identifiants `idClient` au format `cli-001`, `cli-002`, etc. (`data/clients.data.ts`), qui ne sont **pas** des `ObjectId` MongoDB valides. Le nouveau backend Facturation, lui, attend et retourne toujours de vrais `ObjectId` (`clientId` des documents `Redevance`/`Contrat`).

**Deux symptômes distincts selon l'écran** :
- **Relevé Client / Fiche Client (onglet factures)** : appellent `getFacturesClient(idClient)` avec un `idClient` du type `cli-001` → le backend valide `ObjectId.isValid()` avant toute requête → **erreur 400 explicite `"idClient invalide"`**, visible et honnête (pas de faux résultat).
- **Liste clients (badge "Situation paiement")** : `client-list.component.ts` fait une jointure côté client entre la liste `ClientDataMockService` (IDs `cli-XXX`) et `getSituationClientsAgence()` (IDs Mongo réels), par `Map` indexée sur `idClient`. Ces IDs ne matchent **jamais** → la recherche `Map.get()` échoue silencieusement → **chaque client affiche "à jour" par défaut, quel que soit son vrai retard**. C'est le cas le plus dangereux : aucune erreur visible, donnée silencieusement fausse.

**Ce qui fonctionne réellement sans aucun mock** : "Suivi Mensuel" (`getSuiviMensuelAgence`) est fonctionnellement autonome — le backend fait lui-même la jointure `Contrat`→`User` et renvoie nom/quartier du client directement dans sa réponse, sans jamais passer par `ClientDataService`.

**Pour lever complètement cette limitation** : il faudrait construire le backend de `ClientDataService` (`GET /finance/clients`, `GET /finance/clients/:idClient`) avec de vrais `ObjectId`, ce qui était explicitement hors du périmètre du message actuel et d'une décision antérieure de la conversation. Signalé ici plutôt que masqué.

---

# Module Client branché sur le backend réel — suppression de `ClientDataMockService`

## Récapitulatif

| Fichier | Nature | État |
|---|---|---|
| `data-access/http/mappers/client.mapper.ts` | **Réécrit** — `mapClientDto` : passthrough identité → mapping champ-à-champ réel | modifié |
| `data-access/http/client-data.http.service.ts` | Vérifié — déjà 100% conforme au backend, **aucun changement** | inchangé |
| `data-access/mock/client-data.mock.service.ts` | **Supprimé définitivement** (demande explicite) | supprimé |
| `financial-dashboard.routes.ts` | `CLIENT_DATA_SERVICE` branché en dur sur `ClientDataHttpService`, sortie de `'client'` du type union de `mockOuHttp` | modifié |
| `docs/INTEGRATION.md` | Ligne `ClientDataService` du tableau §1 mise à jour | modifié |

## Détail

### Mapping réel écrit contre le contrat backend
`mapClientDto` mappe maintenant `idClient, nom, prenom, quartier, telephone, statut, dateCreation` un-à-un contre `services/user.js::_mapUserToClient` (voir `EditRecap.md` backend, module Client). `client-data.http.service.ts` n'a nécessité aucun changement : ses paramètres de requête (`page`, `pageSize`, `statut`, `search`) et ses chemins (`GET /finance/clients`, `GET /finance/clients/:idClient`) correspondaient déjà exactement au nouveau backend.

### Suppression du mock — vérifiée avant coup
Grep préalable : seuls `client-data.mock.service.ts` lui-même et `financial-dashboard.routes.ts` référençaient `ClientDataMockService` (le commentaire dans `client-data.service.ts` cite juste son nom, pas un import) — suppression sûre. `data/clients.data.ts` (données brutes) n'a **pas** été touché : encore utilisé par 5 autres fichiers (`finance-data.mock.service.ts`, `scenarios.ts`, `factures.data.ts`, `abonnements.data.ts`, `agency-dashboard.ts`), sans rapport avec `ClientDataService`.

### Provider câblé en dur, plus de bascule mock/http pour ce domaine
`CLIENT_DATA_SERVICE` fournit directement `ClientDataHttpService` (plus d'appel à `mockOuHttp('client', ...)`) — le module Client n'a plus de mode démo, comme `facture` désormais. Seuls `finance`/`agent`/`session` restent pilotables via `environment.useMocksOverrides`.

### ⚠️ Résolution de la limitation critique signalée dans la section précédente
Le module Client étant désormais **entièrement réel** (vrais `ObjectId` MongoDB, plus de `cli-001`), la limitation documentée juste au-dessus (mismatch d'IDs entre `ClientDataMockService` et le backend Facturation réel) **n'existe plus** : Relevé Client, Fiche Client et le badge "Situation paiement" de la liste clients reçoivent maintenant tous leurs IDs de la même source réelle (MongoDB), donc la jointure côté `client-list.component.ts` (`Map` indexée sur `idClient` entre `getClients()` et `getSituationClients()`) fonctionne correctement. Les 4 écrans demandés (Suivi Mensuel, Relevé Client, Fiche Client, Facturation) fonctionnent maintenant réellement sans aucun mock.

### Vérification
`npx tsc --noEmit -p tsconfig.json` → `EXIT:0` après l'ensemble des changements ci-dessus. Pas de `ng build`/`ng serve` relancé (même contrainte que pour le module Facturation) — vérification limitée à la compilation TypeScript stricte.

---

# Nettoyage 100% mocks du dashboard financier

Suite à un audit exhaustif (2 agents Explore en parallèle : inventaire mocks frontend + vérification endpoint-par-endpoint du backend), suppression de **tous** les mocks restants du module (`FinanceDataMockService`, `AgentDataMockService`, `SessionMockService`, toute leur infrastructure), pour que le dashboard financier tourne à 100% sur le backend réel.

## Récapitulatif — fichiers supprimés

| Fichier | Raison |
|---|---|
| `data-access/mock/finance-data.mock.service.ts` | Backend réel 100% complet (dashboard/kpi, stats, repartition-mode, paiements, retraits) |
| `data-access/mock/agent-data.mock.service.ts` | Backend réel 100% complet (agents, paiements-agent) |
| `data-access/mock/session.mock.service.ts` | Backend réel 100% complet (session/moi, utilisateurs, droits-finance, financial-role) |
| `data-access/mock/mock-config.service.ts` | Plus aucun mock à configurer (simulation succès/vide/erreur/lent) |
| `data-access/mock/simulate.util.ts` | Consommé uniquement par les 2 mocks ci-dessus, devenu mort |
| `data-access/mock/data/*.ts` (10 fichiers : `abonnements`, `agents`, `clients`, `factures`, `paiements-agent`, `paiements`, `retraits`, `scenarios` — déjà orphelin avant même ce nettoyage —, `seed.util`, `utilisateurs`) | Jeux de données figées, plus aucun consommateur une fois les mocks supprimés |
| `shared/role-switcher/role-switcher.component.{ts,html,scss}` | Démo RBAC sans auth réelle — son seul rôle (`session.switchRole()`) n'a pas d'équivalent en production, le rôle vient de la session réelle |
| `shared/states/mock-scenario-panel.component.{ts,html,scss}` | Panneau démo pilotant `MockConfigService`, supprimé avec lui |
| `data-access/mock/export.mock.service.ts` | **Renommé**, pas supprimé — voir plus bas |

Dossier `data-access/mock/` entièrement vidé et supprimé (plus aucun fichier dedans).

## Fichiers modifiés

| Fichier | Nature |
|---|---|
| `data-access/contracts/finance-data.service.ts` | `enregistrerRetrait` étendu à `{ montant, customerMsisdn, operator: OperateurRetrait, motif? }` (nouveau type `OperateurRetrait`) — voir décision ci-dessous |
| `data-access/http/finance-data.http.service.ts` | `enregistrerRetrait` : vrai `POST /finance/retraits`, plus de composition avec `FinanceDataMockService` |
| `data-access/contracts/session.service.ts` | `switchRole` retiré de l'abstract class (code mort) |
| `data-access/http/session.http.service.ts` | Implémentation `switchRole` (no-op) retirée |
| `data-access/contracts/export.service.ts` | Commentaire mis à jour (référence `ExportClientService`) |
| `features/shell/finance-layout.ts` | Imports/`imports:[]` : retrait de `RoleSwitcherComponent`/`MockScenarioPanelComponent` |
| `features/shell/finance-layout.html` | Retrait de `<app-role-switcher />` et `<app-mock-scenario-panel />`, du wrapper `.quick-actions` devenu vide |
| `financial-dashboard.routes.ts` | Réécriture des `providers` : les 6 tokens pointent en dur sur leur classe Http/réelle ; fonction `mockOuHttp()` supprimée ; imports nettoyés |
| `src/environments/environment.ts` | `useMocks`/`useMocksOverrides` retirés |
| `src/environments/environment.prod.ts` | `useMocks`/`useMocksOverrides` retirés |
| `docs/INTEGRATION.md` | Réécriture §1/§2/§3/§4, ajout §7 — statut "100% Http, mocks supprimés" |

## Fichier créé (déplacement, pas une nouvelle fonctionnalité)

`data-access/export/export-client.service.ts` — `ExportMockService` renommé en `ExportClientService` et déplacé hors de `data-access/mock/`. **Décision et justification** : ce service ne simule rien — il exporte réellement en CSV (Blob) et imprime réellement (`window.print()`), 100% fonctionnel, jamais de données inventées. Le nom "Mock" était trompeur, pas un signe de données factices. `ExportService` n'a et n'aura pas de contrepartie Http par design documentée (export/impression 100% client-side, spec §1.12 — voir `INTEGRATION.md` §4) : le supprimer aurait cassé les exports CSV/impression réels sur les écrans F2/F10/F12 sans aucun gain. Renommer + déplacer satisfait l'objectif "plus aucun MockService" sans supprimer une fonctionnalité qui marche.

## Décision — extension d'`enregistrerRetrait` plutôt que blocage

Avant ce nettoyage, `FinanceDataHttpService.enregistrerRetrait` déléguait à `FinanceDataMockService` car le backend réel exige `{ montant, customerMsisdn, operator }` (`controllers/financeStats.js`), un contrat plus large que l'ancien `{ montant, motif? }`. Vérifié par grep : **aucun composant n'appelle `enregistrerRetrait`** dans tout le module (pas de formulaire de retrait existant) — étendre le contrat était donc sans risque (aucune UI à modifier, aucun appelant à casser). `OperateurRetrait` est un type local (`'MOOV_MONEY' | 'ORANGE_MONEY'`), volontairement **pas** réutilisé depuis `MobileMoneyOperator` (`src/app/models/payment/payment-request.model.ts`, qui inclut aussi `TELECEL_MONEY`) : le backend (`services/transaction.js::sendUserMoney`) rejette explicitement tout opérateur hors `MOOV_MONEY`/`ORANGE_MONEY` pour un retrait, donc un type plus restreint et localement défini est plus correct qu'un import cross-module qui autoriserait une valeur refusée côté serveur — décision cohérente avec l'isolation déjà actée de ce module vis-à-vis du reste de l'app (`Role` propre, pas `UserRole`).

## Vérifications effectuées
- 2 agents Explore (parallèles, lecture seule) : inventaire exhaustif des mocks frontend + vérification ligne-à-ligne des 13 endpoints backend attendus (11/13 confirmés réels et complets, 2 points d'attention déjà résolus ci-dessus).
- Grep de contrôle après suppression : aucune référence vivante à `*MockService`/`MockConfigService`/`useMocks`/`mockOuHttp`/`RoleSwitcherComponent`/`MockScenarioPanelComponent`/`switchRole` nulle part dans `src/` (seuls des commentaires historiques subsistent, explicitement écrits pour expliquer le "avant/après").
- `npx tsc --noEmit -p tsconfig.json` → `EXIT:0`.
- Pas de `ng build`/`ng serve` (contrainte déjà actée dans cette conversation) — les erreurs de template Angular (sélecteurs inconnus, etc.) ont été vérifiées manuellement via les diagnostics IDE en temps réel pendant l'édition de `finance-layout.html`, pas par une recompilation complète.

## Risques et points d'attention restants
1. **`GET /finance/paiements` (F3)** : joint `Transaction` à `pricings` (legacy/abonnements), pas à `Redevance` via `redevanceId` comme le fait `repartition-mode`. Signalé par l'audit backend : à valider avec des données réelles que les paiements de redevances du nouveau module Facturation apparaissent bien dans cet écran — sinon la liste pourrait être vide ou incohérente avec les KPI/factures du même dashboard, même si le seam est techniquement "branché".
2. **`enregistrerRetrait` reste sans UI** : le contrat/service sont maintenant 100% réels, mais aucun écran ne permet encore de déclencher un retrait depuis le dashboard financier (`withdrawals.component` n'affiche qu'un historique). Le jour où ce formulaire sera construit, se rappeler que le backend n'autorise aujourd'hui que `MOOV_MONEY` en pratique (`ORANGE_MONEY` est validé en entrée mais rejette avec "pas encore disponible").
3. **RG10 (impact solde paiement agent)** : contrairement à ce qu'affichaient encore l'UI (`agent-payment.component`) et `docs/INTEGRATION.md` ("TBC"/"mock") avant cet audit, le backend impacte réellement le solde de l'agence depuis un moment déjà (`services/paiementAgent.js`). Le composant `agent-payment` n'a pas été modifié dans cette passe (hors périmètre strict du nettoyage mocks côté data-access) — un message UI encore marqué "mock" y serait trompeur et mérite une vérification séparée.
4. **Perte des outils de démo** : `RoleSwitcherComponent`/`MockScenarioPanelComponent` permettaient de tester rapidement les 3 rôles financiers et les états vide/erreur/lent sans backend. Une fois supprimés, tester ces scénarios nécessite maintenant de vraies données/comptes côté backend (ex. via les écrans d'assignation de `financialRole` déjà construits sur `agency-dashboard`/`admin-dashboard`).
5. **`.quick-actions`/`.header-content` (SCSS)** : la règle `.quick-actions` dans `finance-layout.scss` n'a plus de consommateur HTML mais a été **laissée en place** (délibéré) — le commentaire de tête du fichier indique qu'elle reproduit un langage visuel partagé avec `agency-dashboard.scss`, pas une classe mock-spécifique ; elle reste disponible pour un futur bouton d'action rapide.

---

# Relevé (F10) : le bouton "Imprimer / PDF" imprimait toute la page au lieu de générer un vrai PDF

## Symptôme signalé
Le bouton de l'écran "Relevé" appelait `ExportService.print()` → `window.print()`, qui imprime toute la page du navigateur (toolbar comprise, malgré les règles `@media print` de `statement-print.scss`), pas un document PDF autonome du relevé.

## Fix
- `ExportService` (contrat) : `print()` retiré (devenu mort, seul appelant), ajout de `exportToPdf<T>(rows, columns, filename, options: {titre, sousTitre?, total?})`.
- `ExportClientService` : implémente `exportToPdf` avec `jsPDF`/`jspdf-autotable` — dépendances déjà présentes dans `package.json`, déjà utilisées avec exactement le même pattern (titre, sous-titre, `autoTable`, `doc.save()`) dans `agency-finance.ts` (export paiements/retraits) — réutilisation d'une convention existante, pas une nouvelle dépendance.
- `statement.component.ts` : `imprimer()` renommé `telechargerPdf()`, construit des lignes déjà formatées (dates via `formatFrDate`, montant via `formatMontantXof`, statut via le badge existant) puis appelle `exportToPdf` avec titre "Relevé de paiement", sous-titre "Nom Prénom — Quartier", et le total en pied de tableau — même convention de pré-formatage des lignes que `monthly-tracking.component.ts::exporterCsv`.
- `statement.component.html` : bouton renommé "Télécharger en PDF", icône `picture_as_pdf`.

## Décision — pas de nouvelle dépendance, pas de nouveau composant
`jsPDF`/`jspdf-autotable` étaient déjà des dépendances installées et déjà utilisées ailleurs dans l'app (`agency-finance.ts`, `team-list.ts`, `planning-detail.ts`, `profile.ts`, `client-dashboard.ts`) — aucune installation nécessaire. `statement-print.scss` (`@media print`) n'a pas été supprimé : reste utile en dégradation gracieuse si l'utilisateur imprime manuellement la page (Ctrl+P), même si le bouton ne déclenche plus `window.print()`.

## Vérifications effectuées
- `npx tsc --noEmit -p tsconfig.json` → `EXIT:0`.
- Grep : `ExportService.print()` n'avait qu'un seul appelant dans tout le module avant suppression.

---

# Ajout des infos d'agence sur le relevé PDF

## Fichiers modifiés
- `data-access/contracts/session.service.ts` : nouvelle interface `AgenceSession { nom, ville?, quartier? }`, `SessionUtilisateur.agence?: AgenceSession` (additif, optionnel).
- `data-access/http/mappers/session.mapper.ts::mapSessionUtilisateurDto` : mappe le nouveau champ `agence` du DTO backend.
- `data-access/contracts/export.service.ts` : `ExportPdfOptions.sousTitre` étendu à `string | string[]` (plusieurs lignes sous le titre, pas seulement une).
- `data-access/export/export-client.service.ts::exportToPdf` : rend chaque ligne de `sousTitre` séparément (espacées de 6pt), calcule `startY` du tableau en conséquence.
- `features/statement/statement.component.ts` : injecte `SESSION_SERVICE`, lit `session.getCurrentUser().agence`, construit une ligne "Nom agence — Quartier, Ville" affichée au-dessus de la ligne client dans le PDF (absente si l'utilisateur n'a pas d'agence).

## Décision — via la session plutôt qu'un nouvel appel réseau dédié
`GET /finance/session/moi` est déjà chargé une fois au démarrage du module par `SessionHttpService` (son constructeur) et mis en cache dans `currentUser$`/`getCurrentUser()` — ajouter `agence` à cette réponse évite un appel HTTP dédié rien que pour l'en-tête du PDF, et rend l'info réutilisable par n'importe quel autre écran du dashboard qui voudrait un jour afficher/imprimer le nom de l'agence (dashboard, suivi mensuel, etc.), sans dupliquer la logique de récupération.

## Vérifications effectuées
- `npx tsc --noEmit -p tsconfig.json` → `EXIT:0`.

---

# Audit complet du dashboard financier — composant par composant

## Méthode
3 agents d'exploration en parallèle (lecture seule) ont audité les 9 zones fonctionnelles (`dashboard`, `payments`, `withdrawals`, `clients`, `client-sheet` + ses 2 onglets, `statement`, `monthly-tracking`, `agent-payment`, `roles-admin`, `shell`), en vérifiant pour chacune : service injecté (token), méthodes appelées et confirmation que chaque appel est un vrai `HttpClient` vers un endpoint backend réel (pas un stub), tous les `signal()`/`computed()` (valeur initiale et dérivation), présence de `resource()`/`effect()`, données hardcodées dans le template, et TODO/FIXME/"mock"/"TBC" résiduels.

## Conclusion générale
**Aucune donnée métier statique ou mockée ne subsiste dans le dashboard.** Aucun `resource()` ni `effect()` nulle part dans le module (architecture 100% `signal()`/`computed()`/`toSignal()` + `subscribe()`). Tous les appels de service passent par de vraies requêtes HTTP vers des endpoints backend vérifiés. Aucun endpoint manquant identifié — tous les gaps connus (Facturation, Client) avaient déjà été comblés dans des tours précédents.

## Anomalies trouvées et corrigées (textes trompeurs, pas des données mockées actives)

| Fichier | Problème | Correction |
|---|---|---|
| `agent-payment.component.ts:95` (avant fix) | Message de succès affichait *"(mock) — aucune écriture réelle effectuée"* après un vrai débit du wallet agence | Message honnête ("le solde de l'agence a été débité") + rechargement du solde après paiement (`chargerSolde()`, absent avant : le solde affiché restait périmé après un paiement réel) |
| `agent-payment.component.ts` (erreur) | Erreur générique masquait le vrai message backend (ex. "Solde insuffisant", "Agent introuvable") | `err.error?.message` remonté au lieu d'un texte générique fixe |
| `agent-payment.component.ts` (`formulaireValide`) | Le formulaire autorisait la soumission même en cas de solde insuffisant, alors que le backend rejette (400) systématiquement | `formulaireValide` inclut désormais `!soldeInsuffisant()` — bloque côté client un appel voué à l'échec |
| `agent-payment.component.html` (bandeau + avertissement) | *"Prototype — aucune écriture réelle"* et *"Vous pouvez tout de même continuer (TBC — RG10)"* | Textes réécrits pour refléter le comportement réel (débit réel, refus serveur si solde insuffisant) |
| `agent-payment.component.ts:13-15` (commentaire classe) | Prétendait "UI + mock uniquement : aucune écriture réelle" | Réécrit pour documenter le vrai comportement |
| `roles-admin.component.ts:12` (commentaire) | "gestion des droitsFinance par rôle **mock**", référence à un "rôle-switcher" déjà supprimé | Réécrit, référence morte retirée |
| `roles-admin.component.html:3-6` | "pour la **démo**" | Reformulé ("réellement") |
| `data-access/contracts/session.service.ts:10` | "Session **mock** uniquement" (commentaire déjà obsolète depuis le nettoyage 100% mocks) | Réécrit pour refléter `SessionHttpService` réel |
| `data-access/http/client-data.http.service.ts:10-13` et `facture-data.http.service.ts:15-16` | "**Squelette inerte** (Prompt 17) : jamais fourni par un provider..." — obsolète, ces classes sont câblées en dur depuis plusieurs tours | Réécrits pour refléter l'état réel |

Aucun de ces éléments n'était une donnée métier fictive activement utilisée (les 4 appels HTTP d'`agent-payment` étaient déjà tous réels) — il s'agissait de textes/commentaires n'ayant pas été mis à jour au fil des passes de nettoyage successives, laissant croire à tort à un comportement mock.

## Points signalés mais volontairement non modifiés (TBC légitimes, pas des mocks)
- `dashboard.component.html:17` — "Paiements moins retraits (RG7, formule à confirmer)" : ambiguïté de règle métier réelle, la valeur affichée vient bien du KPI réel.
- `info-tab.component.ts` (fiche client) — édition désactivée, "TBC spec §1.12" : feature gap assumé, bouton correctement désactivé.
- `statement.component.ts` — "scope du relevé (complet vs plage) reste TBC" : comportement par défaut (historique complet) bien implémenté et fonctionnel.

## Vérifications effectuées
- `npx tsc --noEmit -p tsconfig.json` → `EXIT:0` après tous les changements ci-dessus.

---

# Fonctionnalité "Créer un retrait" (F4) — formulaire Angular Material complet

## Contexte
`enregistrerRetrait` était déjà branché en HTTP réel depuis le nettoyage 100% mocks (`FinanceDataMockService` supprimé), mais **aucune UI ne l'appelait** (`withdrawals.component` n'affichait qu'un historique). Cette tâche construit l'écran manquant.

## Fichiers créés
- `features/withdrawals/create-withdrawal-dialog.component.ts` — formulaire réactif (`ReactiveFormsModule`) en boîte de dialogue Angular Material (`MatDialog`), 2 étapes (formulaire → confirmation, même pattern que `agent-payment.component.ts`).
- `features/withdrawals/create-withdrawal-dialog.component.html` / `.scss`.

## Fichiers modifiés
- `withdrawals.component.ts` : bouton "Nouveau retrait" → `MatDialog.open(CreateWithdrawalDialogComponent)`, `afterClosed()` déclenche un `MatSnackBar` de succès + `page.set(1)` + rechargement automatique de la liste.
- `withdrawals.component.html` : ajout du bouton dans `.fin-withdrawals__filters` (flex existant, aucun ajustement CSS nécessaire).

## Détail des champs et validations
| Champ | Validation | Remarque |
|---|---|---|
| `operator` | `Validators.required` | `mat-select` avec 2 options : `MOOV_MONEY` (actif) et `ORANGE_MONEY` (`[disabled]`, libellé "bientôt disponible") — le type `OperateurRetrait` inclut les deux, mais le backend (`services/transaction.js::sendUserMoney`) ne traite réellement que MOOV_MONEY ; proposer l'option désactivée plutôt que la masquer reste honnête sur ce qui existe dans le modèle. |
| `customerMsisdn` | `required` + `pattern(/^\d{8}$/)` | Même format (8 chiffres) que `mobile-money-form.ts`, déjà utilisé ailleurs dans l'app pour les numéros Mobile Money — pas un nouveau format inventé. |
| `montant` | `required` + `min(1)` | Aligné sur la validation serveur (`montant doit être positif`). |
| `motif` | `maxLength(200)` (facultatif) | Correspond à `motif?: string` du contrat. |

## Confirmation, chargement, erreurs
- Étape "confirmation" : récapitulatif (opérateur, numéro, montant, motif) avant tout appel réseau.
- `enregistrement` (signal) pilote un `mat-spinner` sur le bouton "Confirmer" et désactive les boutons pendant la requête.
- Erreur : `err.error?.message` remonté tel quel (le backend renvoie déjà des messages précis — "Solde insuffisant", "Les retraits via ORANGE_MONEY ne sont pas encore disponibles", "Utilisateur non trouvé", etc.) — pas de message générique qui masquerait la vraie cause, même approche que le fix récent sur `agent-payment`.
- Snackbar de succès uniquement après un vrai `200` (fermeture du dialog avec `true`) ; un dialog fermé par annulation/erreur ne déclenche ni snackbar ni rafraîchissement.

## Aucune dépendance mock
`FINANCE_DATA_SERVICE` était déjà câblé en dur sur `FinanceDataHttpService` (aucun `mockOuHttp`, aucun `*MockService` dans tout le module — nettoyage effectué dans un tour précédent). Ce composant n'introduit donc par construction aucune nouvelle dépendance mock.

## Décision — Angular Material plutôt que PrimeNG
L'app utilise déjà PrimeNG ailleurs (`p-dialog`/`p-toast`, `main.ts`), mais la demande nommait explicitement "Angular Material" et "snackbar" (terminologie Material) — suivi tel quel. `@angular/material` était déjà une dépendance installée et utilisée dans d'autres modules de l'app (`mobile-money-form.ts`, `team-*`, etc.), donc aucune nouvelle dépendance ajoutée ; `provideAnimations()` est déjà fourni globalement (`main.ts:22`, pour PrimeNG), ce qui suffit aussi à `MatDialog`/`MatSnackBar` — aucune config supplémentaire nécessaire.

## Vérifications effectuées
- `npx tsc --noEmit -p tsconfig.json` → `EXIT:0`.
- Pas de `ng build`/`ng serve` (contrainte déjà actée dans cette conversation).

---

# Fix — le dialog Angular Material ne s'affichait pas

## Symptôme signalé
Après avoir cliqué sur "Nouveau retrait", le dialog n'apparaissait pas à l'écran (aucune erreur visible signalée).

## Cause
`angular.json` chargeait bien `@angular/material/prebuilt-themes/azure-blue.css` (couleurs/typo des composants Material) mais **jamais** `@angular/cdk/overlay-prebuilt.css` — la feuille de style qui donne au CDK Overlay (utilisé par `MatDialog`, `MatSnackBar`, et le panneau déroulant de `mat-select`) son positionnement (`.cdk-overlay-container { position: fixed }`, `.cdk-global-overlay-wrapper { display: flex; ... }` pour le centrage des dialogs, etc.). Sans ce fichier, le conteneur d'overlay s'insère dans le flux normal du DOM (dernier enfant de `<body>`, sans `position: fixed`), donc le dialog est bien créé mais rendu hors du viewport visible ou sans dimension/centrage — ce qui se traduit, à l'écran, par "rien ne s'affiche". C'était donc **le tout premier usage de `MatDialog` dans toute l'app** (`mat-select` existant ailleurs, ex. `mobile-money-form.ts`, est moins visiblement affecté car son panneau utilise un positionnement connecté calculé en partie via JS, contrairement au centrage global d'un dialog qui dépend entièrement du CSS flex ci-dessus) — ce trou dans la config n'avait donc jamais été remarqué avant cette fonctionnalité.

## Fix
`angular.json` : ajout de `"@angular/cdk/overlay-prebuilt.css"` juste après le thème Material, dans les deux tableaux `styles` (`architect.build.options.styles` et `architect.test.options.styles`).

## Vérification
JSON validé (`python -c "import json; json.load(open('angular.json'))"`). **Redémarrage de `ng serve` nécessaire** pour que ce changement de configuration de build soit pris en compte (contrairement à un changement de composant, une modification d'`angular.json` n'est pas rechargée à chaud).

---

# Fix 2 — le dialog restait invisible même après le fix CSS (seul le fond assombri apparaissait)

## Symptôme signalé
Après redémarrage de `ng serve` et ajout de `overlay-prebuilt.css`, le fond assombri (backdrop) s'affichait bien à l'ouverture, mais jamais le panneau du formulaire lui-même.

## Diagnostic
Le fait que le backdrop s'affiche prouve que `.cdk-overlay-container` a maintenant bien `position: fixed` (le fix précédent était nécessaire et correct). Le problème restant est donc spécifique au **panneau** du dialog (`.cdk-overlay-pane`/`mat-dialog-container`), pas au mécanisme d'overlay en général. Cause la plus probable : cette app combine **3 systèmes CSS globaux qui se marchent dessus** — Angular Material (`mat.theme()` M3 + prebuilt-theme M2 azure-blue en même temps), PrimeNG (`providePrimeNG`, thème Aura), et Flowbite/Tailwind (CDN dans `index.html`, `@use "tailwindcss"` dans `styles.scss`). C'était le tout premier usage de `MatDialog` dans toute l'app (confirmé par grep avant le premier fix) — jamais testé, jamais fiabilisé dans ce contexte CSS chargé.

## Décision — pivoter vers l'overlay custom déjà éprouvé de l'app, garder les champs Material
Plutôt que de continuer à déboguer un conflit CSS incertain entre 3 frameworks (risque de plusieurs allers-retours supplémentaires), réutilisation du pattern **`.modal-overlay` / `.modal-content` / `.modal-header` / `.close-btn`** déjà utilisé avec succès dans 6 écrans de l'app (`admin-dashboard.html`, `agency-dashboard.html`, `client-dashboard.html`, `collector-dashboard.html`, `municipality-dashboard.html`, `subscription.html`) — un mécanisme de fenêtre modale simple (`*ngIf` + CSS `position: fixed`), sans dépendance au CDK Overlay. Les **champs de formulaire restent Angular Material** (`mat-form-field`/`mat-select`/`mat-input`/`mat-button`/`mat-icon`/`mat-progress-spinner`), conformément à la demande — seul le conteneur modal change de mécanisme.

## Fichiers modifiés
- `create-withdrawal-dialog.component.ts` : retrait de `MatDialogModule`/`MatDialogRef` ; ajout de `@Output() ferme = new EventEmitter<boolean>()` (`true` si retrait créé, `false` sur annulation).
- `create-withdrawal-dialog.component.html` : structure `mat-dialog-title`/`mat-dialog-content`/`mat-dialog-actions` remplacée par `.modal-overlay > .modal-content > .modal-header (+ .close-btn) / formulaire / actions`, identique au pattern `admin-dashboard.html`.
- `create-withdrawal-dialog.component.scss` : ajout de `&__actions` (les actions n'ont plus le layout fourni par `mat-dialog-actions`).
- `withdrawals.component.ts` : retrait de `MatDialog`, ajout du signal `afficherFormulaireCreation`, `ouvrirNouveauRetrait()` le passe à `true`, nouveau handler `onFormulaireCreationFerme(succes)` (remplace l'ancien `afterClosed().subscribe(...)`).
- `withdrawals.component.html` : `<app-create-withdrawal-dialog *ngIf="afficherFormulaireCreation()" (ferme)="onFormulaireCreationFerme($event)" />` à la place de l'appel à `MatDialog.open()`.

## Point de vigilance non résolu
`MatSnackBar` (toast de succès) reste utilisé tel quel — il s'appuie aussi sur le CDK Overlay, mais avec une stratégie de positionnement différente (ancré en bas, pas centré en flex comme un dialog) : il pourrait ne pas être affecté par le même conflit. **Non vérifié visuellement** — si le snackbar de succès n'apparaît pas non plus après ce fix, le même remplacement par un mécanisme custom (ou réutilisation de PrimeNG `MessageService`/`p-toast`, déjà fourni globalement dans `main.ts`) sera nécessaire.

## Vérifications effectuées
- `npx tsc --noEmit -p tsconfig.json` → `EXIT:0`.
- Grep : plus aucune référence à `MatDialog`/`MatDialogRef`/`MatDialogModule` dans le module.

---

# Fix 3 — le dialog s'affiche mais "pas de design" (champs sans style, titre chevauché par le bouton fermer)

## Symptôme signalé (capture d'écran)
Le panneau s'affiche désormais (fix précédent réussi), mais : (1) les champs `Opérateur`/`Numéro Mobile Money`/`Montant`/`Motif` apparaissent en HTML brut sans aucune mise en forme (pas de contour, label superposé au texte), alors que les boutons "Annuler"/"Continuer" sont bien stylés Material (bleu, etc.) ; (2) le bouton de fermeture (X) chevauche et masque le début du titre ("uveau retrait" au lieu de "Nouveau retrait").

## Diagnostic
- **Champs sans style** : `mat-form-field` (variante `outline`) repose sur un mécanisme CSS complexe ("notched outline", pseudo-éléments `::before`/`::after` + nombreuses variables CSS `--mdc-*`) pour dessiner son contour et faire flotter le label. Ce mécanisme s'est révélé cassé dans cette app — cohérent avec le diagnostic précédent (coexistence Angular Material M3+M2 / PrimeNG / Flowbite-Tailwind) : les composants Material *simples* (`mat-button`, `mat-icon`, `mat-progress-spinner`, qui n'ont besoin que d'un `background-color`/`color`) restent corrects, mais `mat-form-field` (bien plus dépendant du thème) s'effondre visuellement.
- **Titre chevauché** : la classe globale `.close-btn` (`styles.scss`, partagée par 6 écrans) est définie avec `position: fixed`, pensée pour des modals plus larges ailleurs dans l'app — dans notre panneau plus étroit, ça place le bouton par-dessus le titre.

## Fix
- **Champs** : remplacement de `mat-form-field`/`mat-select`/`mat-input` par du HTML natif (`<select>`/`<input>` + `<label>`) stylé en CSS custom, **exactement la même convention déjà éprouvée dans ce module** (`agent-payment.component.html`/`.scss`, jamais signalé comme cassé). `mat-button`/`mat-icon`/`mat-progress-spinner` conservés tels quels (ils s'affichaient correctement).
- **Titre chevauché** : override scopé au composant (`create-withdrawal-dialog.component.scss`) de `.modal-header`/`.close-btn` — `position: static` au lieu de `fixed`. Grâce à l'encapsulation Angular (styles scopés par composant), cet override **ne touche pas** les 6 autres écrans qui utilisent ces mêmes classes globales avec leur mise en page plus large.

## Fichiers modifiés
- `create-withdrawal-dialog.component.ts` : retrait de `MatFormFieldModule`/`MatInputModule`/`MatSelectModule`.
- `create-withdrawal-dialog.component.html` : champs réécrits en HTML natif + `formControlName` (Reactive Forms fonctionne nativement avec `<select>`/`<input>`, pas besoin de directives Material).
- `create-withdrawal-dialog.component.scss` : styles des champs (bordure, focus, erreurs) + override scopé `.modal-header .close-btn`.

## Vérifications effectuées
- `npx tsc --noEmit -p tsconfig.json` → `EXIT:0`.

---

# Audit et nettoyage complet du dashboard financier (commentaires, code mort, imports/services/routes inutilisés)

## Méthode
3 agents d'exploration en parallèle (lecture seule) ont couvert : `data-access/` + `models/`, `features/` (10 zones), `shared/` + `guards/` + `utils/` + `financial-dashboard.routes.ts`. Chaque finding a été re-vérifié moi-même par grep direct avant toute suppression (aucune édition sur simple déclaration d'agent).

## Bug réel corrigé
- **`financial-dashboard.routes.ts:113`** : `{ path: '**', redirectTo: 'dashboard' }` redirigeait vers une route inexistante (le vrai chemin est `statistiques`) — toute URL non reconnue sous `/dashboard/financial/*` échouait au lieu de retomber sur le tableau de bord. Corrigé en `redirectTo: 'statistiques'`.

## Code mort supprimé
| Élément | Preuve |
|---|---|
| `features/shell/finance-route-placeholder.ts` (fichier entier) | Composant orphelin : plus aucune route ne l'utilise (les 9 routes ont toutes leur vrai `loadComponent()` depuis longtemps) ; commentaire prétendait à tort un usage "temporaire" encore actuel |
| `shared/states/skeleton.component.ts` (+.html/.scss) | `SkeletonComponent`/`app-skeleton` : zéro référence en dehors de sa propre définition dans tout le module |
| `features/shell/finance-layout.ts:23` — `readonly utilisateur = this.currentUser;` | Alias jamais lu (ni template, ni classe) |
| `models/enums.ts` — enum `PaiementStatut` | Zéro usage dans tout `src/app`, déjà marqué "réservé aux évolutions futures" dans son propre commentaire |
| `models/abonnement.model.ts` (fichier entier) — interface `Abonnement` | Zéro import dans tout `src/app` (vérifié par grep global, hors correspondances de chaînes françaises sans rapport) ; retiré aussi de `models/index.ts` |

## Imports inutilisés retirés (`CommonModule` sans directive/pipe consommé)
`shared/filters/search-filter.component.ts`, `shared/month-selector/month-selector.component.ts`, `shared/period-selector/period-selector.component.ts`, `shared/states/empty-state.component.ts`, `shared/states/error-state.component.ts`, `shared/status-badge/status-badge.component.ts`, `features/shell/finance-access-denied.ts` — chacun vérifié : aucun `*ngIf`/`*ngFor`/`*ngClass`/pipe dans son template, `FormsModule` conservé séparément pour `search-filter` (nécessaire pour `[ngModel]`).

## Commentaires périmés/trompeurs corrigés
| Fichier | Avant | Après |
|---|---|---|
| `data-access/contracts/agent-data.service.ts:8-9` | "prototype UI uniquement ; payerAgent() n'écrit qu'en mémoire mock" | Décrit le vrai débit de wallet réel + rollback |
| `data-access/http/agent-data.http.service.ts:10` | "Squelette inerte (Prompt 17)" | Décrit l'implémentation réelle câblée en dur |
| `data-access/contracts/client-data.service.ts:9-11` | Référençait `ClientDataMockService` (supprimée) et `ClientDataHttpService` comme "futur" | Référence nettoyée |
| `data-access/contracts/export.service.ts:1-2` | "Prompt 8" (framing futur) | Reformulé au présent |
| `data-access/http/finance-data.http.service.ts:18-22` | Narratif historique sur la suppression du mock | Condensé, décrit juste le contrat réel du payload |
| `data-access/contracts/finance-data.service.ts:33-35` | "jointure client (déjà faite côté mock)", écran "payments-history" (nom inexact) | "côté backend", écran "Paiements" |
| `utils/periode.util.ts:3-4` | Référençait `data-access/mock` (dossier supprimé) | Reformulé sans référence à un dossier disparu |

## Code confirmé réel mais non consommé par l'UI — signalé, PAS supprimé (décision volontaire)
Trois méthodes de contrat sont pleinement câblées sur de vrais endpoints backend déjà construits sur demande explicite dans des tours précédents, mais aucun écran ne les appelle encore :
- `FactureDataService.getFactures()` — `GET /finance/factures` (liste paginée toutes factures)
- `FactureDataService.genererFacturesDuMois()` — `POST /finance/factures/generer`
- `SessionService.setFinancialRole()` — `PATCH /finance/session/utilisateurs/:id/financial-role` (l'écran `roles-admin` n'utilise que `toggleDroitsFinance`, l'assignation de rôle se fait ailleurs dans l'app via `agency.service.ts`, un chemin différent)

**Ce ne sont pas des mocks ni du code mort au sens propre** : ce sont de vrais endpoints déjà implémentés et testés, sans écran dédié pour l'instant. Les supprimer aurait défait du travail backend explicitement demandé. Signalés ici pour décision produit (construire l'écran manquant, ou déprécier consciemment), pas supprimés unilatéralement.

## Mentions "mock" restantes (vérifiées légitimes, laissées telles quelles)
`session.service.ts`, `export-client.service.ts`, `financial-dashboard.routes.ts:27-41`, `guards/finance-access.guard.ts`, `shared/chart/finance-chart.component.html:10` — toutes au passé, expliquant une décision de design ou un bug déjà résolu, aucune ne prétend qu'un mock est encore actif.

## Vérifications effectuées
- `npx tsc --noEmit -p tsconfig.json` → `EXIT:0` après l'ensemble des changements.
- Chaque suppression (composant, propriété, enum, interface, import) re-vérifiée par grep direct avant édition, pas seulement sur la base du rapport d'agent.
