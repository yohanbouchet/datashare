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

| Action | Commande (racine du projet) |
|---|---|
| Sauvegarder la base (fichier SQL) | `docker compose exec -T db pg_dump -U datashare datashare > sauvegarde.sql` |
| Restaurer dans une base vide | `docker compose exec -T db psql -U datashare -d datashare < sauvegarde.sql` |
| Sauvegarder les fichiers déposés | copier le dossier `backend/uploads/` (ex. `tar czf fichiers.tgz -C backend uploads`) |

✅ Restauration testée le 11/10/2026 dans une base temporaire : mêmes nombres de lignes dans les 4 tables (`users`, `files`, `tags`, `migrations`).
⚠️ La base et les fichiers vont ensemble : les sauvegarder au même moment, sinon une ligne peut désigner un fichier absent (ou l'inverse).
🔒 Une sauvegarde contient les adresses email et les hachés des mots de passe : à stocker chiffrée, hors du serveur.

## 2. Mise à jour des dépendances

### Cycle de vie des technologies (source : [endoflife.date](https://endoflife.date), relevé du 11/10/2026)

| Technologie | Version utilisée | Fin de support (correctifs de sécurité) | Action à prévoir |
|---|---|---|---|
| Node.js | 24.21 (**LTS**) | 30/04/2028 | Passer à Node.js 26 (LTS à partir d'octobre 2026, support jusqu'en avril 2029) au plus tard début 2028 |
| PostgreSQL | 18.6 | 14/11/2030 | Aucune avant 2030 ; appliquer les versions correctives 18.x : sauvegarde, nouvelle version dans le `FROM` de `database/Dockerfile`, puis `docker compose up -d --build --wait` |
| Ubuntu (serveur) | 26.04.1 (**LTS**) | 29/05/2031 | Aucune ; mises à jour de sécurité régulières (`apt`) |
| Docker Engine | 29.8 | Version 29 maintenue (dernière : 29.9) | Mettre à jour vers 29.9 |
| React | 19.3 | Pas de date : seule la dernière version majeure reçoit les correctifs | Suivre les versions 19.x ; migrer à la prochaine version majeure dans l'année suivant sa sortie |
| NestJS | 12.1 | Pas de date publiée : seule la dernière version majeure est maintenue | Idem : suivre les 12.x, planifier la migration à la version 13 |
| TypeScript, Vite, Vitest, Cypress | 6.0 / 8.3 / 4.1 / 16.1 | Outils de développement, sans politique de support à long terme | Mises à jour mineures régulières ; majeures planifiées (absentes de la production) |

**Principe** : on privilégie les versions **LTS** (*Long Term Support*, support long) pour ce qui tourne en production (Node.js, Ubuntu) ; on anticipe chaque fin de support **au moins 6 mois avant** la date ; un composant ne passe en production qu'après le passage des tests sur la nouvelle version.

### Procédure de mise à jour (mensuelle, et dès qu'une faille est publiée)

| Étape | Commande (dans `backend/` puis `frontend/`) | But |
|---|---|---|
| 1. Repérer | `npm outdated` ; `npm audit` | Versions en retard ; failles connues |
| 2. Mettre à jour | `npm update` (versions mineures et correctives) ; une version majeure se traite seule, sur une branche, en lisant ses notes de version | Limiter le risque de régression |
| 3. Vérifier | `npm run lint`, `npm test`, `npm run test:e2e` (back), `npm run cy:run` (front) | Rien n'est cassé : seuils de couverture compris |
| 4. Valider | `npm audit` à 0 vulnérabilité haute ou critique ; commit `chore(deps): …` | Traçabilité |

⚠️ `npm audit fix --force` n'est jamais utilisé : il peut installer des versions majeures incompatibles.
Évolution : automatiser l'étape 1 avec **Dependabot** (propositions de mise à jour par GitHub) et l'étape 3 dans une **intégration continue**.

Repères :
- Les versions exactes sont verrouillées par les fichiers `package-lock.json` (installation reproductible).
- Les versions compatibles de NestJS et React ont été fixées par leurs générateurs officiels.

### Contrôle de sécurité hebdomadaire

| Étape | Commande (racine du projet) | But |
|---|---|---|
| 1. Analyser | `scripts/scan-security.sh` (base démarrée) | `npm audit` et `trivy` sur nos dépendances ; `hadolint` sur `database/Dockerfile` ; `trivy` sur l'image de chaque conteneur en cours d'exécution (de nouvelles failles sont publiées chaque jour) |
| 2. Faille dans nos dépendances | Procédure de mise à jour ci-dessus | Le script échoue : correction avant toute mise en production |
| 3. Faille dans l'image de la base | Vérifier si une nouvelle image officielle la corrige ; sauvegarde de la base ; nouvelle version dans le `FROM` de `database/Dockerfile` (ou même version republiée : `docker compose build --pull`) ; `docker compose up -d --build --wait` ; relancer le scan | Le conteneur est recréé avec la nouvelle image ; les données restent dans le volume. Sinon : analyser l'exposition réelle et consigner la décision dans SECURITY.md |

## 3. Journaux (logs)

| Sujet | État |
|---|---|
| Logs de l'API en JSON sur la sortie standard | Évolution (PERF.md, section 5) : utiles dès qu'ils sont centralisés |
| Rotation des journaux du conteneur PostgreSQL | ✅ 3 fichiers de 10 Mo au plus (`logging: json-file`, `max-size`, `max-file` dans `docker-compose.yml`) — par défaut, Docker ne limite pas leur taille et peut remplir le disque |
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
| Conteneuriser toute l'application | Déploiement identique sur n'importe quel serveur, isolation de l'API | Dockerfile multi-étapes (images légères, sans root) vérifiés par `hadolint` et analysés par `trivy` ; un serveur web (ex. Nginx) pour servir le site et relayer l'API ; sur Kubernetes, exposition par la **Gateway API** avec un contrôleur maintenu (Ingress NGINX Controller est arrêté depuis mars 2026) |
| Intégration et déploiement continus (CI/CD) | Tests et contrôles de sécurité automatiques à chaque envoi de code | GitHub Actions : tests, `scripts/scan-security.sh`, puis publication des images (ex. GitHub Container Registry) |
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
