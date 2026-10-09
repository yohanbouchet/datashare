// ================================================================================================
// Fichier : taille-requete.guard.spec.ts
// Rôle : Tests unitaires de TailleRequeteGuard (Vitest : npm test) : la requête est refusée (413)
//   si son en-tête Content-Length dépasse 1 Go + 1 Mo de marge, acceptée sinon.
// Utilise :
//   - taille-requete.guard.ts (la pièce testée), storage.service.ts (TAILLE_MAX_FICHIER)
// Utilisé par :
//   - Vitest (vitest.config.ts)
// ================================================================================================
import { ExecutionContext, PayloadTooLargeException } from '@nestjs/common';
import { TAILLE_MAX_FICHIER } from './storage.service.js';
import { TailleRequeteGuard } from './taille-requete.guard.js';

describe('TailleRequeteGuard', () => {
  const garde = new TailleRequeteGuard();

  // Faux contexte NestJS qui contient une requête avec les en-têtes donnés
  const contexte = (headers: Record<string, string>) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ headers }) }),
    }) as unknown as ExecutionContext;

  it('laisse passer une requête de taille raisonnable', () => {
    expect(garde.canActivate(contexte({ 'content-length': '2048' }))).toBe(
      true,
    );
  });

  it('laisse passer une requête sans Content-Length (multer contrôlera pendant la réception)', () => {
    expect(garde.canActivate(contexte({}))).toBe(true);
  });

  it('refuse (413, message en français) une requête annoncée au-delà de 1 Go + marge', () => {
    const tropGros = String(TAILLE_MAX_FICHIER + 2 * 1024 * 1024);

    expect(() =>
      garde.canActivate(contexte({ 'content-length': tropGros })),
    ).toThrow(
      new PayloadTooLargeException('La taille des fichiers est limitée à 1 Go'),
    );
  });
});
