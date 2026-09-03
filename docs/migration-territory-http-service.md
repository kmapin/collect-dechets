# Migration vers TerritoryHttpService + vrais clients zone/secteur — Rapport

Suite de [geographie-unifiee.md](../../collecte-dechets-back/docs/geographie-unifiee.md) (backend) : ce chantier termine la migration côté frontend et fait générer de vraies `Collecte` aux plannings `zone`/`secteur`.

## 0. Deux bugs réels trouvés et corrigés pendant la migration (remontés en usage réel)

1. **Id de pays/ville fictif codé en dur** — `CountriesOrgMockService.getCitiesByCountry('1')`/`getArrondissementsByCity('1')` étaient appelés avec `'1'`, l'id du **mock** (`MOCK_COUNTRIES[0].id`/ville "Ouagadougou" dans le mock). Une fois branché sur le vrai backend, `'1'` ne correspond à aucun `_id` Mongo réel — la requête filtrée renvoyait 0 résultat (ou une erreur de cast ObjectId), donc un sélecteur "Ville" vide ("Impossible de charger les villes"). Corrigé : ajout de `TerritoryHttpService.getAllCities()` (sans filtre, comme `ZoneSelectorComponent` le fait déjà) pour la liste de villes ; la ville "Ouagadougou" par défaut (filtres employés d'admin-dashboard.ts/agency-dashboard.ts) est désormais **recherchée par nom** dans les vraies villes chargées, jamais un id fabriqué.
2. **`_id` vs `id`** — vérifié directement sur le modèle Mongoose (`new City({...}).toJSON()`) : le backend renvoie `_id`, **jamais** de champ `id` (pas de virtuel Mongoose configuré). Or tous les appelants migrés lisent `.id` (contrat hérité de `CountriesOrgMockService`, dont les objets mock avaient un vrai champ `id`). Sans correctif, `.id` valait toujours `undefined` et chaque niveau de la cascade envoyait un id `"undefined"` au niveau suivant — silencieusement vide à CHAQUE étage, pas seulement les villes. Corrigé dans `TerritoryHttpService` : chaque méthode renomme désormais `_id` → `id` sur les éléments renvoyés (`normalizeId()`), pour rester compatible avec les interfaces `Country`/`City`/`Arrondissement`/`Sector`/`Quartier` sans toucher aux dizaines de call sites déjà écrits contre `.id`.

Un test dédié (`territory-http.service.spec.ts`) verrouille ce 2ᵉ point : un mock HTTP renvoyant `{_id: 'mongo-id-1', ...}` doit ressortir avec `.id === 'mongo-id-1'`.

## 1. Composants migrés

| Fichier | Ancien service/mock | Nouveau service | Endpoints utilisés |
|---|---|---|---|
| `src/app/pages/auth/register/register.ts` | `CountriesOrgMockService` | `TerritoryHttpService` | `GET /territories/{cities,arrondissements,sectors,neighborhoods}` |
| `src/app/pages/dashboards/admin-dashboard/admin-dashboard.ts` | `CountriesOrgMockService` (filtres employés + drawer "Ajouter un agent") | `TerritoryHttpService` | idem |
| `src/app/pages/dashboards/agency-dashboard/agency-dashboard.ts` | `CountriesOrgMockService` (filtres employés uniquement — le `FormGroup` réactif d'ajout d'employé reste sur `OUAGA_DATA`, hors périmètre) | `TerritoryHttpService` | idem |
| `src/app/pages/agency-details/agency-details.ts` | `CountriesOrgMockService` (cascade + pré-remplissage édition) | `TerritoryHttpService` (cascade) — `CountriesOrgMockService` conservé **uniquement** pour `getQuartierInfos()` (composite, sans équivalent HTTP, et confirmé inutilisé dans le template actuel) | idem |
| `src/app/pages/profile/profile.ts` | `CountriesOrgMockService` (cascade + pré-remplissage profil) | `TerritoryHttpService` | idem |
| `src/app/pages/planning/zone-selector/zone-selector.ts` | Appels HTTP directs (déjà réel, pas de mock) + chiffres fictifs | Inchangé pour la hiérarchie, **nouveau** : `GET /planning/zone-client-count` pour le compte réel | `GET /territories/*` + `GET /planning/zone-client-count` |

Chaque cascade convertie (synchrone → `Observable`) suit le même principe : les niveaux enfants sont réinitialisés **avant** de lancer la requête (jamais après), et les auto-cascades de pré-remplissage (`agency-details.ts`, `profile.ts` — un parent déjà rempli redéclenche automatiquement son enfant) n'avancent au niveau suivant qu'une fois la requête du niveau courant résolue (dans le `next` du `subscribe`), au lieu de supposer une réponse synchrone.

`admin-dashboard.ts`/`agency-dashboard.ts` — `loadAllNeighborhoodsForCity()` (boucles `forEach`+`push` synchrones imbriquées sur 2 niveaux) est devenue un enchaînement `switchMap`+`forkJoin` (arrondissements → secteurs → quartiers, aplati en un seul tableau), avec un helper privé `_aggregateNeighborhoodsForSectors()` partagé pour ne pas dupliquer cette agrégation.

