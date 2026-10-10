// =============================================================================
// Fichier : validation-exception.factory.ts
// Rôle : Fabrique des erreurs de validation (400) du ValidationPipe global.
//   Par défaut, NestJS renvoie TOUTES les règles non respectées d'un champ,
//   parfois trompeuses (mot de passe absent → « ne doit pas dépasser 72
//   caractères »), et un message en anglais pour un champ en trop (« property
//   role should not exist »). Ici : UN seul message par champ, le plus
//   pertinent, et tous en français.
// Utilise :
//   - class-validator (type ValidationError : le détail d'une erreur)
// Utilisé par :
//   - main.ts (ValidationPipe, option exceptionFactory)
// =============================================================================
import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

// Ordre de priorité des règles : la plus « fondamentale » d'abord. Une valeur
// absente doit dire « obligatoire », pas « trop longue ».
const PRIORITY = [
  'isDefined',
  'isNotEmpty',
  'isString',
  'isInt',
  'isEmail',
  'isIn',
  'isArray',
  'min',
  'max',
  'minLength',
  'maxLength',
  'arrayMaxSize',
  'arrayUnique',
];

// Message retenu pour un champ en erreur
export function firstMessage(error: ValidationError): string {
  const constraints = error.constraints ?? {};
  // Champ envoyé mais absent du DTO (whitelist + forbidNonWhitelisted)
  if ('whitelistValidation' in constraints) {
    return `Le champ « ${error.property} » n'est pas autorisé`;
  }
  // 1re règle trouvée dans l'ordre de priorité, sinon la première venue
  const key =
    PRIORITY.find((name) => name in constraints) ?? Object.keys(constraints)[0];
  return key ? constraints[key] : `Le champ « ${error.property} » est invalide`;
}

// Réponse 400 : { message: [un message par champ], error, statusCode }
export function validationExceptionFactory(
  errors: ValidationError[],
): BadRequestException {
  return new BadRequestException(errors.map(firstMessage));
}
