// =============================================================================
// Fichier : Download.test.tsx
// Rôle : Tests de la page publique « Télécharger un fichier » (US02) : bandeau
//   d'expiration, bouton grisé tant que le mot de passe est vide, mot de passe
//   faux sans téléchargement, lien expiré. Les appels à l'API sont des
//   doublures, et l'envoi du formulaire par le navigateur est intercepté.
// Utilise :
//   - pages/Download.tsx (la pièce testée) ; test/render.tsx
//   - services/api.ts (downloadApi, ApiError) ; Testing Library
// Utilisé par :
//   - Vitest (vitest.config.ts)
// =============================================================================
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, downloadApi } from '../services/api.ts';
import { renderPage } from '../test/render.tsx';
import { Download } from './Download.tsx';

vi.mock('../services/api.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../services/api.ts')>();
  return {
    ...original,
    downloadApi: { ...original.downloadApi, info: vi.fn(), verify: vi.fn() },
  };
});

// Date d'expiration dans N jours (à midi, pour éviter les effets de minuit)
function inDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
}

const renderDownload = () =>
  renderPage(<Download />, { route: '/d/jeton', path: '/d/:token' });

describe('Page Télécharger un fichier', () => {
  // Le navigateur de test ne sait pas envoyer un formulaire : on intercepte
  const submit = vi
    .spyOn(HTMLFormElement.prototype, 'submit')
    .mockImplementation(() => undefined);

  beforeEach(() => {
    vi.mocked(downloadApi.info).mockReset();
    vi.mocked(downloadApi.verify).mockReset();
    submit.mockClear();
  });

  it('fichier protégé : bouton grisé tant que le mot de passe est vide', async () => {
    vi.mocked(downloadApi.info).mockResolvedValue({
      originalName: 'photo.jpg',
      size: 2048,
      mimeType: 'image/jpeg',
      expiresAt: inDays(3),
      isProtected: true,
    });
    renderDownload();

    expect(await screen.findByText('photo.jpg')).toBeInTheDocument();
    expect(downloadApi.info).toHaveBeenCalledWith('jeton');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Ce fichier expirera dans 3 jours.',
    );
    const button = screen.getByRole('button', { name: 'Télécharger' });
    expect(button).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Mot de passe'), 'secret1');
    expect(button).toBeEnabled();
  });

  it('mot de passe faux : message sous le champ, aucun téléchargement', async () => {
    vi.mocked(downloadApi.info).mockResolvedValue({
      originalName: 'photo.jpg',
      size: 2048,
      mimeType: 'image/jpeg',
      expiresAt: inDays(1),
      isProtected: true,
    });
    vi.mocked(downloadApi.verify).mockRejectedValue(
      new ApiError(401, 'Mot de passe incorrect'),
    );
    renderDownload();

    // Expire demain : bandeau orange
    expect(
      await screen.findByText('Ce fichier expirera demain.'),
    ).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'faux123');
    await userEvent.click(screen.getByRole('button', { name: 'Télécharger' }));

    expect(downloadApi.verify).toHaveBeenCalledWith('jeton', 'faux123');
    expect(
      await screen.findByText('Mot de passe incorrect'),
    ).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });

  it('bon mot de passe : le formulaire part vers l’API, mot de passe dans le corps', async () => {
    vi.mocked(downloadApi.info).mockResolvedValue({
      originalName: 'photo.jpg',
      size: 2048,
      mimeType: 'image/jpeg',
      expiresAt: inDays(3),
      isProtected: true,
    });
    vi.mocked(downloadApi.verify).mockResolvedValue(undefined);
    renderDownload();

    await userEvent.type(
      await screen.findByLabelText('Mot de passe'),
      'secret1',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Télécharger' }));

    expect(submit).toHaveBeenCalledTimes(1);
    const form = document.querySelector('form')!;
    expect(form.method).toBe('post');
    expect(form.action).toMatch(/\/download\/jeton$/);
    // 🔒 Champ caché « password » : envoyé dans le corps, pas dans l'adresse
    expect(
      (form.elements.namedItem('password') as HTMLInputElement).value,
    ).toBe('secret1');
    expect(
      await screen.findByText('Le téléchargement a commencé.'),
    ).toBeInTheDocument();
  });

  it('lien expiré : seul le bandeau rouge s’affiche', async () => {
    vi.mocked(downloadApi.info).mockRejectedValue(
      new ApiError(
        410,
        "Ce fichier n'est plus disponible en téléchargement car il a expiré.",
      ),
    );
    renderDownload();

    expect(await screen.findByRole('alert')).toHaveTextContent('il a expiré');
    expect(
      screen.queryByRole('button', { name: 'Télécharger' }),
    ).not.toBeInTheDocument();
  });
});
