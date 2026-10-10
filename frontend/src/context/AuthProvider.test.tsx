// =============================================================================
// Fichier : AuthProvider.test.tsx
// Rôle : Tests de la mémoire de session (AuthProvider) : vérification du JWT
//   conservé au démarrage (le F5), connexion, déconnexion. Les appels à l'API
//   sont des doublures.
// Utilise :
//   - context/AuthProvider.tsx, useAuth.ts (les pièces testées)
//   - services/api.ts (authApi, gestion du jeton) ; Testing Library
// Utilisé par :
//   - Vitest (vitest.config.ts)
// =============================================================================
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { authApi, clearToken, readToken, saveToken } from '../services/api.ts';
import { AuthProvider } from './AuthProvider.tsx';
import { useAuth } from './useAuth.ts';

vi.mock('../services/api.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../services/api.ts')>();
  return {
    ...original,
    authApi: { register: vi.fn(), login: vi.fn(), me: vi.fn() },
  };
});

// Petit composant qui affiche l'état de la session et ses boutons
function SessionProbe() {
  const { user, loading, login, logout } = useAuth();
  if (loading) return <p>Vérification…</p>;
  return (
    <>
      <p>{user ? `Connecté : ${user.email}` : 'Personne'}</p>
      <button onClick={() => void login('claire@mail.fr', 'motdepasse8')}>
        Se connecter
      </button>
      <button onClick={logout}>Se déconnecter</button>
    </>
  );
}

const renderProvider = () =>
  render(
    <AuthProvider>
      <SessionProbe />
    </AuthProvider>,
  );

describe('AuthProvider (session)', () => {
  beforeEach(() => {
    vi.mocked(authApi.me).mockReset();
    vi.mocked(authApi.login).mockReset();
    clearToken();
  });

  it('sans jeton conservé : personne n’est connecté, l’API n’est pas appelée', () => {
    renderProvider();

    expect(screen.getByText('Personne')).toBeInTheDocument();
    expect(authApi.me).not.toHaveBeenCalled();
  });

  it('jeton conservé valide (F5) : la session est rétablie par /me', async () => {
    saveToken('jeton-valide');
    vi.mocked(authApi.me).mockResolvedValue({ id: 1, email: 'claire@mail.fr' });

    renderProvider();

    expect(screen.getByText('Vérification…')).toBeInTheDocument();
    expect(
      await screen.findByText('Connecté : claire@mail.fr'),
    ).toBeInTheDocument();
  });

  it('jeton conservé expiré : il est effacé', async () => {
    saveToken('jeton-expire');
    vi.mocked(authApi.me).mockRejectedValue(new Error('401'));

    renderProvider();

    expect(await screen.findByText('Personne')).toBeInTheDocument();
    expect(readToken()).toBeNull();
  });

  it('connexion puis déconnexion : jeton conservé, puis oublié', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      accessToken: 'nouveau-jeton',
      user: { id: 1, email: 'claire@mail.fr' },
    });
    renderProvider();

    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    expect(
      await screen.findByText('Connecté : claire@mail.fr'),
    ).toBeInTheDocument();
    expect(readToken()).toBe('nouveau-jeton');

    await userEvent.click(
      screen.getByRole('button', { name: 'Se déconnecter' }),
    );
    expect(screen.getByText('Personne')).toBeInTheDocument();
    expect(readToken()).toBeNull();
  });
});
