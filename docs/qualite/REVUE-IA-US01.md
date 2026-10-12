# Revue technique du code écrit par l'IA – US01 (téléversement d'un fichier)

> Rapport de revue du code produit par le copilote IA, exigé par l'énoncé (étape 4 et fiche d'autoévaluation).
> Il complète la section « Utilisation de l'IA dans le développement » de la documentation technique.

## 1. Périmètre

J'ai confié au copilote IA Claude Code (Anthropic), utilisé dans VS Code, le développement de l'US01 (téléversement d'un fichier), côté back et côté front.
Son code est identifié dans l'historique Git par les commits `feat(ai)`, `test(ai)` et `refactor(ai)`.

| Date | Commit | Contenu |
|---|---|---|
| 09/10/2026 | `2d628b4 feat(ai)` | Back : route `POST /api/files` — `storage.service.ts` (réception en flux et rangement sur le disque), `request-size.guard.ts` (taille annoncée), `upload-exception.filter.ts` (nettoyage en cas d'erreur), `dto/upload-file.dto.ts` (règles du formulaire), `create` dans `files.service.ts` et `files.controller.ts` |
| 09/10/2026 | `9234982 test(ai)` | Tests unitaires du téléversement |
| 10/10/2026 | `3a52d44 feat(ai)` | Front : carte de téléversement (`UploadCard.tsx`), choix du fichier depuis l'accueil, barre de progression, lien de partage à copier |
| 10/10/2026 | `d3f9eab refactor(ai)` | Composant `FileSummary` partagé avec la page de téléchargement (US02) |
| 11/10/2026 | `e9fffa2 feat(ai)` | Correctif issu de la revue (voir section 4) |

## 2. Méthode de supervision

Mon rôle a été de fixer les règles à respecter (celles de l'énoncé), de relire chaque fichier pièce par pièce, de poser des questions jusqu'à pouvoir expliquer chaque choix, de vérifier le fonctionnement par les tests et par des essais manuels, et de décider des corrections.

| Étape | Ce que j'ai fait |
|---|---|
| Consignes | Règles de l'énoncé (1 Go, extensions interdites, mot de passe de 6 caractères minimum, expiration de 1 à 7 jours, 7 par défaut, tags), maquette Figma « Téléversement », conventions du projet (code en anglais, commentaires en français, en-tête de fichier) |
| Relecture | Lecture du trajet d'un envoi, pièce par pièce (vigile JWT → contrôle de la taille → réception → règles → enregistrement → nettoyage), avec mes questions et leurs réponses consignées |
| Vérification | Tests automatiques (unitaires, de bout en bout, Cypress), essais manuels (`curl`, navigateur), test de performance k6, audit Lighthouse |
| Décision | Chaque correctif a été décidé après un constat, puis vérifié par les tests avant d'être commité |

## 3. Grille de revue

| Critère | Points vérifiés | Verdict |
|---|---|---|
| Conformité à l'énoncé | 1 Go maximum ; extensions `.exe .msi .bat .cmd .com .scr .ps1 .vbs .js .jar .sh` refusées ; mot de passe facultatif de 6 caractères minimum, haché ; expiration de 1 à 7 jours, 7 par défaut ; tags facultatifs (30 caractères, sans doublon) ; lien de partage renvoyé | ✅ |
| Sécurité | Route réservée aux utilisateurs connectés (401) ; taille contrôlée à 3 niveaux (navigateur, taille annoncée, octets réellement reçus → 413) ; extension refusée **avant** toute écriture ; nom de stockage aléatoire, jamais le nom d'origine (pas de traversée de chemin) ; jeton de lien de 256 bits ; mot de passe haché avec bcrypt ; fichier reçu effacé si une donnée est invalide (aucun fichier orphelin) ; nombre de champs limité (déni de service) | ✅ |
| Lisibilité et maintenabilité | Une responsabilité par fichier ; stockage isolé dans `StorageService` (passage à S3 sans toucher au reste) ; en-têtes et commentaires en français | ✅ après correctifs (section 4) |
| Tests | 28 tests unitaires sur les pièces de l'US01, 5 tests de bout en bout de la route, 3 tests du composant React, scénario Cypress « téléversement puis téléchargement » | ✅ |
| Performance | Réception en flux : 30 envois de 10 Mo en une minute, 100 ms au 95e centile, mémoire de l'API stable (PERF.md) | ✅ |
| Accessibilité et messages | Messages d'erreur en français, liés à leur champ ; barre de progression annoncée aux lecteurs d'écran | ✅ après correctifs (section 4) |

## 4. Constats et correctifs

| Date | Constat | Origine | Correctif |
|---|---|---|---|
| 09/10/2026 | Noms du code en français mélangés avec des noms anglais (`TailleRequeteGuard`, `TeleversementFilter`…) | Remarque du mentor | Code renommé en anglais, commentaires conservés en français (`8fdd234`) |
| 10/10/2026 | Commentaires trop longs, difficiles à lire | Ma relecture | Commentaires recoupés à 80 caractères, comme le code (`a779cb5`) |
| 10/10/2026 | « Pourquoi limiter à 20 champs ? », « Pourquoi `unlink` pour supprimer ? », « Comment passer à un stockage S3 ? » | Mes questions de relecture | Réponses justifiées dans les commentaires ; procédure de migration vers S3 dans MAINTENANCE.md (`67f205c`) |
| 10/10/2026 | La liste d'extensions ne protège ni des virus ni des contenus illicites | Ma relecture | Limite assumée et documentée : analyse antivirus en évolution (`412b17c`), section « RGPD et contenus illicites » dans SECURITY.md |
| 10/10/2026 | Un nom de fichier accentué ou en caractères chinois est bien accepté, mais mal restitué au téléchargement | Ma question, puis un test manuel | Nom exact transmis en UTF-8 au téléchargement (`filename*`, anomalie du 10/10 dans TESTING.md) |
| 10/10/2026 | Plusieurs messages d'erreur par champ, certains en anglais | Test manuel (`curl`) | Un seul message par champ, en français (`1ad3317`) |
| 11/10/2026 | Le message d'erreur d'un champ reste affiché après correction de la saisie | Anomalie relevée le 08/10 | Message effacé dès que le champ est modifié (`e9fffa2`) |
| 11/10/2026 | Contraste insuffisant du bouton « Changer » et des boutons orange (norme WCAG) | Audit Lighthouse | Couleurs foncées dans les variables CSS (`1ad7acb`) |

Les correctifs n'ont pas été commités sous la forme `fix: … (revue humaine)` : le tableau ci-dessus fait le lien entre chaque constat et son commit.

## 5. Limites connues

| Limite | Suite prévue |
|---|---|
| La liste d'extensions se contourne (fichier renommé, archive `.zip`) | Analyse antivirus (ClamAV) de chaque fichier reçu (SECURITY.md) |
| Aucun quota par utilisateur : un compte peut remplir le disque | Quota par compte (MAINTENANCE.md, évolutions) |
| Stockage sur le disque d'un seul serveur | Migration vers S3 (MAINTENANCE.md) |

## 6. L'IA en dehors de l'US01

En dehors de l'US01, j'ai écrit le code des fonctionnalités moi-même, guidé pas à pas par l'IA, qui m'expliquait chaque ligne et relisait mon travail.
L'IA a aussi rédigé les tests automatisés, les scripts de déploiement et de contrôle de sécurité, ainsi qu'une partie de la documentation et des commentaires ; je les ai relus et validés.
Ces contributions sont, elles aussi, identifiées par le suffixe `(ai)` dans l'historique Git.
