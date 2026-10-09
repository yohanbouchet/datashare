# TESTING – Plan de tests de DataShare

> Document tenu à jour tout au long du projet : les tests sont écrits avec chaque fonctionnalité.

## 1. Outils et types de tests

| Type | Rôle | Outil | Commande |
|---|---|---|---|
| Unitaire (back) | Tester une pièce isolée (service, contrôleur), sans base ni réseau | Vitest | `npm test` (dans `backend/`) |
| Intégration / e2e API (back) | Tester l'API complète avec de vraies requêtes HTTP et la base | Vitest + supertest | `npm run test:e2e` |
| Unitaire (front) | Tester un composant React | Vitest | 🔜 |
| End-to-end (navigateur) | Rejouer un parcours utilisateur complet | Cypress | 🔜 étape 5 |
| Couverture | Mesurer la part du code exécutée par les tests (objectif ≥ 70 %) | Vitest coverage | `npm run test:cov` |

## 2. Plan de tests des fonctionnalités critiques

| Fonctionnalité | US | Cas testés | Type | Critère d'acceptation | État |
|---|---|---|---|---|---|
| Inscription | US03 | Compte créé ; email déjà utilisé ; email invalide ; mot de passe < 8 caractères ; mot de passe non renvoyé | Unitaire + e2e | 201 ; 409 ; 400 ; 400 ; aucune empreinte dans la réponse | ✅ unitaire (8 tests) · 🔜 e2e |
| Connexion | US04 | Identifiants corrects ; mot de passe faux ; email inconnu (comparaison factice) | Unitaire + e2e | 200 + JWT ; 401 avec le même message dans les deux cas d'échec, sans jeton délivré | ✅ unitaire (3 tests) · 🔜 e2e |
| Route protégée | US04 | Avec JWT valide ; sans JWT ; mauvais format ; JWT invalide ou expiré | Unitaire + e2e | 200 ; 401 ; 401 ; 401 | ✅ unitaire (garde : 4 tests) · 🔜 e2e |
| Téléversement | US01 | Fichier valide (avec ou sans mot de passe et tags) ; > 1 Go annoncé ou réel ; extension interdite ; durée hors 1–7 ; mot de passe < 6 ; tag trop long, en double, > 10 ; sans fichier ; sans connexion ; fichier effacé en cas d'erreur | Unitaire + e2e | 201 + jeton ; 413 ; 400 ; 400 ; 400 ; 400 ; 400 ; 401 ; aucun fichier orphelin | ✅ unitaire (27 tests) · 🔜 e2e |
| Téléchargement | US02 | Lien valide ; lien inconnu ; lien expiré ; mot de passe juste / faux | Unitaire + e2e | 200 ; 404 ; 410 ; 200 / 401 | 🔜 |
| Historique | US05 | Fichiers de l'utilisateur seulement ; filtre actifs (par défaut) / expirés / tous ; filtre invalide ; sans connexion | Unitaire + e2e | Aucun fichier d'un autre compte ; aucune empreinte dans la réponse ; 400 ; 401 | ✅ unitaire (5 tests) · 🔜 e2e |
| Suppression | US06 | Son propre fichier ; fichier d'un autre ; id invalide ou hors limites ; sans connexion | Unitaire + e2e | 204, ligne, tags et fichier effacés (base puis disque) ; 404 sans rien supprimer ; 404 ; 401 | ✅ unitaire (3 tests) · 🔜 e2e |
| Parcours complet | — | Inscription → connexion → téléversement → téléchargement | Cypress | Parcours sans erreur | 🔜 étape 5 |

## 3. Résultats

