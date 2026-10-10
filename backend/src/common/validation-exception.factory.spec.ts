// =============================================================================
// Fichier : validation-exception.factory.spec.ts
// Rôle : Tests unitaires de la fabrique des erreurs de validation (Vitest :
//   npm test). On valide de vrais DTO avec les mêmes options que main.ts
//   (whitelist + forbidNonWhitelisted), puis on vérifie les messages
//   produits : un seul par champ, le plus pertinent, en français.
// Utilise :
//   - validation-exception.factory.ts (la pièce testée)
//   - auth/dto/register.dto.ts, files/dto/download-password.dto.ts (DTO réels)
//   - class-transformer (plainToInstance), class-validator (validate)
// Utilisé par :
//   - Vitest (vitest.config.ts)
// =============================================================================
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from '../auth/dto/register.dto.js';
import { VerifyPasswordDto } from '../files/dto/download-password.dto.js';
import {
  firstMessage,
  validationExceptionFactory,
} from './validation-exception.factory.js';

// Valide un objet comme le ValidationPipe, puis renvoie les messages retenus
async function messagesFor(
  dto: new () => object,
  body: Record<string, unknown>,
): Promise<unknown> {
  const errors = await validate(plainToInstance(dto, body), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return validationExceptionFactory(errors).getResponse();
}

describe('validationExceptionFactory', () => {
  it('mot de passe absent : « obligatoire » seulement, pas « trop long »', async () => {
    expect(await messagesFor(VerifyPasswordDto, {})).toMatchObject({
      statusCode: 400,
      message: ['Le mot de passe est obligatoire'],
    });
  });

  it('un message par champ, plus un message en français pour un champ en trop', async () => {
    const response = await messagesFor(RegisterDto, {
      email: 'pas-un-email',
      password: 'abc',
      role: 'admin',
    });

    expect(response).toMatchObject({
      // Le champ en trop est signalé en premier (contrôle de la whitelist)
      message: [
        "Le champ « role » n'est pas autorisé",
        "L'adresse email n'est pas valide",
        'Le mot de passe doit contenir au moins 8 caractères',
      ],
    });
  });

  it('message de secours si aucune règle n’a de texte', () => {
    expect(
      firstMessage({ property: 'nom', constraints: {}, children: [] }),
    ).toBe('Le champ « nom » est invalide');
  });
});
