# DataShare

Prototype (MVP) d'une plateforme de **transfert sécurisé de fichiers** pour les freelances et les petites entreprises :
un utilisateur connecté dépose un fichier et obtient un **lien de téléchargement temporaire**, éventuellement protégé par mot de passe.

Projet 3 du Master Expert DevOps – OpenClassrooms (« Pilotez le développement d'une solution informatique »).

> 🚧 **Projet en cours de développement.** Ce README est complété à chaque étape.

## Stack technique

| Brique | Technologie |
|---|---|
| Front-end | React 19 + TypeScript, Vite |
| Back-end (API REST) | NestJS 12 (Node.js 24 LTS, TypeScript, modules ESM) |
| Base de données | PostgreSQL 18 (conteneur Docker) |
| Accès aux données | TypeORM + migrations versionnées |
| Stockage des fichiers | Disque local (dossier `uploads/`) |
| Tests | Vitest (back et front) |
| Qualité du code | Oxlint, Prettier |

## Structure du dépôt

```
datashare/
├── backend/            API NestJS
├── frontend/           Application React
├── docs/
│   ├── conception/     MCD, schéma d'architecture, contrat d'interface
│   └── qualite/        Suivi qualité : TESTING, SECURITY, PERF, MAINTENANCE
├── docker-compose.yml  Service PostgreSQL
└── .env.example        Modèle des variables d'environnement (racine)
```

## Prérequis

| Outil | Version | Installation (documentation officielle) |
|---|---|---|
| Node.js (avec npm) | 24 LTS | https://nodejs.org/fr/download |
| Docker Engine + Docker Compose | Docker 29, Compose v2 ou plus | https://docs.docker.com/engine/install/ |
| Git | récente | https://git-scm.com/downloads |

Vérifier les versions installées :

```bash
node --version            # v24.x attendu
npm --version
docker --version
docker compose version
git --version
```

## Installation

```bash
# 1. Récupérer le projet
git clone https://github.com/yohanbouchet/datashare.git
cd datashare

# 2. Créer les fichiers de configuration à partir des modèles, puis les compléter
#    (au minimum : changer POSTGRES_PASSWORD dans .env)
cp .env.example .env
cp frontend/.env.example frontend/.env

# 3. Installer les dépendances
(cd backend && npm install)
(cd frontend && npm install)
```

## Lancement (environnement de développement)

```bash
# 1. Démarrer la base PostgreSQL et attendre qu'elle soit prête
docker compose up -d --wait

# 2. Créer ou mettre à jour les tables (migrations)
cd backend
npm run migration:run

# 3. Démarrer l'API (http://localhost:3000/api), rechargée à chaque modification
npm run start:dev

# 4. Dans un autre terminal : démarrer le front (http://localhost:5173)
cd frontend
npm run dev
```

## Commandes utiles

Les commandes `npm run …` sont des **raccourcis** définis dans la section `scripts` de chaque `package.json` :
chacune remplace une commande plus longue.

### Back-end (`backend/`)

| Commande | Rôle |
|---|---|
| `npm run start:dev` | Démarre l'API en mode développement (redémarrage automatique) |
| `npm run build` | Compile le TypeScript vers `dist/` |
| `npm test` | Lance les tests unitaires |
| `npm run test:e2e` | Lance les tests de bout en bout de l'API (base Docker démarrée) ; ils utilisent une base séparée, `datashare_test`, recréée à chaque lancement : les données de développement ne sont jamais touchées |
| `npm run test:cov` | Tests unitaires avec rapport de couverture (`coverage/index.html`) ; échoue sous 70 % |
| `npm run test:e2e:cov` | Tests de bout en bout avec rapport de couverture (`coverage-e2e/index.html`) |
| `npm run lint` | Analyse statique du code (Oxlint) |
| `npm run format` | Met en forme le code (Prettier) |
| `npm run migration:generate -- src/database/migrations/<Nom>` | Génère une migration à partir des entités modifiées |
| `npm run migration:run` | Applique les migrations en attente |
| `npm run migration:revert` | Annule la dernière migration appliquée |

### Front-end (`frontend/`)

| Commande | Rôle |
|---|---|
| `npm run dev` | Démarre le serveur de développement |
| `npm run build` | Produit la version optimisée pour la production |
| `npm test` | Lance les tests unitaires du front (Vitest, faux navigateur jsdom) |
| `npm run test:cov` | Tests unitaires avec rapport de couverture (`coverage/index.html`) ; échoue sous 70 % |
| `npm run lint` | Analyse statique du code (Oxlint) |

### Base de données (racine du projet)

| Commande | Rôle |
|---|---|
| `docker compose up -d --wait` | Démarre PostgreSQL et attend qu'il soit prêt |
| `docker compose ps` | Affiche l'état du conteneur (`healthy` attendu) |
| `docker compose stop` | Arrête la base (les données sont conservées dans le volume) |
| `docker compose exec db psql -U datashare -d datashare` | Ouvre une console SQL |

## Variables d'environnement

| Fichier | Lu par | Variables |
|---|---|---|
| `.env` (racine) | Docker Compose, API | `POSTGRES_*`, `FRONTEND_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `UPLOAD_DIR`, `FORBIDDEN_EXTENSIONS`, `PURGE_INTERVAL_MINUTES`, `HISTORY_RETENTION_DAYS`, `API_DOCS` |
| `frontend/.env` | Vite | `VITE_API_URL` |

Les fichiers `.env` contiennent des secrets : ils sont exclus de Git. Seuls les modèles `.env.example` sont publiés.

## Documentation

Suivi de la qualité et de la maintenance (tenu à jour au fil du projet) :

- [TESTING.md](docs/qualite/TESTING.md) – plan de tests et résultats
- [SECURITY.md](docs/qualite/SECURITY.md) – mesures de sécurité et scans des dépendances
- [PERF.md](docs/qualite/PERF.md) – tests de performance et métriques
- [MAINTENANCE.md](docs/qualite/MAINTENANCE.md) – procédures (base de données, migrations, dépendances, journaux)

Conception :

- [Choix technologiques justifiés](docs/conception/choix-techniques.md)
- [Modèle conceptuel de données (MCD)](docs/conception/mcd-datashare.drawio)
- [Schéma d'architecture](docs/conception/architecture-datashare.drawio)
- [Contrat d'interface de l'API](docs/conception/contrat-interface.md)
- Documentation OpenAPI (Swagger), générée à partir du code : http://localhost:3000/api/docs une fois l'API lancée (description et essai de chaque route ; bouton « Authorize » pour coller un JWT obtenu par `/api/auth/login`) ; format JSON sur `/api/docs-json`

## Avancement

- [x] Étape 1 – Conception (MCD, architecture, contrat d'interface)
- [x] Étape 2 – Initialisation (dépôt, PostgreSQL, API, front)
- [x] Étape 3 – Inscription (US03) et connexion (US04)
- [x] Étape 4 – Téléversement, téléchargement, historique, suppression, purge (US01, US02, US05, US06, US10), tags et mot de passe de fichier (US08, US09)
- [ ] Étape 5 – Tests, sécurité, performance
- [ ] Étape 6 – Documentation finale
