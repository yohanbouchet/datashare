// ================================================================================================
// Fichier : list-files-query.dto.ts
// Rôle : DTO du paramètre d'adresse ?status=… de GET /api/files (US05).
//   Contrôle À L'ENTRÉE de l'API (entre le navigateur et le contrôleur) : seules les valeurs
//   active, expired ou all sont acceptées (sinon 400). Absent → active (règle de l'US06 :
//   seuls les fichiers non expirés sont affichés par défaut).
// Utilise :
//   - class-validator (IsIn, IsOptional)
// Utilisé par :
//   - files.controller.ts (@Query), files.service.ts (type StatutFichier), main.ts (ValidationPipe)
// ================================================================================================
import { IsIn, IsOptional } from 'class-validator';

// Liste des valeurs autorisées. « as const » : TypeScript retient les 3 valeurs exactes, pas « n'importe quel texte »
export const STATUTS_FICHIER = ['active', 'expired', 'all'] as const;
// Type déduit de la liste : 'active' | 'expired' | 'all' (une seule source de vérité)
export type StatutFichier = (typeof STATUTS_FICHIER)[number];

export class ListFilesQueryDto {
  // IsOptional : le paramètre peut être absent ; IsIn : s'il est présent, il doit faire partie de la liste.
  // « = 'active' » : valeur par défaut (appliquée grâce à transform: true du ValidationPipe)
  @IsOptional()
  @IsIn(STATUTS_FICHIER, {
    message: 'Le filtre doit valoir active, expired ou all',
  })
  status: StatutFichier = 'active';
}
