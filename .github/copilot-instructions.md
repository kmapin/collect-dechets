# Instructions pour les agents

## Apercu du projet

- Application Angular 20 autonome avec TypeScript strict, SCSS et Angular Material/PrimeNG.
- Application principale situee dans `src/app/`, avec les pages sous `src/app/pages/`.
- L'application utilise le bootstrap standalone via `src/main.ts`; conserver ce modele.
- La locale applicative est `fr-FR`.
- Les routes principales sont centralisees dans `src/app/app.routes.ts`; les modules fonctionnels peuvent exposer leurs routes dans un fichier `*.routes.ts`.

## Commandes

- Installer les dependances: `npm install`
- Demarrer l'application: `npm start`
- Construire l'application: `npm run build`
- Executer les tests: `npx ng test --watch=false --browsers=ChromeHeadless`
- Executer uniquement les tests concernes apres une modification: `npx ng test --watch=false --browsers=ChromeHeadless --include=<test-file>`

Ne modifiez pas `package.json` seulement pour remplacer les scripts existants. Utilisez `npm run build` comme verification minimale pour toute modification TypeScript ou template.

## Architecture et emplacement du code

- Placez les composants de pages dans `src/app/pages/<fonction>/`.
- Placez les composants reutilisables dans `src/app/components/` ou `src/app/shared/`.
- Placez les services applicatifs dans `src/app/services/`.
- Placez les gardes dans `src/app/core/guards/`.
- Placez les modeles partages dans `src/app/models/`.
- Placez les donnees mockees ou statiques dans `src/app/data/`.
- Conservez les fichiers d'un composant ensemble: classe TypeScript, template HTML et styles SCSS du meme repertoire.
- Pour un nouveau composant Angular, suivez les composants standalone existants: `standalone: true`, metadata `imports`, `templateUrl` et `styleUrl`.
- Preferez les imports explicites aux exports de barrel lorsqu'ils rendraient les dependances moins claires.

## Routage

- Utilisez `loadComponent` pour une page autonome et `loadChildren` pour un sous-module route.
- Conservez les fichiers `*.routes.ts` proches de la fonctionnalite qu'ils definissent.
- Placez les gardes dans les configurations de route lorsque l'acces depend du role ou de l'authentification.
- Respectez les chemins existants et ajoutez des redirections explicites uniquement lorsque cela maintient la compatibilite des anciens liens.

## Services HTTP et donnees

- Les URL de base utilisent `src/environments/environment.ts` et `environment.prod.ts`.
- Utilisez `HttpClient` injecte dans les services Angular et exposez les resultats avec `Observable`.
- N'ajoutez pas un intercepteur ou une authentification manuellement dans un service lorsque `authInterceptorInterceptor` est deja fourni globalement.
- Normalisez les identifiants provenant du backend: plusieurs services convertissent `_id` en `id` pour les types applicatifs.
- Ne supposez pas qu'une fonctionnalite utilise l'API. Avant toute modification, verifiez le service ou le README: certaines zones du projet sont encore simulees ou locales.
- Ne remplacez pas un comportement local simule par un appel API non demande sans confirmer le contrat backend.

## TypeScript et Angular

- Respectez les options strictes de `tsconfig.json`: pas de `any` inutile, pas d'acces a des proprietes dynamiques non typées, pas de chemin implicite de retour.
- Utilisez `inject()` pour les nouvelles injections lorsqu'il correspond au style du fichier.
- Conservez les APIs publiques, les signaux et les observables coherents avec les types existants du domaine.
- Utilisez les formulaires reactifs pour les formulaires complexes avec validation, types de controles explicites et messages d'erreur.
- Conservez les templates strictement compatibles avec Angular (`strictTemplates`).
- Utilisez les APIs Angular modernes sans transformer toute l'application en meme temps: ne faites pas de migration globale hors de la demande.

## Templates, styles et UX

- Les labels visibles, textes d'aide et messages d'erreur doivent etre en français.
- Reutilisez les composants, tokens visuels, PrimeNG, Angular Material et classes SCSS deja presents avant d'en creer de nouveaux.
- Conservez les styles proches du composant concerne dans son fichier `.scss`.
- Utilisez `SCSS` en respectant les budgets Angular deja configurés dans `angular.json`.
- N'aggravez pas les composants dont les styles approchent deja les budgets du build.
- Assurez l'accessibilite des controles: labels associes, textes alternatifs pertinents, navigation clavier et attributs ARIA lorsqu'un composant natif ne suffit pas.
- Pour les tableaux, listes et formulaires, preservez les etats existants: chargement, vide, erreur, succes et action desactivee.

## Tests

- Les tests unitaires utilisent Jasmine/Karma et sont situes en `*.spec.ts`, generalement a cote du code teste.
- Ajoutez ou mettez a jour le test le plus proche lorsque vous corrigez un comportement ou ajoutez une branche importante.
- Testez les contrats observables, les transformations `_id` vers `id`, les erreurs HTTP et les chemins de navigation pertinents.
- Evitez les assertions sur des constantes d'implementation sans valeur utilisateur.
- Une modification UI simple peut etre verifiee par `npm run build` si aucun test cible n'existe; n'annoncez pas la couverture complete du navigateur.

## Workflow de modification

- Lisez les fichiers voisins avant d'ajouter une nouvelle fonctionnalite: le depot contient plusieurs generations de styles Angular.
- Faites des changements chirurgicaux; ne reformatez pas ni ne migrez les fichiers non lies.
- Ne retirez pas les commentaires utiles expliquant une compatibilite, un contrat backend ou un ancien chemin.
- Verifiez au minimum `npm run build`. Lancez les tests ciblés lorsque des tests existants couvrent la zone modifiée.
- Signalez explicitement les avertissements ou erreurs du build. Les avertissements actuels incluent notamment des budgets de bundle, sans empecher une compilation reussie.
