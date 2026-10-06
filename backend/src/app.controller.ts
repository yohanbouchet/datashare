// Contrôleur d'exemple généré par NestJS (provisoire) : il répond "Hello World!" sur GET /api.
// Il sert de test de connexion avec le front ; il sera supprimé quand les vraies routes existeront.
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

// @Controller : cette classe reçoit des requêtes HTTP (couche "contrôleur" de l'architecture).
@Controller()
export class AppController {
  // Injection de dépendances : NestJS fournit automatiquement une instance d'AppService.
  // "private readonly" crée la propriété this.appService, non modifiable.
  constructor(private readonly appService: AppService) {}

  // @Get() : cette méthode répond aux requêtes GET sur la racine du contrôleur (/api avec le préfixe).
  // Le contrôleur ne fait pas le travail lui-même : il délègue au service (séparation des couches).
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
