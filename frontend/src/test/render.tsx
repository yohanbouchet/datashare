// =============================================================================
// Fichier : render.tsx
// Rôle : Outil de test : affiche un composant comme dans l'application, avec
//   un routeur en mémoire (adresses /connexion, /…) et une session de
//   connexion FACTICE (utilisateur, login, logout remplacés par des doublures).
// Utilise :
//   - context/AuthContext.ts ; react-router (MemoryRouter) ; Testing Library
// Utilisé par :
//   - les fichiers *.test.tsx du front
// =============================================================================
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AuthContext, type AuthValue } from '../context/AuthContext.ts';

interface Options {
  // Adresse affichée au départ (par défaut /page ; ex. /d/jeton)
  route?: string;
  // Modèle d'adresse de la page (ex. /d/:token), pour lire ses paramètres
  path?: string;
  // Valeurs de la session (par défaut : personne n'est connecté)
  auth?: Partial<AuthValue>;
}

export function renderPage(
  page: ReactElement,
  { route = '/page', path = '/page', auth = {} }: Options = {},
) {
  const value: AuthValue = {
    user: null,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    ...auth,
  };
  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={page} />
          {/* Pages de destination des redirections, reconnaissables */}
          <Route path="/connexion" element={<p>Page Connexion</p>} />
          <Route path="/" element={<p>Page Accueil</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
  return value;
}