| Date | Projet | Tests | Résultat | Couverture |
|---|---|---|---|---|
| 06/10/2026 | backend | 2 tests d'exemple (générateur) | ✅ 2/2 | — |
| 07/10/2026 | backend | Validation de l'inscription, test manuel `curl` : données valides (201, email normalisé), email invalide + mot de passe court (400, 2 messages), champ `role` ajouté (400) | ✅ 3/3 | — |
| 07/10/2026 | backend | Inscription, test manuel `curl` : compte créé (201, réponse sans empreinte), même email en majuscules (409), empreinte `$2b$12$…` en base | ✅ 3/3 | — |
| 08/10/2026 | backend | Tests unitaires de l'inscription avec doublures : AuthService (compte créé sans empreinte, mot de passe haché, email déjà pris → 409 sans création, doublon simultané 23505 → 409, autres erreurs remontées), UsersService (recherche, création), AuthController (délégation) | ✅ 9/9 | auth.service.ts : 100 % des lignes |
| 08/10/2026 | backend | Connexion, test manuel `curl` : identifiants corrects (200 + JWT, email en majuscules accepté), mauvais mot de passe (401), email inconnu (401, même message et même durée ≈ 0,21 s) | ✅ 3/3 | — |
| 08/10/2026 | backend | Tests unitaires de la connexion : JWT délivré avec `sub` et `email` seulement, mauvais mot de passe → 401 sans jeton, email inconnu → même message et comparaison bcrypt factice effectuée | ✅ 12/12 (total) | — |
| 08/10/2026 | backend | Garde JWT et `GET /api/auth/me` : tests unitaires (4 cas de la garde, routes login et me du contrôleur) + test manuel `curl` (jeton valide 200, sans jeton 401, jeton modifié d'un caractère 401) | ✅ 18/18 (total) · ✅ 3/3 manuel | — |
| 08/10/2026 | frontend | Session au rechargement (F5), test manuel navigateur : jeton valide → en-tête « Mon espace » ; jeton modifié → `GET /api/auth/me` 401, jeton effacé, en-tête « Se connecter » | ✅ 2/2 | — |
| 08/10/2026 | frontend | Page Créer un compte, test manuel navigateur : champs vides (messages email et mot de passe), mot de passe de 5 caractères, vérification différente, email déjà utilisé (bandeau « Cet email est déjà utilisé » renvoyé par l'API), nouveau compte → page Connexion avec bandeau « Ton compte est créé » | ✅ 5/5 | — |
| 09/10/2026 | backend | Historique `GET /api/files` : tests unitaires (filtre utilisateur toujours présent, filtres actifs / expirés / tous, réponse sans empreinte avec `isExpired`, `isProtected` et tags, délégation du contrôleur) | ✅ 23/23 (total) | — |
| 09/10/2026 | backend | Historique, test manuel `curl` avec des données de test : par défaut 2 fichiers actifs, `status=expired` 1 fichier, `status=all` 3 fichiers, jamais le fichier d'un autre compte ni d'empreinte ; filtre invalide (400, message en français) ; paramètre `userId` ajouté (400) ; sans jeton (401) | ✅ 6/6 | — |
| 09/10/2026 | backend | Suppression `DELETE /api/files/:id`, test manuel `curl` : fichier d'un autre compte (404, intact), son fichier (204 : ligne, tag et fichier du disque effacés), 2e suppression (404), fichier absent du disque (204), id `abc` (404), id `99999999999` (500 → corrigé : 404), id `0` et `-5` (404), sans jeton (401) | ✅ 9/9 après correction | — |
| 09/10/2026 | backend | Tests unitaires de la suppression : recherche par numéro ET propriétaire, base puis disque (ordre vérifié), 404 sans suppression, 404 sans requête pour un id hors limites | ✅ 26/26 (total) | — |
| 09/10/2026 | backend | Téléversement `POST /api/files`, test manuel `curl` : fichier au nom accentué (201, 7 jours par défaut), mot de passe + 3 jours + 2 tags (201, empreinte `$2b$12$`, tags enregistrés), extension `.SH` (400), durée 9 (400), mot de passe court + tag en double + tag trop long (400, 3 messages), sans fichier (400), champ `userId` (400), sans jeton (401), `Content-Length` de 2 Go (413), 1,1 Go sans `Content-Length` (413) ; seuls les 2 fichiers acceptés restent sur le disque, noms de 64 caractères, jetons de 43 | ✅ 10/10 | — |
| 09/10/2026 | backend | Tests unitaires du téléversement : service (enregistrement, durée, jeton aléatoire, empreinte, tags, nom trop long), stockage (réglages multer, nom aléatoire, extensions, suppression sur un dossier temporaire, traversée de chemin), garde de taille, filtre d'exceptions (fichier effacé, 400, 413, 500), DTO (défauts, conversions, règles) ; contrôleur (upload, remove) | ✅ 53/53 (total) | — |

🔜 Rapport de couverture et capture d'écran (étape 5).

## 4. Anomalies détectées et corrigées

Anomalies relevées pendant le développement par les tests (automatiques et manuels), la relecture du code
ou les vérifications avant commit.

| Date | Anomalie | Détectée par | Cause | Correction |
|---|---|---|---|---|
| 05/10/2026 | Échec de connexion à la base juste après `docker compose up` | Test manuel (`psql`) | Conteneur encore en initialisation (`health: starting`) | Attente du healthcheck : `docker compose up -d --wait` |
| 05/10/2026 | Port de la base transmis comme texte (`"5432"`) au lieu d'un nombre | Relecture du code | `getOrThrow<number>` ne convertit pas, il ne fait qu'annoncer un type | Conversion explicite `Number(...)` (commit `826295d`) |
| 06/10/2026 | La page React affichait du HTML au lieu de la réponse de l'API | Test manuel (navigateur) | `VITE_API_URL` placée dans le `.env` racine, non lu par Vite : appel vers une adresse `undefined` | Variable déplacée dans `frontend/.env` ; principe « chaque application lit son `.env` » documenté |
| 06/10/2026 | Changement de la règle CORS sans effet apparent | Test manuel (navigateur) | Réponse servie depuis le cache du navigateur (code 304) | Test refait cache désactivé : blocage CORS confirmé |
| 07/10/2026 | API qui ne démarre pas après ajout de l'inscription | Test manuel (`curl` : connexion refusée) | `UsersModule` déclaré dans `controllers` au lieu de `imports` | Module déplacé dans `imports` |
| 07/10/2026 | Tests unitaires en échec après ajout de dépendances aux services | Tests unitaires | Les tests ne fournissaient pas les dépendances (base, services) | Doublures (mocks) de `UsersService`, du Repository et de `JwtService` |
| 08/10/2026 | La connexion répondait 201 au lieu de 200 | Vérification du code de retour (`curl`) | Code par défaut d'un POST dans NestJS | `@HttpCode(HttpStatus.OK)`, conforme au contrat d'interface |
| 08/10/2026 | Import inutile `import { request } from 'http'` dans le contrôleur | Relecture du code | Import automatique ajouté par l'éditeur pendant la saisie | Ligne supprimée ; relecture des imports ajoutée au contrôle avant commit |
| 08/10/2026 | Avertissement « Fast refresh only works when a file only exports components » | Analyse statique (Oxlint) | Le contexte React et son composant étaient exportés par le même fichier | Séparation en `AuthContext.ts` (contexte), `AuthProvider.tsx` (composant) et `useAuth.ts` (hook) |
| 08/10/2026 | Page entièrement blanche après l'ajout de « Mon espace » dans l'en-tête | Test manuel (navigateur) + Oxlint (`rules-of-hooks`) | Hook `useAuth()` appelé en dehors de la fonction du composant `Header` | Appel déplacé au début de la fonction du composant ; règle rappelée en commentaire |
| 08/10/2026 | Type `FormEvent` affiché barré dans l'éditeur | Relecture du code (signalée par l'éditeur) | `FormEvent` déclaré obsolète dans les types de React 19 | Remplacé par `SubmitEvent` |
| 08/10/2026 | Message d'erreur d'un champ resté affiché après correction de la saisie | Test manuel (navigateur) | La validation n'est recalculée qu'à l'envoi du formulaire | 🔜 Amélioration d'ergonomie prévue (étape 5) : effacer l'erreur d'un champ dès qu'il est modifié |
| 08/10/2026 | « Cannot access 'FileEntity' before initialization » à la génération de la migration | Vérification avant livraison (génération de migration sur une copie) | Import mutuel entre `FileEntity` et `Tag` en modules ESM : la classe est lue avant d'être définie | Type `Relation<…>` de TypeORM sur les propriétés de relation |
| 09/10/2026 | Compilation impossible : `FileEntity` et `Tag` importés depuis le mauvais fichier | Compilation TypeScript | Chaque classe doit être importée depuis le fichier où elle est écrite | Une ligne d'import par fichier (`user.entity`, `file.entity`, `tag.entity`) |
| 09/10/2026 | Paramètre inattendu (`?userId=2`) refusé avec un message en anglais (« property userId should not exist ») | Test manuel (`curl`) | Message par défaut de `forbidNonWhitelisted` (le refus 400 est correct, seule la langue diffère) | 🔜 Message en français prévu à l'étape 5 (option `exceptionFactory` du `ValidationPipe`) |
| 09/10/2026 | Suppression avec un id énorme (`99999999999`) : erreur 500 | Test manuel (`curl`, cas limite) | `ParseIntPipe` accepte le nombre, mais il dépasse la limite d'une colonne `integer` PostgreSQL (2 147 483 647) : la requête échoue | Vérification de l'intervalle (1 à 2 147 483 647) avant la requête → 404 ; test unitaire de non-régression |
