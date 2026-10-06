import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Récupère le service de configuration (il a déjà lu le .env)
  const config = app.get(ConfigService);

  // Toutes les routes commencent par /api (convention du contrat d'interface)
  app.setGlobalPrefix('api');

  // CORS : seul notre front (adresse lue dans le .env) a le droit d'appeler l'API depuis un navigateur
  app.enableCors({ origin: config.getOrThrow<string>('FRONTEND_URL') });
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
