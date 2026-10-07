// Source de données autonome, utilisée par l'outil en ligne de commande de TypeORM (migrations).
// L'API, elle, se connecte via app.module.ts ; ce fichier sert seulement aux commandes migration:*.
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
