// =============================================================================
// Fichier : files.e2e-spec.ts
// Rôle : Tests de bout en bout des fichiers de l'utilisateur connecté :
//   téléversement (US01), historique (US05) et suppression (US06). Vraies
//   requêtes multipart, vraie base de test, vrai dossier de stockage
//   (temporaire) : on vérifie aussi ce qui est écrit, ou effacé, sur le disque.
// Utilise :
//   - test/e2e-app.ts, test/e2e-env.ts (dossier de stockage) ; supertest
// Utilisé par :
//   - npm run test:e2e (vitest.config.e2e.ts)
// =============================================================================
import type { INestApplication } from '@nestjs/common';
import { readdir } from 'node:fs/promises';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createUser, resetDatabase, startApp } from './e2e-app.js';
import { TEST_UPLOAD_DIR } from './e2e-env.js';

describe('Fichiers (e2e)', () => {
  let app: INestApplication;
  let claire: string;
  let bob: string;
  const api = () => request(app.getHttpServer());
  // Nombre de fichiers présents dans le dossier de stockage
  const filesOnDisk = async () => (await readdir(TEST_UPLOAD_DIR)).length;

  beforeAll(async () => {
    app = await startApp();
    await resetDatabase(app);
    claire = await createUser(app, 'claire@mail.fr');
    bob = await createUser(app, 'bob@mail.fr');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/files (US01)', () => {
    it('enregistre le fichier (201) avec mot de passe, durée et tags', async () => {
      const before = await filesOnDisk();

      const response = await api()
        .post('/api/files')
        .set('Authorization', `Bearer ${claire}`)
        .attach('file', Buffer.from('Compte rendu'), 'compte-rendu été.txt')
        .field('expiresInDays', '3')
        .field('password', 'secret1')
        .field('tags', 'travail')
        .field('tags', 'réunion')
        .expect(201);

      expect(response.body).toMatchObject({
        originalName: 'compte-rendu été.txt',
        size: 12,
        isProtected: true,
        isExpired: false,
        tags: ['travail', 'réunion'],
      });
      // Jeton du lien : 43 caractères base64url ; jamais d'empreinte ni de
      // nom de stockage dans la réponse
      expect(response.body.token).toMatch(/^[\w-]{43}$/);
      expect(response.body).not.toHaveProperty('passwordHash');
      expect(response.body).not.toHaveProperty('storageName');
      // Expiration à 3 jours (à une minute près)
      const delay = Date.parse(response.body.expiresAt) - Date.now();
      expect(Math.abs(delay - 3 * 24 * 3600 * 1000)).toBeLessThan(60_000);
      // Le fichier est bien écrit sur le disque
      expect(await filesOnDisk()).toBe(before + 1);
    });

    it('refuse une extension interdite (400), sans rien écrire sur le disque', async () => {
      const before = await filesOnDisk();

      const response = await api()
        .post('/api/files')
        .set('Authorization', `Bearer ${claire}`)
        .attach('file', Buffer.from('echo pirate'), 'script.SH')
        .expect(400);

      expect(response.body.message).toBe(
        "Ce type de fichier n'est pas autorisé",
      );
      expect(await filesOnDisk()).toBe(before);
    });

    it('efface le fichier reçu si une donnée est invalide (400, aucun orphelin)', async () => {
      const before = await filesOnDisk();

      await api()
        .post('/api/files')
        .set('Authorization', `Bearer ${claire}`)
        .attach('file', Buffer.from('photo'), 'photo.jpg')
        .field('expiresInDays', '9')
        .expect(400);

      expect(await filesOnDisk()).toBe(before);
    });

    it('refuse un envoi annoncé à plus de 1 Go (413)', async () => {
      const response = await api()
        .post('/api/files')
        .set('Authorization', `Bearer ${claire}`)
        .set('Content-Type', 'multipart/form-data; boundary=x')
        .set('Content-Length', String(2 * 1024 ** 3))
        .send('x')
        .expect(413);

      expect(response.body.message).toBe(
        'La taille des fichiers est limitée à 1 Go',
      );
    });

    it('refuse un envoi sans fichier (400) ou sans jeton (401)', async () => {
      await api()
        .post('/api/files')
        .set('Authorization', `Bearer ${claire}`)
        .field('expiresInDays', '3')
        .expect(400);
      await api()
        .post('/api/files')
        .attach('file', Buffer.from('x'), 'a.txt')
        .expect(401);
    });
  });

  describe('GET /api/files (US05)', () => {
    it('ne renvoie que les fichiers de l’utilisateur connecté', async () => {
      await api()
        .post('/api/files')
        .set('Authorization', `Bearer ${bob}`)
        .attach('file', Buffer.from('fichier de Bob'), 'bob.txt')
        .expect(201);

      const claireFiles = await api()
        .get('/api/files?status=all')
        .set('Authorization', `Bearer ${claire}`)
        .expect(200);
      const bobFiles = await api()
        .get('/api/files')
        .set('Authorization', `Bearer ${bob}`)
        .expect(200);

      expect(
        claireFiles.body.map((f: { originalName: string }) => f.originalName),
      ).toEqual(['compte-rendu été.txt']);
      expect(
        bobFiles.body.map((f: { originalName: string }) => f.originalName),
      ).toEqual(['bob.txt']);
    });

    it('filtre les fichiers expirés (status=expired)', async () => {
      // On fait expirer le fichier de Claire directement en base
      await app
        .get(DataSource)
        .query(
          "UPDATE files SET expires_at = now() - interval '1 hour' WHERE original_name = 'compte-rendu été.txt'",
        );

      const active = await api()
        .get('/api/files?status=active')
        .set('Authorization', `Bearer ${claire}`)
        .expect(200);
      const expired = await api()
        .get('/api/files?status=expired')
        .set('Authorization', `Bearer ${claire}`)
        .expect(200);

      expect(active.body).toEqual([]);
      expect(expired.body).toHaveLength(1);
      expect(expired.body[0].isExpired).toBe(true);
    });

    it('refuse un filtre inconnu ou un paramètre en trop (400)', async () => {
      await api()
        .get('/api/files?status=tous')
        .set('Authorization', `Bearer ${claire}`)
        .expect(400);
      const response = await api()
        .get('/api/files?userId=2')
        .set('Authorization', `Bearer ${claire}`)
        .expect(400);

      expect(response.body.message).toEqual([
        "Le champ « userId » n'est pas autorisé",
      ]);
    });
  });

  describe('DELETE /api/files/:id (US06)', () => {
    it('refuse de supprimer le fichier d’un autre utilisateur (404)', async () => {
      const bobFiles = await api()
        .get('/api/files')
        .set('Authorization', `Bearer ${bob}`);

      await api()
        .delete(`/api/files/${bobFiles.body[0].id}`)
        .set('Authorization', `Bearer ${claire}`)
        .expect(404);
    });

    it('supprime son fichier (204) : ligne en base ET fichier sur le disque', async () => {
      const bobFiles = await api()
        .get('/api/files')
        .set('Authorization', `Bearer ${bob}`);
      const before = await filesOnDisk();

      await api()
        .delete(`/api/files/${bobFiles.body[0].id}`)
        .set('Authorization', `Bearer ${bob}`)
        .expect(204);

      const after = await api()
        .get('/api/files?status=all')
        .set('Authorization', `Bearer ${bob}`);
      expect(after.body).toEqual([]);
      expect(await filesOnDisk()).toBe(before - 1);
    });

    it('répond 404 pour un id invalide ou hors limites', async () => {
      for (const id of ['abc', '99999999999', '0']) {
        await api()
          .delete(`/api/files/${id}`)
          .set('Authorization', `Bearer ${claire}`)
          .expect(404);
      }
    });
  });
});
