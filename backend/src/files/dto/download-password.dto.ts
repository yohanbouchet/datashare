// =============================================================================
// Fichier : download-password.dto.ts
// Rôle : DTO du mot de passe envoyé pour un fichier protégé (US02).
//   - VerifyPasswordDto : POST /api/download/:token/verify, mot de passe
//     obligatoire (absent → 400).
//   - DownloadFileDto : POST /api/download/:token, mot de passe facultatif
//     (un fichier non protégé se télécharge sans).
// Utilise :
//   - class-validator (règles)
// Utilisé par :
//   - download.controller.ts (@Body), main.ts (ValidationPipe)
// =============================================================================
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

const TOO_LONG = 'Le mot de passe ne doit pas dépasser 72 caractères';

// Vérification : le mot de passe est obligatoire
export class VerifyPasswordDto {
  @IsString({ message: 'Le mot de passe doit être un texte' })
  @IsNotEmpty({ message: 'Le mot de passe est obligatoire' })
  @MaxLength(72, { message: TOO_LONG })
  password!: string;
}

// Téléchargement : le mot de passe n'est envoyé que si le fichier est protégé
export class DownloadFileDto {
  @IsOptional()
  @IsString({ message: 'Le mot de passe doit être un texte' })
  @MaxLength(72, { message: TOO_LONG })
  password?: string;
}
