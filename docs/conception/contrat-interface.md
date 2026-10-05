# Contrat d'interface – API DataShare

Ce document décrit les routes de l'API REST exposée par le back-end NestJS et consommée par le front-end React.
Il sert de référence commune aux deux parties. Une documentation OpenAPI (Swagger) sera générée automatiquement à partir du code (`@nestjs/swagger`).

## 1. Conventions

| Convention | Règle |
|---|---|
| Préfixe | Toutes les routes commencent par `/api` |
| Format | JSON, sauf l'envoi de fichier (`multipart/form-data`) et le téléchargement (flux binaire) |
| Nommage | Noms techniques en anglais (camelCase), messages d'erreur en français |
| Authentification | JWT dans l'en-tête `Authorization: Bearer <accessToken>`, durée de vie 1 h (variable `JWT_EXPIRES_IN`) |
| Dates | Format ISO 8601 en UTC (`2026-10-05T09:00:00Z`) |
| Tailles | En octets (la mise en forme « 2,6 Mo » est faite par le front) |

### Format unique des erreurs

```json
{ "statusCode": 409, "message": "Cet email est déjà utilisé", "error": "Conflict" }
```

Le front affiche `message` dans le composant « Callout » rouge des maquettes.

### Codes HTTP utilisés

| Code | Signification |
|---|---|
| 200 OK | Requête réussie |
| 201 Created | Ressource créée |
| 204 No Content | Action réussie, sans contenu en retour |
| 400 Bad Request | Données invalides |
| 401 Unauthorized | Non authentifié, ou mot de passe incorrect |
| 404 Not Found | Ressource introuvable (ou appartenant à un autre utilisateur) |
| 409 Conflict | Conflit avec une donnée existante |
| 410 Gone | Lien expiré (fichier pas encore purgé) |
| 413 Payload Too Large | Fichier supérieur à 1 Go |

## 2. Vue d'ensemble

| # | Méthode | Route | JWT | US | Écran |
|---|---|---|---|---|---|
| 1 | POST | `/api/auth/register` | Non | US03 | Créer un compte |
| 2 | POST | `/api/auth/login` | Non | US04 | Connexion |
| 3 | GET | `/api/auth/me` | Oui | US04 | En-tête « Mon espace » (rechargement de page) |
| 4 | POST | `/api/files` | Oui | US01 | Ajouter un fichier |
| 5 | GET | `/api/files?status=active` | Oui | US05 | Mes fichiers |
| 6 | DELETE | `/api/files/:id` | Oui | US06 | Mes fichiers (Supprimer) |
| 7 | GET | `/api/download/:token` | Non | US02 | Télécharger un fichier |
| 8 | POST | `/api/download/:token/verify` | Non | US02 | Télécharger un fichier (mot de passe) |
| 9 | POST | `/api/download/:token` | Non | US02 | Télécharger un fichier (bouton Télécharger) |

## 3. Authentification

### 3.1 `POST /api/auth/register` – Créer un compte (US03)

**Corps de la requête**

```json
{ "email": "claire@mail.fr", "password": "motdepasse8" }
```

| Champ | Règle |
|---|---|
| `email` | Obligatoire, format email valide, unique en base |
| `password` | Obligatoire, 8 caractères minimum |

**Réponse 201**

```json
{ "id": 1, "email": "claire@mail.fr", "createdAt": "2026-10-05T09:00:00Z" }
```

**Erreurs** : 400 (format invalide) · 409 « Cet email est déjà utilisé »

**Notes**
- Le mot de passe est haché et salé (bcrypt) ; il n'est jamais renvoyé.
- Le champ « Vérification du mot de passe » est contrôlé uniquement par le front.
- Après inscription, le front redirige vers la page de connexion.

### 3.2 `POST /api/auth/login` – Se connecter (US04)

**Corps de la requête**

```json
{ "email": "claire@mail.fr", "password": "motdepasse8" }
```

**Réponse 200**

```json
{ "accessToken": "eyJhbGciOi...", "user": { "id": 1, "email": "claire@mail.fr" } }
```

**Erreurs** : 400 (format invalide) · 401 « Email ou mot de passe incorrect »

**Note** : le message 401 est identique que l'email existe ou non, pour empêcher l'énumération des comptes.

### 3.3 `GET /api/auth/me` – Utilisateur connecté

**Réponse 200**

```json
{ "id": 1, "email": "claire@mail.fr" }
```

**Erreurs** : 401 (jeton absent, invalide ou expiré)

**Note** : utilisée au rechargement de la page pour vérifier que le JWT conservé est toujours valide.
Il n'y a pas de route de déconnexion : le front supprime le JWT (authentification sans état).

## 4. Fichiers du propriétaire (routes protégées)

L'identité de l'utilisateur est toujours déduite du JWT, jamais d'un paramètre envoyé par le client.

### 4.1 `POST /api/files` – Envoyer un fichier (US01)

**Format** : `multipart/form-data`

