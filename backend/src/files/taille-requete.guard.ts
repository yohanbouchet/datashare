// ================================================================================================
// Fichier : taille-requete.guard.ts
// Rôle : Garde (« vigile ») de la route de téléversement (US01) : refuse d'emblée (413) une requête
//   qui annonce, dans son en-tête Content-Length, une taille supérieure à 1 Go (+ marge pour les champs).
//   2e des 3 niveaux de contrôle de la taille : le front (avant l'envoi), cette garde (à l'arrivée),
//   multer (pendant la réception, pour un client qui mentirait ou n'annoncerait pas la taille).
// Utilise :
//   - storage.service.ts (TAILLE_MAX_FICHIER, MESSAGE_TAILLE_MAX)
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
import { MESSAGE_TAILLE_MAX, TAILLE_MAX_FICHIER } from './storage.service.js';

// Marge pour l'enveloppe multipart (séparateurs, en-têtes) et les champs texte : 1 Mo
const MARGE = 1024 ** 2;

@Injectable()
export class TailleRequeteGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    // Content-Length : taille annoncée par le client, en octets (absente → 0, multer contrôlera)
    const tailleAnnoncee = Number(request.headers['content-length'] ?? 0);
    // 🔒 Refus immédiat : l'API ne lit même pas le contenu d'un envoi trop gros
    if (tailleAnnoncee > TAILLE_MAX_FICHIER + MARGE) {
      throw new PayloadTooLargeException(MESSAGE_TAILLE_MAX);
    }
    return true;
  }
}
