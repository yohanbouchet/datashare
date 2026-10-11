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
| Fichier rattaché à un compte existant | ✅ | Clé étrangère `files.user_id` → `users.id` (`ON DELETE CASCADE`) |
| Lien de partage unique | ✅ | Contrainte `UNIQUE` sur `files.token` (64 caractères) ; génération aléatoire à l'US01 |
| Nom de stockage généré et unique | ✅ | Colonne `files.storage_name` (`UNIQUE`), distincte du nom d'origine |
| Empreinte du mot de passe de fichier jamais lue par défaut | ✅ | `select: false` sur `files.password_hash` (facultatif) |
| Tags sans doublon et supprimés avec leur fichier | ✅ | `UNIQUE (file_id, label)` et clé étrangère `ON DELETE CASCADE` |
| Structure de la base versionnée | ✅ | Migrations TypeORM ; `synchronize: false` interdit toute modification automatique des tables |
| Protection contre les injections SQL | ✅ | Requêtes paramétrées générées par TypeORM (les valeurs ne sont jamais concaténées au SQL) |

### API et navigateur

| Mesure | État | Détail |
|---|---|---|
| CORS restreint | ✅ | Seule l'origine du front (`FRONTEND_URL`) est autorisée ; jamais `*` |
| Mots de passe hachés et salés (bcrypt) | ✅ | US03 : coût 12 (≈ 0,2 s par hachage, freine la force brute) ; sel aléatoire intégré ; seule l'empreinte `$2b$12$…` est stockée |
| Aucune empreinte dans les réponses | ✅ | La réponse d'inscription est construite champ par champ (`id`, `email`, `createdAt`) : `select: false` ne protège que les lectures en base, pas l'objet qui vient d'être créé |
| Doublon d'email simultané | ✅ | Erreur PostgreSQL `23505` (contrainte UNIQUE) convertie en 409, au lieu d'une erreur 500 |
| Authentification par JWT à durée limitée | ✅ | US04 : jeton signé (HS256) avec `JWT_SECRET` (clé aléatoire de 48 octets, hors du code), valable 1 h (`JWT_EXPIRES_IN`) ; il ne contient que `sub` (id) et `email`, jamais de donnée sensible (son contenu est lisible, seule la signature le protège) |
| Routes protégées par une garde JWT | ✅ | `JwtAuthGuard` vérifie la signature et l'expiration avant d'entrer dans la route ; jeton absent, mal formé, modifié ou expiré → 401 ; l'identité est lue dans le jeton signé (`request.user`), jamais dans un paramètre du client |
| Message de connexion identique en cas d'échec | ✅ | « Email ou mot de passe incorrect » (401) dans les deux cas : on ne peut pas deviner quels emails ont un compte (énumération) |
| Durée de réponse identique en cas d'échec | ✅ | Si l'email est inconnu, bcrypt compare quand même avec une empreinte factice : ≈ 0,21 s dans les deux cas (mesuré), le chronomètre ne révèle rien |
| Empreinte lue uniquement pour la connexion | ✅ | `findByEmailWithPassword` est la seule requête qui demande `password_hash` |
| Validation des données côté serveur | ✅ | DTO + `class-validator`, `ValidationPipe` global : toute donnée invalide est refusée (400) avant d'atteindre le service |
| Champs inattendus refusés | ✅ | `whitelist` + `forbidNonWhitelisted` : un client ne peut pas ajouter un champ comme `role` ou `id` (400) |
| Email normalisé | ✅ | Espaces retirés et minuscules avant contrôle : une seule adresse = un seul compte |
| Longueur du mot de passe bornée | ✅ | 8 caractères minimum (US03), 72 maximum (limite de bcrypt, au-delà les caractères seraient ignorés) |
| En-têtes de sécurité HTTP (`helmet`) | ✅ | Appliqués à toutes les réponses : `X-Powered-By` supprimé (technologie du serveur masquée), `X-Content-Type-Options: nosniff`, `X-Frame-Options` et `frame-ancestors` (anti-clickjacking), `Strict-Transport-Security` (HTTPS imposé en production), `Referrer-Policy: no-referrer` (les liens de partage ne fuient pas vers d'autres sites), `Content-Security-Policy` |
| Accès limité à ses propres fichiers | ✅ | US05 : la liste est toujours filtrée sur l'identifiant du JWT, jamais sur un paramètre (un paramètre `userId` ajouté à l'adresse est refusé, 400) ; US06 : recherche par numéro ET propriétaire, le fichier d'un autre renvoie 404 (et non 403) pour ne pas révéler son existence |
| Suppression complète et ordonnée | ✅ | US06 : ligne en base (tags en cascade) puis fichier sur le disque ; une panne entre les deux laisse au pire un fichier orphelin inaccessible, jamais un lien vers un fichier absent |
| Identifiant d'adresse contrôlé | ✅ | US06 : id non numérique ou hors limites → 404, sans requête en base (plus d'erreur 500) |
| Historique sans donnée sensible | ✅ | US05 : la réponse est construite champ par champ ; l'empreinte du mot de passe de fichier devient un simple booléen `isProtected` |
| Paramètre de filtre contrôlé | ✅ | US05 : `status` limité à `active`, `expired` ou `all` (DTO), sinon 400 |
| Lien de partage non prédictible | ✅ | US01 : jeton de 32 octets aléatoires (`crypto.randomBytes`, 256 bits) encodé en base64url (43 caractères), sans rapport avec l'identifiant interne ; contrainte `UNIQUE` en base |
| Contrôle de la taille | ✅ back · 🔜 front | US01 : 1 Go maximum, à trois niveaux : dans le navigateur (avant l'envoi, à venir), à l'arrivée (`Content-Length` annoncé > 1 Go → 413 sans lire le contenu) et pendant la réception (multer interrompt au-delà de 1 Go → 413, morceau reçu effacé) |
| Extensions exécutables refusées | ✅ | US01 : `.exe .msi .bat .cmd .com .scr .ps1 .vbs .js .jar .sh` (liste configurable, `FORBIDDEN_EXTENSIONS`), quelle que soit la casse ; refus avant toute écriture sur le disque (400) |
| Analyse antivirus des fichiers reçus | 🔜 étape 5 (si le planning le permet) | Limite assumée de la liste d'extensions : elle se contourne (exécutable renommé, placé dans un `.zip`) et ne détecte pas un document piégé (PDF, Office). Évolution : analyser chaque fichier juste après réception avec **ClamAV** (antivirus libre, conteneur Docker `clamav/clamav`), refus et effacement si une menace est détectée ; base de signatures mise à jour automatiquement (`freshclam`) |
| Aucun fichier orphelin | ✅ | US01 : si une donnée est invalide ou si l'enregistrement échoue, le fichier déjà reçu est effacé du disque (filtre d'exceptions de la route) ; erreur imprévue → 500 sans détail technique, détail dans le journal |
| Réception en flux | ✅ | US01 : le fichier est écrit sur le disque au fil de la réception (jamais 1 Go en mémoire) ; un seul fichier et 20 champs au plus par envoi |
| Mot de passe de fichier haché | ✅ | US01 : bcrypt coût 12 (comme les comptes), 6 à 72 caractères ; seule l'empreinte est stockée, la réponse indique seulement `isProtected` |
| Fichiers stockés sous un nom généré | ✅ | US01 : nom aléatoire de 64 caractères hexadécimaux, jamais le nom d'origine (pas de doublon, pas d'attaque par chemin `../`, nom non devinable) ; le service de stockage refuse en plus tout nom contenant un chemin (défense en profondeur) |
| Accès au disque centralisé | ✅ | Un seul service (`StorageService`) lit et écrit les fichiers, dans le dossier `UPLOAD_DIR` (hors de Git) |
| Mot de passe de fichier hors de l'URL | ✅ | US02 : envoyé dans le corps d'une requête POST, jamais dans l'adresse (historique, journaux, favoris) |
| Mot de passe de fichier toujours revérifié | ✅ | US02 : la route de téléchargement revérifie le mot de passe (bcrypt), même après la route `verify`, qui ne sert qu'au confort du front ; sans mot de passe valide, le fichier n'est jamais ouvert |
| Page de téléchargement sans donnée sensible | ✅ | US02 : nom, taille, type, date d'expiration et `isProtected` seulement ; jamais l'empreinte, le nom de stockage ni le propriétaire |
| Lien expiré ou invalide | ✅ | US02 : jeton inconnu → 404, date dépassée → 410 ; le statut est calculé à chaque demande, même si la purge n'est pas encore passée |
| Fichier enregistré, jamais ouvert dans la page | ✅ | US02 : `Content-Disposition: attachment` ; type (`Content-Type`) déduit de l'extension par le serveur, sans se fier au type déclaré à l'envoi ; avec `X-Content-Type-Options: nosniff` (helmet), un fichier HTML ou SVG piégé ne peut pas s'exécuter sur le domaine de l'API |
| Envoi en flux | ✅ | US02 : le fichier est lu sur le disque et envoyé morceau par morceau (jamais entièrement en mémoire) ; fichier absent du disque → 404 avant tout envoi |
| Documentation de l'API non publiée en production | ✅ | La page OpenAPI (`/api/docs`) n'existe que si `API_DOCS=true` (développement) : en production, la carte complète des routes n'est pas exposée |
| Limitation des tentatives | 🔜 étape 5 | `@nestjs/throttler` sur la connexion et la vérification de mot de passe de fichier |

