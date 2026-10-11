// =============================================================================
// Fichier : rate-limit.e2e-spec.ts
// Rôle : Tests de bout en bout de la limitation des tentatives (anti-force
//   brute, OWASP A07) : au-delà de 5 essais par minute sur la connexion ou
//   sur la vérification du mot de passe d'un fichier, l'API répond 429.
// Utilise :
//   - test/e2e-app.ts ; supertest
// Utilisé par :
//   - npm run test:e2e (vitest.config.e2e.ts)
// =============================================================================
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createUser, resetDatabase, startApp } from './e2e-app.js';

describe('Limitation des tentatives (e2e)', () => {
  let app: INestApplication;
  let claire: string;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await startApp();
    await resetDatabase(app);
    // Compte créé AVANT les tentatives : sa connexion compte aussi (5 par
    // minute et par adresse IP sur la route de connexion)
    claire = await createUser(app, 'claire@mail.fr');
  });

  afterAll(async () => {
    await app.close();
  });

  it('connexion : 5 essais par minute et par adresse IP, le 6e est refusé (429)', async () => {
    const attempt = () =>
      api()
        .post('/api/auth/login')
        .send({ email: 'pirate@mail.fr', password: 'devinette1' });

    // 1 connexion déjà faite (création du compte de Claire) + 4 échecs = 5
    for (let i = 0; i < 4; i++) {
      await attempt().expect(401);
    }
    const blocked = await attempt().expect(429);

    expect(blocked.body.message).toBe(
      'Trop de tentatives. Réessaie dans une minute.',
    );
    // En-tête indiquant le délai d'attente, en secondes
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('mot de passe d’un fichier : 5 essais par minute, puis 429 même avec le bon', async () => {
    const upload = await api()
      .post('/api/files')
      .set('Authorization', `Bearer ${claire}`)
      .attach('file', Buffer.from('secret'), 'secret.txt')
      .field('password', 'secret1')
      .expect(201);
    const url = `/api/download/${upload.body.token}/verify`;

    for (let i = 0; i < 5; i++) {
      await api()
        .post(url)
        .send({ password: `essai${i}0` })
        .expect(401);
    }
    await api().post(url).send({ password: 'secret1' }).expect(429);
  });
});
