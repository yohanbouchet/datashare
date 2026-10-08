// ================================================================================================
// Fichier : app.service.ts
// Rôle : Service d'exemple PROVISOIRE (généré par NestJS) : renvoie « Hello World! ».
//   Illustre la séparation contrôleur / service ; sera supprimé avec app.controller.ts.
// Utilise :
//   - rien
// Utilisé par :
//   - app.controller.ts
// ================================================================================================
import { Injectable } from '@nestjs/common';

// @Injectable : NestJS peut créer ce service et l'injecter dans le contrôleur.
@Injectable()
export class AppService {
  // ": string" indique le type de la valeur renvoyée par la méthode.
  getHello(): string {
    return 'Hello World!';
  }
}
