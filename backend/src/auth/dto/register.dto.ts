// DTO d'inscription (US03) : décrit et valide les données envoyées sur POST /api/auth/register.
// Toute donnée qui ne respecte pas ces règles est refusée avec une erreur 400, avant d'atteindre le service.
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  // 🔒 Normalisation : espaces retirés et minuscules, pour que "Alice@Mail.fr " et "alice@mail.fr"
  // désignent le même compte (sinon, deux comptes pour une même personne).
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: "L'adresse email n'est pas valide" })
  @MaxLength(255, { message: "L'adresse email est trop longue" })
  email!: string;

  // Règle de l'US03 : au moins 8 caractères.
  // 🔒 Au plus 72 : bcrypt ignore tout ce qui dépasse 72 octets. Deux mots de passe identiques
  // sur leurs 72 premiers caractères seraient acceptés l'un pour l'autre : on l'interdit.
  @IsString({ message: 'Le mot de passe doit être un texte' })
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caractères',
  })
  @MaxLength(72, {
    message: 'Le mot de passe ne doit pas dépasser 72 caractères',
  })
  password!: string;
}
