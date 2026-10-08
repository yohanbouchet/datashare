// ================================================================================================
// Fichier : app.controller.ts
// Rôle : Contrôleur d'exemple PROVISOIRE (généré par NestJS) : GET /api → « Hello World! ».
//   Sert de test de connexion avec le front. Il sera supprimé quand les vraies routes seront en place.
// Utilise :
//   - app.service.ts (AppService) : fournit le texte
// Utilisé par :
//   - app.module.ts (déclaré dans controllers)
//   - frontend/src/App.tsx (appel fetch)
// ================================================================================================
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
