# Audit — Protection contre les soumissions multiples (double/triple clic)

Date : 2026-09-07. Portée : l'intégralité de `src/app` (frontend Angular 20), toutes les
actions déclenchant un POST/PUT/PATCH/DELETE — recherche partant des services
`HttpClient` puis remontée jusqu'aux boutons/formulaires qui les appellent (pas l'inverse),
comme demandé. Vérification confirmée : aucun composant ne contourne les services listés
pour appeler `HttpClient` directement sur ces domaines.

## Constat général

Le projet a déjà un **pattern local établi et qui fonctionne** : un flag booléen par action
(`isSaving`, `isDeleting`, `isProcessing`, `isSubmitting`...), posé à `true` en tête de
méthode AVANT l'appel HTTP (avec un `if (flag) return;` en garde d'entrée), réinitialisé à
`false` dans les callbacks `next` ET `error` du `.subscribe(...)`, et lié à `[disabled]` sur
le bouton déclencheur. Des exemples EXACTEMENT conformes existent déjà :
`create-withdrawal-dialog.component.ts`, `quartiers-management.ts`, `team-create.ts`,
`planning-create.ts`/`planning-detail.ts` (la plupart des actions), les dialogues
utilisateur de `admin-dashboard.ts` (suppression, statut, reset mot de passe),
`fee-config-settings.ts`.

**Le problème n'est donc pas l'absence de pattern — c'est son application incohérente.**
Sur ~130 méthodes d'écriture auditées, on trouve 4 classes de défauts récurrents :

