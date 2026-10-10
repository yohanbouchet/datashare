// =============================================================================
// Fichier : Register.test.tsx
// Rôle : Tests de la page « Créer un compte » (US03) dans un faux navigateur.
//   L'appel à l'API (authApi.register) est remplacé par une doublure
//   (vi.mock) : aucune requête réseau.
// Utilise :
//   - pages/Register.tsx (la pièce testée) ; test/render.tsx
//   - services/api.ts (authApi, ApiError) ; Testing Library
// Utilisé par :
//   - Vitest (vitest.config.ts)
// =============================================================================
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, authApi } from '../services/api.ts';
import { renderPage } from '../test/render.tsx';
import { Register } from './Register.tsx';

// Remplace authApi.register par une doublure, le reste du module est conservé
vi.mock('../services/api.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../services/api.ts')>();
  return {
    ...original,
    authApi: { ...original.authApi, register: vi.fn() },
  };
});

// Remplit le formulaire comme un utilisateur
async function fillForm(password: string, confirmation: string) {
  await userEvent.type(screen.getByLabelText('Email'), 'bob@mail.fr');
  await userEvent.type(screen.getByLabelText('Mot de passe'), password);
  await userEvent.type(
    screen.getByLabelText('Vérification du mot de passe'),
    confirmation,
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Créer mon compte' }),
  );
}

describe('Page Créer un compte', () => {
  beforeEach(() => {
    vi.mocked(authApi.register).mockReset();
  });

  it('refuse un mot de passe de moins de 8 caractères et une vérification différente', async () => {
    renderPage(<Register />);

    await fillForm('court', 'autre');

    expect(
      screen.getByText('Le mot de passe doit contenir au moins 8 caractères'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Les mots de passe ne correspondent pas'),
    ).toBeInTheDocument();
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it('crée le compte puis mène à la page de connexion', async () => {
    vi.mocked(authApi.register).mockResolvedValue({
      id: 2,
      email: 'bob@mail.fr',
      createdAt: '2026-10-10T10:00:00.000Z',
    });
    renderPage(<Register />);

    await fillForm('motdepasse8', 'motdepasse8');

    expect(authApi.register).toHaveBeenCalledWith('bob@mail.fr', 'motdepasse8');
    expect(await screen.findByText('Page Connexion')).toBeInTheDocument();
  });

  it('affiche « Cet email est déjà utilisé » renvoyé par l’API', async () => {
    vi.mocked(authApi.register).mockRejectedValue(
      new ApiError(409, 'Cet email est déjà utilisé'),
    );
    renderPage(<Register />);

    await fillForm('motdepasse8', 'motdepasse8');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cet email est déjà utilisé',
    );
  });
});
