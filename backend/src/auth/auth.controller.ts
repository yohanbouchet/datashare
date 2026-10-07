// Contrôleur d'authentification : reçoit les requêtes /api/auth/...
import { Body, Controller, Post } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto.js';

@Controller('auth')
export class AuthController {
  // POST /api/auth/register
  // @Body() : NestJS lit le corps JSON de la requête et le valide avec RegisterDto.
  // PROVISOIRE : renvoie seulement l'email nettoyé ; le vrai enregistrement viendra à la brique suivante.
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return { email: dto.email };
  }
}
