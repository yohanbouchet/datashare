// =============================================================================
// Fichier : jwt-auth.guard.spec.ts
// Rôle : Tests unitaires de la garde JWT (Vitest : npm test). JwtService est
//   remplacé par une doublure ; la requête HTTP est simulée par un petit objet.
//   Cas testés : pas d'en-tête, mauvais format, jeton invalide ou expiré (401)
//   ; jeton valide (accès + request.user).
// Utilise :
//   - jwt-auth.guard.ts (la pièce testée)
//   - @nestjs/jwt (JwtService, remplacé par une doublure)
// Utilisé par :
//   - Vitest (vitest.config.ts)
// =============================================================================
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard.js';

describe('JwtAuthGuard', () => {
  // Doublure de JwtService : on choisit dans chaque test si le jeton est
  // accepté ou refusé.
  const jwtService = { verifyAsync: vi.fn() };
  const guard = new JwtAuthGuard(jwtService as unknown as JwtService);

  // Fabrique un faux "contexte" NestJS qui contient une requête avec l'en-tête
  // Authorization voulu.
  function contextWith(authorization?: string) {
    const request: Record<string, unknown> = { headers: { authorization } };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    return { context, request };
  }

  beforeEach(() => vi.clearAllMocks());

  it('refuse une requête sans en-tête Authorization (401)', async () => {
    const { context } = contextWith(undefined);
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Authentification requise',
    );
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it("refuse un en-tête qui n'est pas au format « Bearer <jeton> » (401)", async () => {
    const { context } = contextWith('Basic abc123');
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('refuse un jeton invalide ou expiré (401)', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));
    const { context } = contextWith('Bearer jeton.falsifie');
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Session invalide ou expirée',
    );
  });

  it('laisse passer un jeton valide et range son contenu dans request.user', async () => {
    const payload = { sub: 1, email: 'claire@mail.fr' };
    jwtService.verifyAsync.mockResolvedValue(payload);
    const { context, request } = contextWith('Bearer jeton.valide');

    expect(await guard.canActivate(context)).toBe(true);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('jeton.valide');
    expect(request.user).toEqual(payload);
  });
});
