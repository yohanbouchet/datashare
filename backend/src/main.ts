// =============================================================================
// Fichier : main.ts
// Rôle : Point d'entrée de l'API : premier fichier exécuté (npm run start:dev).
//   Fabrique l'application à partir d'AppModule, applique les réglages globaux
//   (helmet, préfixe /api, validation des données, CORS), puis ouvre le port
//   3000.
// Utilise :
//   - app.module.ts (AppModule) : la liste des modules à charger
//   - @nestjs/config (ConfigService) : lit FRONTEND_URL dans le .env racine
//   - helmet (paquet npm) : en-têtes de sécurité HTTP
//   - @nestjs/swagger : documentation OpenAPI (/api/docs, si API_DOCS=true)
//   - common/validation-exception.factory.ts : messages de validation (un par
//     champ, en français)
// Utilisé par :
//   - personne : c'est le point de départ (lancé par Node.js)
// =============================================================================
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { validationExceptionFactory } from './common/validation-exception.factory.js';
import { AppModule } from './app.module.js';

// async / await : certaines étapes prennent du temps (connexion à la base…) ;
// "await" attend qu'une étape soit terminée avant de passer à la suivante.
async function bootstrap() {
  // ① Fabrique l'application (charge tous les modules déclarés dans AppModule)
  const app = await NestFactory.create(AppModule);

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

  // ② Ouvre la "porte" : l'API écoute sur le port PORT du .env, ou 3000 par
  //   défaut ("??" = « sinon »)
  await app.listen(process.env.PORT ?? 3000);
}
// Lance la fonction de démarrage (le "await" en dehors d'une fonction est
// permis en ESM).
await bootstrap();
