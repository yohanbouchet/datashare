// =============================================================================
// Fichier : e2e-global-setup.ts
// Rôle : Préparation unique, avant tous les tests e2e (globalSetup de Vitest) :
//   1. crée la base de test datashare_test si elle n'existe pas ;
//   2. la vide entièrement, puis rejoue TOUTES les migrations : les tests
//      partent d'une base propre, et les migrations sont testées au passage ;
//   3. vide le dossier de stockage temporaire.
//   🔒 Garde-fou : refuse de s'exécuter si le nom de la base ne finit pas par
//   « _test » (impossible de vider la base de développement par erreur).
// Utilise :
//   - .env (racine) : hôte, port et identifiants PostgreSQL
//   - test/e2e-env.ts ; database/migrations/ (les 3 migrations)
//   - typeorm (DataSource) : accès direct à PostgreSQL
// Utilisé par :
//   - vitest.config.e2e.ts (globalSetup)
// =============================================================================
import { mkdir, rm } from 'node:fs/promises';
import { DataSource } from 'typeorm';
import { CreateUsers1791355761850 } from '../src/database/migrations/1791355761850-CreateUsers.js';
import { CreateFilesAndTags1791529371214 } from '../src/database/migrations/1791529371214-CreateFilesAndTags.js';
import { AddPurgedAtToFiles1791623057942 } from '../src/database/migrations/1791623057942-AddPurgedAtToFiles.js';
import { TEST_DATABASE, TEST_UPLOAD_DIR } from './e2e-env.js';

export default async function setup(): Promise<void> {
  if (!TEST_DATABASE.endsWith('_test')) {
    throw new Error(`Base de test refusée : « ${TEST_DATABASE} »`);
  }
  // Identifiants du .env racine (lancé depuis backend/)
  process.loadEnvFile('../.env');
  const connection = {
    type: 'postgres' as const,
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
  };

  // 1. Création de la base de test (connexion à la base d'administration)
  const admin = new DataSource({ ...connection, database: 'postgres' });
  await admin.initialize();
  const exists: unknown[] = await admin.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [TEST_DATABASE],
  );
  if (exists.length === 0) {
    await admin.query(`CREATE DATABASE "${TEST_DATABASE}"`);
  }
  await admin.destroy();

  // 2. Base vidée, puis migrations rejouées dans l'ordre
  const dataSource = new DataSource({
    ...connection,
    database: TEST_DATABASE,
    migrations: [
      CreateUsers1791355761850,
      CreateFilesAndTags1791529371214,
      AddPurgedAtToFiles1791623057942,
    ],
  });
  await dataSource.initialize();
  await dataSource.dropDatabase();
  await dataSource.runMigrations();
  await dataSource.destroy();

  // 3. Dossier de stockage temporaire, vide
  await rm(TEST_UPLOAD_DIR, { recursive: true, force: true });
  await mkdir(TEST_UPLOAD_DIR, { recursive: true });
}
