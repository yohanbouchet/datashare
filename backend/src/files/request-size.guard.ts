// ================================================================================================
// Fichier : request-size.guard.ts
// Rôle : Garde (« vigile ») de la route de téléversement (US01) : refuse d'emblée (413) une requête
//   qui annonce, dans son en-tête Content-Length, une taille supérieure à 1 Go (+ marge pour les champs).
//   2e des 3 niveaux de contrôle de la taille : le front (avant l'envoi), cette garde (à l'arrivée),
//   multer (pendant la réception, pour un client qui mentirait ou n'annoncerait pas la taille).
// Utilise :
//   - storage.service.ts (MAX_FILE_SIZE, MAX_FILE_SIZE_MESSAGE)
// Utilisé par :
//   - files.controller.ts (@UseGuards sur la route POST /api/files)
// ================================================================================================
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { Request } from 'express';
import { MAX_FILE_SIZE_MESSAGE, MAX_FILE_SIZE } from './storage.service.js';

// Marge pour l'enveloppe multipart (séparateurs, en-têtes) et les champs texte : 1 Mo
const MARGIN = 1024 ** 2;

@Injectable()
export class RequestSizeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    // Content-Length : taille annoncée par le client, en octets (absente → 0, multer contrôlera)
    const declaredSize = Number(request.headers['content-length'] ?? 0);
    // 🔒 Refus immédiat : l'API ne lit même pas le contenu d'un envoi trop gros
    if (declaredSize > MAX_FILE_SIZE + MARGIN) {
      throw new PayloadTooLargeException(MAX_FILE_SIZE_MESSAGE);
    }
    return true;
  }
}
