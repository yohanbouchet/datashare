// =============================================================================
// Fichier : storage.service.spec.ts
// Rôle : Tests unitaires de StorageService (Vitest : npm test). On vérifie les
//   réglages donnés à multer (nom aléatoire, 1 Go, extensions interdites) et la
//   suppression et la lecture en flux sur un VRAI dossier temporaire (créé
//   puis effacé par le test, jamais le dossier uploads/).
// Utilise :
//   - storage.service.ts (la pièce testée), ConfigService (doublure qui renvoie
//     les variables d'environnement)
//   - node:fs/promises, node:os, node:path : dossier et fichiers temporaires
//   - node:stream/consumers (text : lit tout le contenu d'un flux)
// Utilisé par :
//   - Vitest (vitest.config.ts)
// =============================================================================
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { text } from 'node:stream/consumers';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StorageService, MAX_FILE_SIZE } from './storage.service.js';

// Signature simplifiée des fonctions de rappel de multer (filename, fileFilter)
type Callback = (error: Error | null, value?: unknown) => void;
interface TestedMulterOptions {
  storage: {
    getFilename: (request: unknown, file: unknown, callback: Callback) => void;
  };
  limits: { fileSize: number; files: number };
  fileFilter: (request: unknown, file: unknown, callback: Callback) => void;
}

describe('StorageService', () => {
  let directory: string;
  let service: StorageService;
  let options: TestedMulterOptions;

  beforeEach(async () => {
    // Dossier temporaire unique (ex. /tmp/datashare-test-AbC123)
    directory = await mkdtemp(join(tmpdir(), 'datashare-test-'));
    const variables: Record<string, string> = {
      UPLOAD_DIR: directory,
      FORBIDDEN_EXTENSIONS: '.exe, .SH,.js',
    };
    const config = {
      getOrThrow: (key: string) => variables[key],
    } as unknown as ConfigService;
    service = new StorageService(config);
    options = service.createMulterOptions() as unknown as TestedMulterOptions;
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  // Appelle le fileFilter de multer pour un nom de fichier et renvoie [erreur,
  // accepté]
  const runFilter = (name: string) =>
    new Promise<[Error | null, unknown]>((done) =>
      options.fileFilter({}, { originalname: name }, (error, accepted) =>
        done([error, accepted]),
      ),
    );

  it('limite la réception à un seul fichier de 1 Go', () => {
    expect(options.limits.fileSize).toBe(1024 * 1024 * 1024);
    expect(MAX_FILE_SIZE).toBe(1073741824);
    expect(options.limits.files).toBe(1);
  });

  it('génère un nom de stockage aléatoire de 64 caractères hexadécimaux, jamais le nom d’origine', async () => {
    const generateName = () =>
      new Promise<unknown>((done) =>
        options.storage.getFilename(
          {},
          { originalname: 'photo.jpg' },
          (_error, name) => done(name),
        ),
      );

    const name1 = await generateName();
    const name2 = await generateName();

    expect(name1).toMatch(/^[0-9a-f]{64}$/);
    expect(name1).not.toBe(name2);
  });

  it('refuse les extensions interdites, quelle que soit la casse (400)', async () => {
    for (const name of ['virus.exe', 'script.sh', 'SCRIPT.SH', 'app.Js']) {
      const [error, accepted] = await runFilter(name);
      expect(error).toBeInstanceOf(BadRequestException);
      expect(accepted).toBe(false);
    }
  });

  it('accepte les autres fichiers', async () => {
    for (const name of [
      'photo.jpg',
      'rapport.pdf',
      'archive.tar.gz',
      'sans-extension',
    ]) {
      const [error, accepted] = await runFilter(name);
      expect(error).toBeNull();
      expect(accepted).toBe(true);
    }
  });

  it('supprime un fichier du dossier de stockage', async () => {
    await writeFile(join(directory, 'abc123'), 'contenu');

    await service.remove('abc123');

    await expect(access(join(directory, 'abc123'))).rejects.toThrow();
  });

  it('ne signale pas d’erreur si le fichier est déjà absent (ENOENT)', async () => {
    await expect(service.remove('inexistant')).resolves.toBeUndefined();
  });

  it('refuse un nom de stockage contenant un chemin (traversée « ../ »)', async () => {
    await expect(service.remove('../../.env')).rejects.toThrow(
      'Nom de stockage invalide',
    );
  });

  it('ouvre un fichier stocké en flux et en restitue le contenu (US02)', async () => {
    await writeFile(join(directory, 'abc123'), 'contenu du fichier');

    const stream = await service.openStream('abc123');

    expect(stream).not.toBeNull();
    expect(await text(stream!)).toBe('contenu du fichier');
  });

  it('renvoie null si le fichier est absent du disque', async () => {
    expect(await service.openStream('inexistant')).toBeNull();
  });
});
