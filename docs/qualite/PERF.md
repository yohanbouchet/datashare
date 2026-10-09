# PERF – Performance de DataShare

> Document tenu à jour tout au long du projet. Les mesures sont réalisées à l'étape 5.

## 1. Test de charge sur un endpoint critique (back-end)

🔜 Outil : **k6**, exécuté dans un conteneur Docker (image `grafana/k6`, rien à installer sur la machine).

| Endpoint | Scénario | Métriques suivies | Résultat |
|---|---|---|---|
| `POST /api/files` (téléversement) | 🔜 | Temps de réponse (moyen, p95), taux d'erreur, débit | 🔜 |
| `POST /api/download/:token` (téléchargement) | 🔜 | Temps de réponse, débit | 🔜 |

## 2. Budget de performance côté front

🔜 Outils : **Lighthouse** (intégré à Chrome) et analyse du poids du bundle (`npm run build`).

| Indicateur | Budget visé | Mesure |
|---|---|---|
| Poids du JavaScript livré | 🔜 | 🔜 |
| Score Lighthouse Performance | 🔜 | 🔜 |

## 3. Logs structurés et métriques clés

🔜 Logs de l'API au format JSON, avec pour chaque requête : route, code HTTP, **temps de réponse**,
et pour les transferts : **taille des fichiers**.

## 4. Choix de conception favorables à la performance (déjà en place ou prévus)

| Choix | État | Effet |
|---|---|---|
| Téléversement et téléchargement en flux (*streaming*) | 🔜 étape 4 | Un fichier de 1 Go n'est jamais chargé entièrement en mémoire |
| Téléchargement confié au navigateur | 🔜 étape 4 | Écriture directe sur le disque de l'utilisateur |
| Contrôle de la taille pendant la réception | 🔜 étape 4 | Arrêt immédiat au-delà de 1 Go |
| Index sur la date d'expiration | ✅ migration `CreateFilesAndTags` | Purge rapide même avec beaucoup de fichiers |
| Statut « expiré » calculé et non stocké | ✅ conception | Aucune mise à jour massive à minuit |

## 5. Analyse et pistes d'optimisation

🔜 Après les mesures de l'étape 5.
