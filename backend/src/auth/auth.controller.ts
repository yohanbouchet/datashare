// Contrôleur d'authentification : reçoit les requêtes /api/auth/... et délègue le travail à AuthService.
import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';

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
}
