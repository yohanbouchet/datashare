// Configuration de Vitest pour les tests UNITAIRES (npm test) du back-end.
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  // Permet à Vitest de comprendre les raccourcis de chemins déclarés dans tsconfig.json
  // (y compris ceux ajoutés par "nest g library").
  plugins: [tsconfigPaths()],
  test: {
    // globals : describe, it, expect… sont disponibles sans les importer dans chaque fichier de test.
    globals: true,
    root: './',
    // Seuls les fichiers se terminant par .spec.ts sont considérés comme des tests unitaires.
    include: ['**/*.spec.ts'],
  },
});
