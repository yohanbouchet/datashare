// ================================================================================================
// Fichier : useAuth.ts
// Rôle : « Hook » personnalisé pour lire la mémoire d'authentification depuis n'importe quel composant :
//   const { utilisateur, connexion, deconnexion } = useAuth();
// Utilise :
//   - context/AuthContext.ts (AuthContext, type AuthValue)
// Utilisé par :
//   - components/Header.tsx, pages/Login.tsx (brique 3), et toute page qui a besoin de l'utilisateur
// ================================================================================================
import { useContext } from 'react';
import { AuthContext, type AuthValue } from './AuthContext.ts';

// Un hook est une fonction dont le nom commence par "use" et qui utilise d'autres hooks React.
export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  // Garde-fou : signale clairement l'oubli de l'AuthProvider dans main.tsx
  if (!value) {
    throw new Error(
      'useAuth doit être utilisé à l’intérieur de <AuthProvider>',
    );
  }
  return value;
}
