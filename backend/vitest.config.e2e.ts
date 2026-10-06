// Configuration de Vitest pour les tests END-TO-END (npm run test:e2e) du back-end.
// Même réglages que vitest.config.ts, mais on ne cible que les fichiers .e2e-spec.ts (dossier test/).
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
  },
});
