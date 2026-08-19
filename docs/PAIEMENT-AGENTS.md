# Paiement des agents (collecteurs) — Référence complète

> Document de référence sur la fonctionnalité "Paiement agents" (F5) du tableau de bord financier : ce qu'elle fait réellement aujourd'hui, comment elle est implémentée (frontend + backend), et ce qui reste volontairement non résolu. Rédigé à partir d'une lecture complète du code réel (composants, services, modèles, routes, tests) — pas d'une relecture des specs d'origine, qui sont partiellement obsolètes sur ce sujet (voir §8).

---

## 1. Résumé en une phrase

Un comptable ou administrateur ayant `droitsFinance` peut, depuis l'écran **Paiement agents** du tableau de bord financier, débiter manuellement un montant du **solde de l'agence** au profit d'un **collecteur** ; ce paiement est une **écriture comptable interne** (aucun transfert Mobile Money réel vers l'agent), notifiée au collecteur et conservée dans un historique.

---

## 2. Qui est un "agent" ?

Il n'existe **aucun modèle `Agent` séparé** côté backend. Un "agent" est un document `User` avec :

```js
{ role: 'collector', status: 'active', agencyId: <agence> }
```

(`models/User.js`). Le rôle `manager` (gestionnaire) n'est **jamais** payable via cet écran — la liste des agents vient de `AgencyEmployeeService.getCollectorsByAgency(agencyId)`, filtrée strictement sur `role: 'collector'`.

### À ne pas confondre : `role` vs `financialRole`

| Champ (sur `User`) | Rôle | Détermine |
|---|---|---|
| `role` | `'client' \| 'collector' \| 'manager' \| 'municipality' \| 'super_admin'` | **Qui peut être payé** (`collector` uniquement) via cet écran |
| `financialRole` | `'comptable' \| 'manager_terrain' \| 'administrateur' \| null` | **Qui peut accéder** à l'écran, via le flag dérivé `droitsFinance: boolean` |

Ces deux notions sont totalement indépendantes. Un `collector` pourrait en théorie avoir aussi `financialRole: 'comptable'` — rien dans le code n'empêche ou ne gère spécialement ce cumul.

> **Écart doc/code à noter** : le commentaire de route dit *"F5 — Comptable ET Administrateur"*, mais le seul garde réellement branché est `financeAccessGuard`, qui vérifie uniquement `droitsFinance === true` — un flag partagé par Comptable, Manager terrain **et** Administrateur. Contrairement à l'écran "Rôles & droits" (`roles-admin`, qui ajoute un `financeAdminGuard` réservé à l'Administrateur), **aucune restriction supplémentaire** n'existe sur `agent-payment`. En pratique, un Manager terrain avec `droitsFinance: true` peut payer des agents, malgré ce que suggère le commentaire.

---

## 3. Parcours utilisateur (frontend)

**Route** : `/dashboard/financial/agent-payment` (`financial-dashboard.routes.ts`), gardée par `financeAccessGuard` uniquement.
**Composant** : `features/agent-payment/agent-payment.component.ts` / `.html`.

Formulaire en 2 étapes (signal `etape: 'formulaire' | 'confirmation'`) :

1. **Formulaire**
   - Sélection de l'agent dans un `<select>` (liste chargée depuis `GET /finance/agents`).
   - Saisie **manuelle** d'un montant en FCFA (`<input type="number" min="1" step="1">`) — **aucun montant n'est suggéré ou pré-calculé**.
   - Bannière d'avertissement si le montant saisi dépasse le solde disponible de l'agence (vérification côté client, en miroir de la vérification serveur — voir §5).
   - Bouton "Continuer", actif seulement si `idAgent` choisi + `montant > 0` + solde suffisant.

2. **Confirmation**
   - Récapitulatif ("Vous allez payer X FCFA à [agent]"), boutons Annuler/Confirmer.
   - À la confirmation : appel `POST /finance/agents/paiements`. En cas de succès, message "Paiement enregistré — le solde de l'agence a été débité.", réinitialisation du formulaire, rechargement de l'historique **et** du solde affiché. En cas d'échec, le message d'erreur **réel renvoyé par le backend** est affiché tel quel (ex. "Solde insuffisant", "Agent introuvable pour cette agence") — pas un message générique.

