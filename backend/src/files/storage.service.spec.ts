// ================================================================================================
// Fichier : storage.service.spec.ts
// Rôle : Tests unitaires de StorageService (Vitest : npm test).
//   On vérifie les réglages donnés à multer (nom aléatoire, 1 Go, extensions interdites) et la suppression
//   sur un VRAI dossier temporaire (créé puis effacé par le test, jamais le dossier uploads/).
// Utilise :
//   - storage.service.ts (la pièce testée), ConfigService (doublure qui renvoie les variables d'environnement)
//   - node:fs/promises, node:os, node:path : dossier et fichiers temporaires
// Utilisé par :
//   - Vitest (vitest.config.ts)
// ================================================================================================
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StorageService, TAILLE_MAX_FICHIER } from './storage.service.js';

// Signature simplifiée des fonctions de rappel de multer (filename, fileFilter)
type Rappel = (erreur: Error | null, valeur?: unknown) => void;
interface OptionsMulterTestees {
  storage: {
    getFilename: (requete: unknown, fichier: unknown, rappel: Rappel) => void;
  };
  limits: { fileSize: number; files: number };
  fileFilter: (requete: unknown, fichier: unknown, rappel: Rappel) => void;
}

describe('StorageService', () => {
  let dossier: string;
  let service: StorageService;
  let options: OptionsMulterTestees;

  beforeEach(async () => {
    // Dossier temporaire unique (ex. /tmp/datashare-test-AbC123)
    dossier = await mkdtemp(join(tmpdir(), 'datashare-test-'));
    const variables: Record<string, string> = {
      UPLOAD_DIR: dossier,
      FORBIDDEN_EXTENSIONS: '.exe, .SH,.js',
    };
    const config = {
      getOrThrow: (cle: string) => variables[cle],
    } as unknown as ConfigService;
    service = new StorageService(config);
    options = service.createMulterOptions() as unknown as OptionsMulterTestees;
  });

  afterEach(async () => {
    await rm(dossier, { recursive: true, force: true });
  });

  // Appelle le fileFilter de multer pour un nom de fichier et renvoie [erreur, accepté]
  const filtrer = (nom: string) =>
    new Promise<[Error | null, unknown]>((fin) =>
      options.fileFilter({}, { originalname: nom }, (erreur, accepte) =>
        fin([erreur, accepte]),
      ),
    );

  it('limite la réception à un seul fichier de 1 Go', () => {
    expect(options.limits.fileSize).toBe(1024 * 1024 * 1024);
    expect(TAILLE_MAX_FICHIER).toBe(1073741824);
    expect(options.limits.files).toBe(1);
  });

  it('génère un nom de stockage aléatoire de 64 caractères hexadécimaux, jamais le nom d’origine', async () => {
    const nommer = () =>
      new Promise<unknown>((fin) =>
        options.storage.getFilename(
          {},
          { originalname: 'photo.jpg' },
          (_erreur, nom) => fin(nom),
        ),
      );

    const nom1 = await nommer();
    const nom2 = await nommer();

    expect(nom1).toMatch(/^[0-9a-f]{64}$/);
    expect(nom1).not.toBe(nom2);
  });

  it('refuse les extensions interdites, quelle que soit la casse (400)', async () => {
    for (const nom of ['virus.exe', 'script.sh', 'SCRIPT.SH', 'app.Js']) {
      const [erreur, accepte] = await filtrer(nom);
      expect(erreur).toBeInstanceOf(BadRequestException);
      expect(accepte).toBe(false);
    }
  });

  it('accepte les autres fichiers', async () => {
    for (const nom of [
      'photo.jpg',
      'rapport.pdf',
      'archive.tar.gz',
      'sans-extension',
    ]) {
      const [erreur, accepte] = await filtrer(nom);
      expect(erreur).toBeNull();
      expect(accepte).toBe(true);
    }
  });

  it('supprime un fichier du dossier de stockage', async () => {
    await writeFile(join(dossier, 'abc123'), 'contenu');

    await service.remove('abc123');

    await expect(access(join(dossier, 'abc123'))).rejects.toThrow();
  });

  it('ne signale pas d’erreur si le fichier est déjà absent (ENOENT)', async () => {
    await expect(service.remove('inexistant')).resolves.toBeUndefined();
  });

  it('refuse un nom de stockage contenant un chemin (traversée « ../ »)', async () => {
    await expect(service.remove('../../.env')).rejects.toThrow(
      'Nom de stockage invalide',
    );
  });
});
