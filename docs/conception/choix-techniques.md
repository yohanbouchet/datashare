# Choix technologiques justifiés – DataShare

> Tenu à jour au fil du projet. Contraintes de l'énoncé : back-end parmi Spring Boot, .NET Core, NestJS
> ou Symfony/Laravel ; front-end parmi Angular, React ou Vue ; base parmi PostgreSQL ou MongoDB ;
> stockage local ou AWS S3. Les autres outils sont libres.

## 1. Stack principale

| Élément | Choix | Alternatives (liste de l'énoncé) | Justification |
|---|---|---|---|
| Langage | TypeScript (back et front) | Java, C#, PHP | Un seul langage de bout en bout : mêmes types, mêmes outils et mêmes conventions des deux côtés ; typage strict qui détecte les erreurs à la compilation |
| Back-end | NestJS 12 (Node.js 24 LTS) | Spring Boot, .NET Core, Symfony/Laravel | Architecture en modules, contrôleurs et services imposée par le framework ; validation, injection de dépendances et JWT intégrés ; Node.js traite les fichiers en flux (*streaming*), adapté à des fichiers jusqu'à 1 Go |
| Front-end | React 19 + Vite | Angular, Vue | Bibliothèque la plus répandue (documentation et ressources abondantes, cours fournis dans le parcours) ; légère, favorable au budget de performance ; modèle de composants réutilisables adapté à la planche de composants des maquettes |
| Base de données | PostgreSQL 18 (SQL) | MongoDB (NoSQL) | Données relationnelles (un utilisateur possède des fichiers, un fichier porte des tags) : contraintes d'intégrité (clé étrangère, unicité de l'email) garanties par la base ; modèle conceptuel (Merise) directement traduisible |
| Stockage des fichiers | Disque local (volume Docker) | AWS S3 | Simple, sans compte ni coût externe, adapté à un prototype ; le contrôle de la taille, des extensions et du mot de passe reste côté serveur ; isolé dans un service de stockage pour permettre une migration vers S3 |

## 2. Back-end : bibliothèques et outils

| Élément | Choix | Alternatives | Justification |
|---|---|---|---|
| Accès aux données | TypeORM | Prisma | Intégration documentée par NestJS ; entités annotées par des décorateurs ; génération de migrations |
| Évolution du schéma | Migrations TypeORM versionnées | `synchronize: true`, script SQL unique | Chaque changement de structure est tracé dans Git, rejouable et réversible ; aucune modification automatique risquée en production |
| Validation des entrées | class-validator + class-transformer, `ValidationPipe` global | Validation manuelle | Outils recommandés par NestJS ; règles déclarées une fois dans les DTO ; champs inattendus refusés |
| Hachage des mots de passe | bcrypt (coût 12) | argon2 | Algorithme éprouvé, sel intégré, coût réglable pour freiner la force brute |
| Authentification | JWT (`@nestjs/jwt`), garde NestJS | Sessions serveur, OAuth2 | Exigé par les spécifications ; sans état côté serveur ; durée de vie limitée (1 h) |
| En-têtes de sécurité HTTP | helmet | Configuration manuelle | Ensemble d'en-têtes recommandés appliqué en une ligne |
| Configuration | `@nestjs/config` + fichiers `.env` | Valeurs dans le code | Secrets hors du code et du dépôt ; démarrage refusé si une variable manque |
| Documentation de l'API | OpenAPI 3 avec `@nestjs/swagger` (page `/api/docs`) | Rédaction manuelle seule | Générée à partir du code (routes, DTO et règles de validation via le greffon de compilation) : elle reste à jour ; les exemples du contrat d'interface y sont repris ; essai des routes dans le navigateur |

## 3. Front-end : bibliothèques et organisation

| Élément | Choix | Alternatives | Justification |
|---|---|---|---|
| Outil de build | Vite | Webpack, Create React App | Générateur officiel recommandé par React ; démarrage et rechargement instantanés |
| Navigation | React Router | TanStack Router | Bibliothèque de navigation de référence pour React ; une adresse par écran des maquettes |
| Organisation du code | `pages/` (écrans), `components/` (composants réutilisables), `services/` (appels à l'API), `context/` (état partagé) | Organisation par fonctionnalité | Correspond aux briques du schéma d'architecture ; composants de la planche Figma réutilisés sur tous les écrans |
| Gestion d'état | Contexte React (utilisateur connecté, JWT) | Redux, Zustand | Un seul état partagé dans le MVP : la session ; pas de bibliothèque supplémentaire nécessaire |
| Styles | CSS natif avec variables (couleurs et espacements des maquettes) | Tailwind, CSS-in-JS | Aucune dépendance ; couleurs centralisées dans des variables, mises en page adaptées aux écrans mobiles et ordinateur |

## 4. Outils de développement et de qualité

| Élément | Choix | Alternatives | Justification |
|---|---|---|---|
| Gestion de versions | Git + GitHub, *conventional commits* | GitLab | Exigé par l'énoncé ; historique lisible par type de changement |
| Gestion des dépendances | npm + `package-lock.json` | pnpm, yarn | Fourni avec Node.js ; versions exactes verrouillées, installation reproductible |
| Conteneurisation | Docker Compose (PostgreSQL) | Installation locale | Base identique sur toutes les machines, démarrage en une commande, healthcheck |
| Tests | Vitest (back et front), Cypress (E2E) | Jest | Choix par défaut de NestJS 12 en ES Modules et de Vite : un seul outil de test pour tout le projet |
| Analyse statique | Oxlint | ESLint | Installé par les deux générateurs ; même outil des deux côtés, très rapide |
| Mise en forme | Prettier | — | Présentation homogène du code, appliquée automatiquement |
| Éditeur | VS Code (Remote SSH) | IntelliJ / WebStorm | Gratuit, adapté à TypeScript, travail à distance sur la machine Ubuntu |
| Langue | Code en anglais (fichiers, classes, fonctions, variables, classes CSS, messages de commit) ; commentaires, documentation et messages affichés en français | Tout en français, mélange | Les frameworks (`@Controller`, `useState`…) et les champs de l'API sont en anglais : un code entièrement anglais est homogène ; les explications et l'interface s'adressent à un public francophone |
