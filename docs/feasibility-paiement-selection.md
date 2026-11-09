# Faisabilité — Paiement par sélection de redevances

## 1. Problème actuel

Le flow manager actuel comporte **7 étapes** pour payer plusieurs redevances :

```
Bouton "Configurer un paiement groupé"
  → Formulaire (genererTout, réduction)
    → "Créer la proposition"
      → Attente création backend (notif client)
        → Carte "Proposition en attente"
          → "Paiement manuel"
            → Drawer → Confirmer
```

Pour une seule redevance : cliquer l'icône paiement dans la ligne → Drawer → Confirmer (3 étapes, correct).  
Le problème est **uniquement le chemin multi-redevances avec ou sans réduction**.

---

## 2. Flow proposé (cible)

```
Cocher 1..N redevances impayées
  → Barre flottante "X sélectionnée(s) — Total FCFA — [Payer]"
    → Drawer unifié :
        • Récap des lignes sélectionnées
        • Toggle "Appliquer une réduction" (optionnel)
          └─ si activé : champs réduction (type + valeur)
        • Date de paiement · Somme reçue · Commentaire
        → [Confirmer le paiement]
```

**Soit 2 étapes pour le manager** : cocher → confirmer dans le drawer.

---

## 3. Contrainte backend (clé)

Le endpoint de paiement groupé `POST /redevances/contrat/{id}/paiement-groupe` **ne prend pas de liste de redevanceIds** : il groupe automatiquement toutes les redevances impayées du contrat (`genererTout` ou non).

### Stratégie adoptée

| Sélection | Réduction | Chemin backend |
|-----------|-----------|----------------|
| 1 ou N redevances | non | `forkJoin` de `PATCH /redevances/{id}/payer` pour chaque sélectionnée |
| Toutes les impayées | oui | `POST paiement-groupe` → `PATCH paiement-groupe/{id}/payer-manuel` |
| Sélection partielle | oui | Bloqué UI — message : "La réduction nécessite de sélectionner toutes les redevances impayées" |

**Avantage** : zéro changement backend, contrainte exposée clairement au manager.

---

## 4. Changements frontend

### `redevances.component.ts`

**Supprimer :**
- `showPaiementGroupeForm`, `paiementGroupeApercu`, `chargementApercu`, `paiementGroupeForm`
- méthodes : `ouvrirFormPaiementGroupe`, `fermerFormPaiementGroupe`, `setGenererTout`, `setReductionType`, `setReductionValeur`, `chargerApercuPaiementGroupe`, `montantApresReductionApercu`, `onCreerPropositionPaiementGroupe`

**Ajouter :**
- `selectedIds = signal<Set<string>>(new Set())`
- `avecReduction = signal(false)`
- `reductionForm = signal({ type: 'pourcentage', valeur: 0 })`
- computed : `selectionCount`, `selectionMontant`, `toutesImpayeesSelectionnees`, `montantApresReduction`
- méthodes : `toggleSelection(id)`, `toggleTout()`, `ouvrirPayerSelection()`, `onConfirmerPaiementSelection()`

**Modifier :**
- `CiblePaiementManuel` → remplacé par un `mode` dans le drawer unifié
- `onConfirmerPaiementManuel` → bifurcation selon `selectedIds.size` + `avecReduction`

### `redevances.component.html`

**Supprimer** : tout le bloc `fin-redevances__paiement-groupe` (form + card proposition active).

**Ajouter :**
- Colonne checkbox dans `<thead>` et `<tbody>` (visible si `peutPayerManuel()`)
- Checkbox "tout sélectionner" dans le header de colonne (sélectionne uniquement les impayées)
- Barre d'action flottante conditionnelle quand `selectionCount() > 0`
- Dans le drawer : remplacer le `*ngIf cible.type` par le récap de sélection + toggle réduction

---

## 5. Cas limite & points d'attention

| Cas | Comportement |
|-----|-------------|
| Proposition groupée déjà active | Continuer à l'afficher (card en haut) + désactiver les checkboxes — le manager doit d'abord payer ou annuler la proposition active |
| `genererTout` (générer les futures échéances) | Gardé comme option dans le drawer uniquement quand réduction activée (car lié au endpoint groupé). Coché par défaut : non. |
| Redevance déjà payée | Checkbox absente (seulement `en_attente` / `retard`) |
| Paiement parallèle (forkJoin) | Si l'une échoue, les autres sont déjà confirmées — notification spécifique par redevance échouée |

---

## 6. Fichiers impactés

| Fichier | Nature |
|---------|--------|
| `redevances.component.ts` | Refactoring signals + méthodes |
| `redevances.component.html` | Refactoring template |
| `redevances.component.scss` | Nouveaux styles barre flottante + checkbox column |
| Aucun service, aucun modèle, aucun backend | — |
