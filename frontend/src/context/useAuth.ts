// =============================================================================
// Fichier : useAuth.ts
// Rôle : « Hook » personnalisé pour lire la mémoire d'authentification depuis
//   n'importe quel composant :
//   const { user, login, logout } = useAuth();
// Utilise :
//   - context/AuthContext.ts (AuthContext, type AuthValue)
// Utilisé par :
//   - components/Header.tsx, RequireAuth.tsx, SpaceLayout.tsx, UploadCard.tsx
//   - pages/Home.tsx, Login.tsx, Register.tsx, MySpace.tsx
// =============================================================================
import { useContext } from 'react';
import { AuthContext, type AuthValue } from './AuthContext.ts';

// Un hook est une fonction dont le nom commence par "use" et qui utilise
// d'autres hooks React.
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
