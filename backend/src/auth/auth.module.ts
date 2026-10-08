// ================================================================================================
// Fichier : auth.module.ts
// Rôle : Module « auth » : l'authentification (inscription US03, puis connexion US04 et JWT).
//   Regroupe son contrôleur (routes /api/auth/...), son service (la logique) et ses DTO (dossier dto/).
// Utilise :
//   - users/users.module.ts (UsersModule) : fournit UsersService
//   - auth.controller.ts (AuthController), auth.service.ts (AuthService)
// Utilisé par :
//   - app.module.ts (imports)
// ================================================================================================
import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

@Module({
  // imports : les autres modules dont ce module a besoin. UsersModule fournit UsersService
  // (grâce à son "exports"), utilisé par AuthService pour lire et créer les comptes.
  imports: [UsersModule],
  // controllers : les classes qui reçoivent les requêtes HTTP de ce module.
  controllers: [AuthController],
  // providers : les services que NestJS crée et injecte (ici dans AuthController).
  providers: [AuthService],
})
export class AuthModule {}
