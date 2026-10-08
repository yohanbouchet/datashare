// ================================================================================================
// Fichier : app.module.ts
// Rôle : Module racine de l'API : le « sommaire » de l'application.
//   Charge la configuration (.env), ouvre la connexion à PostgreSQL et déclare tous les modules fonctionnels.
// Utilise :
//   - .env (racine) : variables POSTGRES_* lues par ConfigModule / ConfigService
//   - users/users.module.ts (UsersModule), auth/auth.module.ts (AuthModule)
//   - app.controller.ts, app.service.ts : exemple provisoire (GET /api)
// Utilisé par :
//   - main.ts (NestFactory.create(AppModule))
// ================================================================================================
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
// En ESM, nos propres fichiers s'importent avec l'extension .js (celle du fichier compilé),
// alors que les paquets npm (@nestjs/...) s'importent par leur nom seul.
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';

// @Module : le "sommaire" de l'application. Il liste les briques à charger (imports),
// les points d'entrée HTTP (controllers) et la logique métier (providers).
@Module({
  imports: [
    // 1) Lecture du fichier .env : les réglages (identifiants de la base…) restent HORS du code,
    //    donc hors de GitHub. Le code ne contient que les NOMS des variables, jamais leurs valeurs.
    ConfigModule.forRoot({
      // La configuration est disponible dans tous les modules, sans devoir la réimporter partout.
      isGlobal: true,
      // Le .env est à la racine du projet (un niveau au-dessus de backend/),
      // car il est partagé avec Docker Compose : une seule source pour les identifiants.
      envFilePath: '../.env',
    }),

    // 2) Connexion à PostgreSQL.
    //    "Async" : la connexion attend que la configuration soit lue avant d'être construite.
    TypeOrmModule.forRootAsync({
      // Injection de dépendances : NestJS fournit le ConfigService à la fonction ci-dessous.
      inject: [ConfigService],
      // useFactory : une "fabrique" qui construit les réglages de connexion à partir de la config.
      // getOrThrow : si une variable manque, l'API refuse de démarrer avec un message clair
      // (principe "échouer tôt"), au lieu de démarrer en panne.
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.getOrThrow<string>('POSTGRES_HOST'),
        // Une valeur lue dans un .env est toujours du TEXTE ("5432") : on la convertit en nombre.
        // Le <number> seul ne convertit rien, il ne fait que "promettre" le type à TypeScript.
        port: Number(config.getOrThrow<string>('POSTGRES_PORT')),
        username: config.getOrThrow<string>('POSTGRES_USER'),
        password: config.getOrThrow<string>('POSTGRES_PASSWORD'),
        database: config.getOrThrow<string>('POSTGRES_DB'),
        // Les entités (les tables) déclarées dans les modules sont chargées automatiquement.
        autoLoadEntities: true,
        // On interdit à TypeORM de modifier seul la structure des tables : décision prise
        // lors de la création de la première table (US03).
        synchronize: false,
      }),
    }),

    UsersModule,

    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
