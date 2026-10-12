// =============================================================================
// Fichier : main.ts
// Rôle : Point d'entrée de l'API : premier fichier exécuté
//   (npm run start:dev). Fabrique l'application à partir d'AppModule, avec
//   des journaux au format JSON (logs structurés), applique les réglages
//   globaux (app.setup.ts : helmet, préfixe /api, validation, documentation,
//   CORS), puis ouvre le port 3000.
// Utilise :
//   - app.module.ts (AppModule) : la liste des modules à charger
//   - app.setup.ts (configureApp) : les réglages globaux
// Utilisé par :
//   - personne : c'est le point de départ (lancé par Node.js)
// =============================================================================
import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';

// async / await : certaines étapes prennent du temps (connexion à la base…) ;
// "await" attend qu'une étape soit terminée avant de passer à la suivante.
async function bootstrap() {
  // ① Fabrique l'application (charge tous les modules déclarés dans AppModule)
  //   Journaux au format JSON (logs structurés) : une ligne par événement,
  //   lisible par un outil de centralisation (ex. Loki + Grafana)
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({ json: true }),
  });

  // Réglages globaux : sécurité, préfixe /api, validation, documentation, CORS
  configureApp(app);

  // ② Ouvre la "porte" : l'API écoute sur le port PORT du .env, ou 3000 par
  //   défaut ("??" = « sinon »)
  await app.listen(process.env.PORT ?? 3000);
}
// Lance la fonction de démarrage (le "await" en dehors d'une fonction est
// permis en ESM).
await bootstrap();