### Front-end

| Mesure | État | Détail |
|---|---|---|
| Conservation du JWT | ✅ | `sessionStorage` : survit au rechargement, effacé à la fermeture de l'onglet ; combiné à la durée de vie d'1 h du jeton. Évolution possible : cookie `HttpOnly` (inaccessible au JavaScript), qui demanderait une protection CSRF |
| Session vérifiée au démarrage | ✅ | Le jeton conservé est contrôlé par `GET /api/auth/me` ; jeton expiré ou invalide → effacé |
| Jeton jamais dans l'adresse | ✅ | Envoyé uniquement dans l'en-tête `Authorization` par le service API |

### Risques web classiques

| Risque | Protection |
|---|---|
| Injection SQL | Requêtes paramétrées (TypeORM) |
| XSS (injection de code dans les pages) | React échappe automatiquement le texte affiché ; pas d'insertion de HTML brut |
| CSRF (requête forcée depuis un autre site) | Le JWT est envoyé dans l'en-tête `Authorization`, pas dans un cookie : un site tiers ne peut pas l'ajouter à la place de l'utilisateur |

### Conformité : RGPD et contenus illicites

| Sujet | Dans le MVP | Pour une mise en production |
|---|---|---|
| Minimisation des données (RGPD) | Seuls l'email et l'empreinte du mot de passe sont conservés pour un compte | — |
| Durée de conservation limitée | Fichiers expirés après 1 à 7 jours, effacés du disque par la purge ; leur ligne d'historique (nom, taille, dates) est supprimée après `HISTORY_RETENTION_DAYS` jours (30 par défaut, réglable) | Durée de conservation des comptes inactifs à définir |
| Sécurité des données | Hachage bcrypt, JWT à durée limitée, secrets hors du code ; HTTPS en production | Chiffrement du stockage (ex. *bucket* S3 chiffré) |
| Droits des personnes | — | Suppression de son compte et de ses fichiers (droit à l'effacement), export de ses données ; page de confidentialité et mentions légales |
| Localisation | Serveur de développement local | Hébergement dans l'Union européenne (ex. région AWS `eu-west-3`, Paris) |
| Contenus illicites | Compte obligatoire pour déposer (traçabilité), expiration de 7 jours au plus, purge automatique | Statut d'**hébergeur** (LCEN, *Digital Services Act*) : pas d'obligation de tout surveiller, mais obligation d'agir promptement sur signalement → bouton « signaler ce fichier », procédure de retrait, conservation des journaux de dépôt ; une détection automatique (comparaison d'empreintes de contenus illicites connus) est hors de portée du MVP |

