// ================================================================================================
// Fichier : Header.tsx
// Rôle : En-tête commun à toutes les pages (« Header Component » des maquettes) :
//   logo « DataShare » (retour à l'accueil) et bouton d'accès au compte :
//   « Se connecter » si personne n'est connecté, « Mon espace » si un utilisateur est connecté,
//   rien pendant la vérification de la session au démarrage (évite un clignotement).
// Utilise :
//   - context/useAuth.ts (useAuth) : utilisateur connecté et état de chargement
//   - react-router (Link) : liens internes sans rechargement de la page
//   - index.css : classes header, header__logo, button-dark
// Utilisé par :
//   - components/Layout.tsx
// ================================================================================================
import { Link } from 'react-router';
import { useAuth } from '../context/useAuth.ts';

// Un composant React = une fonction qui renvoie du JSX (du « HTML dans le code »).
// "export" : rend le composant importable dans les autres fichiers.
export function Header() {
  // ⚠️ Un hook (fonction "use…") s'appelle TOUJOURS à l'intérieur d'un composant, en haut de sa fonction :
  // React l'exécute à chaque affichage du composant. Appelé hors d'une fonction, il plante l'application.
  const { user, loading } = useAuth();

  return (
    // <header> : balise « sémantique », les lecteurs d'écran l'annoncent comme l'en-tête de la page
    <header className="header">
      {/* Link : change de page SANS recharger le site (contrairement à une balise <a> classique) */}
      <Link to="/" className="header__logo">
        DataShare
      </Link>
      {/* Choix en cascade « condition ? A : B » :
          vérification en cours → rien ; connecté → « Mon espace » ; sinon → « Se connecter » */}
      {loading ? null : user ? (
        <Link to="/mon-espace" className="button-dark">
          Mon espace
        </Link>
      ) : (
        <Link to="/connexion" className="button-dark">
          Se connecter
        </Link>
      )}
    </header>
  );
}
