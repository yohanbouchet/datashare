// Module "users" : regroupe tout ce qui concerne les comptes utilisateurs (entité, service).
// Un module NestJS = un "service de l'entreprise" avec son propre bureau ; il est déclaré dans app.module.ts.
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// Imports en ".js" (règle ESM) : on vise le fichier compilé, TypeScript retrouve le .ts correspondant.
import { UsersService } from './users.service.js';
import { User } from './user.entity.js';

@Module({
  // forFeature([User]) : ce module a le droit d'utiliser la table décrite par la classe User.
  // 🔒 Cloisonnement : un module n'accède qu'aux tables qu'il déclare ici.
  imports: [TypeOrmModule.forFeature([User])],
  // providers : les services (logique métier) que NestJS crée et fournit aux autres pièces du module.
  providers: [UsersService],
  // exports : rend UsersService utilisable par les modules qui importent UsersModule (ici AuthModule).
  exports: [UsersService],
})
export class UsersModule {}
