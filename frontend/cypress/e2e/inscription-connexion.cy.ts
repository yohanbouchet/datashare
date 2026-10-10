// =============================================================================
// Fichier : inscription-connexion.cy.ts
// Rôle : Scénario Cypress n°1 (US03, US04), dans un vrai navigateur :
//   erreurs du formulaire, création d'un compte, connexion, accès à Mon
//   espace, déconnexion, puis protection de Mon espace pour un visiteur.
// Utilise :
//   - l'application complète (front + API + base de développement) ; un
//     email unique est créé à chaque lancement
// Utilisé par :
//   - npm run cy:run (cypress.config.ts)
// =============================================================================
describe('Parcours : inscription, connexion, déconnexion', () => {
  const email = `cypress-${Date.now()}@mail.fr`;
  const password = 'motdepasse8';

  it('crée un compte, se connecte puis se déconnecte', () => {
    // 1. Inscription : erreurs affichées sous les champs
    cy.visit('/inscription');
    cy.contains('button', 'Créer mon compte').click();
    cy.contains("L'adresse email n'est pas valide").should('be.visible');
    cy.contains('Le mot de passe doit contenir au moins 8 caractères');

    // 2. Inscription réussie → page de connexion avec le bandeau bleu
    cy.get('#email').type(email);
    cy.get('#password').type(password);
    cy.get('#confirmation').type(password);
    cy.contains('button', 'Créer mon compte').click();
    cy.location('pathname').should('eq', '/connexion');
    cy.contains('Ton compte est créé');

    // 3. Mauvais mot de passe : message de l'API dans un bandeau
    cy.get('#email').type(email);
    cy.get('#password').type('mauvaismotdepasse');
    cy.contains('button', 'Connexion').click();
    cy.get('[role=alert]').should(
      'contain.text',
      'Email ou mot de passe incorrect',
    );

    // 4. Connexion → accueil, l'en-tête propose « Mon espace »
    cy.get('#password').clear().type(password);
    cy.contains('button', 'Connexion').click();
    cy.location('pathname').should('eq', '/');
    cy.contains('a', 'Mon espace').click();
    cy.contains('h1', 'Mes fichiers');
    cy.contains('Aucun fichier à afficher.');

    // 5. Déconnexion → accueil, « Se connecter » revient
    // Bouton de la barre du haut (celui du tiroir mobile est caché)
    cy.get('header').contains('button', 'Déconnexion').click();
    cy.location('pathname').should('eq', '/');
    cy.contains('a', 'Se connecter');

    // 6. 🔒 Un visiteur qui tape /mon-espace est renvoyé vers la connexion
    cy.visit('/mon-espace');
    cy.location('pathname').should('eq', '/connexion');
  });
});
