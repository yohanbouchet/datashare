// ================================================================================================
// Fichier : auth.module.ts
// Rôle : Module « auth » : l'authentification (inscription US03, puis connexion US04 et JWT).
//   Regroupe son contrôleur (routes /api/auth/...), son service (la logique) et ses DTO (dossier dto/).
// Utilise :
//   - users/users.module.ts (UsersModule) : fournit UsersService
//   - auth.controller.ts (AuthController), auth.service.ts (AuthService)
//   - @nestjs/jwt (JwtModule)
//   - .env (JWT_SECRET, JWT_EXPIRES_IN)
// Utilisé par :
//   - app.module.ts (imports)
//   - files/files.module.ts (imports : pour la garde JWT, grâce à exports: [JwtModule])
// ================================================================================================
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

@Module({
  imports: [
    // UsersModule fournit UsersService (lire et créer les comptes).
    UsersModule,
    // JwtModule fournit JwtService, qui fabrique et vérifie les JWT.
    // "Async" + useFactory : comme pour la base, les réglages sont lus dans le .env au démarrage.
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // 🔒 Clé de signature, jamais écrite dans le code
        secret: config.getOrThrow<string>('JWT_SECRET'),
        // Durée de vie du jeton (1h) : passé ce délai, il faut se reconnecter
        signOptions: { expiresIn: config.getOrThrow('JWT_EXPIRES_IN') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  // exports : partage JwtModule avec les modules qui importent AuthModule (ex. FilesModule),
  // pour qu'ils puissent utiliser la garde JWT (qui a besoin de JwtService).
  exports: [JwtModule],
})
export class AuthModule {}
