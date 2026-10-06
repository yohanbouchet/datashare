// Service "users" : contiendra la logique métier des comptes (créer un utilisateur, le retrouver par email…).
// Il est encore vide : il sera complété avec l'inscription (US03) et la connexion (US04).
import { Injectable } from '@nestjs/common';

// @Injectable : NestJS peut créer ce service et le "donner" (injecter) aux autres pièces qui en ont besoin,
// par exemple au futur contrôleur d'authentification. C'est l'injection de dépendances.
@Injectable()
export class UsersService {}
