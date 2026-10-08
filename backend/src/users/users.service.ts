// ================================================================================================
// Fichier : users.service.ts
// Rôle : Service « users » : accès à la table users (lire et créer des comptes).
//   Seule pièce qui parle à la table users, via le Repository de TypeORM (aucun SQL écrit à la main).
// Utilise :
//   - user.entity.ts (User) : la forme d'un compte
//   - @nestjs/typeorm / typeorm : Repository<User> fourni par NestJS
// Utilisé par :
//   - auth/auth.service.ts (findByEmail, create)
// ================================================================================================
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity.js';

@Injectable()
export class UsersService {
  // @InjectRepository(User) : NestJS fournit "l'archiviste" de la table users.
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  // Cherche un compte par email ; renvoie null s'il n'existe pas.
  // 🔒 Requête paramétrée générée par TypeORM : pas d'injection SQL possible.
  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ email });
  }

  // Crée et enregistre un compte. Reçoit l'empreinte, JAMAIS le mot de passe en clair.
  create(email: string, passwordHash: string): Promise<User> {
    const user = this.usersRepository.create({ email, passwordHash });
    return this.usersRepository.save(user);
  }
}
