// =============================================================================
// Fichier : download.e2e-spec.ts
// Rôle : Tests de bout en bout du téléchargement public (US02) : sans compte,
//   avec le seul jeton du lien. On vérifie les informations, le mot de passe,
//   le contenu reçu octet pour octet, les en-têtes, et les liens expirés ou
//   inconnus.
// Utilise :
//   - test/e2e-app.ts ; supertest ; typeorm (DataSource : faire expirer un
//     fichier directement en base)
// Utilisé par :
//   - npm run test:e2e (vitest.config.e2e.ts)
// =============================================================================
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createUser, resetDatabase, startApp } from './e2e-app.js';

describe('Téléchargement public (e2e)', () => {
  let app: INestApplication;
  let freeToken: string;
  let protectedToken: string;
  const api = () => request(app.getHttpServer());
  const content = Buffer.from('Contenu du rapport annuel');

  beforeAll(async () => {
    app = await startApp();
    await resetDatabase(app);
    const claire = await createUser(app, 'claire@mail.fr');
    // Deux fichiers : un libre, un protégé par mot de passe
    const free = await api()
      .post('/api/files')
      .set('Authorization', `Bearer ${claire}`)
      .attach('file', content, 'rapport été.pdf')
      .expect(201);
    const secured = await api()
      .post('/api/files')
      .set('Authorization', `Bearer ${claire}`)
      .attach('file', content, 'secret.txt')
      .field('password', 'secret1')
      .expect(201);
    freeToken = free.body.token;
    protectedToken = secured.body.token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET : informations du fichier, sans compte ni donnée sensible (200)', async () => {
    const response = await api()
      .get(`/api/download/${protectedToken}`)
      .expect(200);

    expect(response.body).toEqual({
      originalName: 'secret.txt',
      size: content.length,
      mimeType: 'text/plain',
      expiresAt: expect.any(String),
      isProtected: true,
    });
  });

  it('POST verify : 204 avec le bon mot de passe, 401 sinon, 400 s’il manque', async () => {
    const url = `/api/download/${protectedToken}/verify`;
    await api().post(url).send({ password: 'secret1' }).expect(204);
    await api().post(url).send({ password: 'faux123' }).expect(401);
    const missing = await api().post(url).send({}).expect(400);

    expect(missing.body.message).toEqual(['Le mot de passe est obligatoire']);
  });

  it('POST : envoie le fichier libre, octet pour octet, à enregistrer sous son nom', async () => {
    const response = await api()
      .post(`/api/download/${freeToken}`)
      .buffer(true)
      .parse((res, done) => {
        // Réception brute des octets (le fichier n'est pas du JSON)
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => done(null, Buffer.concat(chunks)));
      })
      .expect(200);

    expect(Buffer.compare(response.body as Buffer, content)).toBe(0);
    expect(response.headers['content-type']).toBe('application/pdf');
    // Nom sans accents + nom exact en UTF-8 (norme RFC 6266)
    expect(response.headers['content-disposition']).toBe(
      'attachment; filename="rapport ete.pdf"; ' +
        "filename*=UTF-8''rapport%20%C3%A9t%C3%A9.pdf",
    );
  });

  it('POST : fichier protégé refusé sans le bon mot de passe (401), envoyé avec (200)', async () => {
    await api().post(`/api/download/${protectedToken}`).expect(401);
    await api()
      .post(`/api/download/${protectedToken}`)
      .type('form')
      .send({ password: 'faux123' })
      .expect(401);
    // Formulaire envoyé comme par le navigateur (application/x-www-form-urlencoded)
    await api()
      .post(`/api/download/${protectedToken}`)
      .type('form')
      .send({ password: 'secret1' })
      .expect(200);
  });

  it('lien inconnu : 404 « Ce lien est invalide ou a expiré »', async () => {
    const response = await api().get('/api/download/lien-inconnu').expect(404);

    expect(response.body.message).toBe('Ce lien est invalide ou a expiré');
  });

  it('lien expiré : 410, pour les informations comme pour le téléchargement', async () => {
    await app
      .get(DataSource)
      .query(
        "UPDATE files SET expires_at = now() - interval '1 hour' WHERE token = $1",
        [freeToken],
      );

    const info = await api().get(`/api/download/${freeToken}`).expect(410);
    await api().post(`/api/download/${freeToken}`).expect(410);

    expect(info.body.message).toBe(
      "Ce fichier n'est plus disponible en téléchargement car il a expiré.",
    );
  });
});
