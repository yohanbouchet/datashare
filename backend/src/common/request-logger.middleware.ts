// =============================================================================
// Fichier : request-logger.middleware.ts
// Rôle : Journal de chaque requête HTTP (logs structurés, PERF.md) : une ligne
//   JSON par requête, écrite quand la réponse est terminée, avec la méthode,
//   l'adresse, le code de réponse, le temps de réponse et les tailles reçue
//   et envoyée (taille des fichiers transférés).
//   Middleware (et non intercepteur) : il voit TOUTES les requêtes, même
//   celles refusées par une garde (401 sans jeton, 429 trop de tentatives).
//   🔒 Le jeton d'un lien de partage est masqué : un journal ne doit jamais
//   contenir de quoi télécharger un fichier.
// Utilise :
//   - @nestjs/common (Logger, NestMiddleware) ; express (Request, Response)
// Utilisé par :
//   - app.module.ts (configure : appliqué à toutes les routes)
// =============================================================================
import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

// /api/download/<jeton>/verify → /api/download/:token/verify
export function maskToken(url: string): string {
  return url.replace(/^(\/api\/download\/)[^/?]+/, '$1:token');
}

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  // Logger nommé « HTTP » : le champ "context" de chaque ligne du journal
  private readonly logger = new Logger('HTTP');

  use(request: Request, response: Response, next: NextFunction) {
    // Heure de départ, en millisecondes (horloge précise de Node.js)
    const start = performance.now();
    // « finish » : la réponse est entièrement envoyée (fichier compris)
    response.on('finish', () => {
      this.logger.log({
        method: request.method,
        url: maskToken(request.originalUrl),
        status: response.statusCode,
        durationMs: Math.round(performance.now() - start),
        // Tailles en octets (en-tête Content-Length ; 0 s'il est absent)
        bytesIn: Number(request.headers['content-length'] ?? 0),
        bytesOut: Number(response.getHeader('content-length') ?? 0),
      });
    });
    // Passe la main à la suite (gardes, contrôleur…)
    next();
  }
}