## 2. Données fictives supprimées

- **`zone-selector.ts`** : `households`/`active` codés en dur par nœud (`40`/`15` par quartier ; `120`/`45` en repli par secteur, même sans quartier chargé). Retirés de `ZoneMeta`/`ZoneSelection`/`_buildTreeFromApi()`/tooltips de la carte.
- **`zone-selector.ts`** : bandeau de stats globales `globalHouseholds()`/`globalActive()`/`globalCoverage()` — entièrement dérivées des chiffres ci-dessus, sans aucune contrepartie réelle à ce niveau d'agrégation (aucun modèle backend ne stocke de comptage de ménages). Retirées plutôt que remplacées par une fausse valeur ; `totalSecteurs()` (un vrai compte de nœuds) est conservé.
- **`zone-selector.ts`** : le filtre "Actifs uniquement" (`activeOnly`/`toggleActiveFilter()`) reposait entièrement sur le champ `active` fictif — retiré (aurait sinon masqué silencieusement tous les résultats une fois `active` supprimé).
- **`planning-create.ts`** : `estimatedHouseholds()` renvoyait `50` en dur pour `zone`/`secteur`, indépendamment de toute sélection réelle — remplacé par le vrai compte reçu de `ZoneSelectorComponent`.

Aucune de ces valeurs n'a été remplacée par une autre constante : quand le vrai nombre n'est pas disponible (chargement, échec réseau), l'UI affiche explicitement **"Non disponible"**.

## 3. Résolution des vrais clients pour zone/secteur

Avant ce chantier, `resolvePlanningClients()` (`services/planning.js`) renvoyait toujours `[]` pour `zone`/`secteur` — aucune `Collecte` n'était jamais générée au démarrage d'un tel planning. Désormais :

```
Planning zone/secteur
        ↓
resolveGeographyClientIds(planning)   ← nouveau helper partagé, extrait de
        ↓                                resolvePlanningRecipients() (notifications)
User.find({ agencyId, role:'client', status:'active', ...resolveGeographyUserFilter(planning) })
        ↓
checkClientEligibility (contrat actif OU abonnement actif non expiré) — même filtre
        ↓                                que individuel/groupe, déjà appliqué par startPlanning()
Collecte.insertMany(...)               — AUCUN changement à startPlanning() lui-même
```

`resolveGeographyUserFilter()` (résolution géographique par correspondance texte insensible à la casse sur `User.address.*`, priorité quartier > secteur > arrondissement > ville) est réutilisée **telle quelle** — c'est la même fonction qui alimentait déjà les notifications, jamais une deuxième logique parallèle. Aucun client n'est fabriqué : seuls de vrais documents `User` (rôle `client`, statut `active`, agence correspondante, adresse correspondant à la géographie) génèrent une `Collecte`.

Un nouvel endpoint `GET /api/planning/zone-client-count` (query : `agencyId` + un ou plusieurs de `villeId`/`arrondissementId`/`secteurId`/`quartierId`) réutilise le même helper + `checkClientEligibility`, pour que le frontend affiche — **avant même la création du planning** — le nombre réel de clients qui recevraient une `Collecte`, jamais une estimation.

## 4. Backend — fonctions modifiées

- **`resolvePlanningClients()`** : nouvelle branche `zone`/`secteur` (`resolveGeographyClientIds()`), avant : `[]` uniquement.
- **`resolvePlanningRecipients()`** : sa branche zone/secteur inline est remplacée par un appel au même `resolveGeographyClientIds()` (dé-duplication, comportement identique).
- **`ELIGIBILITY_FILTERED_TYPES`** : `['individuel', 'groupe']` → `['individuel', 'groupe', 'zone', 'secteur']` — un client non éligible n'est désormais plus notifié pour un planning zone/secteur non plus (cohérent avec le fait qu'il ne recevra de toute façon aucune `Collecte` réelle). Ce changement était déjà anticipé par un commentaire explicite dans le code avant ce chantier.
- **Nouveau** : `getZoneClientCount()` (service) + `getZoneClientCountV2` (controller) + `GET /planning/zone-client-count` (route).
- **`startPlanning()`** : **non modifié** — son pipeline (résolution → éligibilité → `Collecte.insertMany`) était déjà générique, la nouvelle liste zone/secteur s'y insère sans changement.

## 5. Mocks restants