1. **❌ Aucune protection du tout** — ni flag, ni `[disabled]` (le cas le plus fréquent, et
   le plus grave quand l'action est une création/suppression/paiement).
2. **⚠️ Flag posé mais jamais réellement activé avant l'appel** — bug "cosmétique" : le
   flag existe et est bien lié au bouton, mais la méthode ne fait jamais `flag.set(true)`
   avant l'appel HTTP (ex. `addEmployee()`/`addTariff()` dans `agency-dashboard.ts`) — le
   bouton ne se désactive donc jamais pendant la requête.
3. **⚠️ Flag correct dans le `.ts`, mais jamais lié au bouton dans le `.html`** (ex.
   `deleteTariff()`/`deletePlanning()` dans `agency-dashboard.ts`).
4. **⚠️ Flag réinitialisé seulement en cas de succès, jamais en cas d'erreur** — le bouton
   reste bloqué indéfiniment après une erreur (ex. `TeamForm.saving` utilisé par
   `team-detail.ts`/`team-list.ts`).

---

## 1. Actions identifiées (table complète)

### 1.1 Agence / Admin / Territoire

| Fichier | Composant/Méthode | Action | Verbe HTTP | Classification |
|---|---|---|---|---|
| agency.service.ts / agency-details.ts | `deleteAgency()` | Supprimer agence | DELETE `/agencies/:id` | ❌ none |
| agency.service.ts / admin-dashboard.ts | `deleteAgency()` | Supprimer agence | DELETE `/agencies/:id` | ❌ none |
| agency.service.ts / agency-details.ts | `activateAgency()` | Activer/désactiver agence | PATCH `/agencies_validation/:id/validate` | ❌ none |
| agency.service.ts / admin-dashboard.ts | `activateAgency()`/`deActivateAgency()` | Activer/désactiver agence | PATCH | ❌ none |
| agency.service.ts / admin-dashboard.ts, agency-dashboard.ts | `assignFinancialRole()` | Assigner/révoquer rôle financier | PATCH `/finance/.../financial-role` | ❌ none |
| agency.service.ts / agency-dashboard.ts | `confirmDeleteEmployee()` | Supprimer employé | DELETE `/user/:id` | ✅ protected |
| agency.service.ts / agency-dashboard.ts | `addEmployee()` | Créer employé | POST `/register` | ⚠️ partial — flag jamais mis à `true` |
| agency.service.ts / agency-dashboard.ts | `updateEmployeeData()` | Modifier employé | PUT `/user/:id` | ⚠️ partial — même bug de flag partagé |
| agency.service.ts / agency-dashboard.ts | `addTariff()` | Créer tarif | POST `/pricing` | ⚠️ partial — flag jamais mis à `true` |
| agency.service.ts / agency-dashboard.ts | `updateTariff()` | Modifier tarif | PUT `/pricing/:id` | ✅ protected |
| agency.service.ts / agency-dashboard.ts | `deleteTariff()` | Supprimer tarif | DELETE `/pricing/:id` | ⚠️ partial — flag OK dans `.ts`, jamais lié au bouton |
| agency.service.ts / agency-dashboard.ts | `deletePlanning()` | Supprimer planning | DELETE `/planning/:id` | ⚠️ partial — même défaut |
| agency.service.ts / agency-dashboard.ts, admin-dashboard.ts, municipality-dashboard.ts | `resolveIncident()`/`onResolvedIncident()` | Résoudre signalement | PATCH `/signalements/:id/resolve` | ❌ none (3 dashboards) |
| agency.service.ts / agency-dashboard.ts, municipality-dashboard.ts | `onAssignReportToTeam()`/`onAssignReport()` | Assigner signalement | PATCH `/signalements/:id/assign-team` | ❌ none |
| agency.service.ts / agency-dashboard.ts | `toggleEmployeeStatus()` | Changer statut employé | PUT `/users/agency/:id` | ❌ none |
| agency.service.ts / agency-dashboard.ts | `addZoneAgency()` | Modifier zones agence | PATCH `/agencies/:id/zone` | ❌ none |
| admin.ts / admin-dashboard.ts | `confirmDeleteUser()` | Supprimer utilisateur | DELETE `/user/:id` | ✅ protected |
| admin.ts / admin-dashboard.ts | `toggleUserStatus()` | Activer/désactiver utilisateur | PUT `/users/agency/:id` | ✅ protected |
| admin.ts / admin-dashboard.ts | `sendPasswordResetEmail()`/`setNewPasswordAdmin()` | Reset mot de passe | POST/PATCH | ✅ protected |
| admin.ts / admin-dashboard.ts | `saveUserChanges()` | Modifier profil utilisateur | PUT `/user/:id` | ✅ protected |
| admin.ts / admin-dashboard.ts | `sendCommunication()` | Envoyer communication | POST `/communications/send` | ❌ none |
| admin.ts / admin-dashboard.ts | `confirmDeleteCommunication()` | Supprimer communication | DELETE `/communications/:id` | ✅ protected |
| territory-http.service.ts / quartiers-management.ts | `enregistrer()` | Créer/modifier quartier | POST/PUT `/territories/neighborhoods` | ✅ protected |
| territory-http.service.ts / quartiers-management.ts | `supprimer()` | Supprimer quartier | DELETE `/territories/neighborhoods/:id` | ❌ none |

*(Méthodes confirmées mortes/non appelées depuis aucun template, exclues du reste : `addTarif$`, `deleteTariff$`, `updateTarif$`, `resolveReport$`, `assignReportToTeam$` legacy, `registerMunicipality$`, `resolveCollecte$`, `updateAgency()`, `optimizeSpecificZone`/`generateZoneReport` (existent mais jamais invoquées depuis le HTML).)*

### 1.2 Auth / Client / Véhicule / Notifications

| Fichier | Composant/Méthode | Action | Verbe HTTP | Classification |
|---|---|---|---|---|
| auth.service.ts / login.ts | `onLogin()` | Connexion | POST `/login` | ⚠️ partial — pas de garde d'entrée |
| auth.service.ts / register.ts | `onRegister()` (client/agence/mairie) | Inscription | POST `/register` | ⚠️ partial — pas de garde d'entrée ; cas mairie avec `agencyId` : bouton sans `[disabled]` du tout |
| auth.service.ts / forgot-password.ts | `forgotSubmit()`/`verifyOtpCode()`/`resendCode()`/`submitNewPassword()` | Mot de passe oublié (4 étapes) | POST | ⚠️ partial (×4) — pas de garde d'entrée |
| client.service.ts / agency-details.ts | `subscribeToAgency()` | Abonnement agence | POST `/clients/subscribe` | ❌ none (+ actuellement injoignable depuis l'UI) |
| client.service.ts / agency-dashboard.ts | `validateClientSubscription()` | Valider abonnement client | PUT `/agences/clients/:id/validate` | ❌ none (+ actuellement injoignable depuis l'UI) |
| client.service.ts / client-dashboard.ts | `walletPayment()` | **Recharge wallet (paiement)** | POST `/wallet/add/...` | ❌ none |
| client.service.ts / client-dashboard.ts | `rateCollecte()` | Noter une collecte | POST `/collectes/:id/rating` | ✅ protected |
| client.service.ts / client-dashboard.ts | `createSignalement()` | Créer signalement | POST `/signalements` | ❌ none |
| vehicle.service.ts / agency-dashboard.ts | `saveVehicle()` | Créer/modifier véhicule | POST/PUT `/v2/vehicles` | ⚠️ partial — pas de garde d'entrée |
| vehicle.service.ts / agency-dashboard.ts | `deleteVehicle()` | Supprimer véhicule | DELETE `/v2/vehicles/:id` | ⚠️ partial — `confirm()` seul |
| notification.service.ts / notifications.ts | `markAsRead$`/`markAllAsRead$`/`deleteNotification$` | Notifications | PUT/PATCH/DELETE | ❌ none (risque faible — idempotent côté backend) |
| notification-settings.service.ts / notification-settings.ts | `save()`/`sendTest()` | Réglages notif / email test | PUT/POST | ⚠️ partial — pas de garde d'entrée |
| messages.service.ts / agency-details.ts | `submitMessage()` | Message → agence | POST `/messages/send` | ❌ none |
| messages.service.ts / subscription.ts | `sendContactMessage()` | Message → agence | POST `/messages/send` | ⚠️ partial — pas de garde d'entrée |
| messages.service.ts / agency-dashboard.ts, client-dashboard.ts | Chat interne | Message chat | POST `/messages/send` | ❌ none (×2) |
| shared-service.ts / profile.ts | `onUpdateUser()` | **Mise à jour profil** | PUT `/user/:id` | ❌ none — `isLoading` déclaré mais jamais activé |
| fee-config.service.ts / fee-config-settings.ts | `save()` | Config frais plateforme | PUT `/finance/fee-config` | ✅ protected — modèle exemplaire |

*(Méthodes mortes exclues : `updateClient`, `registerAgency$`, `logout` (appel réel commenté), `subscribeToAgencyPlan`, `generateNewQRCode`, `markMessagesAsRead`, `deleteMessage`. Hors périmètre signalé par l'agent : `src/app/pages/payment/**` passe par un `PaymentService` distinct — voir section Finance ci-dessous, qui l'a couvert.)*

### 1.3 Finance / Contrats / Paiements

| Fichier | Composant/Méthode | Action | Verbe HTTP | Classification |
|---|---|---|---|---|
| contrat.service.ts / contracts.component.ts | `onCreerContrat()` | **Créer un contrat** | POST `/contrats` | ❌ none |
| contrat.service.ts / contracts.component.ts | `onResilierContrat()`/`onSuspendreContrat()`/`onReactiverContrat()` | Changer statut contrat | PATCH | ❌ none (×3) |
| contrat.service.ts / contracts.component.ts | `onGenererDocument()` | Générer document contrat | POST `/contrats/:id/document` | ❌ none |
| redevance.service.ts / contracts.component.ts | `onMarquerRedevancePayee()` | **Marquer redevance payée** | PATCH `/redevances/:id/payer` | ❌ none |
| redevance.service.ts / contracts.component.ts | `onCreerPropositionPaiementGroupe()`/`onAnnulerPaiementGroupe()` | Paiement groupé | POST/PATCH | ❌ none (×2) |
| redevance.service.ts / contracts.component.ts | `onPayerManuelPaiementGroupe()` | **Payer manuellement (groupé)** | PATCH `.../payer-manuel` | ❌ none |
| demande-collecte.service.ts / client-dashboard.ts | `submitSpontaneousRequest()` | Créer demande de collecte | POST `/demandes-collecte` | ✅ protected |
| demande-collecte.service.ts / agency-dashboard.ts | `acceptDemandeCollecte()`/`rejectDemandeCollecte()`/`confirmAssignDemandeTeam()`/`createFollowUpPlanning()` | Traiter demande | PATCH/POST | ✅ protected (×4) |
| withdrawal-requests-http.service.ts / admin-dashboard.ts | `confirmApproveWithdrawal()`/`confirmRejectWithdrawal()`/`confirmVirement()` | Traiter retrait | PATCH | ✅ protected (×3, pas de garde d'entrée mais `[disabled]` fiable) |
| finance.service.ts / agency-finance.ts | `submitWithdrawal()` | Demander un retrait (UI legacy) | POST `/finance/retraits` | ⚠️ partial — pas de garde d'entrée, form sans `(ngSubmit)` → Entrée peut recharger la page |
| finance-data.http.service.ts / create-withdrawal-dialog.component.ts | `confirmer()` | Demander un retrait (module Finance) | POST `/finance/retraits` | ✅ protected — modèle exemplaire |
| agent-data.http.service.ts / agent-payment.component.ts | `confirmer()`/`valider()`/`confirmerRejet()`/`confirmerEffectue()` | Paiement agent (create/valider/rejeter/virement) | POST/PATCH | ✅ protected (×4+) |
| session.http.service.ts / roles-admin.component.ts | `changerRole()`/`basculerDroitsFinance()` | Changer rôle/accès financier | PATCH | ❌ none (×2) |
| session.http.service.ts / roles-admin.component.ts | `enregistrer()` | Enregistrer permissions | PATCH | ✅ protected |
| payment.service.ts / mobile-money-form.ts | `onSubmit()` | **Initier paiement mobile money** | POST `/transactions/initiate` | ✅ protected (mais aucune clé d'idempotence envoyée — voir §3) |
| payment.service.ts / otp-input.ts | `onVerifyOtp()` | **Confirmer OTP (débit réel)** | POST `/transactions/confirm` | ⚠️ partial — bouton sans `type` explicite dans un `[formGroup]` sans `(ngSubmit)` → Entrée peut soumettre nativement |

*(Méthode morte exclue : `facture-data.http.service.ts::genererFacturesDuMois()`, jamais appelée. `cancelSpontaneousRequest()` : orpheline, non câblée à un bouton.)*

### 1.4 Planning / Équipes

| Fichier | Composant/Méthode | Action | Verbe HTTP | Classification |
|---|---|---|---|---|
| planning.service.ts / planning-create.ts | `submitForm()` | Créer/modifier planning | POST/PUT `/planning` | ✅ protected |
| planning.service.ts / planning-create.ts | `publishDraft()` | Publier | POST `/planning/:id/publish` | ✅ protected |
| planning.service.ts / planning-create.ts | `addTeamChip()`/`removeTeamChip()` | Assigner/retirer équipe | PUT `/planning/:id` | ✅ protected |
| planning.service.ts / planning-create.ts | `deleteExistingGroup()` | Supprimer groupe client | DELETE `/client-groups/:id` | ⚠️ partial — `confirm()` seul |
| planning.service.ts / planning-create.ts | `removeClientFromGroup()`/`addClientToGroup()` | Ajout/retrait client d'un groupe | POST/DELETE | ❌ none |
| planning.service.ts / planning-detail.ts | `deletePlanning()`/`publishPlanning()`/`startPlanning()`/`completePlanning()`/`retryCollecte()`/`saveObservation()`/`assignTeam()`/`removeTeam()`/`resendNotifications()` | Toutes actions planning détail | POST/PUT/PATCH/DELETE | ✅ protected (9 actions, dont **démarrer** qui génère les vraies Collecte) |
| planning.service.ts / planning-detail.ts | `cancelPlanning()` | Annuler | POST `/planning/:id/cancel` | ⚠️ partial — logique correcte mais bouton confirm-dialog sans `[disabled]` |
| planning.service.ts / planning-dashboard.ts | `publishPlanning()`/`startPlanning()`/`completePlanning()`/`cancelPlanning()`/`deletePlanning()` (vue tableau) | Mêmes actions, depuis le tableau | POST/DELETE | ⚠️ partial (×5) — flag posé mais **pas de garde d'entrée** dans la méthode elle-même |
| planning.service.ts / planning-dashboard.ts | `dismissAlert()` | Ignorer une alerte | PATCH `/planning/alerts/:id/dismiss` | ❌ none (faible sévérité) |
| team.service.ts / team-create.ts | `onSubmit()` | **Créer équipe** | POST `/teams` | ✅ protected |
| team.service.ts / team-detail.ts, team-list.ts (via TeamForm) | `onFormSave()` | Modifier équipe | PUT `/teams/:id` | ⚠️ partial — flag enfant jamais réinitialisé en erreur |
| team.service.ts / team-detail.ts | `doDelete()` | **Supprimer équipe** | DELETE `/teams/:id` | ❌ none |
| team.service.ts / team-detail.ts, team-list.ts | `changeStatus()` | Changer statut équipe | PATCH `/teams/:id/status` | ❌ none |
| team.service.ts / team-list.ts | `doDelete()` | **Supprimer équipe** | DELETE `/teams/:id` | ❌ none |
| team.service.ts / team-members.ts | `submitAdd()` | **Ajouter membre(s)** | POST `/teams/:id/members` | ✅ protected |
| team.service.ts / team-members.ts | `doDelete()` | Retirer membre | DELETE `/teams/:id/members/:id` | ❌ none |
| team.service.ts / team-members.ts | `setAvail()` | Disponibilité membre | PATCH | ❌ none (faible sévérité, optimiste) |

---

## 2. Solution proposée

**Pas de nouveau système global** (pas d'interceptor, pas de directive, pas de composant
bouton générique) — l'architecture existante (flag par action + `[disabled]` + reset
`next`/`error`) fonctionne déjà très bien là où elle est complète. Créer un mécanisme
parallèle irait à l'encontre de la consigne de réutiliser l'existant, et risquerait
d'introduire des comportements différents de ceux déjà validés en production sur les
actions ✅.

**Ce qui est proposé, uniquement pour compléter le pattern existant :**

1. **Correction mécanique, action par action**, des trois classes de défauts identifiées
   (§ Constat général) — ajouter le flag manquant, le lier au bouton, ou corriger le point
   de réinitialisation — sans toucher à la requête HTTP elle-même, aux routes, aux
   paramètres, ni aux messages de succès/erreur.
2. **Un seul petit ajout, réellement réutilisable** : généraliser l'usage de l'opérateur
   RxJS `finalize()` (déjà utilisé ailleurs dans le projet, ex. `agency-finance.ts`) pour la
   réinitialisation du flag — `.pipe(finalize(() => this.isX.set(false)))` — au lieu de la
   dupliquer dans `next` et `error` séparément. Ça élimine mécaniquement la classe de bug
   "jamais réinitialisé en erreur" (ex. `TeamForm.saving`), sans introduire de nouvelle
   abstraction : c'est un opérateur RxJS standard, pas un service maison.
3. Pour les boutons dans un `<form (ngSubmit)>` sans garde de type explicite (ex.
   `otp-input.ts`), ajouter `type="button"` ou s'assurer que `(ngSubmit)` appelle bien la
   même méthode gardée — pas de nouveau mécanisme, juste aligner le HTML sur ce que fait
   déjà `mobile-money-form.ts` correctement.

## 3. Actions critiques (protection backend à envisager séparément)

**Argent / contrats — le plus urgent, aucune garde frontend à ce jour :**
- `onCreerContrat()`, `onMarquerRedevancePayee()`, `onPayerManuelPaiementGroupe()`,
  `onResilierContrat()`/`onSuspendreContrat()`/`onReactiverContrat()`,
  `onCreerPropositionPaiementGroupe()`/`onAnnulerPaiementGroupe()` — **tout le fichier
  `contracts.component.ts` n'a aucune protection**, alors que le pattern est bien appliqué
  ailleurs dans le même module Finance (`agent-payment`, `create-withdrawal-dialog`,
  `roles-admin`).
- `client-dashboard.ts::walletPayment()` — recharge de wallet, aucune garde.

**Vérification backend ciblée déjà faite (par l'agent Finance), à traiter séparément —
je n'ai rien modifié côté backend, conformément à la consigne :**
- `services/contrat.js::creerContrat` — garde "check-then-insert" (`findOne` avant
  `save()`), **pas atomique** : deux requêtes vraiment concurrentes peuvent toutes les deux
  passer le contrôle avant qu'aucune n'ait sauvegardé.
- `services/redevance.js::payerRedevance` — même pattern non atomique
  (`findById` puis `save()` séparés).
- `services/transaction.js::demanderRetrait` (création de la demande de retrait) —
  **aucune garde de doublon du tout**. En revanche `accepterRetrait`/`rejeterRetrait`
  utilisent un vrai verrou atomique (`findOneAndUpdate` conditionnel) — le pattern
  d'idempotence existe déjà dans ce codebase (voir aussi `walletCreditedAt` sur les
  transactions), simplement pas répliqué à la création.
- `mobile-money-form.ts` calcule déjà un `generateTransactionId()` côté client mais ne
  l'envoie jamais au backend — une clé d'idempotence prête à être branchée, pas encore
  utilisée.

Aucune modification backend n'a été faite : ces points sont signalés pour décision
séparée, comme demandé, car ils touchent des règles métier (transactions Mongo,
contraintes d'unicité) qui dépassent la portée "double-clic frontend".

---

## Résumé chiffré

- **~130 méthodes d'écriture** auditées à travers 22 fichiers de service.
- **✅ Protection complète** : ~38 actions.
- **⚠️ Protection partielle** (un des 4 défauts ci-dessus) : ~30 actions.
- **❌ Aucune protection** : ~40 actions, dont la totalité de `contracts.component.ts`
  (contrats + redevances + paiement groupé) et plusieurs suppressions/changements de statut
  dans `agency-dashboard.ts`/`admin-dashboard.ts`/`team-detail.ts`/`team-list.ts`.

---

## Mise à jour — Implémentation (2026-09-07)

Toutes les actions ❌/⚠️ listées ci-dessus ont été corrigées, en 4 vagues, avec
`tsc --noEmit` + `ng build --configuration=development` (build complet, sans erreur)
après chaque vague. Aucun appel HTTP, route, paramètre, message de succès/erreur ou
règle métier n'a été modifié — uniquement l'ajout d'un garde d'entrée, la pose du flag
avant l'appel, sa réinitialisation (via `finalize()` quand c'est un Observable RxJS
direct, sinon `next`/`error` séparés selon le style déjà en place dans le fichier), et
la liaison `[disabled]` correspondante côté template.

**Vague 1 — Finance/Contrats** : `contracts.component.ts`/`.html` (9 actions),
`client-dashboard.ts::walletPayment()`, `otp-input.ts`/`.html` (bouton `type="submit"` +
`(ngSubmit)` réel, alignés sur `mobile-money-form.ts`), `agency-finance.ts::submitWithdrawal()`.

**Vague 2 — Agence/Admin/Territoire** : `agency-details.ts` (suppression/activation
agence, message), `admin-dashboard.ts` (suppression/activation agence, rôle financier,
communication, incidents), `agency-dashboard.ts` (employé, tarif, planning, zone,
véhicule, rôle financier — 2ᵉ copie), le composant partagé `signalement.ts`/`.html`
(nouveaux `@Input() resolvingIncidentIds`/`assigningIncidentIds`, consommés par les 3
dashboards qui l'utilisent), `quartiers-management.ts::supprimer()`.

**Vague 3 — Auth/Client/Véhicule/Notifications** : `login.ts`, `register.ts`,
`forgot-password.ts` (4 étapes), `client-dashboard.ts` (signalement, chat),
`agency-dashboard.ts` (véhicule, chat), `notification-settings.ts`, `agency-details.ts`/
`subscription.ts` (messages), `profile.ts::onUpdateUser()` (le bug confirmé — flag jamais
activé — est corrigé).

**Vague 4 — Planning/Équipes** : `planning-create.ts` (groupes clients),
`planning-detail.ts::cancelPlanning()`, `planning-dashboard.ts` (5 actions — garde
d'entrée ajoutée, `[disabled]` élargi à `!!actionLoading()` pour rester cohérent avec le
verrou global à une seule action à la fois), `team-form.ts` (le flag enfant `saving`,
jamais réinitialisé en erreur, devient un `@Input()` piloté par le parent),
`team-detail.ts`/`team-list.ts`/`team-members.ts` (suppression équipe/membre,
changement de statut).

**Volontairement non modifiés** (décision documentée, pas un oubli) :
- `agency-details.ts::subscribeToAgency()` et `agency-dashboard.ts::validateClientSubscription()`
  — confirmés injoignables depuis l'UI actuelle ; corriger du code mort aurait été un
  travail sans effet réel.
- `notifications.ts` (marquer lu/tout lu/supprimer) et `team-members.ts::setAvail()` —
  déjà protégés naturellement par leur mutation locale optimiste synchrone (l'état change
  avant même que la requête parte, ce qui bloque un second clic immédiat) ; ajouter un
  flag dédié aurait été une couche sans bénéfice mesurable, pour un risque déjà classé
  faible/idempotent par l'audit.
- `planning-dashboard.ts::dismissAlert()` — même raisonnement (faible sévérité, action
  idempotente).

**Bug de build détecté et corrigé au passage** : `agency-dashboard.html` liait
`vehicleDeletionEnCours.has(vehicle._id)` sans tenir compte du typage `_id?: string`
(optionnel) de l'interface `Vehicle` locale — erreur de template stricte (`TS2345`),
repérée uniquement par `ng build` (pas par `tsc --noEmit` seul). Corrigé avec l'assertion
non-null `vehicle._id!`, cohérente avec le reste du fichier.
