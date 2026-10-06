// Service d'exemple généré par NestJS (provisoire), appelé par AppController.
// Dans l'architecture en couches, le service contient la logique métier ; ici, il renvoie juste un texte.
import { Injectable } from '@nestjs/common';

// @Injectable : NestJS peut créer ce service et l'injecter dans le contrôleur.
@Injectable()
export class AppService {
  // ": string" indique le type de la valeur renvoyée par la méthode.
  getHello(): string {
    return 'Hello World!';
  }
}
