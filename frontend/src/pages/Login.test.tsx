// =============================================================================
// Fichier : Login.test.tsx
// Rôle : Tests de la page de connexion (US04) dans un faux navigateur
//   (jsdom) : on remplit le formulaire comme un utilisateur (userEvent) et on
//   vérifie ce qui s'affiche. La session est une doublure (renderPage).
// Utilise :
//   - pages/Login.tsx (la pièce testée) ; test/render.tsx (renderPage)
//   - services/api.ts (ApiError) ; Testing Library (screen, userEvent)
// Utilisé par :
//   - Vitest (vitest.config.ts)
// =============================================================================
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../services/api.ts';
import { renderPage } from '../test/render.tsx';
import { Login } from './Login.tsx';

describe('Page Connexion', () => {
  it('affiche un message sous chaque champ invalide, sans appeler l’API', async () => {
    const auth = renderPage(<Login />);

    await userEvent.click(screen.getByRole('button', { name: 'Connexion' }));

    expect(
      screen.getByText("L'adresse email n'est pas valide"),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Le mot de passe est obligatoire'),
    ).toBeInTheDocument();
    // Accessibilité : le champ en erreur est signalé aux lecteurs d'écran
    expect(screen.getByLabelText('Email')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('connecte l’utilisateur (email sans espaces) et revient à l’accueil', async () => {
    const auth = renderPage(<Login />, {
      auth: { login: vi.fn().mockResolvedValue(undefined) },
    });

    await userEvent.type(screen.getByLabelText('Email'), ' claire@mail.fr ');
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'motdepasse8');
    await userEvent.click(screen.getByRole('button', { name: 'Connexion' }));

    expect(auth.login).toHaveBeenCalledWith('claire@mail.fr', 'motdepasse8');
    expect(await screen.findByText('Page Accueil')).toBeInTheDocument();
  });

  it('affiche le message de l’API dans un bandeau d’erreur', async () => {
    renderPage(<Login />, {
      auth: {
        login: vi
          .fn()
          .mockRejectedValue(
            new ApiError(401, 'Email ou mot de passe incorrect'),
          ),
      },
    });

    await userEvent.type(screen.getByLabelText('Email'), 'claire@mail.fr');
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'mauvais');
    await userEvent.click(screen.getByRole('button', { name: 'Connexion' }));

    // role="alert" : le bandeau est annoncé par les lecteurs d'écran
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Email ou mot de passe incorrect',
    );
  });
});
