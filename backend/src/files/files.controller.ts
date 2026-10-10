// =============================================================================
// Fichier : files.controller.ts
// Rôle : Contrôleur (le « guichet ») des fichiers du propriétaire : reçoit les
//   requêtes /api/files. Toutes ses routes sont protégées par la garde JWT. Il
//   ne fait aucun traitement : il transmet au service. Routes : POST /api/files
//   (US01, téléversement) ; GET /api/files?status=active|expired|all (US05,
//   historique) ; DELETE /api/files/:id (US06, suppression).
// Utilise :
//   - files.service.ts (FilesService) : create, findForUser, remove
//   - dto/upload-file.dto.ts, request-size.guard.ts, upload-exception.filter.ts
//     (US01)
//   - @nestjs/platform-express (FileInterceptor : réception du fichier par
//     multer)
//   - dto/list-files-query.dto.ts (ListFilesQueryDto) : contrôle du paramètre
//     ?status=…
//   - auth/jwt-auth.guard.ts (JwtAuthGuard, type AuthenticatedRequest) : vigile
//     + utilisateur du jeton
// Utilisé par :
//   - files.module.ts (controllers) ; le front (écran « Mon espace », à venir)
// =============================================================================
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseFilePipe,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import { ListFilesQueryDto } from './dto/list-files-query.dto.js';
import { UploadFileDto } from './dto/upload-file.dto.js';
import { FilesService } from './files.service.js';
import { RequestSizeGuard } from './request-size.guard.js';
import { UploadExceptionFilter } from './upload-exception.filter.js';

// @Controller('files') : ce guichet répond à /api/files (le préfixe /api est
// ajouté dans main.ts).
// @UseGuards sur la CLASSE : le vigile protège toutes les routes du guichet
// (sans jeton valide → 401).
// @ApiTags, @ApiBearerAuth… : documentation OpenAPI (page /api/docs) ;
// toutes les routes exigent le JWT (bouton « Authorize » de la page)
@ApiTags('Fichiers (connecté)')
@ApiBearerAuth()
@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  // Injection de dépendances : NestJS fournit le FilesService au guichet, qui
  // lui délègue le travail
  constructor(private readonly filesService: FilesService) {}

  // POST /api/files : téléversement d'un fichier (US01) → 201 + informations et
  // jeton du lien.
  // Ordre de passage : garde JWT (classe) → RequestSizeGuard (Content-Length >
  // 1 Go → 413)
  // → FileInterceptor (multer écrit le fichier sur le disque, sous un nom
  // aléatoire, ou refuse : extension, taille)
  // → pipes (ParseFilePipe : fichier présent ; ValidationPipe : UploadFileDto)
  // → service.
  // @UseFilters : toute erreur efface le fichier déjà reçu
  // (upload-exception.filter.ts).
  @ApiOperation({ summary: 'Téléverser un fichier (US01)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '1 Go maximum, extension non interdite',
        },
        expiresInDays: { type: 'integer', minimum: 1, maximum: 7, default: 7 },
        password: {
          type: 'string',
          minLength: 6,
          maxLength: 72,
          description: 'Facultatif',
        },
        tags: {
          type: 'array',
          maxItems: 10,
          items: { type: 'string', maxLength: 30 },
          description: 'Facultatif, sans doublon',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description:
      'Fichier enregistré ; token sert à construire le lien /d/<token>',
    schema: {
      example: {
        id: 12,
        originalName: 'IMG_9210.jpg',
        size: 2726297,
        mimeType: 'image/jpeg',
        createdAt: '2026-10-05T09:00:00.000Z',
        expiresAt: '2026-10-12T09:00:00.000Z',
        isExpired: false,
        isProtected: true,
        tags: ['photos'],
        token: 'Xk9f…q2',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Aucun fichier, extension interdite, durée, mot de passe ou tags invalides',
  })
  @ApiResponse({ status: 401, description: 'Jeton absent, invalide ou expiré' })
  @ApiResponse({
    status: 413,
    description: 'La taille des fichiers est limitée à 1 Go',
  })
  @Post()
  @UseGuards(RequestSizeGuard)
  @UseInterceptors(FileInterceptor('file'))
  @UseFilters(UploadExceptionFilter)
  upload(
    @Req() request: AuthenticatedRequest,
    @UploadedFile(
      new ParseFilePipe({
        exceptionFactory: () => new BadRequestException('Aucun fichier envoyé'),
      }),
    )
    file: Express.Multer.File,
    @Body() dto: UploadFileDto,
  ) {
    // 🔒 Le propriétaire vient du jeton (sub), jamais d'un champ du formulaire
    return this.filesService.create(request.user.sub, file, dto);
  }

  // GET /api/files : la liste des fichiers de l'utilisateur connecté (US05).
  // @Req() : la requête, où la garde a rangé l'utilisateur du jeton
  // (request.user).
  // @Query() : le paramètre ?status=…, déjà contrôlé par le DTO (active par
  // défaut, sinon 400).
  // 🔒 L'identifiant vient du jeton signé (sub), jamais de l'adresse :
  // impossible de lister les fichiers d'un autre.
  @ApiOperation({ summary: 'Historique de mes fichiers (US05)' })
  @ApiResponse({
    status: 200,
    description: 'Liste, du plus récent au plus ancien',
    schema: {
      example: [
        {
          id: 12,
          originalName: 'IMG_9210.jpg',
          size: 2726297,
          mimeType: 'image/jpeg',
          createdAt: '2026-10-05T09:00:00.000Z',
          expiresAt: '2026-10-12T09:00:00.000Z',
          isExpired: false,
          isProtected: true,
          tags: ['photos'],
          token: 'Xk9f…q2',
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Filtre invalide (active, expired ou all)',
  })
  @ApiResponse({ status: 401, description: 'Jeton absent, invalide ou expiré' })
  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListFilesQueryDto,
  ) {
    return this.filesService.findForUser(request.user.sub, query.status);
  }

  // DELETE /api/files/:id : supprime un fichier de l'utilisateur connecté
  // (US06) → 204 sans contenu.
  // ParseIntPipe : l'id de l'adresse (texte) devient un nombre ; « abc » → 404
  // « Fichier introuvable »
  // (exceptionFactory) plutôt qu'un 400 technique, conformément au contrat
  // d'interface.
  // 🔒 Le propriétaire vient du jeton (sub) : le service refuse (404) le fichier
  // d'un autre.
  @ApiOperation({
    summary: 'Supprimer un de mes fichiers : base et disque (US06)',
  })
  @ApiResponse({ status: 204, description: 'Fichier supprimé' })
  @ApiResponse({ status: 401, description: 'Jeton absent, invalide ou expiré' })
  @ApiResponse({
    status: 404,
    description: 'Fichier introuvable (ou appartenant à un autre utilisateur)',
  })
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
