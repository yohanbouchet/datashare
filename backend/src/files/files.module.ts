// ================================================================================================
// Fichier : files.module.ts
// Rôle : Module « files » : tout ce qui concerne les fichiers déposés (US01, US02, US05, US06, purge).
//   Pour l'instant, déclare seulement les tables files et tags ; services et contrôleurs viendront avec les US.
// Utilise :
//   - file.entity.ts (FileEntity), tag.entity.ts (Tag)
// Utilisé par :
//   - app.module.ts (imports)
// ================================================================================================
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileEntity } from './file.entity.js';
import { Tag } from './tag.entity.js';

@Module({
  // forFeature : ce module a le droit d'utiliser les tables files et tags (cloisonnement)
  imports: [TypeOrmModule.forFeature([FileEntity, Tag])],
})
export class FilesModule {}
