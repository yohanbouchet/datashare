// ================================================================================================
// Fichier : PageIntrouvable.tsx
// Rôle : Page affichée pour toute adresse inconnue (erreur 404 côté interface), avec un lien de retour.
//   Évite une page blanche : fait partie de la gestion des erreurs côté interface.
// Utilise :
//   - react-router (Link)
//   - index.css : classes carte, carte__titre
// Utilisé par :
//   - App.tsx (route « * » = toutes les autres adresses)
// ================================================================================================
import { Link } from 'react-router';

export function PageIntrouvable() {
  return (
    <section className="carte">
      <h1 className="carte__titre">Page introuvable</h1>
      <p>
        Cette page n'existe pas. <Link to="/">Retour à l'accueil</Link>
      </p>
    </section>
  );
}
