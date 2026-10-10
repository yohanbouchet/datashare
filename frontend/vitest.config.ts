// Configuration de Vitest pour les tests UNITAIRES du front (npm test).
// Reprend la configuration de Vite (plugin React) et simule un navigateur
// avec jsdom : les composants sont affichés en mémoire, sans fenêtre.
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // describe, it, expect… disponibles sans les importer
      globals: true,
      // Faux navigateur (document, window, formulaires…)
      environment: 'jsdom',
      // Exécuté avant chaque fichier de tests (vérifications « toBeInTheDocument »…)
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      // Couverture (npm run test:cov) : tout le code du front est compté,
      // sauf le point d'entrée et les fichiers de tests
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx'],
        reporter: ['text', 'html', 'json-summary'],
        // Seuil de l'énoncé : en dessous de 70 %, la commande échoue
        thresholds: { lines: 70, statements: 70, functions: 70, branches: 70 },
      },
    },
  }),
);
