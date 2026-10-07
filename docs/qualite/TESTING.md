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
| Inscription | US03 | Compte créé ; email déjà utilisé ; email invalide ; mot de passe < 8 caractères ; mot de passe non renvoyé | Unitaire + e2e | 201 ; 409 ; 400 ; 400 ; aucune empreinte dans la réponse | 🔜 |
| Connexion | US04 | Identifiants corrects ; mot de passe faux ; email inconnu | Unitaire + e2e | 200 + JWT ; 401 avec le même message dans les deux cas d'échec | 🔜 |
| Route protégée | US04 | Avec JWT valide ; sans JWT ; JWT expiré | e2e | 200 ; 401 ; 401 | 🔜 |
| Téléversement | US01 | Fichier valide ; > 1 Go ; extension interdite ; durée hors 1–7 ; sans connexion | Unitaire + e2e | 201 + jeton ; 413 ; 400 ; 400 ; 401 | 🔜 |
| Téléchargement | US02 | Lien valide ; lien inconnu ; lien expiré ; mot de passe juste / faux | Unitaire + e2e | 200 ; 404 ; 410 ; 200 / 401 | 🔜 |
| Historique | US05 | Fichiers de l'utilisateur seulement ; filtre actifs / expirés | Unitaire + e2e | Aucun fichier d'un autre compte | 🔜 |
| Suppression | US06 | Son propre fichier ; fichier d'un autre | Unitaire + e2e | 204 et fichier effacé du disque ; 404 | 🔜 |
| Parcours complet | — | Inscription → connexion → téléversement → téléchargement | Cypress | Parcours sans erreur | 🔜 étape 5 |

## 3. Résultats

| Date | Projet | Tests | Résultat | Couverture |
|---|---|---|---|---|
| 06/10/2026 | backend | 2 tests d'exemple (générateur) | ✅ 2/2 | — |

🔜 Rapport de couverture et capture d'écran (étape 5).
