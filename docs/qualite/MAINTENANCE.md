# MAINTENANCE – Procédures de maintenance de DataShare

> Document tenu à jour tout au long du projet. Les commandes sont détaillées dans le [README](../../README.md).

## 1. Base de données

### Démarrer, arrêter, vérifier

| Action | Commande (racine du projet) |
|---|---|
| Démarrer et attendre que la base soit prête | `docker compose up -d --wait` |
| Vérifier l'état (`healthy` attendu) | `docker compose ps` |
| Arrêter (données conservées) | `docker compose stop` |
| Ouvrir une console SQL | `docker compose exec db psql -U datashare -d datashare` |

- Le conteneur redémarre seul après un redémarrage de la machine (`restart: unless-stopped`).
- Les données sont dans le volume Docker `datashare_db-data` : supprimer ou mettre à jour le conteneur ne les efface pas.
- ⚠️ `docker compose down -v` supprime aussi le volume, donc **toutes les données**.

### Faire évoluer la structure : les migrations

La structure de la base n'est jamais modifiée à la main ni automatiquement (`synchronize: false`) :
chaque changement est une **migration**, un fichier versionné dans `backend/src/database/migrations/`.

| Étape | Commande (dans `backend/`) | Effet |
|---|---|---|
| 1. Modifier une entité (`*.entity.ts`) | — | Décrit la structure voulue |
| 2. Générer la migration | `npm run migration:generate -- src/database/migrations/<NomExplicite>` | Compare les entités à la base réelle et écrit le SQL manquant |
| 3. Relire le fichier généré | — | Vérifier le SQL avant de l'appliquer (perte de données possible) |
| 4. Appliquer | `npm run migration:run` | Exécute les migrations en attente, dans une transaction |
| Retour arrière | `npm run migration:revert` | Annule la **dernière** migration appliquée (méthode `down`) |

- TypeORM enregistre les migrations appliquées dans la table `migrations` : une migration n'est jamais exécutée deux fois.
- ⚠️ Le `down` de la migration `CreateUsers` supprime la table `users` et tous les comptes.

**Parallèle avec l'infrastructure as code (Terraform)** : les migrations appliquent au schéma de la base
le même principe que Terraform à l'infrastructure.

| Terraform | Migrations TypeORM |
|---|---|
| `terraform plan` : compare le code à l'existant | `migration:generate` : compare les entités à la base réelle |
| `terraform apply` : applique les changements | `migration:run` : applique les migrations en attente |
| Fichier d'état (*state*) | Table `migrations` |
| `terraform fmt` | `npm run format` (Prettier) |

### Sauvegarde et restauration

🔜 À documenter (étape 5) : sauvegarde par `pg_dump`, restauration et test de restauration.

## 2. Mise à jour des dépendances

🔜 À documenter (étape 5) : procédure (`npm outdated`, mise à jour, tests, `npm audit`), fréquence et risques.

Repères déjà fixés :
- **Node.js 24 LTS** (support jusqu'en avril 2028) ; PostgreSQL 18.
- Les versions exactes sont verrouillées par les fichiers `package-lock.json` (installation reproductible).
- Les versions compatibles de NestJS et React ont été fixées par leurs générateurs officiels.

## 3. Journaux (logs)

| Sujet | État |
|---|---|
| Logs de l'API en JSON sur la sortie standard | 🔜 étape 5 |
| Rotation des journaux des conteneurs (`max-size`, `max-file` dans `docker-compose.yml`) | 🔜 étape 5 — par défaut, Docker ne limite pas la taille des journaux |
| Centralisation (ex. Loki + Grafana) | Évolution hors MVP, pertinente avec plusieurs serveurs |

## 4. Nettoyage des fichiers expirés

🔜 Étape 4 : tâche planifiée qui supprime les fichiers expirés (disque et base), au moins une fois par jour,
avec une fréquence configurable par variable d'environnement.
