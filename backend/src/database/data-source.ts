// ================================================================================================
// Fichier : data-source.ts
// Rôle : Source de données AUTONOME, utilisée uniquement par les commandes de migration TypeORM.
//   L'API, elle, se connecte via app.module.ts. Ce fichier sert à npm run migration:generate / run / revert.
// Utilise :
//   - .env (racine) : variables POSTGRES_* (lues avec process.loadEnvFile)
//   - users/user.entity.ts (User) : entité comparée à la base
//   - dist/database/migrations/*.js : les migrations compilées
// Utilisé par :
//   - package.json (scripts migration:*)
// ================================================================================================
import { DataSource } from 'typeorm';
import { User } from '../users/user.entity.js';

// Lit le .env de la racine (fonction intégrée à Node.js : aucune dépendance à ajouter).
// Le chemin part du dossier où la commande est lancée : backend/.
process.loadEnvFile('../.env');

export default new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  // Les entités à comparer avec la base pour générer les migrations
  entities: [User],
  // Où trouver les migrations COMPILÉES (le code exécuté est celui de dist/)
  migrations: ['dist/database/migrations/*.js'],
});
