// =============================================================================
// Fichier : auth.e2e-spec.ts
// Rôle : Tests de bout en bout de l'authentification (US03, US04) : vraies
//   requêtes HTTP sur l'API complète et la base de test. On vérifie le
//   contrat d'interface : codes, messages, et qu'aucune empreinte ne sort.
// Utilise :
//   - test/e2e-app.ts (startApp, resetDatabase) ; supertest
// Utilisé par :
//   - npm run test:e2e (vitest.config.e2e.ts)
// =============================================================================
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { resetDatabase, startApp } from './e2e-app.js';

describe('Authentification (e2e)', () => {
  let app: INestApplication;
  // Raccourci : requête HTTP vers l'API démarrée
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await startApp();
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/register (US03)', () => {
    it('crée le compte (201) avec un email normalisé, sans empreinte', async () => {
      const response = await api()
        .post('/api/auth/register')
        .send({ email: '  Claire@Mail.fr ', password: 'motdepasse8' })
        .expect(201);

      expect(response.body).toMatchObject({ id: 1, email: 'claire@mail.fr' });
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('refuse un email déjà utilisé, même en majuscules (409)', async () => {
      const response = await api()
        .post('/api/auth/register')
        .send({ email: 'CLAIRE@mail.fr', password: 'autremotdepasse' })
        .expect(409);

      expect(response.body.message).toBe('Cet email est déjà utilisé');
    });

    it('refuse des données invalides avec un message par champ (400)', async () => {
      const response = await api()
        .post('/api/auth/register')
        .send({ email: 'pas-un-email', password: 'court', role: 'admin' })
        .expect(400);

      expect(response.body.message).toEqual([
        "Le champ « role » n'est pas autorisé",
        "L'adresse email n'est pas valide",
        'Le mot de passe doit contenir au moins 8 caractères',
      ]);
    });
  });

  describe('POST /api/auth/login (US04)', () => {
    it('délivre un JWT (200) pour des identifiants corrects', async () => {
      const response = await api()
        .post('/api/auth/login')
        .send({ email: 'claire@mail.fr', password: 'motdepasse8' })
        .expect(200);

      // Un JWT : trois parties séparées par des points
      expect(response.body.accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
      expect(response.body.user).toEqual({ id: 1, email: 'claire@mail.fr' });
    });

    it('même message (401) pour un mauvais mot de passe et un email inconnu', async () => {
      const wrongPassword = await api()
        .post('/api/auth/login')
        .send({ email: 'claire@mail.fr', password: 'mauvaismotdepasse' })
        .expect(401);
      const unknownEmail = await api()
        .post('/api/auth/login')
        .send({ email: 'inconnu@mail.fr', password: 'motdepasse8' })
        .expect(401);

      expect(wrongPassword.body.message).toBe(
        'Email ou mot de passe incorrect',
      );
      expect(unknownEmail.body.message).toBe(wrongPassword.body.message);
    });
  });

  describe('GET /api/auth/me', () => {
    it('renvoie l’utilisateur du jeton (200)', async () => {
      const login = await api()
        .post('/api/auth/login')
        .send({ email: 'claire@mail.fr', password: 'motdepasse8' });

      await api()
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(200, { id: 1, email: 'claire@mail.fr' });
    });

    it('refuse une requête sans jeton ou avec un jeton modifié (401)', async () => {
      await api().get('/api/auth/me').expect(401);
      await api()
        .get('/api/auth/me')
        .set(
          'Authorization',
          'Bearer eyJhbGciOiJIUzI1NiJ9.e30.signature-fausse',
        )
        .expect(401);
    });

    it('ajoute les en-têtes de sécurité (helmet) à chaque réponse', async () => {
      const response = await api().get('/api/auth/me');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });
});