3. **Panneau historique** (à droite de l'écran)
   - Liste chargée depuis `GET /finance/agents/paiements` (jusqu'à 50 lignes), triée par date décroissante.
   - Deux filtres **côté client uniquement** : recherche par nom d'agent, montant minimum.
   - Colonnes : agent, montant, date de paiement.

**Où vient le solde affiché ?** Le solde disponible affiché sur cet écran est le **même** `soldeDisponible` que celui du tableau de bord général (`GET /finance/dashboard/kpi`) — ce n'est **pas** un solde par agent (un `Agent` n'a aucun champ de solde/montant dû dans le modèle). Il n'existe donc aucune notion de "combien doit-on à cet agent" affichée nulle part : c'est au comptable de le savoir et de le saisir.

---

## 4. Modèles de données

### Backend — `models/PaiementAgent.js`

```js
{
  agentId:      { type: ObjectId, ref: 'User', required: true },
  agencyId:     { type: ObjectId, ref: 'Agence', required: true },
  montant:      { type: Number, required: true },
  datePaiement: { type: Date, default: Date.now },
  walletId:     { type: ObjectId, ref: 'Wallet' },
  status:       { type: String, enum: ['INITIATED', 'COMPLETED', 'FAILED'], default: 'INITIATED' },
}, { timestamps: true }
```

> **`status` est en grande partie mort** : aucun chemin de code n'écrit jamais `'INITIATED'` ou `'FAILED'` — un document `PaiementAgent` n'est créé **que** si le paiement réussit intégralement, directement avec `status: 'COMPLETED'`. Un paiement échoué (solde insuffisant, agent introuvable) ne laisse **aucune trace** dans cette collection — verrouillé par un test dédié (§7).

### Frontend — `models/agent.model.ts` / `paiement-agent.model.ts`

```ts
export interface Agent {
  readonly idAgent: string;
  nom: string;
  prenom?: string;
  telephone?: string;
}

export interface PaiementAgent {
  readonly idPaiementAgent: string;
  idAgent: string;
  montant: number;
  datePaiement: string; // ISO date
}
```

Un `Agent` côté frontend n'est qu'une identité (nom/prénom/téléphone) — aucun champ financier. Le commentaire du mapper est explicite : *"Pas de champ solde ici (Agent n'en a pas côté modèle) : le solde affiché ailleurs vient de DashboardKpi.soldeDisponible (solde de l'agence, pas par agent)."*

---

## 5. Le mécanisme de paiement (backend, `services/paiementAgent.js`)

### 5.1 Aucun calcul du montant dû

**Il n'existe aucune formule de rémunération** : ni salaire fixe, ni taux par collecte/passage effectué, ni pourcentage de commission, ni configuration de type `FeeConfig` équivalente pour les agents. Le montant est **entièrement saisi à la main** par le comptable/administrateur à chaque paiement. C'est un point explicitement documenté comme non tranché (voir §8, RG10).

### 5.2 Le flux complet

```js
static async payerAgent(agencyId, agentId, montant, io = null) {
    try {
        // 1. L'agent doit être un collecteur de CETTE agence
        const agent = await User.findOne({ _id: agentId, agencyId, role: 'collector' });
        if (!agent) throw new Error('Agent introuvable pour cette agence');

        // 2. Le solde vient du Wallet de l'AGENCE (indexé par agencyId dans userId),
        //    pas d'un wallet par agent
        const wallet = await getWalletByUserIdService(agencyId);
        if (wallet.balance < montant) throw new Error('Solde insuffisant');

        // 3. Débit du wallet agence
        await removeBalanceService(agencyId, montant);

        try {
            // 4. Écriture de la ligne d'historique
            const paiement = await PaiementAgent.create({
                agentId, agencyId, montant,
                datePaiement: new Date(),
                walletId: wallet._id,
                status: 'COMPLETED',
            });

            // 5. Notification au collecteur (best-effort, jamais bloquante)
            try {
                await notificationService.notifyUsers(io, [agentId], {
                    message: `Vous avez été payé(e) ${montant} FCFA.`,
                    type: 'PaiementAgent',
                });
            } catch (notifError) {
                // Volontairement avalée — un échec de notification ne doit
                // jamais faire échouer (ni annuler) un paiement déjà débité.
            }

            return { idPaiementAgent: paiement._id, idAgent: paiement.agentId, montant: paiement.montant, datePaiement: paiement.datePaiement };
        } catch (err) {
            // Compensation manuelle si l'écriture PaiementAgent échoue après le débit
            await addBalanceService(agencyId, montant);
            throw err;
        }
    } catch (error) {
        throw new Error(error.message);
    }
}
```

### 5.3 Points importants sur l'argent

- **Le solde débité est celui de l'agence**, pas un solde par agent — convention identique à celle utilisée partout ailleurs dans le module financier (`Wallet.userId === agencyId`).
- **Aucun transfert Mobile Money réel n'a lieu.** `payerAgent` n'appelle **jamais** `sendUserMoney` (la fonction utilisée pour les vrais transferts Orange/Moov Money ailleurs dans l'app) — décision délibérée, car cette fonction débite déjà elle-même le wallet en interne ; l'appeler en plus du débit manuel aurait doublé le débit. **"Payer un agent" signifie donc uniquement : décrémenter le solde de l'agence + créer une ligne d'historique + notifier l'agent** — l'agent ne reçoit aucun argent réel sur un compte Mobile Money via ce mécanisme. C'est une distinction essentielle à communiquer à tout utilisateur métier de cette fonctionnalité.
- **Pas de transaction MongoDB (`session`/`withTransaction`)** : le débit, l'écriture de l'historique et la compensation en cas d'échec sont 3 opérations séparées, non atomiques. `services/wallet.js` ne supporte pas de paramètre `{session}`, et une décision explicite a été prise de ne pas le modifier pour ce chantier. Il existe donc une fenêtre de risque théorique (bien que très étroite) entre le débit et la compensation en cas de plantage exact à ce moment précis.
- **`removeBalanceService`** relit le wallet, vérifie `balance < montant`, décrémente en mémoire puis `.save()` — un pattern lecture-puis-écriture **non atomique** (contrairement à `addBalanceService`, qui utilise `$inc` atomique de MongoDB). Signalé comme point faible pré-existant, volontairement non corrigé (hors périmètre de ce chantier).
- **Ordre des vérifications** : agent introuvable → 404 ; solde insuffisant → 400 ; les deux échouent **avant** tout débit ou toute écriture.

### 5.4 Endpoints

| Méthode | Route | Usage |
|---|---|---|
| `GET` | `/api/finance/agents?page=&pageSize=` | Liste paginée des collecteurs actifs de l'agence |
| `GET` | `/api/finance/agents/paiements?page=&pageSize=&idAgent=` | Historique des paiements, filtre optionnel par agent |
| `POST` | `/api/finance/agents/paiements` `{ idAgent, montant }` | Effectue un paiement |

Tous protégés par `authMiddleware()` + `resolveAgency` (résolution de `agencyId` depuis l'utilisateur connecté — jamais depuis l'URL, sauf override `?agencyId=` réservé à `super_admin`/`administrateur`).

> **Écart avec la spec d'origine** : la spécification initiale prévoyait `GET /api/paiements-agent`, `GET /api/paiements-agent/agent/:agentId`, `POST /api/paiements-agent`. L'implémentation réelle suit plutôt le contrat déjà utilisé par le frontend (`/finance/agents...`) — il n'existe **pas** de route séparée `/agent/:agentId` ; le filtre se fait via `?idAgent=` sur l'historique.

---

## 6. Historique et audit

- **Historique des paiements** : réel et interrogeable (`PaiementAgent`), avec filtre par agent. Champs exposés : `idPaiementAgent`, `idAgent`, `montant`, `datePaiement`.
- **Qui a autorisé le paiement ? Non enregistré nulle part.** `PaiementAgent` n'a aucun champ du type `paidBy`/`initiatedBy`. Le seul contexte d'acteur est implicite (l'`agencyId` résolu depuis le JWT au moment de la requête) — il n'existe **aucune traçabilité** de quel comptable/administrateur précisément a déclenché un paiement donné.
- **`ActivityLog`** : le backend dispose d'un modèle générique d'audit (`models/ActivityLog.js`), mais `services/paiementAgent.js` ne l'utilise **jamais** — un paiement d'agent n'apparaît pas dans le journal d'activité généraliste. La seule trace est la collection `PaiementAgent` elle-même, plus la `Notification` envoyée au collecteur.

---

## 7. Couverture de tests

**Backend** — `tests/collectorNotifications.test.js` ("Point 8 — Statut de paiement agent"), 2 tests verrouillent :

1. Un paiement réussi crée exactement une `Notification` de type `'PaiementAgent'`, avec le montant dans le message.
2. Un solde insuffisant lève une erreur `/Solde insuffisant/` **avant** toute écriture de `PaiementAgent` ou de `Notification` — le test documente explicitement qu'aucun chemin "paiement échoué" n'existe dans le code (aucun document `status: 'FAILED'` n'est jamais créé).

**Frontend** — aucun test de composant dédié à `agent-payment` (seul `agent.mapper.spec.ts` teste le mapping DTO). La couverture du parcours UI complet repose sur une checklist de test manuel (`docs/CHECKLIST-TEST-MANUEL-F8.md`, section F5) :
- Liste des agents s'affiche avec nom/prénom/téléphone.
- Historique + filtre par agent fonctionnels.
- Un paiement réel débite le solde et crée une ligne d'historique visible immédiatement.
- Cas limite : agence sans aucun agent → état vide propre.

---

## 8. Limites connues et points non tranchés

| Sujet | État |
|---|---|
| **Formule de rémunération** (RG10) | **Non résolu.** Aucun salaire fixe, taux par tâche, ou commission n'est calculé — saisie 100% manuelle à chaque paiement. |
| **Impact sur le solde** (autre moitié de RG10) | **Résolu et réel** — contrairement à d'anciens commentaires UI ("mock"/"TBC") corrigés lors d'un audit ultérieur (voir historique dans `EditRecapFront.md`). Le débit du solde agence est effectif dès aujourd'hui. |
| **Restriction d'accès Comptable+Administrateur** | Le commentaire de route le suggère, mais **non implémenté** — seul `droitsFinance` (partagé par 3 rôles financiers) est vérifié. |
| **Transfert Mobile Money réel** | **N'existe pas.** Paiement = écriture comptable interne + notification, jamais un vrai virement vers l'agent. |
| **Atomicité (transaction DB)** | Absente — débit, écriture, compensation sont 3 opérations séparées non transactionnelles (signalé, volontairement non résolu). |
| **`PaiementAgent.status`** | L'enum contient `'FAILED'`/`'INITIATED'` mais seul `'COMPLETED'` est jamais écrit — un paiement échoué ne laisse aucune trace dans cette collection. |
| **Traçabilité "qui a payé"** | Absente — ni champ dédié sur `PaiementAgent`, ni entrée `ActivityLog`. |
| **Échec de notification** | Avalé silencieusement — un agent non notifié après un paiement réussi ne génère aucune alerte visible pour le comptable. |

---

## 9. Références code (pour aller plus loin)

**Frontend** (`collect-dechets/src/app/pages/dashboards/financial-dashboard/`) :
- `features/agent-payment/agent-payment.component.ts` / `.html`
- `data-access/contracts/agent-data.service.ts` (contrat abstrait)
- `data-access/http/agent-data.http.service.ts` (implémentation HTTP)
- `data-access/http/mappers/agent.mapper.ts` (+ `.spec.ts`)
- `models/agent.model.ts`, `models/paiement-agent.model.ts`
- `financial-dashboard.routes.ts` (route `agent-payment`, garde `financeAccessGuard`)

**Backend** (`collecte-dechets-back/`) :
- `models/PaiementAgent.js`
- `services/paiementAgent.js` (logique métier complète)
- `controllers/paiementAgent.js`
- `routes/paiementAgentRoute.js`
- `services/agencyEmployee.js::getCollectorsByAgency` (réutilisé, pas dupliqué)
- `services/wallet.js::getWalletByUserIdService` / `removeBalanceService` / `addBalanceService`
- `tests/collectorNotifications.test.js` (section "Point 8")

**Documentation historique associée** :
- `collecte-dechets-back/EditRecap.md` — "Prompt 9 — Nouveau domaine « paiement agent » (F5)" et "Prompt 11" (durcissement `ObjectId.isValid`)
- `collect-dechets/docs/EditRecapFront.md` — audit "Nettoyage 100% mocks", correction des messages UI trompeurs sur RG10
- `collect-dechets/docs/DISCOVERY.md` §7 — framing original ("prototype UI-only"), aujourd'hui obsolète
- `collect-dechets/docs/INTEGRATION.md` — contrat des 3 endpoints
- `collect-dechets/docs/CHECKLIST-TEST-MANUEL-F8.md` — section F5
