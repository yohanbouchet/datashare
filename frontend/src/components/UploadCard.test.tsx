// =============================================================================
// Fichier : UploadCard.test.tsx
// Rôle : Tests de la carte « Ajouter un fichier » (US01) : contrôle de la
//   taille AVANT l'envoi (1er des 3 niveaux), contrôles du formulaire,
//   contenu envoyé à l'API et carte de succès avec le lien de partage.
//   L'envoi (filesApi.upload) est remplacé par une doublure.
// Utilise :
//   - components/UploadCard.tsx (la pièce testée) ; test/render.tsx
//   - services/api.ts (filesApi) ; Testing Library
// Utilisé par :
//   - Vitest (vitest.config.ts)
// =============================================================================
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { filesApi } from '../services/api.ts';
import { renderPage } from '../test/render.tsx';
import { UploadCard } from './UploadCard.tsx';

vi.mock('../services/api.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../services/api.ts')>();
  return { ...original, filesApi: { ...original.filesApi, upload: vi.fn() } };
});

// Fichier de test ; size remplacée pour simuler un gros fichier sans le créer
function makeFile(name: string, size: number): File {
  const file = new File(['contenu'], name, { type: 'text/plain' });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

const user = { id: 1, email: 'claire@mail.fr' };

describe('Carte « Ajouter un fichier »', () => {
  beforeEach(() => {
    vi.mocked(filesApi.upload).mockReset();
  });

  it('refuse un fichier de plus de 1 Go avant tout envoi', () => {
    renderPage(
      <UploadCard
        file={makeFile('film.mp4', 1.1 * 1024 ** 3)}
        onChangeFile={vi.fn()}
      />,
      { auth: { user } },
    );

    expect(screen.getByText('1,1 Go')).toBeInTheDocument();
    expect(
      screen.getByText('La taille des fichiers est limitée à 1 Go'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Téléverser' })).toBeDisabled();
  });

  it('refuse un mot de passe trop court et des tags en double', async () => {
    renderPage(
      <UploadCard file={makeFile('photo.jpg', 2048)} onChangeFile={vi.fn()} />,
      { auth: { user } },
    );

    await userEvent.type(screen.getByLabelText('Mot de passe'), 'abc');
    await userEvent.type(screen.getByLabelText('Tags'), 'photo, photo');
    await userEvent.click(screen.getByRole('button', { name: 'Téléverser' }));

    expect(
      screen.getByText(
        'Le mot de passe du fichier doit contenir au moins 6 caractères',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Un même tag ne peut pas être ajouté deux fois'),
    ).toBeInTheDocument();
    expect(filesApi.upload).not.toHaveBeenCalled();
  });

  it('envoie le fichier, la durée, le mot de passe et les tags, puis affiche le lien', async () => {
    vi.mocked(filesApi.upload).mockResolvedValue({
      id: 12,
      originalName: 'photo.jpg',
      size: 2048,
      mimeType: 'image/jpeg',
      createdAt: '2026-10-10T10:00:00.000Z',
      expiresAt: '2026-10-13T10:00:00.000Z',
      isExpired: false,
      isProtected: true,
      tags: ['vacances', 'photos'],
      token: 'jeton-du-lien',
    });
    const file = makeFile('photo.jpg', 2048);
    renderPage(<UploadCard file={file} onChangeFile={vi.fn()} />, {
      auth: { user },
    });

    await userEvent.type(screen.getByLabelText('Mot de passe'), 'secret1');
    await userEvent.selectOptions(screen.getByLabelText('Expiration'), '3');
    await userEvent.type(screen.getByLabelText('Tags'), 'vacances, photos');
    await userEvent.click(screen.getByRole('button', { name: 'Téléverser' }));

    // Contenu du « colis » multipart envoyé à l'API
    const data = vi.mocked(filesApi.upload).mock.calls[0][0];
    expect(data.get('file')).toBe(file);
    expect(data.get('expiresInDays')).toBe('3');
    expect(data.get('password')).toBe('secret1');
    expect(data.getAll('tags')).toEqual(['vacances', 'photos']);
    // Carte de succès : durée choisie et lien /d/<jeton>
    expect(
      await screen.findByText(/conservé chez nous pendant trois jours/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /\/d\/jeton-du-lien$/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Copier le lien' }),
    ).toBeInTheDocument();
  });
});
