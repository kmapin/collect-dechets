# WebSocket — Guide d'intégration Frontend

> **Socket.IO v4** — URL : `http://localhost:3000` (remplacer par l'URL de production)

---

## ⚠️ Changement important — Authentification obligatoire

La connexion socket nécessite maintenant un **token JWT** passé dans les options de connexion.  
Sans token valide, la connexion est rejetée immédiatement par le serveur.

---

## 1. Connexion

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: localStorage.getItem('token'), // ou ton store (Redux, Pinia, etc.)
  },
});
```

### Gérer les erreurs de connexion

```js
socket.on('connect_error', (err) => {
  // err.message : 'Token manquant' | 'Token expiré' | 'Token invalide'
  if (err.message === 'Token expiré') {
    // rafraîchir le token et reconnecter
    socket.auth.token = getNewToken();
    socket.connect();
  } else {
    // rediriger vers la page de login
    redirectToLogin();
  }
});
```

---

## 2. Rejoindre sa room (obligatoire)

Après la connexion, envoyer `joinRoom` avec l'`_id` de l'utilisateur connecté.  
**Sans cet appel, aucun événement ciblé ne sera reçu.**

```js
socket.on('connect', () => {
  socket.emit('joinRoom', userId); // userId = _id MongoDB de l'utilisateur connecté
});
```
²
---

## 3. Événements reçus du serveur

### Notifications

| Événement | Reçu par | Payload |
|---|---|---|
| `newNotification` | l'utilisateur concerné | `{ _id, user, message, type, createdAt }` |
| `notificationRead` | l'utilisateur concerné | `{ id }` |
| `notificationDeleted` | l'utilisateur concerné | `{ id }` |

### Messagerie

> ⚠️ **IMPORTANT — L'envoi de message ne se fait PAS par socket.**
> Le socket sert uniquement à **recevoir**. Pour envoyer un message, appeler l'API REST :
>
> ```
> POST /api/messages/send
> Authorization: Bearer <token>
> Content-Type: application/json
>
> {
>   "sender": "<userId de l'expéditeur>",
>   "receiver": "<userId du destinataire>",
>   "content": "Bonjour !"
> }
> ```
>
> Les **3 champs sont obligatoires** (400 sinon). Après le POST, le serveur émet
> `messageSent` vers la room du destinataire **et** celle de l'expéditeur
> (pratique pour synchroniser plusieurs onglets/appareils).
> Un `socket.emit('sendMessage', ...)` côté client ne fera **rien** — aucun handler serveur.

| Événement | Reçu par | Payload |
|---|---|---|
| `messageSent` | destinataire + expéditeur | objet message complet |
| `messageRead` | l'expéditeur | objet message complet |
| `messageDeleted` | expéditeur + destinataire | `{ messageId }` |

### Collectes / Signalements

| Événement | Reçu par | Payload |
|---|---|---|
| `newReport` | l'agence (`agencyId`) | `{ collecteId, reportedBy, severity, comment }` |
| `reportAssigned` | chef d'équipe + chaque collecteur | `{ collecteId, message }` |
| `reportResolved` | le client + l'agence | `{ collecteId, message }` |

### Planning

| Événement | Reçu par | Payload |
|---|---|---|
| `planningNotification` | le collecteur assigné | `{ collectorId, message, clients }` |

---

## 4. Exemple complet (React)

```jsx
import { useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: localStorage.getItem('token') },
  autoConnect: false, // connexion manuelle après login
});

export function useSocket(userId) {
  useEffect(() => {
    if (!userId) return;

    socket.connect();

    socket.on('connect', () => {
      socket.emit('joinRoom', userId);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket error:', err.message);
    });

    socket.on('newNotification', (notif) => {
      // mettre à jour le store / afficher un toast
      console.log('Nouvelle notification :', notif);
    });

    socket.on('messageSent', (msg) => {
      // ajouter le message à la conversation
      console.log('Nouveau message :', msg);
    });

    socket.on('planningNotification', (data) => {
      // afficher la notification de planning au collecteur
      console.log('Planning :', data);
    });

    return () => {
      socket.off('newNotification');
      socket.off('messageSent');
      socket.off('planningNotification');
      socket.disconnect();
    };
  }, [userId]);
}
```

---

## 5. Reconnecter après refresh du token

```js
// Appeler cette fonction quand tu obtiens un nouveau token
function updateSocketToken(newToken) {
  socket.auth.token = newToken;
  socket.disconnect().connect(); // reconnexion avec le nouveau token
}
```

---

## 6. Tester avec Postman

1. Ouvrir Postman → **New → Socket.IO** (pas WebSocket)
2. URL : `http://localhost:3000`
3. Onglet **Headers** → ajouter :

```
Authorization: Bearer <ton_token>
```

> **Attention** : Postman Socket.IO passe les headers différemment des options `auth`. Si la connexion échoue, utiliser l'option `handshake` ou tester depuis le code.

Alternativement, tester depuis la console navigateur :

```js
const s = io('http://localhost:3000', { auth: { token: 'TON_TOKEN' } });
s.on('connect', () => s.emit('joinRoom', 'TON_USER_ID'));
s.on('newNotification', console.log);
```

---

## 7. Flux de scénarios complets

### Signalement → Assignation → Résolution

```
Connecter 3 onglets (ou 3 useSocket différents) :
  → Onglet A : joinRoom(agencyId)   — écoute newReport, reportResolved
  → Onglet B : joinRoom(leaderId)   — écoute reportAssigned
  → Onglet C : joinRoom(clientId)   — écoute reportResolved

1. Client signale → Onglet A reçoit newReport
2. Manager assigne une équipe → Onglet B reçoit reportAssigned
3. Collecteur résout → Onglet A + C reçoivent reportResolved
```

### Nouveau planning

```
  → Collecteur connecté : joinRoom(collectorId) — écoute planningNotification

Quand un manager crée un planning avec ce collecteur :
  → Collecteur reçoit planningNotification { collectorId, message, clients }
```

---

## 8. Erreurs courantes

| Symptôme | Cause | Solution |
|---|---|---|
| `connect_error: Token manquant` | Pas de `auth.token` dans les options `io()` | Passer `{ auth: { token } }` dans les options |
| `connect_error: Token expiré` | JWT expiré | Rafraîchir le token et reconnecter |
| `error: Non autorisé` reçu après `joinRoom` | userId envoyé ≠ userId du token | Utiliser l'`_id` exact de l'utilisateur connecté |
| Aucun événement reçu | `joinRoom` non envoyé | Émettre `joinRoom` dans le handler `connect` |
| Connecté mais les messages ne partent pas | Envoi tenté via `socket.emit('sendMessage', ...)` | L'envoi passe par **HTTP** : `POST /api/messages/send` avec `{ sender, receiver, content }` |
| Le message part (201) mais rien ne s'affiche en face | Le destinataire n'a pas fait `joinRoom` avec SON userId, ou écoute le mauvais event | Vérifier `joinRoom(userId)` côté destinataire et écouter `messageSent` |
| `400 Champs requis` sur /send | `sender` manquant dans le body | Envoyer les 3 champs : `sender`, `receiver`, `content` |
| `Could not connect` | Serveur arrêté | `npm run dev` côté back |
