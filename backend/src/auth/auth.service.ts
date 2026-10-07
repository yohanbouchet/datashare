// Service "auth" : contiendra la logique d'authentification (vérifier l'email, hacher le mot de passe,
// créer le JWT). Encore vide : il sera complété à la brique suivante de l'US03.
import { Injectable } from '@nestjs/common';

// @Injectable : NestJS peut créer ce service et l'injecter dans le contrôleur.
@Injectable()
export class AuthService {}
