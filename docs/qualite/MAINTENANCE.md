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

✅ US10 : `backend/src/files/purge.service.ts`.

| Élément | Fonctionnement |
|---|---|
| Fréquence | `PURGE_INTERVAL_MINUTES` dans `.env` (60 par défaut) ; une valeur invalide (0, négative, non entière) empêche l'API de démarrer |
| Démarrage | Une purge est lancée dès le démarrage de l'API (rattrapage après un arrêt), puis à chaque intervalle |
| Étape 1 : disque | Fichiers dont `expires_at` est dépassée et pas encore purgés (`purged_at` vide) : fichier effacé du disque, puis date de purge enregistrée dans `purged_at` ; la ligne reste visible dans l'historique (« Ce fichier a expiré, il n'est plus stocké chez nous ») et le lien répond 410 |
| Étape 2 : historique | Lignes purgées depuis plus de `HISTORY_RETENTION_DAYS` jours (30 par défaut) : supprimées de la base (tags en cascade) ; le lien répond alors 404 |
| Reprise sur erreur | Ordre disque puis marquage : l'opération peut être rejouée sans risque (« déjà absent » est accepté) |
| Robustesse | Un échec sur un fichier est consigné dans le journal et n'interrompt pas la purge des suivants |
| Suivi | Journal de l'API : `[PurgeService] Purge : N fichier(s) expiré(s) supprimé(s)` |
| Plusieurs serveurs | À prévoir si l'API est répartie sur plusieurs instances : une seule doit purger (verrou en base ou tâche planifiée externe) |

## 5. Évolutions envisagées

| Évolution | Pourquoi | Mise en œuvre envisagée |
|---|---|---|
| Analyse antivirus des fichiers reçus | La liste d'extensions interdites se contourne (renommage, archive `.zip`) et ne détecte pas les documents piégés | Conteneur **ClamAV** ajouté à Docker Compose ; l'API lui transmet chaque fichier reçu avant de l'enregistrer ; mise à jour quotidienne des signatures (`freshclam`) à surveiller comme une dépendance |
| Quota par utilisateur | Empêche un seul compte de remplir le disque du serveur ; base d'une offre commerciale | Colonne `quota` dans `users` ; au téléversement, somme des tailles des fichiers actifs (`SUM(size)`), refus au-delà avec un message clair |
| Offre payante (*freemium*) | Modèle des services de transfert (gratuit limité, payant pour plus) | Quota, taille maximale et durée d'expiration plus élevés pour les comptes payants ; paiement confié à un prestataire (ex. Stripe) : aucune donnée bancaire stockée par DataShare (norme PCI-DSS) |
| Stockage sur AWS S3 | Disque local limité à un serveur (pas de répartition de charge, sauvegardes à gérer) ; S3 offre une capacité illimitée, une durabilité très élevée et des sauvegardes intégrées | Voir ci-dessous : seul `StorageService` change |

### Passer du disque local à AWS S3

Le stockage est isolé dans **un seul fichier**, `backend/src/files/storage.service.ts` (le « magasinier ») :
contrôleurs et services ne connaissent qu'un **nom de stockage**, jamais un chemin sur le disque.
La migration ne modifie donc que lui :

| Méthode de `StorageService` | Aujourd'hui (disque local) | Avec S3 (SDK `@aws-sdk/client-s3`) |
|---|---|---|
| `createMulterOptions` (US01) | `diskStorage` : écriture en flux dans `UPLOAD_DIR` | moteur de stockage S3 pour multer (`multer-s3`) : envoi en flux vers le *bucket*, même nom aléatoire comme clé |
| `openStream` (US02) | `createReadStream` sur le disque | `GetObjectCommand` : le corps de la réponse est déjà un flux |
| `remove` (US06, purge) | `unlink` | `DeleteObjectCommand` |

Étapes :
1. Créer le *bucket* privé (accès public bloqué, chiffrement activé) et un rôle IAM limité à ce *bucket*
   (lecture, écriture, suppression) — jamais de clé d'accès écrite dans le code.
2. Remplacer `UPLOAD_DIR` par `S3_BUCKET` et `AWS_REGION` dans `.env` ; les identifiants viennent du rôle
   IAM du serveur.
3. Réécrire les trois méthodes ci-dessus ; les tests unitaires des autres pièces ne changent pas.
4. Copier les fichiers existants en conservant leurs noms : `aws s3 sync backend/uploads s3://<bucket>`.
5. Variante possible pour le téléchargement : une **URL présignée** (lien S3 temporaire) déchargerait
   l'API de l'envoi des octets, après les mêmes contrôles (jeton, expiration, mot de passe).
