// ================================================================================================
// Fichier : televersement.filter.spec.ts
// Rôle : Tests unitaires de TeleversementFilter (Vitest : npm test) : en cas d'erreur pendant un
//   téléversement, le fichier déjà reçu est effacé, et la réponse d'erreur est correcte (400, 413, 500).
// Utilise :
//   - televersement.filter.ts (la pièce testée), storage.service.ts (remplacé par une doublure)
// Utilisé par :
//   - Vitest (vitest.config.ts)
// ================================================================================================
import {
  ArgumentsHost,
  BadRequestException,
  Logger,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { StorageService } from './storage.service.js';
import { TeleversementFilter } from './televersement.filter.js';

describe('TeleversementFilter', () => {
  const storage = { remove: vi.fn() };
  const filtre = new TeleversementFilter(storage as unknown as StorageService);
  // Fausse réponse Express : status(…) renvoie la réponse, pour pouvoir enchaîner .json(…)
  const response = { status: vi.fn(), json: vi.fn() };

  // Faux contexte NestJS avec une requête (éventuellement porteuse d'un fichier reçu) et la fausse réponse
  const contexte = (request: object) =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    }) as unknown as ArgumentsHost;

  beforeEach(() => {
    vi.clearAllMocks();
    response.status.mockReturnValue(response);
    storage.remove.mockResolvedValue(undefined);
    // Le journal des erreurs imprévues est rendu silencieux pendant les tests
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  it('efface le fichier déjà reçu et renvoie l’erreur 400 telle quelle', async () => {
    const erreur = new BadRequestException(['Durée invalide']);

    await filtre.catch(erreur, contexte({ file: { filename: 'abc123' } }));

    expect(storage.remove).toHaveBeenCalledWith('abc123');
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(erreur.getResponse());
  });

  it('ne tente aucune suppression si aucun fichier n’a été reçu', async () => {
    await filtre.catch(
      new BadRequestException('Aucun fichier envoyé'),
      contexte({}),
    );

    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('renvoie 413 avec le message en français, quel que soit le message d’origine', async () => {
    await filtre.catch(
      new PayloadTooLargeException('File too large'),
      contexte({}),
    );

    expect(response.status).toHaveBeenCalledWith(413);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'La taille des fichiers est limitée à 1 Go',
      }),
    );
  });

  it('renvoie 500 sans détail technique pour une erreur imprévue, et efface le fichier', async () => {
    await filtre.catch(
      new Error('connexion à la base perdue'),
      contexte({ file: { filename: 'abc123' } }),
    );

    expect(storage.remove).toHaveBeenCalledWith('abc123');
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(
      expect.not.objectContaining({ message: 'connexion à la base perdue' }),
    );
  });
});
