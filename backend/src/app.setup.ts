// =============================================================================
// Fichier : app.setup.ts
// Rôle : Réglages globaux de l'API, appliqués à l'application une fois créée :
//   en-têtes de sécurité (helmet), préfixe /api, validation des données (DTO),
//   documentation OpenAPI (si API_DOCS=true) et CORS. Regroupés ici pour être
//   appliqués À L'IDENTIQUE par main.ts (le vrai serveur) et par les tests de
//   bout en bout (test/) : on teste exactement l'API qui sera déployée.
// Utilise :
//   - @nestjs/config (ConfigService) : FRONTEND_URL, API_DOCS
//   - helmet (paquet npm) : en-têtes de sécurité HTTP
//   - @nestjs/swagger : documentation OpenAPI (/api/docs)
//   - common/validation-exception.factory.ts : messages de validation (un par
//     champ, en français)
// Utilisé par :
//   - main.ts ; test/e2e-app.ts (tests de bout en bout)
// =============================================================================
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { validationExceptionFactory } from './common/validation-exception.factory.js';

export function configureApp(app: INestApplication): void {
  // 🔒 Helmet : en-têtes de sécurité HTTP sur toutes les réponses (masque la
  // technologie du serveur, interdit l'affichage dans le cadre d'un autre site,
  // impose HTTPS en production…). Placé en premier pour s'appliquer à toutes
  // les routes.
  app.use(helmet());

  // Récupère le service de configuration (il a déjà lu le .env)
  const config = app.get(ConfigService);

  // Toutes les routes commencent par /api (convention du contrat d'interface)
  app.setGlobalPrefix('api');

  // Validation automatique de toutes les données reçues, à partir des DTO.
  app.useGlobalPipes(
    new ValidationPipe({
      // 🔒 whitelist : les champs absents du DTO sont supprimés…
      whitelist: true,
      // 🔒 …et même refusés (400) : un client ne peut pas glisser un champ
      // inattendu comme "id".
      forbidNonWhitelisted: true,
      // Applique les @Transform (ex. : email en minuscules) avant le contrôle.
      transform: true,
      // Un seul message par champ, le plus pertinent, en français
      // (common/validation-exception.factory.ts)
      exceptionFactory: validationExceptionFactory,
    }),
  );

  // Documentation OpenAPI (Swagger) de l'API : page /api/docs, et la
  // description brute au format JSON sur /api/docs-json. Activée par
  // API_DOCS=true (développement) ; désactivée en production, pour ne pas
  // publier la carte de l'API.
  if (config.get<string>('API_DOCS') === 'true') {
    const openApi = new DocumentBuilder()
      .setTitle('DataShare API')
      .setDescription(
        'API du MVP DataShare : transfert sécurisé de fichiers. ' +
          'Contrat détaillé : docs/conception/contrat-interface.md',
      )
      .setVersion('1.0')
      // Bouton « Authorize » : coller un JWT obtenu par /api/auth/login
      .addBearerAuth()
      .build();
    SwaggerModule.setup(
      'api/docs',
      app,
      SwaggerModule.createDocument(app, openApi),
    );
  }

  // CORS : seul notre front (adresse lue dans le .env) a le droit d'appeler
  // l'API depuis un navigateur
  app.enableCors({ origin: config.getOrThrow<string>('FRONTEND_URL') });
}
