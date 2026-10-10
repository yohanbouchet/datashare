// Configuration de Cypress : tests de bout en bout dans un VRAI navigateur,
// sur l'application complète (front + API + base). Prérequis : la base Docker,
// l'API (npm run start:dev) et le front (npm run dev) sont démarrés.
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    // Adresse du front ; cy.visit('/connexion') ouvre donc /connexion
    baseUrl: 'http://localhost:5173',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: false,
    // Vidéo de chaque scénario seulement sur demande (npm run cy:video :
    // fichiers .mp4 dans cypress/videos) ; capture d'écran en cas d'échec
    video: process.env.CY_VIDEO === 'true',
    screenshotOnRunFailure: true,
    // Téléchargements vérifiés par les tests (dossier ignoré par Git)
    downloadsFolder: 'cypress/downloads',
    viewportWidth: 1280,
    viewportHeight: 800,
  },
});
