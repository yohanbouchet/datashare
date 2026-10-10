// =============================================================================
// Fichier : e2e-env.ts
// Rôle : Réglages propres aux tests de bout en bout (e2e), partagés par la
//   configuration de Vitest et la préparation de la base.
//   🔒 Les tests utilisent une base SÉPARÉE (datashare_test) et un dossier de
//   stockage temporaire : ils ne touchent jamais aux données de développement.
// Utilise :
//   - node:os, node:path (dossier temporaire du système)
// Utilisé par :
//   - vitest.config.e2e.ts (variables d'environnement des tests)
//   - test/e2e-global-setup.ts (création de la base de test)
// =============================================================================
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Nom de la base de test : il DOIT finir par « _test » (garde-fou vérifié
// avant de vider la base)
export const TEST_DATABASE = 'datashare_test';

// Dossier de stockage des fichiers téléversés pendant les tests
export const TEST_UPLOAD_DIR = join(tmpdir(), 'datashare-e2e-uploads');

// Variables qui REMPLACENT celles du .env pendant les tests (NestJS donne la
// priorité aux variables d'environnement sur le fichier .env)
export const E2E_ENV = {
  POSTGRES_DB: TEST_DATABASE,
  UPLOAD_DIR: TEST_UPLOAD_DIR,
  API_DOCS: 'false',
};
