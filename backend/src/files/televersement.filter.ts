// ================================================================================================
// Fichier : televersement.filter.ts
// Rôle : Filtre d'exceptions de la route de téléversement (US01). Il intercepte TOUTE erreur de cette route :
//   1. 🔒 si le fichier a déjà été écrit sur le disque (ex. durée invalide, base indisponible), il l'efface :
//      aucun fichier orphelin, aucun fichier stocké sans être enregistré en base ;
//   2. il renvoie la réponse d'erreur habituelle (400, 401, 413…), avec le message de la taille en français ;
//   3. une erreur imprévue est consignée dans le journal et renvoyée en 500 sans détail technique.
// Utilise :
//   - storage.service.ts (StorageService.remove, MESSAGE_TAILLE_MAX)
// Utilisé par :
//   - files.controller.ts (@UseFilters sur la route POST /api/files)
// ================================================================================================
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { MESSAGE_TAILLE_MAX, StorageService } from './storage.service.js';

// @Catch() sans argument : attrape toutes les erreurs de la route
@Catch()
@Injectable()
export class TeleversementFilter implements ExceptionFilter {
  private readonly logger = new Logger(TeleversementFilter.name);

  constructor(private readonly storageService: StorageService) {}

  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    // 1. Fichier déjà reçu (request.file, rempli par multer) : on l'efface du disque
    if (request.file) {
      await this.storageService
        .remove(request.file.filename)
        .catch((erreur: unknown) =>
          this.logger.error(`Fichier non effacé : ${String(erreur)}`),
        );
    }

    // 2. Trop gros (garde ou multer) : message du contrat d'interface, en français
    if (exception instanceof PayloadTooLargeException) {
      response.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
        message: MESSAGE_TAILLE_MAX,
        error: 'Payload Too Large',
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
      });
      return;
    }

    // Autres erreurs prévues (400, 401…) : même réponse que d'habitude
    if (exception instanceof HttpException) {
      const corps = exception.getResponse();
      response
        .status(exception.getStatus())
        .json(
          typeof corps === 'string'
            ? { message: corps, statusCode: exception.getStatus() }
            : corps,
        );
      return;
    }

    // 3. Erreur imprévue : détail dans le journal, réponse générique (aucune fuite d'information)
    this.logger.error(exception);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Internal server error',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
}
