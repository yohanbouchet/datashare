// =============================================================================
// Fichier : download.controller.ts
// Rôle : Contrôleur (« guichet ») PUBLIC du téléchargement (US02) : aucune
//   garde JWT, l'accès repose sur le jeton aléatoire du lien.
//   Routes : GET /api/download/:token (informations) ;
//   POST /api/download/:token/verify (mot de passe) ;
//   POST /api/download/:token (fichier, envoyé en flux).
// Utilise :
//   - download.service.ts (DownloadService) : getInfo, verify, open
//   - dto/download-password.dto.ts (VerifyPasswordDto, DownloadFileDto)
//   - content-disposition (en-tête du nom de fichier, version UTF-8 comprise)
// Utilisé par :
//   - files.module.ts (controllers) ; le front (page Téléchargement, à venir)
// =============================================================================
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import contentDisposition from 'content-disposition';
import { extname } from 'node:path';
import { DownloadService } from './download.service.js';
import {
  DownloadFileDto,
  VerifyPasswordDto,
} from './dto/download-password.dto.js';

// Pas de @UseGuards : routes publiques (le destinataire n'a pas de compte)
@Controller('download')
export class DownloadController {
  constructor(private readonly downloadService: DownloadService) {}

  // GET /api/download/:token → 200 (informations), 404 ou 410
  @Get(':token')
  getInfo(@Param('token') token: string) {
    return this.downloadService.getInfo(token);
  }

  // POST /api/download/:token/verify → 204 si le mot de passe est correct,
  // 401 sinon (POST : le mot de passe voyage dans le corps, jamais dans
  // l'adresse, qui finit dans l'historique et les journaux)
  @Post(':token/verify')
  @HttpCode(HttpStatus.NO_CONTENT)
  verify(@Param('token') token: string, @Body() dto: VerifyPasswordDto) {
    return this.downloadService.verify(token, dto.password);
  }

  // POST /api/download/:token → 200 + le fichier en flux.
  // @Res({ passthrough: true }) : accès à la réponse pour ajouter un en-tête,
  // tout en laissant NestJS envoyer le résultat.
  // En-têtes : Content-Type déduit de l'extension par le serveur (sans se fier
  // au type déclaré à l'envoi) ; Content-Disposition « attachment » + nom.
  // 🔒 « attachment » : le navigateur enregistre le fichier, il ne l'ouvre
  // jamais dans la page (un fichier HTML piégé ne peut pas s'exécuter).
  @Post(':token')
  @HttpCode(HttpStatus.OK)
  async download(
    @Param('token') token: string,
    @Body() dto: DownloadFileDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const { file, stream } = await this.downloadService.open(
      token,
      dto.password,
    );
    // Type du fichier déduit de son extension par le serveur (.jpg →
    // image/jpeg ; inconnue → application/octet-stream)
    response.type(extname(file.originalName));
    // Nom sans accents (anciens navigateurs) + nom exact en UTF-8 (filename*,
    // norme RFC 6266) : « compte-rendu été.txt » s'affiche correctement
    const asciiName = file.originalName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7e]/g, '_');
    response.setHeader(
      'Content-Disposition',
      contentDisposition(file.originalName, { fallback: asciiName }),
    );
    return new StreamableFile(stream, { length: file.size });
  }
}
