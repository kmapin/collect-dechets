# Checklist de test manuel — bascule mock→réel (Prompt F8)

Contexte : `finance` (5/6 méthodes), `agent`, `session` sont désormais en Http réel
(`environment.useMocksOverrides`). `client` et `facture` restent en mock — leurs écrans
correspondants (F6 clients, F9 génération factures) ne sont donc PAS concernés par cette
checklist, ils continuent de fonctionner sur données simulées comme avant.

## Prérequis avant de tester
- [ ] Backend démarré et accessible à `environment.apiUrl` (vérifier la valeur active dans `environment.ts`)
- [ ] Un utilisateur de test avec `droitsFinance=true` ET `financialRole` assigné en base (sinon `GET /finance/session/moi` renverra `role: null` — cf. cas limite dédié plus bas)
- [ ] Au moins une agence avec des données réelles (redevances payées/impayées, transactions, retraits, paiements agent) pour éviter de ne tester que des états vides

## Session (bloquant — teste en premier)
- [ ] Connexion → `GET /finance/session/moi` réussit, l'utilisateur accède au module (pas de redirection immédiate vers `acces-refuse`)
- [ ] **Cas limite** : utilisateur avec `droitsFinance=false` → redirigé vers `acces-refuse`, module inaccessible
- [ ] **Cas limite** : utilisateur avec `financialRole=null` (jamais assigné) → `role` affiché comme absent/neutre, pas de crash de template

## F1 — Tableau de bord (statistiques)
- [ ] Les 4 cartes KPI (solde disponible, total collecté, revenus nets, en attente) affichent des valeurs réelles cohérentes avec la base
- [ ] Changement de période (sélecteur court/long) recharge le KPI correctement
- [ ] **Cas limite** : agence sans aucune activité sur la période → état vide propre (`app-empty-state`), pas de carte à `0` trompeuse ni d'erreur

## F2 — Graphiques (statistiques, même écran)
- [ ] "Total collecté par mois" (6 derniers mois) affiche une vraie courbe
- [ ] "Factures payées / impayées" affiche les vrais comptages mensuels
- [ ] "Répartition par mode de paiement" affiche un seul secteur "MobileMoney" (comportement attendu, voir note F6 — ce n'est pas un bug)
- [ ] **Cas limite** : agence sans données sur la fenêtre de 6 mois → état vide sur les 3 graphiques, canvas jamais cassé
- [ ] Export CSV des statistiques fonctionne toujours (reste 100% mock/client, `ExportService` non touché)

## F3 — Paiements (historique)
- [ ] Liste paginée des paiements réels s'affiche, `clientNom` correct
- [ ] Recherche par nom (`search`) filtre correctement
- [ ] Filtre par client (`idClient`) filtre correctement
- [ ] **Cas limite** : client sans historique de paiement → liste vide propre

## F4 — Retraits
- [ ] Liste paginée des retraits réels s'affiche (montant, date, motif)
- [ ] Filtre par mois/année fonctionne
- [ ] Recherche par motif fonctionne
- [ ] **Point d'attention** : le bouton "enregistrer un retrait" reste mocké (délégation interne, voir F4/F5) — vérifier qu'aucun retrait fictif ne donne l'impression d'un vrai débit ; envisager un indicateur visuel temporaire si ce n'est pas déjà clair pour l'utilisateur final

## F5 — Paiement agents
- [ ] Liste des agents (collectors) de l'agence s'affiche avec nom/prénom/téléphone
- [ ] Historique des paiements agent s'affiche, filtre par agent fonctionne
- [ ] Paiement d'un agent (réel cette fois) débite bien le solde de l'agence et crée une ligne d'historique visible immédiatement après
- [ ] **Cas limite** : tentative de paiement avec solde insuffisant → message d'erreur clair, pas de crash
- [ ] **Cas limite** : agence sans aucun agent → état vide propre

## F12 — Suivi mensuel (seul écran FactureDataService branché en réel)
- [ ] Liste des abonnés du mois s'affiche avec statut (Payée/Impayée/Non générée) et retard cumulé
- [ ] Changement de mois/année recharge correctement
- [ ] Filtre "impayées seulement" fonctionne
- [ ] **Cas limite** : client sous contrat actif sans redevance générée ce mois-là → apparaît avec statut "Non générée", pas absent de la liste

## F10 — Relevé client (seul autre écran FactureDataService branché en réel)
- [ ] Relevé d'un client sur une plage de mois choisie affiche les bonnes lignes (facturé le / payé le / montant)
- [ ] **Cas limite** (`PERIODE_VIDE` côté mock, à rejouer avec de vraies données) : plage sans aucune redevance pour ce client → liste vide propre, pas d'erreur

## F11 — Rôles & droits (le plus sensible)
- [ ] Accessible uniquement à un utilisateur avec `financialRole=administrateur` (tenter d'y accéder avec un compte "Comptable" → redirection `acces-refuse`)
- [ ] Liste des utilisateurs de l'agence avec leurs droits s'affiche
- [ ] Bascule des droits d'un utilisateur cible fonctionne et se reflète immédiatement dans la liste
- [ ] **Cas limite de sécurité** : vérifier qu'un utilisateur d'une AUTRE agence n'apparaît jamais dans la liste, et qu'on ne peut pas cibler son `idUtilisateur` via l'API directement (déjà couvert côté backend, à revérifier ici en bout en bout)

## Écrans volontairement non concernés par cette bascule (restent mock)
- F6 — Liste clients (`ClientDataService` : 0/2 endpoint backend)
- F7/F8 — Fiche client (idem)
- F9 — Génération de factures (`FactureDataService.genererFacturesDuMois` : pas de backend)
- Badge retard `situation-clients` sur F6 (`FactureDataService.getSituationClients` : pas de backend)
