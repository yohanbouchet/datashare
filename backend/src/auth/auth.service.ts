// ================================================================================================
// Fichier : auth.service.ts
// Rôle : Service d'authentification : inscription (US03) et connexion (US04).
//   register : vérifie que l'email est libre, hache le mot de passe (bcrypt), crée le compte, renvoie
//   une réponse sans empreinte ; transforme les doublons en erreur 409.
//   login : vérifie email + mot de passe (même message et même durée en cas d'échec : 401),
//   puis délivre un JWT signé valable 1 h.
// Utilise :
//   - users/users.service.ts (UsersService) : findByEmail, findByEmailWithPassword, create
//   - dto/register.dto.ts (RegisterDto), dto/login.dto.ts (LoginDto) : données déjà validées
//   - @nestjs/jwt (JwtService) : fabrique le JWT avec JWT_SECRET (configuré dans auth.module.ts)
//   - bcrypt (paquet npm) : hachage et comparaison des mots de passe
// Utilisé par :
//   - files/files.service.ts (BCRYPT_ROUNDS : même coût pour le mot de passe d'un fichier)
//   - auth.controller.ts (register, login)
// ================================================================================================
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

// 🔒 Coût de bcrypt : 12 = environ 0,2 s par hachage. Assez lent pour décourager les attaques
// par force brute, assez rapide pour l'utilisateur.
export const BCRYPT_ROUNDS = 12;
// Code d'erreur PostgreSQL "violation de contrainte UNIQUE".
const PG_UNIQUE_VIOLATION = '23505';
// 🔒 Empreinte bcrypt factice (coût 12) : comparée quand l'email est inconnu, pour que la réponse
// prenne le même temps que pour un vrai compte (sinon, le chronomètre révélerait les emails existants).
const DUMMY_HASH =
  '$2b$12$HxQ1T1mpsFVim1l2dea1Au/exvMPcOZoo8T7y5FZwTwiEPI3248Oy';
// 🔒 Message identique quel que soit l'échec : on ne révèle pas si l'email existe.
const LOGIN_ERROR = 'Email ou mot de passe incorrect';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

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

  // Connexion (US04) : vérifie les identifiants et délivre un JWT valable 1 h.
  async login(dto: LoginDto) {
    // ① Compte AVEC empreinte (null si l'email est inconnu)
    const user = await this.usersService.findByEmailWithPassword(dto.email);

    // ② Comparaison bcrypt, faite dans TOUS les cas (empreinte factice si compte inconnu) : même durée.
    const passwordOk = await bcrypt.compare(
      dto.password,
      user?.passwordHash ?? DUMMY_HASH,
    );
    if (!user || !passwordOk) {
      throw new UnauthorizedException(LOGIN_ERROR);
    }

    // ③ JWT signé avec JWT_SECRET. "sub" (subject) = l'identifiant du compte, convention des JWT.
    // 🔒 Jamais de donnée sensible dans un JWT : son contenu est lisible par tous (il est signé, pas chiffré).
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });

    // ④ Réponse du contrat d'interface : le jeton et l'utilisateur (sans empreinte).
    return { accessToken, user: { id: user.id, email: user.email } };
  }
}