| Référence | Où | Pourquoi elle reste |
|---|---|---|
| `CountriesOrgMockService` | `agency-details.ts` (`getQuartierInfos()`), `agencies.ts`, `home.ts` | `agency-details.ts` : méthode composite sans équivalent HTTP (et confirmé non appelée par le template actuel — code mort, non supprimé sans qu'on me le demande). `agencies.ts`/`home.ts` : dépendent de `getAllArrondissementsByVille`/`getAllSectorsByVille`/`getAllNeighborhoodsByVille` (recherche par NOM de ville), absentes de `TerritoryHttpService` par choix (la consigne demande de privilégier les ID) — migration bloquée sans ajouter ces méthodes par nom ou refactorer ces 2 composants pour raisonner en ID, ce qui toucherait aussi `agencyService.searchAgencie()` (recherche d'agences, elle-même en texte libre) : hors périmètre de cette migration. |
| `OUAGA_DATA` / `data/mock-data.ts` | `register.ts` (déclaré, code mort confirmé), `agency-dashboard.ts` (`employeeForm` réactif + `userData`), `agency-details.ts`, `profile.ts` (déclarés), `municipality-dashboard.ts` | Ces usages ne passent jamais par `CountriesOrgMockService` — ce sont des formulaires indépendants qui lisent `OUAGA_DATA` directement. Hors périmètre de "migrer vers TerritoryHttpService" (qui vise `CountriesOrgMockService`), et un chantier de nettoyage à part entière. |
| `CountriesOrgMockService` (classe) / `countries-org.mock.ts` (données) | `services/countries-org-mock.service.ts` | A encore de vrais appelants (ci-dessus) — non supprimée. |

Aucun test frontend n'utilise `CountriesOrgMockService` ni les mocks géographiques (confirmé par recherche) — rien à adapter de ce côté.

## 6. Tests

**Backend** — `tests/planningGeographyClients.test.js` (nouveau, 7 tests, tous verts) :
- `startPlanning` sur un planning `zone` génère de vraies `Collecte` pour les clients réels du quartier (et seulement ceux-là — un client d'un autre quartier n'est jamais inclus).
- Un client sans contrat actif ni abonnement actif est exclu de la génération de `Collecte`.
- Aucune `Collecte` générée (sans erreur) quand la géographie ne contient aucun client.
- `resolvePlanningRecipients()` applique désormais le même filtre d'éligibilité pour `zone` — un client non éligible n'est plus notifié.
- `getZoneClientCount()` renvoie le compte réel de clients éligibles, jamais une estimation ; renvoie `0` (jamais une erreur) pour une géographie sans client ou sans paramètre.

**2 tests préexistants mis à jour** (assertaient le comportement D'AVANT ce chantier, devenu obsolète par construction — pas des régressions) :
- `tests/getClientPlannings.test.js` — "Planning en_cours de type zone" attendait `plannings.length === 1` ("zone/secteur ne génère jamais de Collecte") ; corrigé à `0`, même règle que le cas `individuel` juste au-dessus (dès qu'une vraie `Collecte` existe pour ce client, ce pull générique devient redondant).
- `tests/resolvePlanningRecipients.test.js` — "Zone : un client non éligible reste INCLUS" (décision Volet B, explicitement documentée comme assumée avant ce chantier) ; corrigé pour attendre une liste vide, conformément au nouveau `ELIGIBILITY_FILTERED_TYPES`.

**Suite complète** : `npm test` → 381 tests, 0 échec (379 précédents + 2 corrigés, en comptant les 7 nouveaux de `planningGeographyClients.test.js`).

**Frontend** : `ng build --configuration=development` → succès, sans erreur TypeScript, pour l'ensemble des 7 fichiers migrés + les 2 fichiers backend-adjacents (`territory-http.service.ts`, `planning.model.ts`).

**Erreurs préexistantes, non liées à ce chantier** (déjà signalées dans le rapport du chantier précédent) : la suite Karma du projet ne compile pas à cause de 2 erreurs TypeScript dans `facture.mapper.spec.ts` et `municipality-dashboard.spec.ts`, sans rapport avec la géographie — non corrigées ici.

## 7. Risques et points restant à traiter

- **Précision du matching géographique** : `resolveGeographyUserFilter()` matche par égalité de texte insensible à la casse sur `User.address.*` (pas de FK) — un client dont l'adresse est mal saisie (faute de frappe, variante d'accent) ne sera pas trouvé. C'est la même limite déjà acceptée pour les notifications avant ce chantier, pas une régression — mais elle s'applique désormais aussi à la génération de `Collecte`, avec un impact plus concret (un client réel pourrait ne jamais recevoir de collecte si son adresse est mal orthographiée). Amélioration possible (hors périmètre) : ajouter un vrai `User.address.quartierId` (FK), déjà documentée comme option "robuste" dans `CONCEPTION_UNIFICATION_PLANNING_SIGNALEMENT.md`.
- **`agencies.ts`/`home.ts`** restent sur le mock — si ces 2 pages doivent un jour basculer, il faudra soit ajouter des méthodes par nom à `TerritoryHttpService`/au backend (à éviter, contraire à "privilégier les ID"), soit les refactorer pour sélectionner par ID — un chantier à part.
- **Statistiques agrégées de zone-selector** (ménages/actifs/couverture globale) : aucun endpoint backend n'existe pour un vrai agrégat à ce niveau — signalé plutôt que fabriqué. Si ce besoin revient, il faudra un endpoint dédié (comptage par lot de géographies, pas un par un).
- Pays toujours codé en dur (`"1"` = Burkina Faso) dans les 5 composants migrés — pré-existant, non modifié (aucun composant ne permettait déjà de le changer).
