// ================================================================================================
// Fichier : Header.tsx
// Rôle : En-tête commun à toutes les pages (« Header Component » des maquettes) :
//   logo « DataShare » (retour à l'accueil) et bouton « Se connecter ».
//   Plus tard (brique 2) : le bouton deviendra « Mon espace » quand l'utilisateur est connecté.
// Utilise :
//   - react-router (Link) : liens internes sans rechargement de la page
//   - index.css : classes en-tete, bouton-sombre
// Utilisé par :
//   - components/Layout.tsx
// ================================================================================================
import { Link } from 'react-router';

// Un composant React = une fonction qui renvoie du JSX (du « HTML dans le code »).
// "export" : rend le composant importable dans les autres fichiers.
export function Header() {
  return (
    // <header> : balise « sémantique », les lecteurs d'écran l'annoncent comme l'en-tête de la page
    <header className="en-tete">
      {/* Link : change de page SANS recharger le site (contrairement à une balise <a> classique) */}
      <Link to="/" className="en-tete__logo">
        DataShare
      </Link>
      <Link to="/connexion" className="bouton-sombre">
        Se connecter
      </Link>
    </header>
  );
}
