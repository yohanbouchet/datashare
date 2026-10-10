// =============================================================================
// Fichier : AuthContext.ts
// Rôle : Définit le contexte d'authentification (le « tableau d'affichage »
//   partagé) et sa forme. Séparé du composant AuthProvider.tsx : un fichier de
//   composants ne doit exporter que des composants (règle du rechargement à
//   chaud de Vite, vérifiée par Oxlint).
// Utilise :
//   - services/api.ts (type Utilisateur)
//   - react (createContext)
// Utilisé par :
//   - context/AuthProvider.tsx (remplit le contexte), context/useAuth.ts (le
//     lit)
// =============================================================================
import { createContext } from 'react';
import type { User } from '../services/api.ts';

// Ce que le contexte met à disposition des composants
export interface AuthValue {
  user: User | null;
  // true tant que la session conservée n'a pas été vérifiée (évite d'afficher «
  // Se connecter » une fraction de seconde)
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

// createContext : crée le « tableau d'affichage » partagé ; null tant qu'aucun
// AuthProvider ne l'a rempli
export const AuthContext = createContext<AuthValue | null>(null);
