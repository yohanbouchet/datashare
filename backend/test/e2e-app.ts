// =============================================================================
// Fichier : e2e-app.ts
// Rôle : Outils communs aux tests de bout en bout :
//   - startApp : démarre l'API COMPLÈTE (tous les modules, vraie base de test,
//     mêmes réglages que main.ts) sans ouvrir de port réseau ;
//   - resetDatabase : vide les tables entre deux fichiers de tests ;
//   - createUser : crée un compte et renvoie son JWT.
// Utilise :
//   - src/app.module.ts (AppModule), src/app.setup.ts (configureApp)
//   - @nestjs/testing ; supertest (requêtes HTTP) ; typeorm (DataSource)
// Utilisé par :
//   - test/*.e2e-spec.ts
// =============================================================================
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';

export async function startApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}

// Vide toutes les tables (TRUNCATE) et remet les compteurs d'id à 1
export async function resetDatabase(app: INestApplication): Promise<void> {
  await app
    .get(DataSource)
    .query('TRUNCATE TABLE tags, files, users RESTART IDENTITY CASCADE');
}

// Inscrit puis connecte un utilisateur ; renvoie son JWT
export async function createUser(
  app: INestApplication,
  email: string,
  password = 'motdepasse8',
): Promise<string> {
  const server = app.getHttpServer();
  await request(server)
    .post('/api/auth/register')
    .send({ email, password })
    .expect(201);
  const login = await request(server)
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);
  return (login.body as { accessToken: string }).accessToken;
}
