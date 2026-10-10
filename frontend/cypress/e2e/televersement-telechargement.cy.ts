// =============================================================================
// Fichier : televersement-telechargement.cy.ts
// Rôle : Scénario Cypress n°2 (US01, US02), le parcours principal du
//   produit : un utilisateur connecté téléverse un fichier protégé par mot de
//   passe, récupère le lien ; un destinataire SANS compte ouvre le lien, se
//   trompe de mot de passe, puis télécharge le fichier, identique à l'original.
// Utilise :
//   - l'application complète ; cypress/fixtures/rapport-annuel.txt (fichier
//     envoyé) ; cypress/downloads (fichier reçu)
// Utilisé par :
//   - npm run cy:run (cypress.config.ts)
// =============================================================================
describe('Parcours : téléversement puis téléchargement par lien', () => {
  const email = `cypress-${Date.now()}@mail.fr`;
  const password = 'motdepasse8';

  before(() => {
    // Compte créé directement par l'API (cy.request), pour aller à l'essentiel
    cy.request('POST', 'http://localhost:3000/api/auth/register', {
      email,
      password,
    });
  });

  it('partage un fichier protégé et le télécharge avec le bon mot de passe', () => {
    // 1. Connexion par l'écran
    cy.visit('/connexion');
    cy.get('#email').type(email);
    cy.get('#password').type(password);
    cy.contains('button', 'Connexion').click();
    cy.location('pathname').should('eq', '/');

    // 2. Choix du fichier (le champ est caché : on le remplit directement)
    cy.get('input[type=file]').selectFile(
      'cypress/fixtures/rapport-annuel.txt',
      {
        force: true,
      },
    );
    cy.contains('h1', 'Ajouter un fichier');
    cy.contains('rapport-annuel.txt');

    // 3. Mot de passe, 3 jours, tags, puis envoi
    cy.get('#file-password').type('secret1');
    cy.get('#file-expiration').select('Trois jours');
    cy.get('#file-tags').type('rapport, 2026');
    cy.contains('button', 'Téléverser').click();
    cy.contains('ton fichier sera conservé chez nous pendant trois jours');

    // 4. Le lien de partage, ouvert par un destinataire SANS compte
    cy.get('.upload-card__link')
      .invoke('text')
      .then((link) => {
        expect(link).to.match(/\/d\/[\w-]{43}$/);
        cy.clearAllSessionStorage();
        cy.visit(link);
      });
    cy.contains('h1', 'Télécharger un fichier');
    cy.contains('rapport-annuel.txt');
    cy.contains('Ce fichier expirera dans 3 jours.');
    cy.contains('button', 'Télécharger').should('be.disabled');

    // 5. Mauvais mot de passe : message, aucun téléchargement
    cy.get('#download-password').type('faux123');
    cy.contains('button', 'Télécharger').click();
    cy.contains('Mot de passe incorrect');

    // 6. Bon mot de passe : le navigateur enregistre le fichier
    cy.get('#download-password').clear().type('secret1');
    cy.contains('button', 'Télécharger').click();
    cy.contains('Le téléchargement a commencé.');
    cy.readFile('cypress/downloads/rapport-annuel.txt').should(
      'eq',
      'Rapport annuel 2026 : chiffres clés.\n',
    );
  });
});
