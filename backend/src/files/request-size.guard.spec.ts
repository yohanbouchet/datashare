// ================================================================================================
// Fichier : request-size.guard.spec.ts
// Rôle : Tests unitaires de RequestSizeGuard (Vitest : npm test) : la requête est refusée (413)
//   si son en-tête Content-Length dépasse 1 Go + 1 Mo de marge, acceptée sinon.
// Utilise :
//   - request-size.guard.ts (la pièce testée), storage.service.ts (MAX_FILE_SIZE)
// Utilisé par :
//   - Vitest (vitest.config.ts)
// ================================================================================================
import { ExecutionContext, PayloadTooLargeException } from '@nestjs/common';
import { MAX_FILE_SIZE } from './storage.service.js';
import { RequestSizeGuard } from './request-size.guard.js';

describe('RequestSizeGuard', () => {
  const guard = new RequestSizeGuard();

  // Faux contexte NestJS qui contient une requête avec les en-têtes donnés
  const contextFor = (headers: Record<string, string>) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ headers }) }),
    }) as unknown as ExecutionContext;

  it('laisse passer une requête de taille raisonnable', () => {
    expect(guard.canActivate(contextFor({ 'content-length': '2048' }))).toBe(
      true,
    );
  });

  it('laisse passer une requête sans Content-Length (multer contrôlera pendant la réception)', () => {
    expect(guard.canActivate(contextFor({}))).toBe(true);
  });

  it('refuse (413, message en français) une requête annoncée au-delà de 1 Go + marge', () => {
    const tooLarge = String(MAX_FILE_SIZE + 2 * 1024 * 1024);

    expect(() =>
      guard.canActivate(contextFor({ 'content-length': tooLarge })),
    ).toThrow(
      new PayloadTooLargeException('La taille des fichiers est limitée à 1 Go'),
    );
  });
});
