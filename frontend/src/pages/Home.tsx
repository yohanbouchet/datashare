// ================================================================================================
// Fichier : Home.tsx
// Rôle : Page d'accueil (adresse « / ») : « Tu veux partager un fichier ? » + bouton rond de téléversement.
//   Le téléversement exige un compte (US01) : pour l'instant, le bouton mène à la connexion.
//   Il mènera à l'écran « Ajouter un fichier » à l'étape 4.
// Utilise :
//   - react-router (Link)
//   - index.css : classes home, home__title, home__button
// Utilisé par :
//   - App.tsx (route « / »)
// ================================================================================================
import { Link } from 'react-router';

export function Home() {
  return (
    <section className="home">
      {/* h1 : le titre principal de la page (un seul par page, repère pour l'accessibilité) */}
      <h1 className="home__title">Tu veux partager un fichier ?</h1>
      {/* aria-label : le bouton ne contient qu'une icône, ce texte est lu par les lecteurs d'écran */}
      <Link
        to="/connexion"
        className="home__button"
        aria-label="Téléverser un fichier"
      >
        {/* Icône « nuage avec flèche » ; aria-hidden : décorative, ignorée par les lecteurs d'écran */}
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M16 16l-4-4-4 4" />
          <path d="M12 12v9" />
          <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
        </svg>
      </Link>
    </section>
  );
}
