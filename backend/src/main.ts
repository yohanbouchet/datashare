// =============================================================================
// Fichier : main.ts
// Rôle : Point d'entrée de l'API : premier fichier exécuté (npm run start:dev).
//   Fabrique l'application à partir d'AppModule, applique les réglages globaux
//   (app.setup.ts : helmet, préfixe /api, validation, documentation, CORS),
//   puis ouvre le port 3000.
// Utilise :
//   - app.module.ts (AppModule) : la liste des modules à charger
//   - app.setup.ts (configureApp) : les réglages globaux
// Utilisé par :
//   - personne : c'est le point de départ (lancé par Node.js)
// =============================================================================
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';

// async / await : certaines étapes prennent du temps (connexion à la base…) ;
// "await" attend qu'une étape soit terminée avant de passer à la suivante.
async function bootstrap() {
  // ① Fabrique l'application (charge tous les modules déclarés dans AppModule)
  const app = await NestFactory.create(AppModule);

  // Réglages globaux : sécurité, préfixe /api, validation, documentation, CORS
  configureApp(app);

  // ② Ouvre la "porte" : l'API écoute sur le port PORT du .env, ou 3000 par
  //   défaut ("??" = « sinon »)
  await app.listen(process.env.PORT ?? 3000);
}
// Lance la fonction de démarrage (le "await" en dehors d'une fonction est
// permis en ESM).
await bootstrap();
