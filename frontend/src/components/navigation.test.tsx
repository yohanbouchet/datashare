// =============================================================================
// Fichier : navigation.test.tsx
// Rôle : Tests de la navigation : en-tête (« Se connecter » ou « Mon espace »
//   selon la session), vigile RequireAuth (pages protégées), mise en page de
//   l'espace connecté (déconnexion, tiroir mobile) et accueil (bouton rond).
// Utilise :
//   - components/Header.tsx, RequireAuth.tsx, SpaceLayout.tsx, pages/Home.tsx
//   - test/render.tsx ; Testing Library
// Utilisé par :
//   - Vitest (vitest.config.ts)
// =============================================================================
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AuthContext, type AuthValue } from '../context/AuthContext.ts';
import { Home } from '../pages/Home.tsx';
import { renderPage } from '../test/render.tsx';
import { Header } from './Header.tsx';
import { RequireAuth } from './RequireAuth.tsx';
import { SpaceLayout } from './SpaceLayout.tsx';

const user = { id: 1, email: 'claire@mail.fr' };

describe('En-tête', () => {
  it('propose « Se connecter » à un visiteur', () => {
    renderPage(<Header />);
    expect(screen.getByRole('link', { name: 'Se connecter' })).toHaveAttribute(
      'href',
      '/connexion',
    );
  });

  it('propose « Mon espace » à un utilisateur connecté', () => {
    renderPage(<Header />, { auth: { user } });
    expect(screen.getByRole('link', { name: 'Mon espace' })).toHaveAttribute(
      'href',
      '/mon-espace',
    );
  });
});

describe('RequireAuth (pages protégées)', () => {
  // Affiche /mon-espace derrière le vigile, avec la session donnée
  function renderProtected(auth: Partial<AuthValue>) {
    const value: AuthValue = {
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      ...auth,
    };
    render(
      <AuthContext.Provider value={value}>
        <MemoryRouter initialEntries={['/mon-espace']}>
          <Routes>
            <Route element={<RequireAuth />}>
              <Route path="/mon-espace" element={<p>Contenu protégé</p>} />
            </Route>
            <Route path="/connexion" element={<p>Page Connexion</p>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );
  }

  it('renvoie un visiteur vers la page de connexion', () => {
    renderProtected({});
    expect(screen.getByText('Page Connexion')).toBeInTheDocument();
  });

  it('affiche la page à un utilisateur connecté', () => {
    renderProtected({ user });
    expect(screen.getByText('Contenu protégé')).toBeInTheDocument();
  });

  it('attend la vérification de la session avant de décider', () => {
    renderProtected({ loading: true });
    expect(screen.queryByText('Page Connexion')).not.toBeInTheDocument();
    expect(screen.queryByText('Contenu protégé')).not.toBeInTheDocument();
  });
});

describe('Espace connecté (SpaceLayout)', () => {
  it('déconnecte l’utilisateur et revient à l’accueil', async () => {
    const auth = renderPage(<SpaceLayout />, { auth: { user } });

    // Bouton de la barre du haut (le tiroir mobile contient le même)
    await userEvent.click(
      screen.getAllByRole('button', { name: 'Déconnexion' })[0],
    );

    expect(auth.logout).toHaveBeenCalled();
    expect(await screen.findByText('Page Accueil')).toBeInTheDocument();
  });

  it('ouvre et ferme le tiroir de navigation (mobile)', async () => {
    renderPage(<SpaceLayout />, { auth: { user } });
    const open = screen.getByRole('button', { name: 'Ouvrir le menu' });

    expect(open).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(open);
    expect(open).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(
      screen.getByRole('button', { name: 'Fermer le menu' }),
    );
    expect(open).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('Accueil', () => {
  it('visiteur : le bouton rond mène à la connexion', () => {
    renderPage(<Home />);
    expect(
      screen.getByRole('link', {
        name: 'Téléverser un fichier (connexion requise)',
      }),
    ).toHaveAttribute('href', '/connexion');
  });

  it('connecté : choisir un fichier affiche la carte « Ajouter un fichier »', async () => {
    renderPage(<Home />, { auth: { user } });
    const input = document.querySelector<HTMLInputElement>('input[type=file]')!;

    await userEvent.upload(
      input,
      new File(['contenu'], 'photo.jpg', { type: 'image/jpeg' }),
    );

    expect(
      screen.getByRole('heading', { name: 'Ajouter un fichier' }),
    ).toBeInTheDocument();
    expect(screen.getByText('photo.jpg')).toBeInTheDocument();
  });
});
