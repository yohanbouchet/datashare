// ================================================================================================
// Fichier : files.controller.ts
// Rôle : Contrôleur (le « guichet ») des fichiers du propriétaire : reçoit les requêtes /api/files.
//   Toutes ses routes sont protégées par la garde JWT. Il ne fait aucun traitement : il transmet au service.
//   Routes : GET /api/files?status=active|expired|all (US05, historique) ; DELETE /api/files/:id (US06, suppression).
// Utilise :
//   - files.service.ts (FilesService) : findForUser, remove
//   - dto/list-files-query.dto.ts (ListFilesQueryDto) : contrôle du paramètre ?status=…
//   - auth/jwt-auth.guard.ts (JwtAuthGuard, type AuthenticatedRequest) : vigile + utilisateur du jeton
// Utilisé par :
//   - files.module.ts (controllers) ; le front (écran « Mon espace », à venir)
// ================================================================================================
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import { ListFilesQueryDto } from './dto/list-files-query.dto.js';
import { FilesService } from './files.service.js';

// @Controller('files') : ce guichet répond à /api/files (le préfixe /api est ajouté dans main.ts).
// @UseGuards sur la CLASSE : le vigile protège toutes les routes du guichet (sans jeton valide → 401).
@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  // Injection de dépendances : NestJS fournit le FilesService au guichet, qui lui délègue le travail
  constructor(private readonly filesService: FilesService) {}

  // GET /api/files : la liste des fichiers de l'utilisateur connecté (US05).
  // @Req() : la requête, où la garde a rangé l'utilisateur du jeton (request.user).
  // @Query() : le paramètre ?status=…, déjà contrôlé par le DTO (active par défaut, sinon 400).
  // 🔒 L'identifiant vient du jeton signé (sub), jamais de l'adresse : impossible de lister les fichiers d'un autre.
  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListFilesQueryDto,
  ) {
    return this.filesService.findForUser(request.user.sub, query.status);
  }

  // DELETE /api/files/:id : supprime un fichier de l'utilisateur connecté (US06) → 204 sans contenu.
  // ParseIntPipe : l'id de l'adresse (texte) devient un nombre ; « abc » → 404 « Fichier introuvable »
  // (exceptionFactory) plutôt qu'un 400 technique, conformément au contrat d'interface.
  // 🔒 Le propriétaire vient du jeton (sub) : le service refuse (404) le fichier d'un autre.
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Req() request: AuthenticatedRequest,
    @Param(
      'id',
      new ParseIntPipe({
        exceptionFactory: () => new NotFoundException('Fichier introuvable'),
      }),
    )
    id: number,
  ) {
    return this.filesService.remove(request.user.sub, id);
  }
}
