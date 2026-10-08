// ================================================================================================
// Fichier : AuthProvider.tsx
// Rôle : Composant qui tient la mémoire partagée de l'authentification (« gestion d'état » du front).
//   Fournit à toute l'application : l'utilisateur connecté (ou null), un indicateur de chargement,
//   et les actions connexion / deconnexion. Au démarrage (et donc après un F5), vérifie le JWT
//   conservé en appelant GET /api/auth/me : s'il est expiré ou invalide, il est effacé.
// Utilise :
//   - services/api.ts : authApi, lireJeton, enregistrerJeton, effacerJeton, type Utilisateur
//   - context/AuthContext.ts (AuthContext, type ValeurAuth) : le « tableau d'affichage » à remplir
//   - react (useState, useEffect)
// Utilisé par :
//   - main.tsx (AuthProvider entoure l'application)
// ================================================================================================
import { useEffect, useState, type ReactNode } from 'react';
import {
  authApi,
  effacerJeton,
  enregistrerJeton,
  lireJeton,
  type Utilisateur,
} from '../services/api.ts';
import { AuthContext } from './AuthContext.ts';

// AuthProvider : enveloppe l'application et tient la mémoire à jour.
// children : les composants placés à l'intérieur (ici, toute l'application).
export function AuthProvider({ children }: { children: ReactNode }) {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  // S'il n'y a aucun jeton conservé, rien à vérifier : pas de chargement
  const [chargement, setChargement] = useState<boolean>(
    () => lireJeton() !== null,
  );

  // Au démarrage : si un JWT est conservé, on demande à l'API « qui suis-je ? » (le F5)
  useEffect(() => {
    if (!lireJeton()) return;
    authApi
      .moi()
      .then((u) => setUtilisateur(u))
      // Jeton expiré ou invalide (401), ou API injoignable : on repart déconnecté
      .catch(() => effacerJeton())
      .finally(() => setChargement(false));
  }, []);

  // Connexion : appelle l'API, conserve le JWT, mémorise l'utilisateur.
  // En cas d'échec, l'ApiError remonte à la page, qui affiche son message.
  async function connexion(email: string, password: string) {
    const { accessToken, user } = await authApi.connexion(email, password);
    enregistrerJeton(accessToken);
    setUtilisateur(user);
  }

  // Déconnexion : le JWT est sans état côté serveur, il suffit de l'oublier côté navigateur
  function deconnexion() {
    effacerJeton();
    setUtilisateur(null);
  }

  return (
    <AuthContext.Provider
      value={{ utilisateur, chargement, connexion, deconnexion }}
    >
      {children}
    </AuthContext.Provider>
  );
}
