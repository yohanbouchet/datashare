// =============================================================================
// Fichier : MySpace.test.tsx
// Rôle : Tests de la page « Mes fichiers » (US05, US06) : liste et filtre,
//   cadenas des fichiers protégés, fichier expiré, suppression avec
//   confirmation. Les appels à l'API sont des doublures.
// Utilise :
//   - pages/MySpace.tsx (la pièce testée) ; test/render.tsx
//   - services/api.ts (filesApi) ; Testing Library
// Utilisé par :
//   - Vitest (vitest.config.ts)
// =============================================================================
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { filesApi, type FileHistoryItem } from '../services/api.ts';
import { renderPage } from '../test/render.tsx';
import { MySpace } from './MySpace.tsx';

vi.mock('../services/api.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../services/api.ts')>();
  return { ...original, filesApi: { list: vi.fn(), remove: vi.fn() } };
});

const file = (overrides: Partial<FileHistoryItem>): FileHistoryItem => ({
  id: 1,
  originalName: 'photo.jpg',
  size: 2048,
  createdAt: '2026-10-10T10:00:00.000Z',
  expiresAt: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
  isExpired: false,
  isProtected: false,
  tags: [],
  token: 'jeton-1',
  ...overrides,
});

const user = { id: 1, email: 'claire@mail.fr' };

describe('Page Mes fichiers', () => {
  beforeEach(() => {
    vi.mocked(filesApi.list).mockReset();
    vi.mocked(filesApi.remove).mockReset();
  });

  it('affiche les fichiers actifs par défaut (US06), avec taille et dates (US05)', async () => {
    vi.mocked(filesApi.list).mockResolvedValue([
      file({
        id: 1,
        originalName: 'photo.jpg',
        size: 2726297,
        createdAt: new Date(2026, 9, 8, 12, 0).toISOString(),
        expiresAt: new Date(2026, 9, 15, 12, 0).toISOString(),
      }),
    ]);
    renderPage(<MySpace />, { auth: { user } });

    expect(await screen.findByText('photo.jpg')).toBeInTheDocument();
    expect(filesApi.list).toHaveBeenCalledWith('active');
    expect(screen.getByRole('button', { name: 'Actifs' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      screen.getByText('2,6 Mo · envoyé le 08/10/2026 · expire le 15/10/2026'),
    ).toBeInTheDocument();
  });

  it('affiche le cadenas et un fichier expiré', async () => {
    vi.mocked(filesApi.list).mockResolvedValue([
      file({ id: 1, originalName: 'photo.jpg', isProtected: true }),
      file({
        id: 2,
        originalName: 'vacances.mp4',
        isExpired: true,
        expiresAt: '2026-10-01T10:00:00.000Z',
      }),
    ]);
    renderPage(<MySpace />, { auth: { user } });

    expect(await screen.findByText('photo.jpg')).toBeInTheDocument();
    expect(screen.getByText('Protégé par mot de passe')).toBeInTheDocument();
    expect(
      screen.getByText("Ce fichier a expiré, il n'est plus stocké chez nous"),
    ).toBeInTheDocument();
  });

  it('recharge la liste quand on choisit le filtre « Tous »', async () => {
    vi.mocked(filesApi.list).mockResolvedValue([]);
    renderPage(<MySpace />, { auth: { user } });

    expect(
      await screen.findByText('Aucun fichier à afficher.'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tous' }));

    expect(filesApi.list).toHaveBeenLastCalledWith('all');
  });

  it('supprime un fichier après confirmation, et rien sans confirmation', async () => {
    vi.mocked(filesApi.list).mockResolvedValue([
      file({ id: 7, originalName: 'rapport.pdf' }),
    ]);
    vi.mocked(filesApi.remove).mockResolvedValue(undefined);
    const confirm = vi.spyOn(window, 'confirm');
    renderPage(<MySpace />, { auth: { user } });
    const row = (await screen.findByText('rapport.pdf')).closest('li')!;
    // Bouton de la vue ordinateur (le menu ⋮ du mobile contient le même)
    const deleteButton = within(row).getAllByRole('button', {
      name: 'Supprimer rapport.pdf',
    })[0];

    confirm.mockReturnValueOnce(false);
    await userEvent.click(deleteButton);
    expect(filesApi.remove).not.toHaveBeenCalled();

    confirm.mockReturnValueOnce(true);
    await userEvent.click(deleteButton);
    expect(filesApi.remove).toHaveBeenCalledWith(7);
    expect(
      await screen.findByText('« rapport.pdf » a été supprimé.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('rapport.pdf')).not.toBeInTheDocument();
  });
});
