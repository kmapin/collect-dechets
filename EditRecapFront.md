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

---

# Municipality Dashboard — Prompt 01 : Statistics Contract Alignment & City-Stats Route Resolution

Premier prompt du roadmap de migration mock→réel (`BACKEND_INTEGRATION.md`, analysé par l'utilisateur contre l'OpenAPI réel). Voir `EditRecap.md` (backend) pour le détail des changements serveur. Ceci est la confirmation écrite exigée par les "Deliverables" du prompt.

## (a) Forme réelle de `GET /api/statistics` (vérifiée contre l'implémentation, pas l'OpenAPI)
```
totalMunicipalityAgents, totalManagers, totalCollectors, totalClients, totalActiveClients (nouveau),
totalAgencies, totalActiveAgencies, totalInactiveAgencies, totalDeletedAgencies,
agenciesByCity[], clientsByCity[], collectionsByCity[],
totalCollections, dailyCollections, monthlyCollections,
totalCollectionsCollected, totalCollectionsReported, pendingReportsCount (nouveau),
monthlyClientSubscriptions, monthlyClientPercentage
```
`activeClients`, `completeCollections` (tel quel), `reportsFromClients.pending` — **confirmés absents**, ils n'ont jamais existé sur le vrai backend (lisaient `undefined` silencieusement). Pas une dérive serveur : `totalCollectionsCollected`/`totalCollectionsReported` étaient déjà renvoyés mais non documentés dans le Swagger (corrigé côté backend).

## (b) `/auth/city/municipality` — confirmé inexistant
Grep exhaustif de tout `routes/*.js` + recherche plein-texte sur tout le repo backend : zéro occurrence en dehors de `role: 'municipality'` (une valeur d'enum User, sans rapport). Résolu en faveur de "route jamais construite" — pas une question de documentation OpenAPI manquante.

## (c) Interface `MunicipalityStatistics` corrigée (`municipality-dashboard.ts`)
Entièrement réécrite champ-à-champ sur la forme réelle ci-dessus (nouvelle interface `CityBreakdownEntry` pour les tableaux par ville). `totalRevenue`, `averageRating`, `complianceRate` retirés : **aucune source nulle part dans le backend actuel** — pas inventés, signalés comme dépendant du futur Milestone 05 (Agency Performance Metrics). `statisticsAdmin: any` → `statisticsAdmin: MunicipalityStatistics | null`.

## (d) Sites de lecture frontend corrigés
| Fichier | Avant | Après |
|---|---|---|
| `municipality-dashboard.ts` — `statistics` (champ mocké, ligne 179-190) | Objet 100% hardcodé (`totalAgencies: 15, activeAgencies: 14, totalRevenue: 485000, complianceRate: 92, ...`) | **Supprimé entièrement** |
| `getCollectionRate()` | Lisait `this.statistics.completeCollections / this.statistics.todayCollections` (mock, jamais mis à jour) | Lit `statisticsAdmin.totalCollectionsCollected / statisticsAdmin.dailyCollections` (réel, avec garde /0) |
| `getComplianceText()` | `this.statistics.complianceRate` (mock, toujours 92%) | Retourne "Non disponible" (honnête — aucune source réelle) ; **déjà mort en pratique** : son seul appelant vivait dans un bloc HTML déjà commenté |
| `getIncidentSeverity()` | `statisticsAdmin?.reportsFromClients?.pending` (champ inexistant → toujours 0 → toujours "Faible") | `statisticsAdmin?.pendingReportsCount` (réel) |
| `municipality-dashboard.html:76` — carte "Clients totaux" | `statisticsAdmin?.activeClients` (inexistant) | `statisticsAdmin?.totalActiveClients` (réel, nouveau champ backend) |
| `municipality-dashboard.html:92-93` — carte "Collectes aujourd'hui" | `completeCollections`/`totalCollections` — **double bug** : champ inexistant ET mauvaise portée (total all-time au lieu d'aujourd'hui) | `totalCollectionsCollected`/`dailyCollections` (réel, portée jour correcte) |
| `municipality-dashboard.html:142-147` — carte "Incidents non résolus" | `reportsFromClients?.pending` (inexistant → toujours 0) | `pendingReportsCount` (réel) |
| Export PDF (`generateGlobalReport()`, ~ligne 1259-1261) | Mêmes champs inexistants que les cartes | Mêmes corrections que les cartes |
| `admin.ts::getAllStatisticCity()` | Appelait `/auth/city/municipality` (route morte, toujours 404 en pratique → `zoneStatistics`/`coverageMapZones` toujours vides en production) | **Méthode supprimée** ; `MunicipalityDashboard.buildZoneStatisticsFromAdminStats()` dérive maintenant les compteurs par ville directement de `statisticsAdmin.agenciesByCity/clientsByCity/collectionsByCity` (déjà chargé, aucun appel HTTP supplémentaire) |
| `mocks/municipality-mock.generators.ts::generateMunicipalityStatistics()` + son wrapper `MunicipalityMockDataService.getMunicipalityStatistics()` | Générait un faux objet sur l'ancienne forme, **zéro appelant** confirmé (le composant utilise déjà le vrai `adminService.getAllStatistics()`) | **Supprimés** (code mort rendu incompilable par le nouveau contrat, confirmé orphelin avant suppression) |

## Bug de production concret résolu
`loadZoneStat()` était appelé depuis `ngOnInit` → `loadMunicipalityData()`, et son `error` handler retombait sur `zoneStatistics = []`/`coverageMapZones = []` silencieusement. Comme `/auth/city/municipality` n'a jamais existé, **l'onglet "Couverture Territoriale" était vide dans toutes les conditions réelles**, pas seulement en cas d'erreur réseau ponctuelle. Résolu par construction (plus d'appel réseau séparé, dérivation directe des données déjà chargées).

## Limitation distincte signalée, non résolue ici (hors périmètre du Prompt 01)
La liste des villes elle-même (`MOCK_CITIES`, `data/countries-org.mock.ts`) reste un catalogue statique de 5 pays, pas la vraie API territoriale (`GET /cities`). `coverage`/`incidents` par ville restent à `0` (aucune notion de conformité/signalements par ville nulle part dans le backend) — commentés clairement dans le code, pas masqués. Point pertinent pour le futur Milestone 14 (coverage map).

## Vérifications effectuées
- `npx tsc --noEmit -p tsconfig.json` → `EXIT:0`.
- Backend : `node -c` sur les 3 fichiers modifiés + `require()` à blanc, sans erreur.
- Chaque champ retiré/renommé vérifié par lecture directe du controller/service réel (pas seulement l'OpenAPI ni le guide de migration).

---

# Municipality Dashboard — Prompt 03 : Incidents Query Parameters & Pagination Fix

Voir `EditRecap.md` pour le détail backend (severity, clamp limit/skip, Swagger). Ceci couvre le côté frontend + la confirmation écrite exigée par les "Deliverables" du prompt.

## Bug confirmé et quantifié
`loadAllSignalements()` (`municipality-dashboard.ts`) appelait `this.adminService.getAllReports()` **sans aucun argument**. Conséquences réelles, vérifiées :
1. `Admin.getAllReports()` retombait sur ses défauts (`page=1, limit=10`), mais les envoyait sous les noms `page`/`search` — le vrai backend (`services/qrValidation.js::getAllCollectes`) attend `skip`/`term`. `page` était donc **silencieusement ignoré** par le serveur (jamais lu), qui retombait toujours sur `skip=0` par défaut : **toujours les mêmes 10 premières collectes**, quel que soit l'état de pagination côté client.
2. Aucun filtre `status` envoyé → ces 10 collectes étaient les 10 plus récentes de **n'importe quel statut** (Scheduled/Collected/Completed/... noyant les vrais signalements), pas spécifiquement des signalements. Le badge "Incidents" et `getIncidentBreakdown()` comptaient donc des collectes normales, jamais un vrai total de signalements.

**Ce même bug affecte aussi `admin-dashboard.ts`** (`loadAllSignalements(page)`, autre consommateur de `Admin.getAllReports()`), qui envoie déjà `page`/`search`/`severity` avec une vraie UI de pagination construite dessus — mais ces paramètres étaient tout aussi silencieusement ignorés côté serveur. Corrigé pour les deux dashboards par le même fix (voir ci-dessous), sans toucher au code d'`admin-dashboard.ts`.

## Fix — `Admin.getAllReports()` (`admin.ts`)
Signature publique **inchangée** (`page`/`limit`/`status`/`severity`/`search`/`agencyId`/`date` nouveau) — `admin-dashboard.ts` a déjà une vraie UI de pagination construite dessus (`incidentsCurrentPage`/`incidentsItemsPerPage`/`incidentsTotalPages`), aucune raison de la casser. Seule la **traduction interne** est corrigée : `skip = (page - 1) * limit` calculé et envoyé (au lieu de `page`), `search` envoyé sous le nom réel `term` (au lieu de `search`). `severity`/`status`/`agencyId` inchangés (déjà les bons noms), `date` ajouté (existait côté backend, jamais exposé ici).

## Fix — `loadAllSignalements()` (`municipality-dashboard.ts`)
Appelle maintenant `getAllReports({ status: 'Reported', limit: INCIDENTS_FETCH_LIMIT })` :
- `status: 'Reported'` — seule valeur de l'enum réel `Collecte.status` qui correspond à un signalement (vérifié dans `models/Collecte.js`), pas une valeur inventée.
- `INCIDENTS_FETCH_LIMIT = 300` (nouvelle constante module) — `<app-signalement>` (composant partagé, 4 dashboards) pagine déjà côté client sur l'intégralité du tableau reçu (`pagedIncidents`, `signalement.ts`) : pas besoin de pagination serveur ici, juste d'un plafond couvrant le volume réel. **Valeur provisoire, signalée comme telle** (le prompt demande explicitement de ne pas se baser sur "le compte arbitraire du mock") — à ajuster si le volume réel de signalements dépasse ce seuil (le backend clampe à 500 max), ou à remplacer par un vrai infinite-scroll si ça devient nécessaire.

## Décision — filtre "Sévérité" (severity)
Contrairement à ce que supposait le roadmap initial (§0.3 : "pas de champ severity, donc pas de filtre serveur possible"), le Prompt 01 a confirmé que `Collecte.severity` **existe réellement**. Le backend expose maintenant un vrai filtre `severity` (voir EditRecap.md). Côté municipality-dashboard, aucun filtre de sévérité n'existe au niveau du parent (`MunicipalityDashboard`) — le filtre `severityFilter` vit uniquement dans le composant enfant partagé `<app-signalement>`, où il continue de filtrer **côté client** sur le jeu déjà chargé (comportement inchangé, cohérent avec son modèle de pagination interne). Pas de changement nécessaire ici : le filtre existant reste correct puisqu'il opère maintenant sur un jeu complet de signalements, plus sur une page tronquée à 10.

## Limitation distincte signalée, non résolue ici
`<app-signalement>` (`shared_pages/signalement/signalement.ts`) a son propre vocabulaire de statut (`incidentsFilter: "all"|"open"|"pending"|"resolved"`) qui **ne correspond à aucune valeur réelle** de `Collecte.status` (`Collected|Scheduled|Completed|Cancelled|Reported`) ni de `resolutionStatus` (`pending|in_progress|resolved`) — son filtre de statut ne peut donc jamais matcher quoi que ce soit d'autre que "all" en pratique. Composant partagé par 4 dashboards (admin, agency, client, municipality) — hors périmètre de ce prompt scopé à municipality-dashboard, signalé pour un futur prompt dédié.

## Vérifications effectuées
- `npx tsc --noEmit -p tsconfig.json` → `EXIT:0`.
- Backend : `node -c` + `require()` à blanc, sans erreur.
- `admin-dashboard.ts` non modifié — vérifié que son appel existant (`page`/`limit`/`status`/`severity`/`search`/`agencyId`) reste compatible avec la nouvelle signature de `getAllReports()` (aucun champ renommé côté public).

---

# Fix — Incohérence "Incidents non résolus" (2) vs badge/tableau Incidents (3)

## Symptôme signalé (capture d'écran)
Carte KPI "Incidents non résolus" affiche 2, mais le badge de l'onglet "Incidents" et le tableau "Gestion des Incidents" en affichent 3 — tous les 3 avec le statut "EN COURS".

## Cause
- La carte KPI vient de `statisticsAdmin.pendingReportsCount` (Prompt 01) : `Collecte.countDocuments({status:'Reported', resolutionStatus: {$ne:'resolved'}})` — exclut correctement les signalements déjà traités.
- `loadAllSignalements()` (Prompt 03) filtre uniquement sur `status: 'Reported'`, **sans** exclure `resolutionStatus === 'resolved'` — un signalement déjà résolu via le vrai backend reste donc dans la liste. Comme `resolveReport()` (`services/collecte.service.js`) ne change **jamais** `Collecte.status` (reste `'Reported'` pour toujours, seul `resolutionStatus` bouge), la colonne STATUT du tableau — qui ne lit que `.status`, jamais `.resolutionStatus` — affiche "EN COURS" pour les 3, y compris celui déjà résolu. D'où l'écart : 2 vraiment non résolus, 3 avec ce statut brut.
- Bonus découvert en creusant : le bouton "Résoudre" (`onResolvedIncident()`) ne faisait **qu'une mutation locale** (`target.status = "resolved"`, une valeur qui n'existe même pas dans le vrai enum `Collecte.status`) — **aucun appel réseau**, donc rien n'était jamais persisté. `Admin.resolveCollecte$()` existait déjà dans `admin.ts` mais n'était appelé par aucun dashboard.

