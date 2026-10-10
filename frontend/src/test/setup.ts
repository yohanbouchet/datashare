// =============================================================================
// Fichier : setup.ts
// Rôle : Préparation commune à tous les tests du front (setupFiles de
//   Vitest) : ajoute les vérifications de Testing Library pour la page
//   (toBeInTheDocument, toBeDisabled…) et nettoie la page après chaque test.
// Utilise :
//   - @testing-library/jest-dom (vérifications), @testing-library/react
// Utilisé par :
//   - vitest.config.ts (setupFiles)
// =============================================================================
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';

// Chaque test repart d'une page vide
afterEach(() => {
  cleanup();
});
