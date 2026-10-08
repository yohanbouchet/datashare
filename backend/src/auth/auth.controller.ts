// ================================================================================================
// Fichier : auth.controller.ts
// Rôle : Contrôleur d'authentification : reçoit les requêtes /api/auth/... (couche « contrôleur »).
//   Ne contient aucune logique : il valide les données (via le DTO) et transmet à AuthService.
//   Routes : POST /api/auth/register (US03, inscription) · POST /api/auth/login (US04, connexion)
//            · GET /api/auth/me (utilisateur connecté, route protégée par la garde JWT).
// Utilise :
//   - auth.service.ts (AuthService) : register, login
//   - dto/register.dto.ts (RegisterDto), dto/login.dto.ts (LoginDto) : forme et règles des données reçues
//   - jwt-auth.guard.ts (JwtAuthGuard, type AuthenticatedRequest) : protège /me et fournit request.user
// Utilisé par :
//   - auth.module.ts (déclaré dans controllers)
//   - le front (formulaires d'inscription et de connexion, vérification de session au rechargement : à venir)
// ================================================================================================
import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import type { AuthenticatedRequest } from './jwt-auth.guard.js';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Controller('auth')
export class AuthController {
  // Injection de dépendances : NestJS fournit le AuthService (le "cuisinier").
  constructor(private readonly authService: AuthService) {}

  // POST /api/auth/register (US03)
  // @Body() : NestJS lit le corps JSON et le valide avec RegisterDto (400 si invalide).
  // Le contrôleur ne fait aucun traitement lui-même : il transmet au service et renvoie sa réponse
  // { id, email, createdAt } avec le code 201, ou l'erreur 409 si l'email est déjà utilisé.
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // POST /api/auth/login (US04)
  // Valide les données avec LoginDto, puis transmet à AuthService.login.
  // @HttpCode(200) : un POST répond 201 « créé » par défaut, or une connexion ne crée rien :
  // le contrat d'interface prévoit 200, avec { accessToken, user }, ou 401 si les identifiants sont faux.
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // GET /api/auth/me : « qui suis-je ? » (utilisé par le front au rechargement de la page, F5).
  // @UseGuards(JwtAuthGuard) : la garde vérifie le JWT AVANT d'entrer ici (sinon 401).
  // @Req() : la requête, dans laquelle la garde a rangé le contenu du jeton (request.user).
  // 🔒 L'identité vient du jeton signé, jamais d'un paramètre envoyé par le navigateur.
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() request: AuthenticatedRequest) {
    return { id: request.user.sub, email: request.user.email };
  }
}