## 2. Correspondance avec l'OWASP Top 10:2025

L'[OWASP Top 10](https://top10.owasp.org/2025) recense les 10 risques de sécurité les plus critiques des applications web. Pour chacun : ce que DataShare fait déjà, et ce qui reste à faire.

| Risque OWASP | Mesures en place dans DataShare | Limites ou évolutions |
|---|---|---|
| **A01 Broken Access Control** (contrôle d'accès défaillant) | Garde JWT sur toutes les routes privées ; identité lue dans le jeton signé, jamais dans un paramètre (un `userId` envoyé est refusé, 400) ; recherche par numéro **et** propriétaire, 404 pour le fichier d'un autre ; lien de partage non devinable (256 bits) ; vérifié par les tests e2e (Claire ne voit ni ne supprime les fichiers de Bob) | — |
| **A02 Security Misconfiguration** (mauvaise configuration) | En-têtes helmet ; CORS limité au front ; secrets dans `.env`, hors de Git ; démarrage refusé si une variable manque ; base exposée seulement sur `127.0.0.1` ; documentation OpenAPI désactivée en production ; erreurs 500 sans détail technique | Configuration de production (HTTPS, Docker) : étape 5 |
| **A03 Software Supply Chain Failures** (chaîne d'approvisionnement) | `package-lock.json` (versions exactes) ; `npm audit` à 0 vulnérabilité ; outil inutile retiré ; scripts d'installation bloqués par npm 11 ; versions LTS suivies (MAINTENANCE.md, endoflife.date) | Scan des images Docker par `trivy` (étape 5) ; mise à jour automatisée (Dependabot) en évolution |
| **A04 Cryptographic Failures** (défaillances cryptographiques) | Mots de passe des comptes et des fichiers hachés et salés (bcrypt, coût 12) ; JWT signé (HS256, clé aléatoire de 48 octets) ; jetons et noms de stockage issus d'un générateur cryptographique (`crypto.randomBytes`) | HTTPS obligatoire en production (en-tête HSTS déjà envoyé) ; chiffrement du stockage (*bucket* chiffré) en évolution |
| **A05 Injection** | Requêtes SQL paramétrées (TypeORM) ; validation stricte de toutes les entrées (DTO, liste blanche des champs) ; React échappe le texte affiché ; noms de fichiers jamais utilisés comme chemin ; téléchargement en `attachment` + `nosniff` (un fichier HTML ne s'exécute pas) | — |
| **A06 Insecure Design** (conception non sécurisée) | Sécurité intégrée dès la conception (ce document, tenu à jour brique par brique) ; stockage isolé dans un seul service ; 3 niveaux de contrôle de la taille ; expiration et purge automatiques ; principe du moindre privilège (colonnes sensibles en `select: false`) | — |
| **A07 Authentication Failures** (authentification défaillante) | Mot de passe de 8 caractères minimum ; même message et même durée de réponse pour un email inconnu ou un mauvais mot de passe (pas d'énumération) ; JWT à durée limitée (1 h) ; session effacée à la fermeture de l'onglet ; **limitation des tentatives** (voir § 1) | Authentification à deux facteurs, verrouillage temporaire du compte : évolutions |
| **A08 Software or Data Integrity Failures** (intégrité) | JWT dont la signature est vérifiée à chaque requête (un jeton modifié est refusé, testé) ; migrations versionnées et rejouées par les tests ; fichiers servis tels quels (identiques octet pour octet, testé) | Signature des images Docker, CI : évolutions |
| **A09 Security Logging and Alerting Failures** (journalisation et alertes) | Erreurs imprévues consignées dans le journal de l'API (détail côté serveur seulement) ; purge journalisée | Journaux structurés JSON (étape 5) ; centralisation et alertes (Loki, Grafana) en évolution |
| **A10 Mishandling of Exceptional Conditions** (gestion des cas exceptionnels) | Toute erreur pendant un téléversement efface le fichier reçu (aucun orphelin) ; id hors limites → 404 au lieu de 500 ; fichier absent du disque → 404 avant tout envoi ; une panne sur un fichier n'arrête pas la purge ; reprise sans risque (opérations rejouables) | — |

## 3. Scans de sécurité des dépendances

### Constat initial (07/10/2026, `npm audit`)

| Projet | Critique | Haute | Moyenne | Basse |
|---|---|---|---|---|
| backend | 0 | 2 | 1 | 2 |
| frontend | 0 | 0 | 0 | 0 |

Les vulnérabilités du back-end concernent des dépendances **indirectes**, principalement des outils de développement installés par le générateur NestJS (`undici`, `tmp`, `@nestjs/mau`, `inquirer`, `external-editor`).

### Analyse et décision (11/10/2026)

| Paquet vulnérable | Gravité | Arrive par | Présent en production ? | Décision |
|---|---|---|---|---|
| `undici` 6.20 (valeurs aléatoires insuffisantes ; décompression sans limite) | Haute | `@nestjs/mau` | Non (outil de développement) | Supprimé avec `@nestjs/mau` |
| `tmp` 0.0.33 (écriture via lien symbolique ; traversée de chemin) | Haute | `@nestjs/mau` → `inquirer` → `external-editor` | Non | Supprimé avec `@nestjs/mau` |
| `@nestjs/mau`, `inquirer`, `external-editor` | Moyenne / basse | générateur NestJS | Non | `@nestjs/mau` (outil de déploiement vers le cloud payant de NestJS, jamais utilisé) désinstallé |

**Résultat : `npm audit` → 0 vulnérabilité dans le back-end comme dans le front-end** (11/10/2026), compilation et 75 tests unitaires vérifiés après la suppression.
Principe appliqué : **retirer ce qui ne sert pas** réduit la surface d'attaque, plutôt que de mettre à jour un outil inutile.
Le scan des images Docker par `trivy` complétera cette analyse (étape 5, Docker).

⚠️ La commande `npm audit fix --force` n'est pas utilisée : elle peut installer des versions majeures incompatibles.

### Scripts d'installation des paquets

npm 11 bloque par défaut les scripts exécutés à l'installation d'un paquet (vecteur d'attaque connu de la chaîne d'approvisionnement).
`bcrypt` en déclare un, mais il est livré avec une version précompilée : il fonctionne sans que son script soit autorisé (vérifié le 07/10/2026). Le blocage est donc conservé.
