// ================================================================================================
// Fichier : files.service.spec.ts
// Rôle : Tests unitaires de FilesService – historique (US05) et suppression (US06) (Vitest : npm test).
//   Le Repository TypeORM est remplacé par une doublure : on vérifie la REQUÊTE construite
//   (filtre utilisateur + filtre de date) et la RÉPONSE (sans empreinte, isExpired / isProtected calculés).
//   StorageService est aussi remplacé : on vérifie la suppression (propriétaire, 404, ordre base puis disque).
// Utilise :
//   - files.service.ts (la pièce testée), file.entity.ts (FileEntity, pour l'étiquette du Repository)
//   - storage.service.ts (remplacé par la doublure storage)
//   - typeorm (MoreThan, LessThanOrEqual : pour reconnaître les filtres de date)
// Utilisé par :
//   - Vitest (vitest.config.ts)
// ================================================================================================
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThan } from 'typeorm';
import { FileEntity } from './file.entity.js';
import { FilesService } from './files.service.js';
import { StorageService } from './storage.service.js';

describe('FilesService', () => {
  let service: FilesService;
  const repository = { find: vi.fn(), findOne: vi.fn(), delete: vi.fn() };
  const storage = { remove: vi.fn() };

  // Deux fichiers factices tels que la base les renverrait
  const demain = new Date(Date.now() + 24 * 3600 * 1000);
  const hier = new Date(Date.now() - 24 * 3600 * 1000);
  const fichierActifProtege = {
    id: 1,
    originalName: 'photo.jpg',
    size: 2726297,
    createdAt: new Date(),
    expiresAt: demain,
    token: 'jeton-1',
    passwordHash: '$2b$12$empreinte',
    tags: [{ id: 1, label: 'photos' }],
  };
  const fichierExpire = {
    ...fichierActifProtege,
    id: 2,
    expiresAt: hier,
    token: 'jeton-2',
    passwordHash: null,
    tags: [],
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        { provide: getRepositoryToken(FileEntity), useValue: repository },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();
    service = module.get<FilesService>(FilesService);
  });

  // Récupère les options passées à repository.find() lors du dernier appel
  const optionsDeRecherche = () =>
    repository.find.mock.calls[0][0] as { where: Record<string, unknown> };

  it("filtre TOUJOURS sur l'utilisateur et, par défaut, sur les fichiers actifs", async () => {
    repository.find.mockResolvedValue([]);

    await service.findForUser(7, 'active');

    const { where } = optionsDeRecherche();
    expect(where.userId).toBe(7);
    expect(where.expiresAt).toEqual(MoreThan(expect.any(Date)));
  });

  it('filtre sur les fichiers expirés avec status=expired', async () => {
    repository.find.mockResolvedValue([]);

    await service.findForUser(7, 'expired');

    expect(optionsDeRecherche().where.expiresAt).toEqual(
      LessThanOrEqual(expect.any(Date)),
    );
  });

  it("n'applique aucun filtre de date avec status=all (mais garde le filtre utilisateur)", async () => {
    repository.find.mockResolvedValue([]);

    await service.findForUser(7, 'all');

    const { where } = optionsDeRecherche();
    expect(where).toEqual({ userId: 7 });
  });

  it('renvoie des lignes sans empreinte, avec isExpired, isProtected et les libellés des tags', async () => {
    repository.find.mockResolvedValue([fichierActifProtege, fichierExpire]);

    const lignes = await service.findForUser(7, 'all');

    expect(lignes[0]).toMatchObject({
      id: 1,
      isExpired: false,
      isProtected: true,
      tags: ['photos'],
      token: 'jeton-1',
    });
    expect(lignes[1]).toMatchObject({
      id: 2,
      isExpired: true,
      isProtected: false,
      tags: [],
    });
    // 🔒 L'empreinte du mot de passe ne sort jamais du service
    for (const ligne of lignes) {
      expect(ligne).not.toHaveProperty('passwordHash');
    }
  });

  // Suppression (US06)
  describe('remove', () => {
    it('supprime la ligne en base PUIS le fichier sur le disque', async () => {
      repository.findOne.mockResolvedValue({ id: 1, storageName: 'abc123' });

      await service.remove(7, 1);

      expect(repository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1, userId: 7 } }),
      );
      expect(repository.delete).toHaveBeenCalledWith({ id: 1 });
      expect(storage.remove).toHaveBeenCalledWith('abc123');
      // invocationCallOrder : numéro d'ordre de chaque appel → la base AVANT le disque
      expect(repository.delete.mock.invocationCallOrder[0]).toBeLessThan(
        storage.remove.mock.invocationCallOrder[0],
      );
    });

    it('renvoie 404 sans rien supprimer si le fichier est introuvable ou appartient à un autre', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(7, 4)).rejects.toThrow(NotFoundException);

      expect(repository.delete).not.toHaveBeenCalled();
      expect(storage.remove).not.toHaveBeenCalled();
    });

    it('renvoie 404 pour un id hors limites, sans interroger la base', async () => {
      await expect(service.remove(7, 99999999999)).rejects.toThrow(
        NotFoundException,
      );

      expect(repository.findOne).not.toHaveBeenCalled();
    });
  });
});
