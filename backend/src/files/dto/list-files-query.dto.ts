// ================================================================================================
// Fichier : list-files-query.dto.ts
// Rôle : DTO du paramètre d'adresse ?status=… de GET /api/files (US05).
//   Contrôle À L'ENTRÉE de l'API (entre le navigateur et le contrôleur) : seules les valeurs
//   active, expired ou all sont acceptées (sinon 400). Absent → active (règle de l'US06 :
//   seuls les fichiers non expirés sont affichés par défaut).
// Utilise :
//   - class-validator (IsIn, IsOptional)
// Utilisé par :
//   - files.controller.ts (@Query), files.service.ts (type FileStatus), main.ts (ValidationPipe)
// ================================================================================================
import { IsIn, IsOptional } from 'class-validator';

// Liste des valeurs autorisées. « as const » : TypeScript retient les 3 valeurs exactes, pas « n'importe quel texte »
export const FILE_STATUSES = ['active', 'expired', 'all'] as const;
// Type déduit de la liste : 'active' | 'expired' | 'all' (une seule source de vérité)
export type FileStatus = (typeof FILE_STATUSES)[number];

export class ListFilesQueryDto {
  // IsOptional : le paramètre peut être absent ; IsIn : s'il est présent, il doit faire partie de la liste.
  // « = 'active' » : valeur par défaut (appliquée grâce à transform: true du ValidationPipe)
  @IsOptional()
  @IsIn(FILE_STATUSES, {
    message: 'Le filtre doit valoir active, expired ou all',
  })
  status: FileStatus = 'active';
}
