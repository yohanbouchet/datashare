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
| Téléversement | US01 | Fichier valide ; > 1 Go ; extension interdite ; durée hors 1–7 ; sans connexion | Unitaire + e2e | 201 + jeton ; 413 ; 400 ; 400 ; 401 | 🔜 |
| Téléchargement | US02 | Lien valide ; lien inconnu ; lien expiré ; mot de passe juste / faux | Unitaire + e2e | 200 ; 404 ; 410 ; 200 / 401 | 🔜 |
| Historique | US05 | Fichiers de l'utilisateur seulement ; filtre actifs / expirés | Unitaire + e2e | Aucun fichier d'un autre compte | 🔜 |
| Suppression | US06 | Son propre fichier ; fichier d'un autre | Unitaire + e2e | 204 et fichier effacé du disque ; 404 | 🔜 |
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
