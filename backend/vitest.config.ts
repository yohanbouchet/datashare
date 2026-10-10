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
    // Couverture (npm run test:cov) : TOUT le code source est compté, même
    // les fichiers qu'aucun test ne charge (sinon le pourcentage serait
    // flatteur). Exclus : les tests eux-mêmes, et les migrations, la
    // connexion des commandes de migration et le démarrage (main.ts), vérifiés
    // par les tests de bout en bout (npm run test:e2e).
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/database/**', 'src/main.ts'],
      reporter: ['text', 'html', 'json-summary'],
      // Seuil de l'énoncé : en dessous de 70 %, la commande échoue
      thresholds: { lines: 70, statements: 70, functions: 70, branches: 70 },
    },
  },
});
