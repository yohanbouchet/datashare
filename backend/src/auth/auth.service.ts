// ================================================================================================
// Fichier : auth.service.ts
// Rôle : Service d'authentification : logique de l'inscription (US03) ; la connexion (US04) viendra ici.
//   Vérifie que l'email est libre, hache le mot de passe (bcrypt), crée le compte, renvoie une réponse
//   sans empreinte. Transforme les doublons en erreur 409.
// Utilise :
//   - users/users.service.ts (UsersService) : findByEmail, create
//   - dto/register.dto.ts (RegisterDto) : données déjà validées
//   - bcrypt (paquet npm) : hachage salé du mot de passe
// Utilisé par :
//   - auth.controller.ts (register)
// ================================================================================================
import { ConflictException, Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service.js';
import { RegisterDto } from './dto/register.dto.js';

// 🔒 Coût de bcrypt : 12 = environ 0,2 s par hachage. Assez lent pour décourager les attaques
// par force brute, assez rapide pour l'utilisateur.
const BCRYPT_ROUNDS = 12;
// Code d'erreur PostgreSQL "violation de contrainte UNIQUE".
const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async register(dto: RegisterDto) {
    // ① Contrôle de l'email, pour renvoyer un message clair (409 Conflict).
    if (await this.usersService.findByEmail(dto.email)) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    // ② Hachage salé : le mot de passe en clair n'est jamais stocké.
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // ③ Enregistrement. 🔒 Si deux inscriptions identiques arrivent en même temps,
    // la contrainte UNIQUE de la base refuse la seconde : on renvoie aussi 409 (et pas une erreur 500).
    try {
      const user = await this.usersService.create(dto.email, passwordHash);
      // ④ 🔒 On choisit champ par champ ce qui est renvoyé : l'objet "user" contient encore
      // passwordHash (on vient de le remplir), select: false ne protège que les LECTURES en base.
      return { id: user.id, email: user.email, createdAt: user.createdAt };
    } catch (error) {
      if ((error as { code?: string }).code === PG_UNIQUE_VIOLATION) {
        throw new ConflictException('Cet email est déjà utilisé');
      }
      throw error;
    }
  }
}
