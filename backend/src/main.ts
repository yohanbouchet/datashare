// Point d'entrée de l'API : c'est le premier fichier exécuté (npm run start:dev).
// Il fabrique l'application à partir d'AppModule, applique les réglages globaux, puis ouvre le port.
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';

// async / await : certaines étapes prennent du temps (connexion à la base…) ;
// "await" attend qu'une étape soit terminée avant de passer à la suivante.
async function bootstrap() {
  // ① Fabrique l'application (charge tous les modules déclarés dans AppModule)
  const app = await NestFactory.create(AppModule);
  // Récupère le service de configuration (il a déjà lu le .env)
  const config = app.get(ConfigService);

  // Toutes les routes commencent par /api (convention du contrat d'interface)
  app.setGlobalPrefix('api');

  // CORS : seul notre front (adresse lue dans le .env) a le droit d'appeler l'API depuis un navigateur
  app.enableCors({ origin: config.getOrThrow<string>('FRONTEND_URL') });

  // ② Ouvre la "porte" : l'API écoute sur le port PORT du .env, ou 3000 par défaut ("??" = « sinon »)
  await app.listen(process.env.PORT ?? 3000);
}
// Lance la fonction de démarrage (le "await" en dehors d'une fonction est permis en ESM).
await bootstrap();
