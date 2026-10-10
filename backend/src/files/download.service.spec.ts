// =============================================================================
// Fichier : download.service.spec.ts
// Rôle : Tests unitaires de DownloadService – téléchargement public (US02)
//   (Vitest : npm test). L'archiviste (Repository) et le magasinier
//   (StorageService) sont remplacés par des doublures : on vérifie les
//   réponses 404 / 410 / 401 et qu'aucune donnée sensible ne sort.
// Utilise :
//   - download.service.ts (la pièce testée), file.entity.ts (FileEntity),
//     storage.service.ts (remplacé par une doublure), bcrypt (vraie empreinte)
// Utilisé par :
//   - Vitest (vitest.config.ts)
// =============================================================================
import {
  GoneException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { DownloadService } from './download.service.js';
import { FileEntity } from './file.entity.js';
import { StorageService } from './storage.service.js';

describe('DownloadService', () => {
  let service: DownloadService;
  const repository = { findOne: vi.fn() };
  const storage = { openStream: vi.fn() };
  // Faux flux : son contenu n'a pas d'importance ici
  const stream = { fake: 'stream' };
  let passwordHash: string;

  // Fichier tel que la base le renverrait (expire demain)
  const fileRow = (overrides: object = {}) => ({
    id: 1,
    originalName: 'photo.jpg',
    size: 2048,
    mimeType: 'image/jpeg',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    storageName: 'a'.repeat(64),
    passwordHash: null,
    ...overrides,
  });

  beforeAll(async () => {
    // Coût 4 (au lieu de 12) : même principe, mais test rapide
    passwordHash = await bcrypt.hash('secret1', 4);
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    storage.openStream.mockResolvedValue(stream);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DownloadService,
        { provide: getRepositoryToken(FileEntity), useValue: repository },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();
    service = module.get<DownloadService>(DownloadService);
  });

  describe('getInfo', () => {
    it('renvoie les informations du fichier, sans aucune donnée sensible', async () => {
      repository.findOne.mockResolvedValue(fileRow({ passwordHash }));

      const info = await service.getInfo('jeton');

      expect(repository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { token: 'jeton' } }),
      );
      expect(info).toEqual({
        originalName: 'photo.jpg',
        size: 2048,
        mimeType: 'image/jpeg',
        expiresAt: expect.any(Date),
        isProtected: true,
      });
    });

    it('renvoie 404 pour un jeton inconnu', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.getInfo('inconnu')).rejects.toThrow(
        new NotFoundException('Ce lien est invalide ou a expiré'),
      );
    });

    it('renvoie 410 pour un fichier expiré', async () => {
      repository.findOne.mockResolvedValue(
        fileRow({ expiresAt: new Date(Date.now() - 1000) }),
      );

      await expect(service.getInfo('jeton')).rejects.toThrow(GoneException);
    });
  });

  describe('verify', () => {
    it('accepte le bon mot de passe', async () => {
      repository.findOne.mockResolvedValue(fileRow({ passwordHash }));

      await expect(service.verify('jeton', 'secret1')).resolves.toBeUndefined();
    });

    it('renvoie 401 pour un mauvais mot de passe', async () => {
      repository.findOne.mockResolvedValue(fileRow({ passwordHash }));

      await expect(service.verify('jeton', 'faux123')).rejects.toThrow(
        new UnauthorizedException('Mot de passe incorrect'),
      );
    });
  });

  describe('open', () => {
    it('ouvre un fichier non protégé sans mot de passe', async () => {
      const row = fileRow();
      repository.findOne.mockResolvedValue(row);

      const opened = await service.open('jeton');

      expect(storage.openStream).toHaveBeenCalledWith(row.storageName);
      expect(opened.stream).toBe(stream);
    });

    it('revérifie le mot de passe : sans lui, 401 et le fichier n’est jamais ouvert', async () => {
      repository.findOne.mockResolvedValue(fileRow({ passwordHash }));

      await expect(service.open('jeton')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(storage.openStream).not.toHaveBeenCalled();
    });

    it('ouvre un fichier protégé avec le bon mot de passe', async () => {
      repository.findOne.mockResolvedValue(fileRow({ passwordHash }));

      const opened = await service.open('jeton', 'secret1');

      expect(opened.stream).toBe(stream);
    });

    it('renvoie 404 si le fichier est absent du disque', async () => {
      repository.findOne.mockResolvedValue(fileRow());
      storage.openStream.mockResolvedValue(null);

      await expect(service.open('jeton')).rejects.toThrow(NotFoundException);
    });
  });
});
