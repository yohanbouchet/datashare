// ================================================================================================
// Fichier : AuthProvider.tsx
// Rôle : Composant qui tient la mémoire partagée de l'authentification (« gestion d'état » du front).
//   Fournit à toute l'application : l'utilisateur connecté (ou null), un indicateur de chargement,
//   et les actions connexion / deconnexion. Au démarrage (et donc après un F5), vérifie le JWT
//   conservé en appelant GET /api/auth/me : s'il est expiré ou invalide, il est effacé.
// Utilise :
//   - services/api.ts : authApi, readToken, saveToken, clearToken, type Utilisateur
//   - context/AuthContext.ts (AuthContext, type AuthValue) : le « tableau d'affichage » à remplir
//   - react (useState, useEffect)
// Utilisé par :
//   - main.tsx (AuthProvider entoure l'application)
// ================================================================================================
import { useEffect, useState, type ReactNode } from 'react';
import {
  authApi,
  clearToken,
  saveToken,
  readToken,
  type User,
} from '../services/api.ts';
import { AuthContext } from './AuthContext.ts';

// AuthProvider : enveloppe l'application et tient la mémoire à jour.
// children : les composants placés à l'intérieur (ici, toute l'application).
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // S'il n'y a aucun jeton conservé, rien à vérifier : pas de chargement
  const [loading, setLoading] = useState<boolean>(() => readToken() !== null);

  // Au démarrage : si un JWT est conservé, on demande à l'API « qui suis-je ? » (le F5)
  useEffect(() => {
    if (!readToken()) return;
    authApi
      .me()
      .then((u) => setUser(u))
      // Jeton expiré ou invalide (401), ou API injoignable : on repart déconnecté
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  // Connexion : appelle l'API, conserve le JWT, mémorise l'utilisateur.
  // En cas d'échec, l'ApiError remonte à la page, qui affiche son message.
  async function login(email: string, password: string) {
    const { accessToken, user } = await authApi.login(email, password);
    saveToken(accessToken);
    setUser(user);
  }

  // Déconnexion : le JWT est sans état côté serveur, il suffit de l'oublier côté navigateur
  function logout() {
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
