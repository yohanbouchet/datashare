// =============================================================================
// Fichier : NotFound.tsx
// Rôle : Page affichée pour toute adresse inconnue (erreur 404 côté interface),
//   avec un lien de retour. Évite une page blanche : fait partie de la gestion
//   des erreurs côté interface.
// Utilise :
//   - react-router (Link)
//   - index.css : classes card, card__title
// Utilisé par :
//   - App.tsx (route « * » = toutes les autres adresses)
// =============================================================================
import { Link } from 'react-router';

export function NotFound() {
  return (
    <section className="card">
      <h1 className="card__title">Page introuvable</h1>
      <p>
        Cette page n'existe pas. <Link to="/">Retour à l'accueil</Link>
      </p>
    </section>
  );
}