## Fix
- `Incident` (interface, `municipality-dashboard.ts`) : ajout de `resolutionStatus?: 'pending'|'in_progress'|'resolved'` (le champ réel, déjà renvoyé par le backend, jamais lu jusqu'ici).
- `loadAllSignalements()` : filtre maintenant aussi sur `resolutionStatus !== 'resolved'` — `this.incidents` ne contient plus que de vrais signalements non résolus, cohérent avec la carte KPI (même définition, même nombre).
- `onResolvedIncident()` : appelle maintenant réellement `Admin.resolveCollecte$(incidentId, resolvedBy, resolutionComment)` (`PATCH /collectes/:id/resolve`), et ne retire l'incident de la liste qu'après confirmation serveur — plus de mutation locale fictive. `resolvedBy` lu depuis `currentUser?._id ?? currentUser?.id`.

## Décision — `onAssignReport()` volontairement non touché
Reste une mutation locale fictive (`target.status = "pending"`), **volontairement pas corrigé ici** : c'est exactement le sujet du Prompt 06 du roadmap ("Assign / Resolve Signalement — Frontend Contract Adaptation"), qui doit aussi adapter la sortie de `assignReport` au vrai contrat backend (assignation à une **équipe**, `PATCH /collectes/:id/assign-team`, pas à un collecteur individuel — voir §0.4). Corriger resolve seul était nécessaire pour ne pas laisser une incohérence de comptage after-click ; corriger assign maintenant aurait empiété sur un prompt dédié avec sa propre décision de contrat à trancher.

## Vérifications effectuées
- `npx tsc --noEmit -p tsconfig.json` → `EXIT:0`.

---

# Municipality Dashboard — Prompt 05 : Agency Performance Metrics (Extend Existing Endpoint)

Voir `EditRecap.md` pour le détail backend (`GET /api/state_agencies/{agencyId}/stats` étendu). Ceci couvre le côté frontend + la confirmation écrite exigée par les "Deliverables" du prompt.

## (a) Forme étendue de la réponse consommée (vérifiée contre l'implémentation réelle, pas l'OpenAPI)
```
agencyId, agencyName, status,
totalClientsActifs, totalCollecteurs, totalGestionnaires, totalEmployees, totalZone, totalReporting,
pendingReportsCount, completionRate, collectionsToday,
todayCollections, completedCollections,       // alias de compat pour admin-dashboard.ts
complianceScore: null, revenue: null, rating: null,   // toujours null aujourd'hui, voir (b)
issues: string[]
```

## (b) Formule de compliance-score — aucune formule, documentée comme telle
Le prompt demande explicitement de documenter la formule utilisée. Réponse honnête : **il n'existe aucune formule**, parce qu'il n'existe aucune entité de conformité/audit nulle part dans le schéma backend (ni `Agency`, ni ailleurs). Plutôt que d'inventer un calcul arbitraire (ex. à partir de `completionRate`), `complianceScore` reste **explicitement `null`** — décision cohérente avec la discipline déjà appliquée au Prompt 01 (retirer `complianceRate` du mock plutôt que le maintenir avec une fausse valeur fixe à 92%).

## (c) `revenue` et `rating` — confirmation de la résolution (déférés, avec raison précise)
- **`revenue`** : déféré à `null`. Raison : conflit de scoping JWT confirmé côté backend — le rôle `municipality` n'a aujourd'hui aucune visibilité Finance légitime inter-agences (`resolveAgency`/`OVERRIDE_ROLES`/`OVERRIDE_FINANCIAL_ROLES` limités à `super_admin`/`administrateur`). Résoudre ce point nécessiterait une décision produit explicite (nouveau rôle d'override ou ouverture de la donnée), hors périmètre de ce prompt.
- **`rating`** : déféré à `null`. Raison : aucune entité review/notation n'existe nulle part dans le schéma — rien à requêter.

Les deux sont donc **explicitement non résolus, pas oubliés** — chacun documenté avec sa raison exacte dans le Swagger backend et repris ici.

## (d) Frontend — nullabilité et affichage
- **`AgencyAudit`** (interface, `municipality-dashboard.ts`) : `rating`, `revenue`, `complianceScore` retypés `number | null` (étaient `number`, silencieusement toujours une valeur mockée avant ce prompt).
- **`loadAgencyAudits()`** : entièrement réécrit. Charge la liste des agences puis, pour chacune, appelle le vrai `GET /api/state_agencies/{agencyId}/stats` en parallèle (`forkJoin`, `rxjs`) — remplace l'ancienne génération mock (`MunicipalityMockDataService`). Typage explicite introduit pour lever une erreur TS ("`results` is of type `unknown`") : `const requests: Observable<{ agency: any; stats: any }>[] = list.map(...)` avant le `forkJoin(requests)`.
- **`isAgencyPerformanceMocked`** : `true` → `false` — dernier flag de mock restant sur cet onglet, maintenant réellement alimenté par le backend.
- **`getComplianceClass()`** : ajout d'une branche `null` dédiée (retourne une classe `unknown` plutôt que de comparer `null < seuil`, qui aurait produit un classement trompeur — `null < 50` vaut `true` en JS).
- **Template (`municipality-dashboard.html`)** : affichage null-safe de `agency.complianceScore`/`agency.rating`/`agency.revenue` — "Non disponible" plutôt qu'un score/montant fabriqué ou un `NaN`/`undefined` brut affiché tel quel.
- **`.scss`** : ajout de `.compliance-score.unknown { color: var(--text-secondary, #94a3b8); }` pour le nouvel état "non disponible" (gris neutre, distinct des couleurs de statut existantes bon/mauvais).
- **Export PDF (`generateGlobalReport()`)** : construction du texte `complianceScore` rendue null-safe (chaîne "Non disponible" au lieu de concaténer `null` dans le PDF généré).
- **`buildNotifications()`** — bloc `complianceNotifications` : 2 erreurs TS (`'agency.complianceScore' is possibly 'null'`) corrigées en ajoutant une garde explicite `agency.complianceScore !== null &&` avant chaque comparaison `<`, avec branchement du texte `reason`/`severity` en conséquence (pas de notification générée pour les agences dont le score est `null` — on ne peut pas dire qu'un score inconnu est "faible").

## Bonus backend consommé sans modification de fichier
`admin-dashboard.ts::getSelectedCompletionRate()` (non modifié) attend déjà `todayCollections`/`completedCollections` sur cette même réponse — jamais alimentés jusqu'ici (toujours 0% affiché). Corrigé gratuitement côté backend (alias explicites, voir EditRecap.md) sans toucher ce fichier frontend.

## Vérifications effectuées
- `npx tsc --noEmit -p tsconfig.json` → `EXIT:0` (après correction des 2 classes d'erreurs ci-dessus).
- Backend : `node -c` sur les 3 fichiers modifiés + `require('./routes/stateForAgencyRoute.js')` à blanc, sans erreur.

---

# Municipality Dashboard — Prompt 06 : Assign / Resolve Signalement — Frontend Contract Adaptation

Voir `EditRecap.md` pour le détail backend (role-gating manager/super_admin sur `assign-team`/`resolve`). Ceci couvre le côté frontend + la confirmation écrite exigée par les "Deliverables" du prompt.

## Découverte avant construction — le vrai consommateur n'est pas municipality-dashboard
`<app-signalement>` (composant partagé, `shared_pages/signalement`) ne rend ses boutons "Assigner"/"Résoudre" que pour `currentUser?.role === 'manager'` (`signalement.html`). Les utilisateurs de `municipality-dashboard` ont le rôle `'municipality'` — ces boutons ne s'affichent donc jamais sur ce dashboard. Le seul vrai consommateur en production est `agency-dashboard.ts` (rôle `manager`), dont le flux existant était déjà complètement cassé avant ce prompt :
- `openAssignModal(report)`/`assignReport()` appelaient `AgencyService.assignReportToEmployee$()` vers `PUT /reports/:id/assign`, une route confirmée inexistante dans tout le backend (grep exhaustif de `routes/*.js`).
- `resolveIncident(id)` appelait `AgencyService.resolveIncident$()` vers `PATCH /reports/:id/status`, également inexistante — le code laissait même un toast en dur ("Système de validation non établie") qui admettait déjà que ce flux n'était pas fiable.
- Bonus : `selectedReportId` n'était jamais renseigné par `openAssignModal()` (qui ne posait que `selectedReport`), donc même en admettant que l'endpoint ait existé, le clic sur "Assigner" échouait systématiquement dès le contrôle "au moins un employé sélectionné" — cette action n'a jamais fonctionné, pas même partiellement.
- Le modèle de données lui-même était structurellement faux : assignation par employé individuel, alors que le vrai backend est team-based (`Collecte.assignedTeamId`, `PATCH /collectes/:id/assign-team`) — aucun endpoint d'assignation par employé n'a jamais existé côté serveur.

Question posée explicitement à l'utilisateur avant de construire le picker (changer le contrat émis par le composant partagé impacte forcément `agency-dashboard.ts`, son seul vrai consommateur) : corriger aussi ce flux, ou se limiter strictement à `municipality-dashboard.ts` comme le prompt le nomme littéralement ? Réponse de l'utilisateur : "Seuls les managers peuvent assigner/résoudre. L'agent de mairie ne fait pas ça." — confirme le gating manager-only comme règle métier voulue, et implique de corriger le vrai flux manager, sans quoi le picker d'équipe construit resterait sans utilisateur réel capable de s'en servir.

## Signalement (composant partagé) — construction du vrai team-picker
- `Incident` (interface) : ajout de `assignedTeamId?: { _id: string; name?: string } | null` (champ réel) et `resolutionStatus?: 'pending'|'in_progress'|'resolved'`.
- Ancien `@Output() assignReport = new EventEmitter<Incident>()` — n'émettait que l'incident brut, sans aucune équipe sélectionnée (2 boutons différents, "Assigner" et "Traiter", faisaient déjà le même emit redondant). Remplacé par `@Output() assignReportToTeam = new EventEmitter<{ incidentId: string; teamId: string }>()`, qui n'émet qu'une fois une équipe réellement choisie et confirmée.
- Nouveau modal team-picker (`showTeamPickerModal`/`teamPickerIncident`/`teams`/`selectedTeamId`/`isLoadingTeams`) : `openTeamPicker(incident)` charge les équipes réelles de l'agence via `AgencyService.getTeamsV2$(agencyId)` (déjà existant, déjà utilisé ailleurs dans `agency-dashboard.ts`) ; `confirmAssignTeam()` émet le payload une fois une équipe sélectionnée. `AgencyService` était importé mais commenté dans le constructeur — réactivé.
- Boutons "Assigner"/"Traiter" consolidés : les 2 boutons redondants qui faisaient le même emit sans sélection sont remplacés par un seul bouton ouvrant le picker, libellé "Assigner" ou "Réaffecter" selon `assignedTeamId` déjà présent ou non.
- Bug de gating corrigé : le bouton "Résoudre" et la colonne "Assigné à" lisaient `incident.collectorId` — le collecteur de la collecte planifiée d'origine, sans rapport avec le traitement du signalement. Remplacé par le vrai champ `assignedTeamId` (colonne Assignee) et `resolutionStatus !== 'resolved'` (visibilité du bouton Résoudre) — la condition précédente (`!incident.collectorId?._id`) pouvait masquer "Résoudre" pour un signalement jamais assigné à un collecteur d'origine, sans rapport avec son état de résolution réel.
- `FormsModule` ajouté aux imports du composant standalone (nécessaire pour `[(ngModel)]` sur la sélection radio d'équipe).
- Petit nettoyage collatéral : `investigateIncident()` (méthode déjà morte, non appelée depuis le template de ce composant) écrivait encore `incident.assignedTo`, un champ mock retiré de l'interface — ligne supprimée pour rester compilable, méthode elle-même non retouchée davantage (hors périmètre de ce prompt).

## admin.ts / agency.service.ts — vrais endpoints
- `Admin.assignReportToTeam$(collecteId, teamId, assignedBy)` (nouveau, `admin.ts`) — `PATCH /collectes/:id/assign-team`, même convention que `resolveCollecte$` déjà existant.
- `AgencyService.assignReportToTeam$`/`resolveReport$` (nouveaux, `agency.service.ts`) — mêmes vrais endpoints, remplacent entièrement `resolveIncident$`/`assignReportToEmployee$` (supprimées : elles ne pointaient vers aucune route réelle, voir plus haut).

## municipality-dashboard.ts — handlers réécrits sur le vrai contrat
- `Incident` : ajout de `assignedTeamId?: { _id: string; name?: string } | null` ; `assignedTo?: string` (mock) retiré.
- `onAssignReport()` : appelait auparavant seulement `target.status = "pending"` (une valeur qui n'existe même pas dans le vrai enum `Collecte.status`) en mémoire, jamais persisté. Appelle maintenant le vrai `Admin.assignReportToTeam$()`, met à jour l'incident depuis la réponse serveur seulement après confirmation. Signature changée de `(incident: Incident)` à `(payload: { incidentId, teamId })` pour matcher le nouvel emitter.
- Note assumée : ce handler reste inatteignable en pratique pour un agent de mairie (le bouton ne s'affiche que pour `role === 'manager'`, jamais `'municipality'`, confirmé par l'utilisateur ci-dessus). Corrigé quand même — au lieu de laisser une mutation locale fictive — par cohérence avec le reste du dashboard et au cas où cette règle de visibilité évoluerait un jour.
- `onResolvedIncident()` : déjà correct depuis le bugfix "Pas cohérent" antérieur à ce prompt — non modifié.
- Template (`municipality-dashboard.html`) : binding changé de `(assignReport)="onAssignReport($event)"` à `(assignReportToTeam)="onAssignReport($event)"`.

## agency-dashboard.ts/.html — le vrai flux manager, désormais fonctionnel
- Supprimés (dead code confirmé, jamais fonctionnel) : `showAssignModal`, `selectedReportId`, `selectedReport`, `selectedEmployee` (champs) ; `openAssignModal()`, `closeAssignModal()`, `assignEmployeesToReport()` (stub vide), `toggleEmployeeSelection()`, `onEmployeeToggle()`, `assignReport()` (appelait l'endpoint employé mort), `resolveIncident1()` (méthode dupliquée, confirmée totalement inutilisée — aucun appelant nulle part). Le modal HTML entier de sélection d'employé (grille de checkboxes, ~60 lignes) supprimé du template — remplacé par le team-picker désormais intégré à `<app-signalement>`.
- `onAssignReportToTeam(payload)` (nouveau) : appelle `AgencyService.assignReportToTeam$()`, recharge `agencyReports` via `loadAgencyReports(this.currentUser)` (pas `loadReports()` — celui-ci s'est avéré être un générateur de données 100% mockées et statiques, sans aucun rapport avec les signalements réels, découvert en vérifiant son implémentation avant de le réutiliser).
- `resolveIncident(id)` (réécrit) : appelle maintenant `AgencyService.resolveReport$()` (le vrai endpoint), retire le toast fixe "Système de validation non établie" qui admettait déjà que l'ancien flux n'était pas fiable.
- Template : `(assignReport)="openAssignModal($event)"` devient `(assignReportToTeam)="onAssignReportToTeam($event)"` sur `<app-signalement>`.
- `allEmployees` (champ) conservé : toujours utilisé ailleurs (onglet Employés), non lié à ce flux mort.

## Mock dead code supprimé (découvert en corrigeant l'interface Incident)
`MunicipalityMockDataService.getIncidents()` / `generateIncidents()` (`mocks/municipality-mock.generators.ts`, `mocks/municipality-mock-data.service.ts`) écrivaient encore `assignedTo` (champ mock retiré de l'interface `Incident` réelle) et se sont révélées, en vérifiant leurs appelants, totalement orphelines : `this.incidents` est chargé depuis `loadAllSignalements()` (le vrai `GET /api/collecte/all`, Prompt 03) depuis longtemps déjà — supprimées entièrement plutôt que patchées pour rester compilables, même précédent que la suppression de `generateMunicipalityStatistics()` au Prompt 01. Imports désormais inutilisés (les 4 pools INCIDENT_*, type `Incident`) nettoyés dans les 2 fichiers concernés.

## Vérifications effectuées
- `npx tsc --noEmit -p tsconfig.json` → `EXIT:0`.
- Backend : `node -c` sur les 3 fichiers modifiés + `require('./routes/collecte.route.js')` à blanc, sans erreur.
- Recherche exhaustive de toute référence résiduelle à l'ancien flux (`resolveIncident$`, `assignReportToEmployee$`, `showAssignModal`, `selectedReportId`) : aucune, hors commentaires explicatifs et un unique bloc de markup déjà commenté (code mort préexistant, non touché) dans `agency-dashboard.html`.

---

# Municipality Dashboard — Prompt 07 : Performance Globale (Satisfaction & Conformité)

Voir `EditRecap.md` pour le détail backend (nouvel endpoint, découverte que `zone-coverage` ne calcule en réalité aucun `completionRate`). Ceci couvre le côté frontend + la confirmation écrite exigée par les "Deliverables" du prompt.

## (a) Nouvel endpoint
`GET /api/municipality/performance-overview` → `{ success, message, data: { averageSatisfaction: number | null, complianceRate: number } }`.

## (b) Confirmation écrite — satisfaction n'a aucune source de données
Relecture de tous les modèles Mongoose réels (`models/*.js`, pas seulement les schémas Swagger déclarés) : aucune entité rating/review/feedback/satisfaction n'existe nulle part dans le schéma backend. `averageSatisfaction` reste explicitement `null` — ni requêté, ni fabriqué à partir d'un proxy (le prompt suggérait, à titre d'exemple, un dérivé du volume de plaintes rapporté au nombre de clients). Ceci est escaladé comme une vraie question produit à trancher (construire une entité de feedback client est une fonctionnalité produit à part entière, hors périmètre d'une migration mock→réel), pas contourné silencieusement par un calcul de repli.

## (c) `complianceRate` — agrégation confirmée, mais pas celle suggérée par le prompt
Le prompt suggérait de réutiliser le `completionRate` par quartier de `/api/planning/v2/zone-coverage`. Vérifié contre l'implémentation réelle : cette fonction ne calcule aucun `completionRate` (son vrai retour n'a aucun rapport avec ce que documente son propre Swagger, resté obsolète). `complianceRate` est donc agrégé à la place à partir de la même définition déjà validée au Prompt 05 pour les agences (`Collected` / (total − `Cancelled`) × 100), simplement sans filtre `agencyId` — cohérent avec le principe déjà établi de ne pas calculer une 3ᵉ version parallèle de "conformité".

## (d) Frontend — plus mocké
- `PerformanceOverview` (type, `municipality-mock.types.ts`) : `averageSatisfaction` retypé `number | null` (était `number`, toujours une valeur aléatoire mockée entre 3.8 et 4.6).
- `Admin.getPerformanceOverview$()` (nouveau, `admin.ts`) — appelle le vrai endpoint.
- `loadPerformanceOverview()` (`municipality-dashboard.ts`) : appelait auparavant `mockDataService.getPerformanceOverview()` (données aléatoires). Appelle maintenant le vrai endpoint ; `performanceOverview` mis à `null` en cas d'erreur réseau, pas de valeur de repli fabriquée.
- `isPerformanceOverviewMocked` : `true` → `false` — dernier flag de mock restant sur cet indicateur, fait disparaître le badge "Démo" du template.
- Template (`municipality-dashboard.html`) : bloc "Satisfaction client" affiche "Non disponible" quand `averageSatisfaction` est `null`/`undefined`, au lieu d'afficher `null/5` et zéro étoile silencieusement. "Conformité réglementaire" ne change pas de logique (toujours un nombre réel), seulement sa source.
- `.scss` : nouvelle classe `.metric-value--unknown` pour l'état "non disponible" (gris neutre, cohérent avec les autres badges "non disponible" déjà introduits au Prompt 05).
- Nettoyage collatéral : `generatePerformanceOverview()`/`MunicipalityMockDataService.getPerformanceOverview()` supprimées (mêmes précédents que les Prompts 01/06) — plus aucun appelant réel, le générateur inventait `averageSatisfaction` alors qu'aucune source n'existe.

## Vérifications effectuées
- `npx tsc --noEmit -p tsconfig.json` → `EXIT:0`.
- Backend : `node -c` sur les 4 fichiers (service/controller/route/`server.js`) + `require()` à blanc, sans erreur.

---

# Municipality Dashboard — Prompt 08 : Waste Breakdown Aggregation

Voir `EditRecap.md` pour le détail backend : une régression critique auto-détectée et corrigée (le Prompt 04 avait cassé les 3 seuls points de création de `Collecte` dans tout le backend), et le câblage réel de `PlanningV2.typeDechets` → `Collecte.wasteType` (jamais fait depuis la décision du Prompt 02), préalable nécessaire à ce prompt et validé avec vous avant d'être entrepris. Ceci couvre le côté frontend.

## (a) Nouvel endpoint consommé
`GET /api/municipality/waste-statistics?days=N` → `[{ type, quantity, percentage, trend }]`, `type` ∈ `menagers|recyclables|verts|encombrants|speciaux` (vrai enum, plus les 4 catégories inventées du mock).

## (b) `quantity` — compte de collectes, pas un poids
Le mock affichait `{{ waste.quantity }}t` partout (tonnes) et les 2 exports PDF avaient des en-têtes "Quantité (t)". Aucune source de poids réelle n'existe nulle part dans le schéma — `quantity` est un **compte de collectes** par type. Corrigé partout : template ("collecte(s)" au lieu de "t"), tooltip du graphique (`waste-breakdown.chart.ts`), en-têtes des 2 exports PDF ("Nb. collectes" au lieu de "Quantité (t)").

## (c) `WasteStatistic` (interface) — nouveau champ `label`
Le backend ne renvoie que la clé d'enum (`menagers`, pas "Ménagers"). Ajout de `label: string` sur l'interface, résolu via une nouvelle constante locale `WASTE_TYPE_DISPLAY` (`municipality-dashboard.ts`) qui fournit libellé français + couleur pour les 5 vraies catégories — distincte de `WASTE_TYPE_POOL` (mocks/municipality-mock.constants.ts, 4 catégories inventées), **volontairement laissée intacte** : encore utilisée par 3 autres sections (Performance des collecteurs, Fréquence par zone, Volume Global Collecté) qui restent mock-backées jusqu'à leurs propres prompts dédiés (09/10/11) — les toucher maintenant aurait débordé du périmètre de ce prompt.

## (d) `loadWasteStatistics()` réécrit
Appelle `Admin.getWasteStatistics$(days)` (nouveau, `admin.ts`) au lieu de `mockDataService.getWasteStatistics$()`. Mappe la réponse serveur (`type`, `quantity`, `percentage`, `trend`) vers `WasteStatistic[]` en résolvant `label`/`color` via `WASTE_TYPE_DISPLAY`.

## (e) Badge "Démo" — rien à retirer
Le prompt demande de retirer le badge "Démo" de cette section. Vérifié : contrairement à "Performance Globale" (Prompt 07) et "Performance par Agence" (Prompt 05), qui avaient chacun un `isXMocked`/badge dédié, **la section "Répartition des Déchets" n'en a jamais eu** — aucun flag ni badge trouvé dans le template pour cette section spécifiquement. Rien à retirer ; signalé plutôt que silencieusement ignoré, au cas où ce serait une divergence avec ce que vous attendiez.

## Nettoyage collatéral
`generateWasteStatistics()`/`MunicipalityMockDataService.getWasteStatistics()`/`getWasteStatistics$()` supprimées (plus aucun appelant réel) — même précédent que les Prompts 01/06/07. `generateWasteRecords()` (utilisée par la même fonction supprimée) **conservée** : encore le générateur réel de "Volume Global Collecté" (Prompt 11), non touchée.

## Vérifications effectuées
- `npx tsc --noEmit -p tsconfig.json` → `EXIT:0`.
- Backend : `node -c` sur tous les fichiers modifiés + `require()` à blanc des routes concernées, sans erreur.

---

# Municipality Dashboard — Prompt 09 : Monthly Collection Trend

Voir `EditRecap.md` pour le détail backend (agrégation réutilisant exactement la même base que le Prompt 08, garantissant l'absence de divergence exigée par le roadmap §3.4). Ceci couvre le côté frontend.

## (a) Nouvel endpoint consommé
`GET /api/municipality/monthly-trend?months=N` → `[{ monthKey, label, totalCollections, completedCollections }]`.

## (b) `totalWeightKg` retiré de `MonthlyTrendPoint`
Vérifié avant de toucher au code : ce champ n'était lu nulle part côté frontend, même du temps du mock — ni `collection-evolution.chart.ts` (dont le commentaire dit déjà explicitement "not tonnage: that's already covered by the waste-breakdown chart"), ni l'export PDF (`municipality-dashboard.ts`, section "Évolution des collectes", 2 colonnes de métriques seulement). Retiré de l'interface plutôt que renvoyé à 0 : aucune source de poids réelle n'existe de toute façon nulle part dans le schéma backend (même constat que Prompt 08).

## (c) `loadMonthlyTrend()` réécrit
Appelle `Admin.getMonthlyTrend$(months)` (nouveau, `admin.ts`) au lieu de `mockDataService.getMonthlyTrend$()`. Aucun changement nécessaire côté `collection-evolution.chart.ts` ni template/export PDF : la forme de `MonthlyTrendPoint` consommée par ces 3 endroits (`label`/`totalCollections`/`completedCollections`) reste la même.

## (d) Badge "Démo" — rien à retirer, comme au Prompt 08
Vérifié : la section "Évolution des Collectes" n'a jamais eu de badge/flag "Démo" dans le template (contrairement à "Performance Globale" et "Performance par Agence"). Rien à retirer ; signalé plutôt que silencieusement ignoré.

## Nettoyage collatéral
`generateMonthlyTrend()`/`MunicipalityMockDataService.getMonthlyTrend()`/`getMonthlyTrend$()` supprimées (plus aucun appelant réel) — même précédent que les Prompts 01/06/07/08. `generateWasteRecords()` (dont dépendait ce générateur) conservée : encore utilisée par "Volume Global Collecté" (Prompt 11), toujours mocké.

## Vérifications effectuées
- `npx tsc --noEmit -p tsconfig.json` → `EXIT:0`.
- Backend : `node -c` sur les fichiers modifiés + `require()` à blanc, sans erreur.

---

# Municipality Dashboard — Prompt 11 : Zone Collection Frequency

Voir `EditRecap.md` pour le détail backend (blocage réel découvert — la prémisse « Prompt 10 »
du roadmap ne tenait pas, décision de liaison de zone prise avec l'utilisateur via
AskUserQuestion). Ceci couvre le côté frontend.

## (a) Nouvel endpoint consommé
`GET /api/municipality/zone-frequency?days=N` → `[{ id, zoneId, zoneName, wasteType, plannedFrequency, actualFrequency }]`.
`plannedFrequency` ∈ `unique|hebdomadaire|bimensuel|mensuel` ; `actualFrequency` ajoute `none`.

## (b) Enum réel propagé partout — remplace le mock `daily|weekly|monthly`
- `CollectionFrequency`/`PlannedFrequency` (`municipality-mock.types.ts`) : nouveau type
  `PlannedFrequency = 'unique'|'hebdomadaire'|'bimensuel'|'mensuel'`, `CollectionFrequency =
  PlannedFrequency | 'none'`. `ZoneFrequencyRecord`/`ZoneFrequencyIndicator` retypés en
  conséquence ; `zoneId?: string` ajouté sur `ZoneFrequencyRecord` (miroir de la réponse
  backend, identique à `zoneName` aujourd'hui faute d'id stable partagé entre les deux
  systèmes de zone que le backend réconcilie par nom).
- `FREQUENCY_WEIGHT` (`utils/zone-frequency.util.ts`) : nouveaux poids
  `{hebdomadaire:4, bimensuel:2, mensuel:1, unique:0.5, none:0}` — ordre de fréquence réel,
  `'none'` le plus bas (aucune activité réelle), `'unique'` sous `'mensuel'` (occurrence
  unique, moins fréquent qu'une cadence mensuelle récurrente). `evaluateZoneFrequency()`
  retypé `(planned: PlannedFrequency, actual: CollectionFrequency)`.
- `getFrequencyLabel()` (`municipality-dashboard.ts`) : nouveaux libellés français
  (Ponctuelle/Hebdomadaire/Bimensuelle/Mensuelle/Aucune).
- **Bug auto-détecté et corrigé en cours de route (backend)** : la logique de réconciliation
  zone×type utilisait initialement une clé de type "chaîne jointe puis splittée" — cassée dès
  qu'un nom de zone contient un espace (fréquent en pratique). Corrigée avant tout test en une
  clé composite `JSON.stringify([zoneName, wasteType])`, jamais reconstituée par `.split()`.

## (c) `loadZoneFrequency()` réécrit
Appelle `Admin.getZoneFrequency$(days)` (nouveau, `admin.ts`) au lieu de
`mockDataService.getZoneFrequencyRecords$(seed)` — `days` (fenêtre réelle de dates pour le
côté RÉEL) remplace le `seed` du mock (aucun équivalent réel à un reshuffle par seed).
`zoneFrequencyWasteTypeOptions` liste maintenant les 5 vraies clés d'enum
(`Object.keys(WASTE_TYPE_DISPLAY)`, même catalogue que le Prompt 08) plutôt que les libellés
français du mock — le filtre doit matcher `record.wasteType` (la clé brute), donc affichage
via un nouveau helper `getWasteTypeLabel()` (réutilise `WASTE_TYPE_DISPLAY`) dans le select ET
dans la cellule du tableau (`indicator.wasteType` affichait la clé brute non traduite avant ce
correctif).

## (d) Badge "Démo" — rien à retirer, comme aux Prompts 08/09
Vérifié : le panneau "Fréquence de Collecte par Zone" n'a jamais eu de badge/flag "Démo" dans
le template. Rien à retirer.

## (e) Tests unitaires mis à jour
`zone-frequency.util.spec.ts` : tous les cas de test migrés vers le nouvel enum (même
relations de fréquence relative conservées : hebdomadaire > bimensuel > mensuel), plus 2
nouveaux cas couvrant `actualFrequency: 'none'` (absent du mock, nouveau côté réel) —
`evaluateZoneFrequency` le flague bien `insufficient` même contre le planned le plus léger
(`unique`), et `aggregateZoneFrequencyRecords` le propage correctement au niveau agrégé.

## Nettoyage collatéral
`generateZoneFrequencyRecords()`/`MunicipalityMockDataService.getZoneFrequencyRecords()`/
`getZoneFrequencyRecords$()` supprimées (plus aucun appelant réel) — même précédent que les
Prompts 01/06/07/08/09. `WASTE_TYPE_BASELINE_FREQUENCY` et le helper local `shiftFrequency()`
supprimés avec elle (plus aucun autre appelant, confirmé par grep avant suppression).

## Vérifications effectuées
- `npx tsc --noEmit -p tsconfig.json` → `EXIT:0`.
- `zone-frequency.util.ts` compilé isolément (`tsc` vers un dossier temporaire) et exécuté en
  Node avec les 10 assertions du spec mis à jour rejouées manuellement (pas seulement
  type-checkées) — toutes passent, y compris les 2 nouveaux cas `'none'`.
- Backend : voir `EditRecap.md` (test d'insertion temporaire contre la vraie base, nettoyé
  immédiatement après, base confirmée restaurée à son état initial).

---

# Municipality Dashboard — Prompt 12 : Waste Volume Records (Fact Table + Filtering)

Voir `EditRecap.md` pour le détail backend (blocage plus grave que celui du Prompt 11 —
`weightKg`/`targetWeightKg` n'ont aucune source réelle nulle part, décision prise avec
l'utilisateur via AskUserQuestion). Ceci couvre le côté frontend.

## (a) Nouvel endpoint backend disponible, non consommé directement par l'UI existante
`GET /api/municipality/waste-records?from=&to=&zoneId=&wasteType=&collectorId=&page=&limit=`
existe côté backend (table de faits paginée), mais aucun écran de ce dashboard n'affichait
déjà une liste de collectes individuelles à rebrancher — la "Frontend Integration" demandée
par le prompt portait sur *"Volume Global Collecté"*, pas sur l'ajout d'un nouveau tableau.
Décision (issue du choix utilisateur ci-dessous) : pas de nouveau composant de liste construit
dans ce prompt ; l'endpoint reste disponible pour un futur écran de détail/export si besoin.

## (b) "Volume Global Collecté" entièrement redéfini
- `VolumeAggregate` (`utils/volume.util.ts`) : `actualKg`/`targetKg` → `actualCollections`/
  `targetCollections`. `aggregateVolume()` prend maintenant des `MonthlyTrendPoint[]`
  (déjà chargés pour "Évolution des Collectes", Prompt 09) au lieu de `MockWasteRecord[]` —
  `completedCollections` sert d'"actuel", `totalCollections` sert d'"objectif" (les collectes
  planifiées), sans inventer un objectif externe.
- **Plus de fetch séparé** : `loadVolumeGlobal()`/`applyVolumeFilters()` supprimées.
  `volumeAggregate` est désormais recalculé directement dans `loadMonthlyTrend()` (succès ET
  erreur), à partir de la même réponse déjà reçue pour le graphique d'évolution.
- **Plus de filtres zone/type/collecteur pour ce panneau** : `monthly-trend` est un agrégat
  plateforme, non filtrable par ces dimensions — les 3 `<select>` correspondants retirés du
  template, ainsi que `volumeZoneFilter`/`volumeWasteTypeFilter`/`volumeCollectorFilter`/
  `volumeZoneOptions`/`volumeWasteTypeOptions`/`volumeCollectorOptions`/`volumeAllRecords`/
  `isLoadingVolumeGlobal` (le panneau utilise maintenant `isLoadingMonthlyTrend`, puisqu'il
  n'a plus sa propre requête).
- **Libellés mis à jour** : "Réel (t)"/"Objectif (t)" → "Collectes réalisées"/"Collectes
  planifiées" (retrait de la conversion `/1000` kg→tonnes, désormais un compte, pas un
  poids) — dans le template ET dans les 2 sections d'export PDF/CSV/Excel
  (`generateGlobalReport()` Prompt 15, `buildStatisticsExportSections()` Prompt 16).
- `updateStatistics()` : compteur de fan-out `remaining` réduit de 5 à 4 — "Volume Global
  Collecté" ne consomme plus son propre slot, il se termine avec celui de `loadMonthlyTrend()`.

## (c) Nettoyage collatéral en cascade
`generateWasteRecords()`/`MunicipalityMockDataService.getWasteRecords()`/`getWasteRecords$()`
supprimées (plus aucun appelant réel — "Volume Global Collecté" était leur dernier) — même
précédent que les Prompts 01/06/07/08/09/11. En cascade, également supprimés (devenus
orphelins, confirmé par grep sur tout le repo avant suppression) :
`MockWasteRecord` (interface), `WASTE_TYPE_TARGET_WEIGHT_KG`, `FULL_HISTORY_DAYS` — aucun de
ces trois n'avait plus d'appelant nulle part une fois `generateWasteRecords()` retirée.
L'import `Collection`/`CollectionStatus` (`models/collection.model.ts`) dans
`municipality-dashboard.ts` et `municipality-mock.types.ts` retiré pour la même raison
(n'existait que pour `MockWasteRecord`).

## Vérifications effectuées
- `npx tsc --noEmit -p tsconfig.json` → `EXIT:0` (après tout le nettoyage en cascade).
- `volume.util.ts` compilé isolément et exécuté en Node avec les 4 assertions du spec
  mis à jour rejouées manuellement (pas seulement type-checkées) — toutes passent.
- Backend : voir `EditRecap.md` (non-régression Prompt 09 re-vérifiée après le refactor
  `_baseWasteFactsMatch`, plus test d'insertion temporaire contre la vraie base pour le
  nouvel endpoint, nettoyé immédiatement après, base confirmée restaurée à son état initial).

---

# Municipality Dashboard — Prompt 13 : Period Filter Contract Across All Statistics Endpoints

Voir `EditRecap.md` pour le détail backend (extraction `resolvePeriodWindow()`, et la
matrice complète des 5 sections face à "Période" — le livrable principal de ce prompt).
Ceci couvre le côté frontend.

## Constat : aucun changement de comportement nécessaire côté frontend

Vérifié avant de conclure trop vite à "rien à faire" : `getPeriodConfig()`
(`municipality-dashboard.ts`) envoyait déjà `days`/`months` — pas un `seed` — à
`loadWasteStatistics()`/`loadMonthlyTrend()`/`loadZoneFrequency()`, exactement la table
de correspondance définie dans `BACKEND_INTEGRATION.md` §4 (Aujourd'hui→1j/3mois,
Cette semaine→7j/3mois, Ce mois→30j/6mois, Ce trimestre→90j/9mois, Cette année→365j/12mois).
`days`/`months` sont explicitement acceptés par le prompt lui-même comme équivalents
réels à `from`/`to` ("Existing Architecture Analysis" : "or equivalent days/months
convention") — il n'y avait donc pas de véritable écart à corriger, seulement à confirmer
et documenter clairement, ce qui est le travail effectué ici.

## (a) `getPeriodConfig()` — docstring réécrite comme référence définitive

Le commentaire décrivait déjà `days`/`months`/`seed`, mais pas de façon assez complète pour
servir de référence aux 5 sections face à "Période" (le livrable explicite du prompt).
Réécrit pour couvrir, section par section : lequel des 4 endpoints réels chaque valeur
alimente, et — point le plus important, demandé explicitement par le prompt — que la
fenêtre `days` envoyée à `GET /zone-frequency` (Prompt 11) n'affecte QUE `actualFrequency`,
jamais `plannedFrequency` (aucune notion de "planifié à une date passée" dans le schéma
backend — confirmé côté backend, pas supposé). `seed` reste documenté comme un mécanisme
strictement mock, pour l'unique section (indicateurs de performance) qui n'a encore aucun
endpoint réel — pas une 4ᵉ variante du vrai contrat `from`/`to`/`days`/`months`.

## (b) Aucun nouvel appel réseau, aucun nouveau composant

`GET /waste-records` (Prompt 12) reste sans appelant frontend — confirmé de nouveau ici
(déjà noté au Prompt 12) : aucun écran de ce dashboard n'affiche de liste de collectes
individuelles à faire pointer vers cet endpoint pour l'instant. Rien à câbler pour ce
prompt spécifiquement.

## Vérifications effectuées
- `npx tsc --noEmit -p tsconfig.json` → `EXIT:0`.
- Backend : voir `EditRecap.md` — complété a posteriori une fois la panne réseau/DNS locale
  contournée (`dns.setServers` vers des résolveurs publics) : test comportemental complet
  rejoué, refactor confirmé comportementalement identique.

---

# Municipality Dashboard — Prompt 14 : Coverage Map Data (Reuse Existing Endpoints)

Voir `EditRecap.md` pour le détail backend (prémisse `zone-coverage` confirmée fausse pour
la 3ᵉ fois, fix indépendant du crash `plannings[0]`, décision utilisateur). Ceci couvre le
côté frontend — **majoritairement un retour en arrière**, pas une migration.

## Migration construite, vérifiée, puis mise en attente (décision utilisateur)

Une vraie intégration a été construite : `Admin.getCities$()` (nouveau, `admin.ts`) →
`GET /territories/cities`, une nouvelle `loadCityCoordinates()` dans
`municipality-dashboard.ts` remplaçant `MunicipalityMockDataService.getZoneCoordinates()`
dans `buildCoverageMapZones()`, avec gestion de la course entre ce chargement et
`buildZoneStatisticsFromAdminStats()` (peu importe lequel des deux finit en premier).
Type-check clean, code correct.

**Puis vérifiée contre la vraie base avant de la considérer terminée** (même discipline que
tous les prompts précédents) : la collection `City` réelle n'a que 6 documents, aucun avec
`latitude`/`longitude` renseignées. Migrer aurait fait passer la carte de "marqueurs
approximatifs" à "aucun marqueur" — présenté à l'utilisateur via AskUserQuestion plutôt que
décidé silencieusement, qui a choisi de garder le mock pour le moment.

## Retour en arrière effectué

- `buildCoverageMapZones()` : revert à `this.mockDataService.getZoneCoordinates(city.name)`.
- `loadCityCoordinates()` et la propriété `cityCoordinates` : supprimées (code mort une fois
  la décision prise — un futur prompt qui reviendrait sur cette décision peut relire cette
  entrée plutôt que retrouver un composant à moitié câblé).
- `ZONE_COORDINATES`/`OTHER_COUNTRY_CITY_COORDS`/`getZoneCoordinates()` (mocks) : restaurées
  à l'identique.
- `Admin.getCities$()` : **conservée**, non appelée — prête à être rebranchée le jour où
  `City.latitude`/`longitude` sera réellement peuplé, avec un commentaire à jour expliquant
  pourquoi elle est actuellement inutilisée plutôt que « nouvelle et jamais utilisée ».

## Vérifications effectuées
- `npx tsc --noEmit -p tsconfig.json` → `EXIT:0` (après le retour en arrière).
- Grep sur tout le dossier `municipality-dashboard` : confirmé aucune référence résiduelle à
  `cityCoordinates`/`loadCityCoordinates` après suppression.
- Backend : voir `EditRecap.md` (comptage réel des documents `City` et de la correspondance
  de noms avec `MOCK_CITIES`, qui a motivé la décision de mise en attente).

---

# Municipality Dashboard — Prompt 15 : Known Inconsistencies Cleanup

Voir `EditRecap.md` pour le détail backend (renommage du schéma OpenAPI `Agence`→`Agency`).
Ceci couvre le côté frontend — 3 items indépendants, chacun vérifié avant modification.

## (a) `loadZoneStatistics()` supprimée — mais PAS `AgencyService.getAgenceStats()`

Grep sur tout `src/` (pas seulement ce dossier), comme demandé explicitement par le prompt :
`MunicipalityDashboard.loadZoneStatistics()` (municipality-dashboard.ts:748) n'avait
**zéro appelant** nulle part — supprimée. Mais `AgencyService.getAgenceStats()`, que cette
méthode appelait, **N'A PAS été supprimée** : `admin-dashboard.ts` a sa PROPRE méthode
`loadZoneStatistics()` (homonyme, sans rapport), toujours réellement appelée
(`admin-dashboard.ts:588`), qui appelle elle-même `getAgenceStats()`. La prémisse du prompt
("`AgencyService.getAgenceStats()` confirmée morte") n'était donc vraie que pour l'appelant
municipalité, pas pour la méthode de service elle-même — signalé plutôt que supprimé à
tort, ce qui aurait cassé `admin-dashboard.ts`.

## (b) Bug réel trouvé — mais mal corrigé ici ; vraie correction faite plus tard côté backend (voir EditRecap.md)

Le prompt demandait de "retirer le typage `any` désormais résolu" — déjà fait avant ce
prompt (`statisticsAdmin` est déjà typé `MunicipalityStatistics | null`). Mais vérifier
"Prompt 01 confirmé en conditions réelles" (comme demandé) a révélé que la résolution
n'était pas complète : l'interface déclarait `totalCollectionsCollected` et
`totalCollectionsReported`, des noms qui ne correspondaient à AUCUNE clé renvoyée par
`services/globalState.js` (backend réel) — celui-ci calcule les valeurs sous
`dailyCollectionCollected` et `totalCollectionReported`. Conséquence réelle, pas
théorique : `getCollectionRate()` lisait un champ toujours `undefined` → **le taux de
collecte affiché en haut du dashboard était silencieusement bloqué à 0% depuis la
migration réelle**, malgré des données correctes derrière.

**Correction initialement appliquée ici (erronée)** : les deux champs de l'interface
renommés pour matcher le retour de `services/globalState.js` directement
(`dailyCollectionCollected`/`totalCollectionReported`) — vérification faite uniquement
contre le SERVICE, pas contre la vraie réponse HTTP. Or `controllers/globalSate.js`
(le contrôleur, entre le service et `res.json()`) renomme ces deux champs en
`totalCollectionsCollected`/`totalCollectionsReported` (pluriel) avant de les envoyer —
exactement les noms que l'interface avait AVANT ce prompt, et qu'Prompt 01 avait déjà
confirmés corrects contre la vraie réponse (voir EditRecap.md ligne ~634). Ce
"correctif" recréait donc le même bug (0% affiché) par le chemin inverse, jusqu'à ce que
l'utilisateur colle une vraie réponse HTTP le montrant.

**Résolution finale** (décision utilisateur explicite : "l'ajouter côté backend" plutôt
que renommer à nouveau ici) : les 2 champs de l'interface remis à
`dailyCollectionCollected`/`totalCollectionReported` (leur état originel, correct), et
`controllers/globalSate.js` étendu pour exposer CES noms en plus des alias pluriels
existants (aucun champ retiré côté backend — voir EditRecap.md pour le détail et la
vérification en direct contre la vraie base). Leçon retenue : quand une réponse HTTP
passe par un contrôleur séparé du service, vérifier le contrat contre le contrôleur (ou
un vrai appel HTTP), jamais contre le retour brut du service seul.

## (c) Badges "Démo" — les 2 flags valaient déjà `false`, supprimés avec leurs 3 usages

`isPerformanceOverviewMocked` et `isAgencyPerformanceMocked` valaient déjà `false` en dur
(Prompts 05/07 avaient déjà rendu les données réelles) — aucun badge ne s'affichait donc
plus depuis un moment, mais les indicateurs eux-mêmes restaient dans le code. Retirés avec
leurs 3 usages dans le template (`Satisfaction client`, `Conformité` par agence,
`metric-row-demo-label`) et les 2 règles CSS `.demo-data-badge`/`.metric-row-demo-label`
devenues orphelines.

## Checklist finale — tous les badges "Démo" introduits pendant la phase mock (Prompts 00-14)

| Badge / flag | Section | État |
|---|---|---|
| `isPerformanceOverviewMocked` | Performance Globale — Satisfaction client | ✅ Supprimé (déjà `false`, jamais affiché) |
| `isAgencyPerformanceMocked` (×2 usages) | Audit Agences — Conformité / métriques par agence | ✅ Supprimé (déjà `false`, jamais affiché) |
| Zone Frequency, Waste Breakdown, Monthly Trend, Volume Global | — | ✅ Confirmé aux Prompts 08/09/11/12 : jamais eu de badge "Démo" à retirer (vérifié explicitement à chaque prompt, pas supposé) |
| Performance Indicators (§3.5) | Graphiques de performance | ⚠️ **Toujours mock** (aucun endpoint réel construit) — pas de badge "Démo" existant à ce jour sur cette section non plus, mais c'est la seule section qui resterait légitimement à badger si un badge devait un jour être ajouté |
| Coverage Map (coordonnées) | Couverture Territoriale (carte) | ⚠️ **Toujours mock** (Prompt 14, décision utilisateur de rester sur le mock en attendant de vraies coordonnées) — pas de badge "Démo" existant sur cette section |

Grep final sur `municipality-dashboard.html`/`.ts` : zéro occurrence de
`isXMocked`/`Démo`/`démo`/`demo-data-badge` restante.

## Vérifications effectuées
- `npx tsc --noEmit -p tsconfig.json` → `EXIT:0`.
- Grep sur tout `src/` (pas seulement municipality-dashboard) pour les deux suppressions de
  code mort, avant de supprimer quoi que ce soit.
- Backend : appel réel de `services/globalState.js::getDashboardStats()` — ⚠️ correspondance
  contre le SERVICE seulement, pas contre la vraie réponse HTTP (`controllers/globalSate.js`
  renomme 2 champs entre les deux) — voir la correction de ce point plus bas dans ce même
  fichier ("Correctif : `GET /api/statistics` ne renvoyait pas `dailyCollectionCollected`/
  `totalCollectionReported`", et EditRecap.md pour le détail backend).

# Bug signalé par l'utilisateur : "Le map ne s'affiche pas !" (Coverage Map, Couverture Territoriale)

Signalé via capture d'écran : la carte de `coverage-map.ts` s'affichait comme une boîte
grise vide, avec les contrôles de zoom et l'attribution Leaflet/OSM correctement
positionnés, mais aucune tuile visible. Reproduit en direct (Chrome headless + CDP brut,
`window.ng.getComponent()` pour introspecter l'instance Leaflet en direct) plutôt que
supposé depuis le code.

## Cause réelle : `fitBounds()` s'exécutait avant que le conteneur ait une taille de layout réelle

`initMap()` appelait `fitBounds()` de façon synchrone juste après avoir créé la carte et
les 23 marqueurs — au moment exact où `.territory-map-container` vient d'être inséré/basculé
dans le DOM (bascule `@if/@else` sur `coverageView`). À cet instant, `el.clientWidth`/
`clientHeight` valent encore `0` (le navigateur n'a pas encore fait sa passe de layout).
Un premier correctif (déplacer `invalidateSize()` + `fitBounds()` dans un seul
`requestAnimationFrame`) s'est révélé **insuffisant** : vérifié en direct que
`el.clientWidth`/`clientHeight` valent toujours `0, 0` même à l'intérieur de ce callback rAF
— une seule frame ne suffit pas systématiquement. Conséquence mesurée : `fitBounds()`
calculait un zoom bloqué à `maxZoom` (19, échelle bâtiment) centré sur le centroïde des 23
coordonnées de zones (Niger→Ghana), au lieu d'un zoom englobant réellement tous les
marqueurs — d'où la tuile unique, minuscule, ne couvrant qu'un coin de la boîte, laissant le
reste gris.

Vérifié séparément (chaîne complète d'ancêtres mesurée après stabilisation) que le
conteneur **obtient bien** une taille réelle (363×420 dans le cas testé) — ce n'est donc pas
une chaîne CSS cassée (`:host`/`.coverage-map-host`/`.coverage-map-canvas` en `height:100%`
jusqu'à `.territory-map-container` en `height:420px` fixe est correcte), seulement une
véritable course avec le layout du navigateur, plus lente qu'une seule frame d'animation
dans ce cas précis.

## Correctif appliqué

Remplacé l'hypothèse de timing (`requestAnimationFrame`) par une logique conditionnelle :
si `el.clientWidth > 0 && el.clientHeight > 0` au moment de `initMap()` (vrai à chaque
re-rendu après le premier), `fitBounds()` s'exécute immédiatement. Sinon, la fonction de fit
est stockée (`this.pendingFit`) et exécutée par le `ResizeObserver` déjà existant sur `el`
(observé directement maintenant, plus seulement `el.parentElement`) — celui-ci est garanti
par spec de se déclencher au moins une fois après `observe()`, donc il capte forcément la
transition vers la taille réelle, sans deviner combien de frames cela prend.

## Vérifié en direct après correctif

Rejoué la même reproduction CDP (login mock municipalité → navigation dashboard → clic
"Vue carte") : `map.getZoom()` = **4** (plus 19), `map.getBounds()` couvre bien
lat -8.75→27.06 / lng -15.47→16.44 (cohérent avec les 23 zones Burkina Faso/Mali/Niger/
Ghana), et les 6 tuiles visibles à ce zoom sont toutes chargées (`naturalWidth > 0`).

# Redesign "Alertes Récentes" (Vue d'ensemble) — capture d'écran utilisateur montrant des lignes sans couleur ni icône

Signalé via capture d'écran : chaque ligne de "Alertes Récentes" s'affichait comme un
simple texte brut ("Regular", "REPORTED") sans puce colorée, sans icône, sans badge
stylé — demande explicite de redesign de cette section.

## Cause réelle trouvée avant de redessiner : mismatch de casse entre les données réelles et les classes CSS

`incident.severity` (réel, `Incident["severity"]`) vaut `"Critical"|"High"|"Medium"|"Low"`
(capitalisé) et `incident.status` vaut notamment `"Reported"|"Collected"|"Scheduled"`
(capitalisé) — mais le template construisait les classes CSS directement avec la valeur
brute (`'severity-' + incident.severity` → `severity-Critical`) alors que toutes les
règles CSS existantes sont en minuscules (`.severity-critical`). Résultat : aucune classe
ne matchait jamais, donc ni couleur ni icône ne s'appliquaient — ce n'était pas un simple
manque de style, c'était un vrai bug de mapping qui rendait tout style invisible.

Le même problème existe déjà — et est déjà résolu — dans `signalement.html`/`signalement.ts`
(page Signalements) : `.toLowerCase()` est appliqué systématiquement avant chaque lookup/
classe (`incident.severity.toLowerCase()`, `incident.type.toLowerCase()`,
`incident.status.toLowerCase()`), et `getIncidentTypeText()`/`getIncidentStatusText()`
y ont déjà les entrées `regular`/`reported`/`scheduled`/`collected` que
`municipality-dashboard.ts` n'avait pas. Repris ce pattern déjà établi plutôt que d'en
inventer un nouveau :
- `municipality-dashboard.html` : `.toLowerCase()` ajouté sur severity/type/status avant
  chaque binding de classe et chaque appel à `getSeverityIcon()`/`getIncidentTypeText()`/
  `getIncidentStatusText()`.
- `municipality-dashboard.ts` : `getIncidentTypeText()` complété avec `regular`/`other`,
  `getIncidentStatusText()` complété avec `reported`/`scheduled`/`collected` (mêmes
  traductions françaises que `signalement.ts`, pour rester cohérent dans toute l'app).
- `municipality-dashboard.scss` : ajout de `.status-reported`/`.status-scheduled`/
  `.status-collected` (nouvelles, sans toucher aux classes `.status-*` existantes déjà
  utilisées ailleurs — agences, comparaisons d'objectifs).

## Redesign visuel

Repris la palette "plate" déjà établie dans `signalement.scss` (fonds pastel + texte
saturé pour les puces de sévérité/statut, bordure gauche colorée) plutôt que l'ancien
style (icône ronde à fond plein, badges sans bordure gauche) — cohérence visuelle entre
les deux endroits de l'app qui affichent des incidents. Carte blanche à bordure fine,
bordure gauche de 4px colorée par sévérité, puce d'icône 38×38 à coin arrondi avec fond
teinté, effet de survol (légère élévation), état vide ("Aucune alerte récente" avec icône
`check_circle`) ajouté (le composant n'avait aucun rendu pour la liste vide auparavant).
Nettoyage au passage d'une règle `.alerts-list` dupliquée (5 paires `max-height`/
`overflow-y` empilées dans le fichier, restées d'un ancien copier-coller) — fusionnée en
une seule règle propre.

## Vérifié en direct

`npx tsc --noEmit` → `EXIT:0`. Le login mock utilisé pour la reproduction CDP n'a pas de
vraies données de signalements en base (`isLoadingIncidents` reste bloqué à `true`,
confirmé), donc vérification faite en injectant directement `comp.incidents` (5 entrées
couvrant les 4 sévérités et les 5 statuts réels — `Reported`/`Scheduled`/`Collected`/
`pending`/`resolved`, casse mixte comme les vraies données) via
`window.ng.getComponent()` + `comp.cd.detectChanges()`, puis capture d'écran : les 5
puces de sévérité ont chacune leur icône et leur couleur distinctes, les 5 badges de
statut ont chacun leur couleur et leur texte français corrects.

# Correctif : `dailyCollectionCollected`/`totalCollectionReported` remis (le "correctif" du Prompt 15 (b) était une régression)

Signalé par l'utilisateur via une vraie réponse HTTP collée en direct : `stats` ne
contenait que `totalCollectionsCollected`/`totalCollectionsReported` (pluriel), jamais
`dailyCollectionCollected`/`totalCollectionReported`. Voir EditRecap.md pour l'analyse
complète côté backend (le contrôleur renomme ces champs entre le service et la réponse
HTTP — le rename fait au Prompt 15 (b) ci-dessus avait vérifié uniquement le service, pas
la réponse réelle, recréant le même bug 0% par le chemin inverse).

## Décision utilisateur : corriger côté backend, pas re-renommer ici

Plutôt que de renommer une troisième fois l'interface frontend, l'utilisateur a demandé
d'ajouter les champs manquants côté backend. `MunicipalityStatistics.dailyCollectionCollected`
et `.totalCollectionReported` remis à leur nom d'origine (annulant le rename du Prompt 15
(b)) dans les 3 sites de lecture (`getCollectionRate()`, l'export PDF, le template) —
`municipality-dashboard.html` n'avait d'ailleurs jamais été changé et lisait déjà
`dailyCollectionCollected`, ce qui aurait dû être un signal d'alerte au Prompt 15.
`controllers/globalSate.js` (backend) étend sa réponse pour exposer ces 2 noms exacts en
plus des alias pluriels déjà existants, sans rien retirer.

## Vérifié
`npx tsc --noEmit -p tsconfig.json` → `EXIT:0`. Vérification bout-en-bout faite côté
backend (voir EditRecap.md) : script temporaire reproduisant la construction de réponse
du contrôleur contre la vraie base — `dailyCollectionCollected: 0` et
`totalCollectionReported: 3` bien présents, valeurs identiques à celles de la réponse
réelle collée par l'utilisateur.

# Modules Planning + Équipes : sidebar remplacé par des onglets horizontaux façon /dashboard/financial

Demande explicite de l'utilisateur : garder le fonctionnement identique, mais faire
ressembler le design à `/dashboard/financial`, qui n'a justement jamais eu de sidebar
(voir `finance-layout.ts` : "pas de sidebar, choix explicite"). Portée confirmée par
l'utilisateur (question posée avant modification) : remplacer le sidebar par des
onglets horizontaux, sur TOUTES les pages qui en dépendent, pas seulement le tableau de
bord Planning montré en capture.

## Découverte avant de coder : un seul sidebar partagé par 2 modules

`shared/app-sidebar/app-sidebar.ts` (`<app-sidebar>`) n'est pas propre au module
Planning : c'est le MÊME composant, avec les MÊMES 6 liens (3 "PLANNINGS" + 3
"ÉQUIPES") rendu par `planning-layout.html` ET `teams-layout.html` — retirer le sidebar
touchait donc forcément les deux layouts, jamais un seul. Vérifié aussi que les KPI
cards de `planning-dashboard` (`.stat-card`/`.stat-icon`) étaient déjà, avant toute
modification, du CSS identique à celui de `app-kpi-card` (financier) et
`agency-dashboard` — les 3 partagent la même origine documentée dans leurs commentaires
respectifs. Donc l'essentiel de la "ressemblance visuelle" demandée portait sur la
navigation (sidebar → onglets), pas sur les cartes KPI qui étaient déjà cohérentes.

## Fichiers créés

- `shared/planning-teams-tabs/planning-teams-tabs-nav.config.ts` — reprend
  `planningNav`/`teamsNav` de `app-sidebar.ts` à l'identique (mêmes routes, mêmes
  query params, même `exact`).
- `shared/planning-teams-tabs/planning-teams-tabs.{ts,html,scss}` — composant partagé
  remplaçant `<app-sidebar>` dans les deux layouts. Le SCSS reproduit
  `.tabs-navigation`/`.tab-btn`/`.tab-badge` de `finance-layout.scss` à l'identique
  (mêmes valeurs, mêmes variables CSS), même convention que "agency-dashboard.scss
  reproduit dans finance-layout.scss" déjà en place dans le repo.

## Fonctionnalités de l'ancien sidebar préservées (pas seulement les 6 liens)

- Le badge "en mission" sur l'item "Équipes" (`onMissionCount() > 0`) — repris via
  `.tab-badge` (mécanisme déjà présent dans finance-layout.scss pour ce genre de badge,
  jamais utilisé jusqu'ici), coloré en ambre pour garder la même sémantique de couleur
  que l'ancien `sb-status-row--amber`.
- Les 2 actions secondaires du bas du sidebar ("Nouvelle équipe" → `/teams/create`,
  "Aide" → `/help`) — ajoutées à la suite des 6 onglets principaux, séparées par un
  simple séparateur vertical, toujours dans la même rangée défilante.
- **Non repris** (décision assumée, pas un oubli) : le résumé passif "X actives / X en
  mission / X maintenance" en bas du sidebar — texte non cliquable, sans place
  raisonnable dans une barre d'onglets horizontale sur une ligne, et l'info équivalente
  existe déjà sous forme de cartes KPI sur `team-list`/`team-dashboard` eux-mêmes.

## Fichiers modifiés

| Fichier | Changement |
|---|---|
| `planning-layout.{ts,html,scss}` | `<app-sidebar>` → `<app-planning-teams-tabs>` ; layout flex-colonne simple au lieu du flex-ligne à sidebar fixe (`margin-left: 260px`, etc., supprimés) |
| `teams-layout.{ts,html,scss}` | Même changement, même composant partagé (pas de duplication) |

Aucune page de contenu (`planning-dashboard`, `planning-calendar`, `team-dashboard`,
`team-list`, `team-availability`) n'a été modifiée : chacune a déjà son propre
`<header class="page-header">` (dégradé bleu→vert, déjà la classe globale
`.page-header` de `styles.scss`, déjà utilisée par `/dashboard/financial`) — aucun
changement nécessaire là, conformément à "le fonctionnement ne doit pas changer".

`AppSidebarComponent` (`shared/app-sidebar/`) n'est plus utilisé nulle part dans le
code (vérifié par grep) — laissé en place tel quel plutôt que supprimé (pas demandé
explicitement), à nettoyer si l'utilisateur le souhaite.

## Vérifié en direct

`npx tsc --noEmit` → `EXIT:0`. Reproduction en direct (Chrome headless + CDP, login
mock rôle manager) sur les 5 pages concernées : les 8 items (6 nav + 2 actions)
s'affichent partout, l'onglet actif correspond bien à la route courante sur chacune des
5 pages, zéro exception console, ancien sidebar bien absent du DOM. Viewport mobile
(390px) : la barre déborde horizontalement (`scrollWidth: 1173 > clientWidth: 354`) et
défile bien via `overflow-x: auto` au lieu de casser la mise en page — confirmé aussi
visuellement par capture d'écran (barre de défilement visible sous les 2 premiers
onglets).

## Bug signalé par l'utilisateur après coup : "Tous les onglets ne sont pas fonctionnels" — Supervision/Équipes/Disponibilités s'affichaient vides

Cliquer sur ces 3 onglets naviguait bien vers la bonne route (confirmé), mais la page
s'affichait vide/cassée. Cause : `.tl-shell`/`.planning-shell` utilisaient
`min-height: 100%` au lieu du `height: 100vh; overflow: hidden` de l'ancien shell à
sidebar. Or plusieurs pages enfants dépendent d'une hauteur DÉFINIE en cascade depuis ce
shell :
- `team-dashboard.scss` : `:host{height:100%;overflow:hidden}` et
  `.td-root{height:100%;overflow:hidden}` — combo qui s'effondre à 0px si l'ancêtre n'a
  pas de hauteur définie (`min-height:100%` résout en `auto` face à un ancêtre de
  hauteur indéfinie, ce n'est pas équivalent à `height:100vh`).
- `team-availability.scss` : `:host{height:100%}` — même dépendance.
- `planning-calendar.scss` : `::ng-deep .fc{height:100% !important}` (intégration
  FullCalendar) — même dépendance, pas encore signalée par l'utilisateur au moment du
  correctif mais reproduite et corrigée par prévention (même cause exacte).

Corrigé en restaurant `height: 100vh; overflow: hidden` sur `.tl-shell`/
`.planning-shell` et `overflow-y: auto` sur `.tl-content`/`.planning-content` — exactement
le comportement de hauteur de l'ancien shell à sidebar, seule la disposition interne
(colonne + onglets horizontaux au lieu de ligne + sidebar fixe) change désormais.

Vérifié en direct : les 3 pages Équipes rendent maintenant avec une hauteur réelle
(746–846px, plus 0px) ; `planning-calendar` aussi (grille FullCalendar complète avec
cellules, en-têtes de semaine, sidebar de filtres — tout visible).

## Suivi : carte GPS de `team-dashboard` (Supervision) trop petite, scroll interne non désiré

Signalé via capture d'écran, une fois la page réparée par le correctif ci-dessus : la
carte GPS s'affichait comme une bande très courte, avec un mini-scroll interne pour voir
le reste de la section. Contrairement aux 3 pages du correctif précédent, `team-dashboard`
n'était pas cassé (hauteur 0) mais mal dimensionné — cause différente, diagnostiquée
séparément en injectant des données d'équipe synthétiques en direct (`svc['_teams'].set(...)`
+ `detectChanges()`, car le compte mock utilisé pour les tests n'a aucune vraie équipe et
l'état vide masque toute cette section) :

`team-dashboard.scss` avait sa propre architecture "shell figé" interne
(`:host{height:100%;overflow:hidden}`, `.td-root{height:100%;overflow:hidden}`,
`.td-body-wrap`/`.td-body`/`.td-left` tous en `flex:1;overflow:hidden`) — un budget de
hauteur fixe où le header + les 6 cartes KPI consommaient déjà l'essentiel de l'espace
disponible (mesuré : 746px de hauteur totale, seulement 335px restants pour `.td-left`),
alors que la carte + les 4 graphiques ont besoin d'environ 1030px pour s'afficher
entièrement. Le mini-scroll interne ne montrait donc que les ~150 premiers pixels de la
carte. `team-list.scss` n'a jamais eu ce problème car son `.tl-root` utilise déjà
`min-height:100%` (page en flux normal), pas ce combo `height:100%`+`overflow:hidden`.

Corrigé en alignant `team-dashboard` sur le même pattern que `team-list` : page en flux
normal (`:host{display:block}`, `.td-root{min-height:100%}`, plus de `overflow:hidden`/
`flex:1`/`min-height:0` sur `.td-body-wrap`/`.td-body`/`.td-left`) — la page défile
désormais normalement au lieu d'enfermer la carte+graphiques dans une mini-fenêtre. Le
panneau de droite (`.td-right`, flux Activité/Alertes/Maintenance) n'a rien nécessité de
plus : `align-items:stretch` (par défaut sur `.td-body`) l'étire automatiquement à la
même hauteur que `.td-left` une fois que celui-ci a une hauteur naturelle réelle, donc son
propre scroll interne (`.tdr-scroll`) continue de fonctionner correctement. Les
graphiques (`.cc-body`) avaient déjà une `height:180px` explicite, donc aucun risque pour
leur rendu Chart.js.

Vérifié en direct (même technique d'injection) : `.td-left` a maintenant
`clientHeight === scrollHeight === 1028px` (plus aucun contenu caché), la carte Leaflet
s'affiche à sa pleine hauteur (360px, zoom/légende visibles), capture d'écran confirmant
le rendu complet sans aucun scroll dédié à cette section.

# Graphique "Évolution des collectes (7 jours)" (Planning) câblé sur un vrai endpoint

L'utilisateur a demandé de vérifier si ce graphique était câblé sur un web service —
réponse : non, `evolutionChartData` était construit depuis des tableaux littéraux codés
en dur (`[18, 22, 15, 28, 24, 10, 8]`), et les boutons "Semaine"/"Mois" n'avaient aucun
`(click)`, purement décoratifs. Vérifié aussi qu'aucun endpoint backend existant
n'exposait cette donnée (voir EditRecap.md pour l'analyse complète et le nouvel endpoint
`GET /api/planning/v2/evolution` créé pour ce câblage).

## Frontend câblé sur le nouvel endpoint

- `models/planning.model.ts` : nouvelle interface `CollectionEvolutionDay` (`dayKey`,
  `label`, `planifiees`, `effectuees`), miroir exact de la réponse du nouvel endpoint.
- `services/planning.service.ts` : nouveau signal `_evolution`/`evolution` (même
  convention que `_zones`/`zones`) et méthode `loadEvolution(days = 7)` (même pattern que
  `loadZones()` — `agencyId` en query param si disponible, `catchError(() => of(null))`).
- `planning-dashboard.ts` :
  - `_buildEvolutionChart()` extrait du bloc jusqu'ici codé en dur dans `_initCharts()`,
    reconstruit maintenant `evolutionChartData` depuis `planningService.evolution()`.
  - Un `effect()` dédié dans le constructeur reconstruit le graphique à chaque fois que
    `planningService.evolution()` change (premier chargement, refresh périodique de 30s,
    ou changement de période) — sans ça, cliquer sur "Mois" aurait déclenché le bon appel
    HTTP mais le graphique ne se serait redessiné qu'au prochain tick du minuteur
    existant (jusqu'à 30s plus tard), pas immédiatement.
  - Nouveau signal `evolutionPeriod` (`'week' | 'month'`) + méthode
    `setEvolutionPeriod()` appelant `loadEvolution(7 ou 30)`.
- `planning-dashboard.html` : les boutons "Semaine"/"Mois" ont maintenant un `(click)`
  et une classe `active` réactive ; le titre du graphique reflète la période
  (`"(7 jours)"`/`"(30 jours)"`) au lieu d'un texte figé.

## Vérifié en direct

`npx tsc --noEmit` → `EXIT:0`. Chrome headless + CDP, requêtes réseau interceptées :
chargement initial → `GET /planning/v2/evolution?days=7` bien émise ; clic sur "Mois" →
nouvelle requête `?days=30` émise immédiatement, le titre passe à "(30 jours)" et le
bon bouton devient actif — confirme que le graphique n'est plus statique et que le
toggle Semaine/Mois, jusqu'ici décoratif, est maintenant réellement fonctionnel.

Non vérifiable dans cette session : le rendu avec de vraies données non nulles — les 53
`Collecte` réels en base sont tous datés mars/avril 2026 (voir EditRecap.md), donc toute
fenêtre "N derniers jours" par rapport à la date système actuelle affichera une ligne à
zéro pour l'instant, ce qui est correct/attendu et pas un signe de bug.

# Nouvel onglet "Retraits" dans le Dashboard Administrateur (super_admin) — validation des demandes de retrait d'agence, 100% mock

Demande initiale rédigée en termes génériques "Merchant/Shop" — terminologie confirmée
absente de tout le projet (grep exhaustif, zéro résultat hors une icône Material
`add_shopping_cart` sans rapport). Avant de coder quoi que ce soit, recherche complète
de l'existant (agent dédié) pour éviter de dupliquer une fonctionnalité déjà présente :

- **`financial-dashboard/features/withdrawals`** ("Retraits" F4) : déjà câblé en HTTP
  réel, liste + création seulement, `Retrait` n'a AUCUN champ statut — pas la même chose.
- **`agency-finance`** (page séparée) : possède déjà `WithdrawalRecord`/`WithdrawalStatus`
  (`PENDING/APPROVED/REJECTED/PROCESSED`, `models/finance.model.ts`) — déclaré mais
  **jamais utilisé nulle part**. Quelqu'un avait déjà anticipé cette fonctionnalité.
- Backend réel (`Withdraw.js`) : statuts `INITIATED/COMPLETED/COMPLETED_WITH_ERROR/
  FAILED`, retrait exécuté immédiatement (débit + appel Moov Money synchrones) — aucune
  notion de "en attente d'approbation" aujourd'hui. Un vrai flux d'approbation est un
  changement de logique métier backend, pas juste un écran manquant.

3 questions posées à l'utilisateur avant de coder (mapping Merchant/Shop → domaine
réel, emplacement de la fonctionnalité, modèle de statut à réutiliser). Réponses :
mapper sur les vraies entités (Agence = "Shop", gestionnaire d'agence = "Merchant"),
un nouvel onglet dans le Dashboard Administrateur existant (confirmé être le dashboard
`super_admin` — `adminGuard` vérifie `UserRole.SUPER_ADMIN`, monté sur `/dashboard/admin`
= `admin-dashboard.ts`), réutiliser `WithdrawalStatus` existant + ajouter `PAID`.

## Fichiers créés

- `src/app/models/withdrawal-request.model.ts` — `AdminWithdrawalRequest` (ré-exporte
  `WithdrawalStatus`/`PaymentMethod` de `finance.model.ts` plutôt que d'en redéfinir),
  `WithdrawalRequestFilter`, `PaginatedWithdrawalRequests`, payloads approve/reject.
- `src/app/services/withdrawal-requests-mock.service.ts` — service mock
  `providedIn:'root'`, méthodes `getWithdrawalRequests/getWithdrawalById/
  approveWithdrawal/rejectWithdrawal/searchWithdrawals/filterWithdrawals/
  paginateWithdrawals`, toutes en `Observable` avec `delay()` simulé (même forme
  qu'un vrai `HttpClient`, pour que la bascule future vers un `WithdrawalRequestsHttpService`
  avec la même API publique ne change aucun composant). 32 demandes mock, 15 agences
  réalistes réparties sur 6 pays d'Afrique de l'Ouest (mêmes villes que les autres jeux
  de données mock déjà utilisés cette session — coverage-map, municipality-mock), les 5
  statuts représentés, 3 opérateurs mobile money, dates étalées sur ~2 mois.

## Fichiers modifiés

- `src/app/models/finance.model.ts` — ajout de `PAID` à `WithdrawalStatus` (additif,
  cet enum n'était utilisé nulle part avant cette fonctionnalité — vérifié).
- `admin-dashboard.ts` — nouvel onglet `{ id:'withdrawals', label:'Retraits' }` dans le
  tableau `tabs` existant (le bouton d'onglet apparaît automatiquement, boucle déjà en
  place), injection du mock service au constructeur (même convention que
  `CountriesOrgMockService`, déjà injecté pareillement), état + méthodes pour
  chargement/filtres/pagination/détail/approbation/rejet, câblage dans le `switch` de
  `loadTabData()` existant, badge d'onglet = nombre de demandes en attente.
- `admin-dashboard.html` — contenu de l'onglet inséré entre "Incidents" et
  "Communications" (ordre cohérent avec le tableau `tabs`), drawer de détail et 2
  dialogs (approbation, rejet) ajoutés en fin de fichier, à la suite du drawer incident
  existant.
- `admin-dashboard.scss` — 4 nouvelles couleurs de statut (`.status-approved/-rejected/
  -processed/-paid`, absentes avant), variante verte de `.confirm-dialog-header`/
  `.confirm-icon` et bouton `.btn-approve-confirm` (approbation), variante rouge de
  `.resolve-dialog-icon` et bouton `.btn-reject-confirm` (rejet), variante `.action-btn.success`
  (bouton icône vert dans le tableau). Aucune règle existante modifiée, uniquement des
  ajouts.

## Réutilisation du design system existant (aucun nouveau pattern introduit)

Chaque élément visuel reprend un pattern déjà présent ailleurs dans `admin-dashboard.html`,
jamais un composant importé d'un autre module (financial-dashboard a sa propre
`app-data-table`/`ConfirmationService` PrimeNG — non réutilisés ici pour rester
cohérent avec le fait qu'admin-dashboard ne les utilise nulle part) :

| Besoin | Pattern réutilisé (déjà présent dans admin-dashboard) |
|---|---|
| Tableau + colonnes | `.admin-table`/`.admin-table-wrapper` (onglet Agences) |
| Recherche + filtres | `.search`/`.filter-select` (onglet Agences/Incidents) |
| Pagination | `.pagination-section`/`.pagination-btn` (onglet Agences) |
| Badges de statut | `.status-badge` + classes `status-*` (partagé par tous les onglets) |
| Vue détail | `.drawer-overlay`/`.drawer-content-wide`/`.drawer-section`/`.drawer-info-grid`/`.info-item` (drawer détail incident) |
| Confirmation simple | `.confirm-dialog-overlay`/`.confirm-dialog-box` (dialog suppression utilisateur) |
| Confirmation + motif obligatoire | `.resolve-dialog` (dialog résolution incident, déjà un textarea requis) |
| Notifications succès/erreur | `NotificationService` (déjà injecté dans ce composant) |
| Spinner de chargement | `app-loading-spinner` (déjà utilisé pour Agences/Utilisateurs) |

## Bug rencontré et corrigé pendant l'implémentation : bloc `@if` mal fermé

Le drawer de détail incident (préexistant, jamais touché avant) se termine par un
`@if (visibleIncidentDrawer && selectedIncident) { ... }` dont le `}` de fermeture se
trouvait être la toute dernière ligne du fichier. En insérant mon nouveau contenu
juste avant cette accolade (au lieu de juste après), tout mon drawer + mes 2 dialogs se
sont retrouvés IMBRIQUÉS à l'intérieur de la condition de l'incident — invisibles tant
que `visibleIncidentDrawer` n'était pas vrai. Détecté via `window.ng.getComponent()` en
direct (`visibleWithdrawalDetailDrawer` valait bien `true` sur le composant, mais
`.drawer-content` restait absent du DOM — signe certain d'un problème de structure de
template, pas de logique). Corrigé en déplaçant l'accolade fermante au bon endroit
(juste après le drawer incident) et en supprimant le doublon resté en fin de fichier.

## Vérifié en direct (Chrome headless + CDP, connexion mock rôle `super_admin`)

- Liste : 32 demandes, pagination "1–10 sur 32", les 5 statuts représentés dans
  l'échantillon affiché.
- Recherche "Bobo" → 3 résultats (agence "ZéroDéchet Bobo-Dioulasso"). Filtre statut
  "Rejeté" → 6 résultats, tous portant le bon badge.
- Détail : drawer affiche les 18 valeurs attendues (agence, gestionnaire, montant,
  frais, solde, historique des retraits récents, audit).
- Approbation : dialog de confirmation → statut passe à "Approuvé", toast "Retrait
  approuvé" affiché (vrai `NotificationService`), badge d'onglet décrémenté de 8 à 7,
  liste rafraîchie automatiquement.
- Rejet : bouton de confirmation désactivé tant qu'aucun motif n'est saisi
  (`[disabled]="... || !withdrawalRejectionReason.trim()"`), devient actif après saisie,
  statut passe à "Rejeté", toast "Retrait rejeté" affiché, badge décrémenté à 6.
- `npx tsc --noEmit` → `EXIT:0`. Zéro exception console sur l'ensemble du parcours.

## Retouche après retour utilisateur : drawer de détail "trop désordonné"

La grille 2 colonnes `.drawer-info-grid`/`.info-item` (réutilisée telle quelle du
drawer incident) se désalignait visuellement dès qu'une valeur passait sur 2 lignes
(téléphone, email) — la ligne de grille adjacente restait collée en haut, créant un
effet de décalage répété sur toute la liste. Corrigé sans toucher aux classes
partagées (`.drawer-info-grid`/`.info-item` restent inchangées, toujours utilisées par
le drawer incident) :

- Nouvelles classes dédiées `.wd-detail-list`/`.wd-detail-row`/`.wd-detail-label`/
  `.wd-detail-value` — liste à UNE colonne (label à gauche, valeur alignée à droite),
  chaque ligne indépendante des autres (pas de grille à row-height partagée), donc plus
  aucun désalignement possible quel que soit le nombre de lignes d'une valeur.
- `.wd-amount-hero` — nouvelle carte verte mettant en avant le "Montant net à verser"
  (l'information la plus consultée par un administrateur validant un retrait), avec le
  détail demandé/frais en petit à droite — évite de le noyer au même niveau visuel que
  la devise ou le numéro de portefeuille.
- `.wd-recent-table`/`.wd-recent-table-wrap` — table historique des retraits récents
  avec sa propre présentation (bordure arrondie, en-têtes discrets), au lieu de
  réutiliser `.admin-table` (pensée pour une table pleine largeur avec beaucoup de
  colonnes, trop lourde visuellement pour 4 colonnes dans un panneau latéral).

Vérifié en direct sur le même enregistrement que la capture d'écran signalée
(WD-2026-08, Zinder Recyclage) : montant net affiché en évidence (305 350 XOF), 15
lignes label/valeur toutes alignées proprement, table historique avec ses 2 lignes.

## Suivi : même correctif appliqué au drawer "Détails de l'Incident" (préexistant)

L'utilisateur a signalé le même défaut sur un autre drawer, jamais touché avant cette
session : la section "Parties impliquées" du drawer incident utilisait encore
`.drawer-info-grid`/`.info-item`, avec le même problème (grille 2 colonnes plaçant
"Agence"/"Client" côte à côte avec de grands espaces vides entre label et valeur pour
des champs courts).

Plutôt que de dupliquer le nouveau pattern sous un nom spécifique aux retraits, les
classes ont été renommées en générique (`wd-detail-list/-row/-label/-value` →
`detail-list/-row/-label/-value`, un seul remplacement global dans le `.html` et le
`.scss`, aucune collision trouvée au préalable) puis réutilisées telles quelles pour
la section "Parties impliquées" du drawer incident. `.drawer-info-grid`/`.info-item`
restent inchangées (toujours définies, plus utilisées par aucun des deux drawers
maintenant, mais laissées en place au cas où un autre écran s'en servirait encore).

Note écartée volontairement : le grand espace vide entre "Parties impliquées" et
"Commentaire de résolution" visible sur la capture vient de `.drawer-body{flex:1}`
dans un `.drawer-content{height:100%}` — un panneau plein écran qui s'étire toujours à
la même hauteur quel que soit son contenu, motif partagé par TOUS les drawers de
l'app (édition utilisateur, ajout agent, incident, retrait). Non corrigé : changer ce
comportement affecterait tous les drawers existants, bien au-delà de ce qui a été
demandé ici.

Vérifié en direct : incident de test injecté (`openIncidentDrawer()` appelé
directement, le compte mock utilisé pour les tests n'ayant aucun vrai incident en
base) — les 3 lignes Agence/Client/Collecteur s'affichent proprement alignées, plus
aucune trace de `.drawer-info-grid` dans le DOM de ce drawer.

## Suivi : textarea "Commentaire de résolution" sans aucun style (rendu navigateur par défaut)

Signalé via capture d'écran (même drawer incident, section juste en dessous). Cause
trouvée : `.form-input` — la classe utilisée sur ce `<textarea>` — n'a JAMAIS de règle
CSS propre ; elle n'hérite d'un style (bordure, `border-radius`, focus) que via le
sélecteur `.form-group input/select/textarea` — qui exige que le champ soit
DANS un `<div class="form-group">`. Ce `<textarea>` précis n'avait pas ce wrapper
(contrairement aux textareas des dialogs "Résoudre l'incident" et "Rejeter le
retrait", qui elles l'ont) — d'où un rendu 100% par défaut du navigateur.

Corrigé en créant une classe autonome `.resolution-textarea` (bordure arrondie 10px,
fond gris clair, anneau de focus coloré façon `--primary-color`) qui ne dépend
d'AUCUN wrapper parent, et en l'appliquant aux 3 textareas de ce type dans le fichier
(drawer incident, dialog résolution incident, dialog rejet retrait) pour une
apparence cohérente partout, pas seulement à l'endroit signalé.

Vérifié en direct : `getComputedStyle()` sur le textarea confirme bordure/rayon/fond
appliqués (auparavant absents), capture d'écran confirmant le rendu visuel.

## Bascule future vers un vrai backend

Remplacer `WithdrawalRequestsMockService` par un `WithdrawalRequestsHttpService`
implémentant exactement la même classe (mêmes noms de méthodes, mêmes signatures
`Observable<...>`) est le seul changement nécessaire — aucun composant, aucun template
n'aurait à changer, car `admin-dashboard.ts` ne dépend que du type de la classe injectée,
jamais de son implémentation interne. Le futur backend réel devra en plus introduire un
statut `PENDING` par défaut (`Withdraw.js` exécute aujourd'hui le retrait immédiatement,
sans étape d'approbation) et un endpoint de listing multi-agences — changements côté
backend, hors périmètre de cette tâche (mock uniquement, comme demandé).

---

# Nettoyage Plannings / Signalements / Assignation — Phase 2 (renommage `resolutionTeamId`)

Voir `EditRecap.md` (backend) pour le détail complet de la Phase 2 (executedByTeamId,
helper "signalements ouverts", Planning.schemaVersion). Ceci couvre uniquement le
renommage frontend rendu nécessaire par §2.2 : `Collecte.assignedTeamId` → `resolutionTeamId`
(clarifie que ce champ concerne la RÉSOLUTION d'un signalement, pas l'équipe d'EXÉCUTION
de la collecte — une confusion à l'origine de plusieurs bugs déjà corrigés cette session).

## Fichiers mis à jour
- `signalement.ts`/`signalement.html` (composant partagé) : interface `Incident.assignedTeamId` → `resolutionTeamId`, `openTeamPicker()`, affichage de la colonne Assignee, libellé du bouton Assigner/Réaffecter, titre du modal team-picker.
- `municipality-dashboard.ts` : interface `Incident.assignedTeamId` → `resolutionTeamId`, `onAssignReport()`.
- `agency-dashboard.ts` : interface `Incident.assignedTeamId` → `resolutionTeamId`.

Migration backend déjà exécutée contre la vraie base avant ce changement (voir EditRecap.md) — le seul document réel affecté a été renommé avant que ce renommage frontend ne soit déployé, aucune fenêtre où les deux bouts (API/UI) auraient été désynchronisés.

## Vérifications effectuées
- `npx tsc --noEmit -p tsconfig.json` → `EXIT:0`.
- Grep exhaustif sur tout `src/app` : aucune référence de code résiduelle à `assignedTeamId` (seulement des commentaires explicatifs mentionnant l'ancien nom pour le contexte historique).
