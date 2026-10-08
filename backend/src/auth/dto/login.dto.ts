// ================================================================================================
// Fichier : login.dto.ts
// Rôle : DTO de connexion (US04) : forme et règles des données de POST /api/auth/login.
//   Plus souple que l'inscription : on ne revérifie pas la longueur minimale (un mauvais mot de passe
//   recevra simplement 401). Normalise l'email comme à l'inscription, sinon "Claire@…" ne serait pas trouvé.
// Utilise :
//   - class-validator, class-transformer (paquets npm) : règles et transformation
// Utilisé par :
//   - auth.controller.ts (@Body), auth.service.ts (login), main.ts (ValidationPipe)
// ================================================================================================
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  // Même normalisation qu'à l'inscription : minuscules et sans espaces.
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: "L'adresse email n'est pas valide" })
  email!: string;

  // 🔒 72 maximum : limite de bcrypt (et évite de faire calculer des textes géants au serveur).
  @IsString({ message: 'Le mot de passe doit être un texte' })
  @MinLength(1, { message: 'Le mot de passe est obligatoire' })
  @MaxLength(72, {
    message: 'Le mot de passe ne doit pas dépasser 72 caractères',
  })
  password!: string;
}