| Champ | Type | Règle |
|---|---|---|
| `file` | fichier | Obligatoire, 1 Go maximum, extension non interdite |
| `expiresInDays` | entier | Facultatif, de 1 à 7, 7 par défaut |
| `password` | texte | Facultatif, 6 caractères minimum s'il est renseigné |
| `tags` | liste de textes | Facultatif, 30 caractères maximum par tag, pas de doublon |

Extensions interdites (configurables) : `.exe .msi .bat .cmd .com .scr .ps1 .vbs .js .jar .sh`

**Réponse 201**

```json
{
  "id": 12,
  "originalName": "IMG_9210.jpg",
  "size": 2726297,
  "mimeType": "image/jpeg",
  "createdAt": "2026-10-05T09:00:00Z",
  "expiresAt": "2026-10-12T09:00:00Z",
  "isProtected": true,
  "tags": ["photos"],
  "token": "Xk9f...aléatoire...q2"
}
```

**Erreurs**
- 400 : fichier absent, durée hors de 1 à 7, mot de passe trop court, tag trop long ou en double, « Ce type de fichier n'est pas autorisé »
- 401 : non authentifié
- 413 : « La taille des fichiers est limitée à 1 Go »

**Notes**
- La taille est contrôlée à trois niveaux : par le front avant l'envoi, par l'en-tête `Content-Length` à l'arrivée, et pendant la réception du flux (interruption dès que 1 Go est dépassé).
- Le front construit le lien de partage à partir du `token` : `https://<domaine>/d/<token>`.
- Le mot de passe du fichier est haché (bcrypt) et n'est jamais renvoyé.

### 4.2 `GET /api/files?status=active` – Historique (US05)

| Paramètre | Valeurs | Par défaut |
|---|---|---|
| `status` | `active` · `expired` · `all` | `active` |

**Réponse 200**

```json
[
  {
    "id": 12,
    "originalName": "IMG_9210.jpg",
    "size": 2726297,
    "createdAt": "2026-10-05T09:00:00Z",
    "expiresAt": "2026-10-12T09:00:00Z",
    "isExpired": false,
    "isProtected": true,
    "tags": ["photos"],
    "token": "Xk9f...q2"
  }
]
```

**Erreurs** : 400 (`status` inconnu) · 401

**Notes**
- Seuls les fichiers de l'utilisateur connecté sont renvoyés.
- `isExpired` est calculé au moment de la réponse (comparaison avec `expiresAt`).
- Le `token` permet au bouton « Accéder » d'ouvrir la page de téléchargement.

### 4.3 `DELETE /api/files/:id` – Supprimer un fichier (US06)

**Réponse 204** : aucun contenu.

**Erreurs** : 401 · 404 « Fichier introuvable »

**Notes**
- La confirmation (« Êtes-vous sûr ? ») est demandée par le front.
- Le fichier est supprimé du disque, ainsi que ses métadonnées et ses tags en base.
- Un fichier appartenant à un autre utilisateur renvoie 404 (et non 403), pour ne pas révéler son existence.

## 5. Téléchargement public (US02)

Ces routes ne demandent pas de JWT : l'accès repose sur le jeton aléatoire du lien.

### 5.1 `GET /api/download/:token` – Informations avant téléchargement

**Réponse 200**

```json
{
  "originalName": "IMG_9210.jpg",
  "size": 2726297,
  "mimeType": "image/jpeg",
  "expiresAt": "2026-10-08T09:00:00Z",
  "isProtected": true
}
```

**Erreurs**
- 404 : « Ce lien est invalide ou a expiré » (jeton inconnu, ou fichier déjà purgé)
- 410 : « Ce fichier n'est plus disponible en téléchargement car il a expiré. »

**Note** : les bandeaux « Ce fichier expirera dans 3 jours » (info) et « Ce fichier expirera demain » (alerte) sont calculés par le front à partir de `expiresAt`.

### 5.2 `POST /api/download/:token/verify` – Vérifier le mot de passe

Utilisée uniquement pour un fichier protégé, avant de lancer le téléchargement.

**Corps de la requête**

```json
{ "password": "secret6" }
```

**Réponse 204** : mot de passe correct.

**Erreurs** : 400 (mot de passe absent) · 401 « Mot de passe incorrect » · 404 · 410

### 5.3 `POST /api/download/:token` – Télécharger le fichier

**Corps de la requête** (formulaire envoyé par le navigateur) : `password`, uniquement si le fichier est protégé.

**Réponse 200** : le contenu du fichier, envoyé en flux, avec les en-têtes :
- `Content-Type` : type MIME du fichier
- `Content-Length` : taille en octets
- `Content-Disposition: attachment; filename="IMG_9210.jpg"`

**Erreurs** : 401 « Mot de passe incorrect » · 404 · 410

**Notes**
- Le téléchargement est confié au navigateur (soumission de formulaire) : le fichier est écrit directement sur le disque de l'utilisateur, sans être chargé en mémoire.
- La méthode POST évite que le mot de passe apparaisse dans l'URL, l'historique du navigateur ou les journaux du serveur.
- Le mot de passe est revérifié côté serveur, même après l'étape `verify`.
- Amélioration prévue (SECURITY.md) : limiter le nombre de tentatives par minute (`@nestjs/throttler`).
