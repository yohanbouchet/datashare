// ================================================================================================
// Fichier : useAuth.ts
// Rôle : « Hook » personnalisé pour lire la mémoire d'authentification depuis n'importe quel composant :
//   const { utilisateur, connexion, deconnexion } = useAuth();
// Utilise :
//   - context/AuthContext.ts (AuthContext, type ValeurAuth)
// Utilisé par :
//   - components/Header.tsx, pages/Connexion.tsx (brique 3), et toute page qui a besoin de l'utilisateur
// ================================================================================================
import { useContext } from 'react';
import { AuthContext, type ValeurAuth } from './AuthContext.ts';

// Un hook est une fonction dont le nom commence par "use" et qui utilise d'autres hooks React.
export function useAuth(): ValeurAuth {
  const valeur = useContext(AuthContext);
  // Garde-fou : signale clairement l'oubli de l'AuthProvider dans main.tsx
  if (!valeur) {
    throw new Error(
      'useAuth doit être utilisé à l’intérieur de <AuthProvider>',
    );
  }
  return valeur;
}
