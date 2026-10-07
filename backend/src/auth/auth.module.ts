// Module "auth" : l'authentification (inscription US03, connexion US04, JWT).
// Il regroupe son contrôleur (les routes /api/auth/...), son service (la logique) et ses DTO (dossier dto/).
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

@Module({
  // controllers : les classes qui reçoivent les requêtes HTTP de ce module.
  controllers: [AuthController],
  // providers : les services que NestJS crée et injecte (ici dans AuthController).
  providers: [AuthService],
})
export class AuthModule {}
