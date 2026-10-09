// ================================================================================================
// Fichier : upload-file.dto.ts
// Rôle : DTO des champs texte qui accompagnent le fichier dans POST /api/files (US01, multipart/form-data).
//   Le fichier lui-même est contrôlé par multer (storage.service.ts) ; ici : durée, mot de passe, tags.
//   Toute valeur invalide → 400 (ValidationPipe) ; le fichier déjà reçu est alors effacé (televersement.filter.ts).
// Utilise :
//   - class-validator (règles), class-transformer (Type, Transform : conversion du texte reçu)
// Utilisé par :
//   - files.controller.ts (@Body), files.service.ts (create), main.ts (ValidationPipe)
// ================================================================================================
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

// Tags reçus : un seul tag arrive comme un texte, plusieurs comme une liste.
// On obtient toujours une liste, sans espaces autour ni tag vide.
function normaliserTags(valeur: unknown): unknown {
  const liste = Array.isArray(valeur) ? valeur : [valeur];
  return liste
    .map((tag) => (typeof tag === 'string' ? tag.trim() : tag))
    .filter((tag) => tag !== '');
}

const MESSAGE_DUREE =
  "La durée d'expiration doit être comprise entre 1 et 7 jours";

export class UploadFileDto {
  // En multipart, tout arrive sous forme de texte : @Type le convertit en nombre avant le contrôle.
  // Absent → 7 jours (règle de l'US01)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: MESSAGE_DUREE })
  @Min(1, { message: MESSAGE_DUREE })
  @Max(7, { message: MESSAGE_DUREE })
  expiresInDays: number = 7;

  // Mot de passe facultatif ; un champ laissé vide ('') est traité comme absent.
  // 6 caractères minimum (US01) ; 72 maximum (limite de bcrypt, comme pour les comptes)
  @Transform(({ value }: { value: unknown }) =>
    value === '' ? undefined : value,
  )
  @IsOptional()
  @IsString({ message: 'Le mot de passe doit être un texte' })
  @MinLength(6, {
    message: 'Le mot de passe du fichier doit contenir au moins 6 caractères',
  })
  @MaxLength(72, {
    message: 'Le mot de passe du fichier ne doit pas dépasser 72 caractères',
  })
  password?: string;

  // Tags facultatifs : 10 au plus, 30 caractères chacun, sans doublon (contrainte UNIQUE en base aussi)
  @Transform(({ value }: { value: unknown }) => normaliserTags(value))
  @IsOptional()
  @IsArray({ message: 'Les tags doivent être une liste' })
  @ArrayMaxSize(10, { message: 'Un fichier peut avoir au plus 10 tags' })
  @IsString({ each: true, message: 'Chaque tag doit être un texte' })
  @MaxLength(30, {
    each: true,
    message: 'Un tag ne doit pas dépasser 30 caractères',
  })
  @ArrayUnique({ message: 'Un même tag ne peut pas être ajouté deux fois' })
  tags: string[] = [];
}
