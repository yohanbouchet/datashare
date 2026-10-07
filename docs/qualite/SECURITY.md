# SECURITY – Sécurité de DataShare

> Document tenu à jour tout au long du projet : la sécurité est intégrée dès la conception
> (« security by design »), brique par brique, plutôt qu'ajoutée en fin de développement.

Légende : ✅ en place · 🔜 prévu (étape indiquée)

## 1. Mesures de sécurité

### Gestion des secrets et configuration

| Mesure | État | Détail |
|---|---|---|
| Secrets hors du code | ✅ | Identifiants de la base et adresses lus dans des fichiers `.env`, jamais écrits dans le code |
| Secrets hors du dépôt Git | ✅ | `.env` exclus par le `.gitignore` ; seuls les modèles `.env.example` (sans vraie valeur) sont publiés |
| Démarrage refusé si une variable manque | ✅ | `ConfigService.getOrThrow` : l'API s'arrête avec un message clair plutôt que de démarrer mal configurée |
| Aucun secret côté navigateur | ✅ | Seules les variables `VITE_*` (adresse de l'API) sont transmises au front |

### Base de données

| Mesure | État | Détail |
|---|---|---|
| Base non exposée sur le réseau | ✅ | Port publié uniquement sur `127.0.0.1` (`docker-compose.yml`) |
| Unicité de l'email garantie par la base | ✅ | Contrainte `UNIQUE` (migration `CreateUsers`) : protège aussi contre deux inscriptions simultanées |
| Empreinte du mot de passe jamais lue par défaut | ✅ | `select: false` sur `password_hash` : elle ne peut pas être renvoyée par erreur dans une réponse |
| Structure de la base versionnée | ✅ | Migrations TypeORM ; `synchronize: false` interdit toute modification automatique des tables |
| Protection contre les injections SQL | ✅ | Requêtes paramétrées générées par TypeORM (les valeurs ne sont jamais concaténées au SQL) |

### API et navigateur

| Mesure | État | Détail |
|---|---|---|
| CORS restreint | ✅ | Seule l'origine du front (`FRONTEND_URL`) est autorisée ; jamais `*` |
| Mots de passe hachés et salés (bcrypt) | ✅ | US03 : coût 12 (≈ 0,2 s par hachage, freine la force brute) ; sel aléatoire intégré ; seule l'empreinte `$2b$12$…` est stockée |
| Aucune empreinte dans les réponses | ✅ | La réponse d'inscription est construite champ par champ (`id`, `email`, `createdAt`) : `select: false` ne protège que les lectures en base, pas l'objet qui vient d'être créé |
| Doublon d'email simultané | ✅ | Erreur PostgreSQL `23505` (contrainte UNIQUE) convertie en 409, au lieu d'une erreur 500 |
| Authentification par JWT à durée limitée | 🔜 étape 3 | US04 : jeton valable 1 h (`JWT_EXPIRES_IN`) |
| Message de connexion identique en cas d'échec | 🔜 étape 3 | Empêche de deviner quels emails ont un compte (énumération) |
| Validation des données côté serveur | ✅ | DTO + `class-validator`, `ValidationPipe` global : toute donnée invalide est refusée (400) avant d'atteindre le service |
| Champs inattendus refusés | ✅ | `whitelist` + `forbidNonWhitelisted` : un client ne peut pas ajouter un champ comme `role` ou `id` (400) |
| Email normalisé | ✅ | Espaces retirés et minuscules avant contrôle : une seule adresse = un seul compte |
| Longueur du mot de passe bornée | ✅ | 8 caractères minimum (US03), 72 maximum (limite de bcrypt, au-delà les caractères seraient ignorés) |
| En-têtes de sécurité HTTP (`helmet`) | ✅ | Appliqués à toutes les réponses : `X-Powered-By` supprimé (technologie du serveur masquée), `X-Content-Type-Options: nosniff`, `X-Frame-Options` et `frame-ancestors` (anti-clickjacking), `Strict-Transport-Security` (HTTPS imposé en production), `Referrer-Policy: no-referrer` (les liens de partage ne fuient pas vers d'autres sites), `Content-Security-Policy` |
| Accès limité à ses propres fichiers | 🔜 étape 4 | L'identité vient du JWT, jamais d'un paramètre ; réponse 404 pour le fichier d'un autre |
| Lien de partage non prédictible | 🔜 étape 4 | Jeton aléatoire long, distinct de l'identifiant interne |
| Contrôle de la taille et des extensions | 🔜 étape 4 | 1 Go maximum (contrôle dans le navigateur, à l'arrivée et pendant la réception) ; extensions exécutables refusées |
| Fichiers stockés sous un nom généré | 🔜 étape 4 | Jamais le nom d'origine : évite les doublons et les attaques par chemin (`../`) |
| Mot de passe de fichier hors de l'URL | 🔜 étape 4 | Envoyé dans le corps d'une requête POST, jamais dans l'adresse |
| Limitation des tentatives | 🔜 étape 5 | `@nestjs/throttler` sur la connexion et la vérification de mot de passe de fichier |

### Risques web classiques

| Risque | Protection |
|---|---|
| Injection SQL | Requêtes paramétrées (TypeORM) |
| XSS (injection de code dans les pages) | React échappe automatiquement le texte affiché ; pas d'insertion de HTML brut |
| CSRF (requête forcée depuis un autre site) | Le JWT est envoyé dans l'en-tête `Authorization`, pas dans un cookie : un site tiers ne peut pas l'ajouter à la place de l'utilisateur |

## 2. Scans de sécurité des dépendances

### Constat initial (07/10/2026, `npm audit`)

| Projet | Critique | Haute | Moyenne | Basse |
|---|---|---|---|---|
| backend | 0 | 2 | 1 | 2 |
| frontend | 0 | 0 | 0 | 0 |

Les vulnérabilités du back-end concernent des dépendances **indirectes**, principalement des outils de développement installés par le générateur NestJS (`undici`, `tmp`, `@nestjs/mau`, `inquirer`, `external-editor`).
Analyse détaillée et décision (corriger, accepter ou ignorer) : 🔜 étape 5, avec un scan complémentaire des images Docker par `trivy`.

⚠️ La commande `npm audit fix --force` n'est pas utilisée : elle peut installer des versions majeures incompatibles.

### Scripts d'installation des paquets

npm 11 bloque par défaut les scripts exécutés à l'installation d'un paquet (vecteur d'attaque connu de la chaîne d'approvisionnement).
`bcrypt` en déclare un, mais il est livré avec une version précompilée : il fonctionne sans que son script soit autorisé (vérifié le 07/10/2026). Le blocage est donc conservé.
