// Configuration de Vitest pour les tests END-TO-END (npm run test:e2e) du
// back-end : l'API complète est démarrée et interrogée par de vraies requêtes
// HTTP (supertest), sur une base PostgreSQL de TEST (datashare_test).
// Prérequis : la base Docker est démarrée (docker compose up -d --wait).
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { E2E_ENV } from './test/e2e-env.js';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    // Base de test, dossier temporaire, documentation désactivée
    env: E2E_ENV,
    // Base créée, vidée et migrée UNE fois avant tous les tests
    globalSetup: ['./test/e2e-global-setup.ts'],
    // Les fichiers de tests partagent la même base : un seul à la fois
    fileParallelism: false,
    // bcrypt (coût 12) prend environ 0,2 s par mot de passe
    testTimeout: 20000,
    // Couverture des tests de bout en bout (npm run test:e2e:cov), rangée à
    // part pour ne pas écraser celle des tests unitaires
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.spec.ts',
        'src/database/data-source.ts',
        'src/main.ts',
      ],
      reportsDirectory: './coverage-e2e',
      reporter: ['text', 'html', 'json-summary'],
    },
    hookTimeout: 30000,
  },
});
