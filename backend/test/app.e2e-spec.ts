// ================================================================================================
// Fichier : app.e2e-spec.ts
// Rôle : Test de bout en bout (e2e) d'exemple PROVISOIRE, généré par NestJS (npm run test:e2e).
//   Démarre l'application complète (avec la base) et envoie de vraies requêtes HTTP.
//   Remarque : le préfixe /api est appliqué dans main.ts, non utilisé ici : la route reste « / ».
// Utilise :
//   - src/app.module.ts (AppModule) : l'application complète
//   - supertest (paquet npm) : requêtes HTTP de test
// Utilisé par :
//   - Vitest (vitest.config.e2e.ts)
// ================================================================================================
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
// supertest : outil qui envoie des requêtes HTTP à l'application sans ouvrir de vrai port réseau.
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  // Avant chaque test : on démarre l'application entière à partir d'AppModule.
  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  // On envoie GET / et on vérifie le code HTTP (200) et le contenu de la réponse.
  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  // Après chaque test : on arrête l'application pour libérer la connexion à la base.
  afterEach(async () => {
    await app.close();
  });
});
