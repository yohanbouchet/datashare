// =============================================================================
// Fichier : mon-espace.cy.ts
// Rôle : Scénario Cypress n°3 (US05, US06) : historique et suppression. Un
//   fichier est téléversé, apparaît dans Mon espace (filtres), puis il est
//   supprimé après confirmation ; son lien ne fonctionne plus.
// Utilise :
//   - l'application complète ; cypress/fixtures/rapport-annuel.txt
// Utilisé par :
//   - npm run cy:run (cypress.config.ts)
// =============================================================================
describe('Parcours : historique et suppression', () => {
  const email = `cypress-${Date.now()}@mail.fr`;
  const password = 'motdepasse8';

  before(() => {
    cy.request('POST', 'http://localhost:3000/api/auth/register', {
      email,
      password,
    });
  });

  it('liste le fichier, le supprime après confirmation, le lien devient invalide', () => {
    // Connexion et téléversement (sans mot de passe)
    cy.visit('/connexion');
    cy.get('#email').type(email);
    cy.get('#password').type(password);
    cy.contains('button', 'Connexion').click();
    cy.location('pathname').should('eq', '/');
    cy.get('input[type=file]').selectFile(
      'cypress/fixtures/rapport-annuel.txt',
      {
        force: true,
      },
    );
    cy.contains('button', 'Téléverser').click();
    // type « static » : on mémorise la VALEUR lue maintenant (par défaut,
    // Cypress relancerait la recherche plus tard, sur une autre page)
    cy.get('.upload-card__link').invoke('text').as('link', { type: 'static' });

    // Mon espace : le fichier apparaît dans « Tous » et « Actifs »,
    // pas dans « Expiré »
    cy.visit('/mon-espace');
    cy.contains('li', 'rapport-annuel.txt').should(
      'contain.text',
      'Expire dans 7 jours',
    );
    cy.contains('button', 'Expiré').click();
    cy.contains('Aucun fichier à afficher.');
    cy.contains('button', 'Actifs').click();
    cy.contains('li', 'rapport-annuel.txt');

    // Suppression : la boîte de confirmation est remplacée par une doublure
    // qui répond « Annuler » la 1re fois, puis « OK »
    cy.window().then((win) => {
      cy.stub(win, 'confirm')
        .as('confirm')
        .onFirstCall()
        .returns(false)
        .onSecondCall()
        .returns(true);
    });
    cy.contains('li', 'rapport-annuel.txt')
      .find('.file-row__actions button')
      .click();
    cy.get('@confirm').should('have.been.calledOnce');
    cy.contains('li', 'rapport-annuel.txt').should('exist');
    cy.contains('li', 'rapport-annuel.txt')
      .find('.file-row__actions button')
      .click();
    cy.contains('« rapport-annuel.txt » a été supprimé.');
    cy.contains('li', 'rapport-annuel.txt').should('not.exist');

    // Le lien de partage ne fonctionne plus
    cy.get<string>('@link').then((link) => cy.visit(link));
    cy.contains('Ce lien est invalide ou a expiré');
  });
});
