// =============================================================================
// Fichier : RequireAuth.tsx
// Rôle : « Garde » du front : protège les pages réservées aux utilisateurs
//   connectés (ex. /mon-espace). Pas connecté → redirection vers /connexion.
//   🔒 Ce n'est qu'un confort d'affichage : la vraie protection est côté API
//   (garde JWT), qui refuse toute requête sans jeton valide (401).
// Utilise :
//   - context/useAuth.ts (user, loading) ; react-router (Navigate, Outlet)
// Utilisé par :
//   - App.tsx (route parente des pages protégées)
// =============================================================================
import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../context/useAuth.ts';

export function RequireAuth() {
  const { user, loading } = useAuth();

  // Session en cours de vérification (après un F5) : on attend, sinon on
  // renverrait à tort vers /connexion pendant une fraction de seconde
  if (loading) {
    return null;
  }
  // Pas connecté : redirection (replace : la page protégée ne reste pas dans
  // l'historique, le bouton « Retour » ne boucle pas)
  if (!user) {
    return <Navigate to="/connexion" replace />;
  }
  // Connecté : on affiche la page demandée
  return <Outlet />;
}
