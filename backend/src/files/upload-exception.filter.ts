// ================================================================================================
// Fichier : upload-exception.filter.ts
// Rôle : Filtre d'exceptions de la route de téléversement (US01). Il intercepte TOUTE erreur de cette route :
//   1. 🔒 si le fichier a déjà été écrit sur le disque (ex. durée invalide, base indisponible), il l'efface :
//      aucun fichier orphelin, aucun fichier stocké sans être enregistré en base ;
//   2. il renvoie la réponse d'erreur habituelle (400, 401, 413…), avec le message de la taille en français ;
//   3. une erreur imprévue est consignée dans le journal et renvoyée en 500 sans détail technique.
// Utilise :
//   - storage.service.ts (StorageService.remove, MAX_FILE_SIZE_MESSAGE)
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
import { MAX_FILE_SIZE_MESSAGE, StorageService } from './storage.service.js';

// @Catch() sans argument : attrape toutes les erreurs de la route
@Catch()
@Injectable()
export class UploadExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(UploadExceptionFilter.name);

  constructor(private readonly storageService: StorageService) {}

  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    // 1. Fichier déjà reçu (request.file, rempli par multer) : on l'efface du disque
    if (request.file) {
      await this.storageService
        .remove(request.file.filename)
        .catch((error: unknown) =>
          this.logger.error(`Fichier non effacé : ${String(error)}`),
        );
    }

    // 2. Trop gros (garde ou multer) : message du contrat d'interface, en français
    if (exception instanceof PayloadTooLargeException) {
      response.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
        message: MAX_FILE_SIZE_MESSAGE,
        error: 'Payload Too Large',
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
      });
      return;
    }

    // Autres erreurs prévues (400, 401…) : même réponse que d'habitude
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      response
        .status(exception.getStatus())
        .json(
          typeof body === 'string'
            ? { message: body, statusCode: exception.getStatus() }
            : body,
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
