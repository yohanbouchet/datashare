// =============================================================================
// Fichier : request-logger.middleware.spec.ts
// Rôle : Tests unitaires du journal des requêtes (logs structurés) : une ligne
//   écrite quand la réponse est terminée, avec code, durée et tailles ; jeton
//   des liens de partage masqué.
// Utilise :
//   - request-logger.middleware.ts (la pièce testée)
//   - node:events (EventEmitter : fausse réponse qui émet « finish »)
// Utilisé par :
//   - Vitest (vitest.config.ts)
// =============================================================================
import { Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { EventEmitter } from 'node:events';
import {
  maskToken,
  RequestLoggerMiddleware,
} from './request-logger.middleware.js';

describe('maskToken', () => {
  it('masque le jeton des liens de partage, et lui seul', () => {
    expect(maskToken('/api/download/AbC123-_x')).toBe('/api/download/:token');
    expect(maskToken('/api/download/AbC123/verify')).toBe(
      '/api/download/:token/verify',
    );
    expect(maskToken('/api/files?status=all')).toBe('/api/files?status=all');
  });
});

describe('RequestLoggerMiddleware', () => {
  it('écrit une ligne à la fin de la réponse : code, durée, tailles', () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    const request = {
      method: 'POST',
      originalUrl: '/api/download/secret-token',
      headers: { 'content-length': '16' },
    } as unknown as Request;
    // Fausse réponse : un émetteur d'événements avec un code et un en-tête
    const response = Object.assign(new EventEmitter(), {
      statusCode: 200,
      getHeader: (name: string) =>
        name === 'content-length' ? '10485760' : undefined,
    }) as unknown as Response;
    const next = vi.fn();

    new RequestLoggerMiddleware().use(request, response, next);

    // La requête continue tout de suite ; rien n'est écrit avant la fin
    expect(next).toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();

    response.emit('finish');

    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: '/api/download/:token',
        status: 200,
        bytesIn: 16,
        bytesOut: 10485760,
        durationMs: expect.any(Number),
      }),
    );
    log.mockRestore();
  });
});
