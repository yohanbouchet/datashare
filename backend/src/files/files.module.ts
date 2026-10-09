// ================================================================================================
// Fichier : files.module.ts
// Rôle : Module « files » : tout ce qui concerne les fichiers déposés (US01, US02, US05, US06, purge).
//   Déclare les tables files et tags, le contrôleur (routes /api/files) et le service.
// Utilise :
//   - file.entity.ts (FileEntity), tag.entity.ts (Tag)
//   - files.controller.ts (FilesController), files.service.ts (FilesService), storage.service.ts (StorageService)
//   - auth/auth.module.ts (AuthModule) : fournit JwtService à la garde JWT
//   - @nestjs/platform-express (MulterModule) : réception des fichiers, réglée par StorageService
// Utilisé par :
//   - app.module.ts (imports)
// ================================================================================================
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileEntity } from './file.entity.js';
import { Tag } from './tag.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { FilesController } from './files.controller.js';
import { FilesService } from './files.service.js';
import { StorageService } from './storage.service.js';

@Module({
  // forFeature : ce module a le droit d'utiliser les tables files et tags (cloisonnement)
  // AuthModule : nécessaire pour la garde JWT des routes /api/files
  // MulterModule : réception des fichiers (US01) ; useClass : NestJS demande ses réglages
  // au StorageService (createMulterOptions) : dossier, nom aléatoire, 1 Go, extensions interdites
  imports: [
    TypeOrmModule.forFeature([FileEntity, Tag]),
    AuthModule,
    MulterModule.registerAsync({ useClass: StorageService }),
  ],
  // controllers : les guichets (routes HTTP) ; providers : les services injectés
  controllers: [FilesController],
  providers: [FilesService, StorageService],
})
export class FilesModule {}
