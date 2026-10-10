// =============================================================================
// Fichier : jwt-auth.guard.ts
// Rôle : Garde JWT : contrôle exécuté AVANT une route protégée
//   (@UseGuards(JwtAuthGuard)). Lit l'en-tête "Authorization: Bearer <jeton>",
//   vérifie la signature (JWT_SECRET) et l'expiration, puis range le contenu du
//   jeton dans request.user. Sinon : 401. Définit aussi les types JwtPayload
//   (contenu du jeton) et AuthenticatedRequest (requête après la garde).
// Utilise :
//   - @nestjs/jwt (JwtService) : verifyAsync, avec la clé configurée dans
//     auth.module.ts
//   - express (type Request) : la forme d'une requête HTTP
// Utilisé par :
//   - auth.controller.ts (route GET /api/auth/me)
//   - plus tard : les routes des fichiers (US01, US05, US06)
// =============================================================================
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
// "import type" : on n'importe qu'une description de type, rien n'est chargé à
// l'exécution.
import type { Request } from 'express';

// Contenu du JWT (signé à la connexion dans auth.service.ts) : sub =
// identifiant du compte.
export interface JwtPayload {
  sub: number;
  email: string;
}

// Requête HTTP APRÈS passage de la garde : elle porte l'utilisateur
// authentifié.
export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

// CanActivate : une garde répond true (« il peut passer ») ou lève une erreur
// (« refusé »).
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Récupère la requête HTTP en cours
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // En-tête attendu : "Bearer eyJhbGciOi..." → on sépare le mot "Bearer" du
    // jeton
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Authentification requise');
    }

    try {
      // 🔒 Vérifie la signature (jeton fabriqué par NOUS, non modifié) et la
      // date d'expiration
      request.user = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Session invalide ou expirée');
    }
    return true;
  }
}
