// =============================================================================
// Fichier : data-source.ts
// Rôle : Source de données AUTONOME, utilisée uniquement par les commandes de
//   migration TypeORM. L'API, elle, se connecte via app.module.ts. Ce fichier
//   sert à npm run migration:generate / run / revert.
// Utilise :
//   - .env (racine) : variables POSTGRES_* (lues avec process.loadEnvFile)
//   - users/user.entity.ts (User), files/file.entity.ts (FileEntity),
//     files/tag.entity.ts (Tag) :
//     entités comparées à la base
//   - dist/database/migrations/*.js : les migrations compilées
// Utilisé par :
//   - package.json (scripts migration:*)
// =============================================================================
import { DataSource } from 'typeorm';
// Une ligne d'import par fichier : chaque classe s'importe depuis le fichier où
// elle est écrite
import { User } from '../users/user.entity.js';
import { FileEntity } from '../files/file.entity.js';
import { Tag } from '../files/tag.entity.js';

// Lit le .env de la racine (fonction intégrée à Node.js : aucune dépendance à
// ajouter).
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
  entities: [User, FileEntity, Tag],
  // Où trouver les migrations COMPILÉES (le code exécuté est celui de dist/)
  migrations: ['dist/database/migrations/*.js'],
});
