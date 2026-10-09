// ================================================================================================
// Fichier : files.service.spec.ts
// Rôle : Tests unitaires de FilesService – téléversement (US01), historique (US05) et suppression (US06) (Vitest : npm test).
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
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThan } from 'typeorm';
import { FileEntity } from './file.entity.js';
import { FilesService } from './files.service.js';
import { StorageService } from './storage.service.js';

describe('FilesService', () => {
  let service: FilesService;
  const repository = {
    find: vi.fn(),
    findOne: vi.fn(),
    delete: vi.fn(),
    // create : renvoie l'objet préparé tel quel ; save : simule l'INSERT (id et date ajoutés par la base)
    create: vi.fn((donnees: object) => donnees),
    save: vi.fn((donnees: object) =>
      Promise.resolve({ ...donnees, id: 12, createdAt: new Date() }),
    ),
  };
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

  // Téléversement (US01)
  describe('create', () => {
    // Fichier tel que multer le décrit après l'avoir écrit sur le disque
    const fichier = {
      originalname: 'photo.jpg',
      size: 2048,
      mimetype: 'image/jpeg',
      filename: 'a'.repeat(64),
    } as Express.Multer.File;

    // Options passées à repository.create() lors du dernier appel
    const ligneCreee = () =>
      repository.create.mock.calls[0][0] as {
        token: string;
        passwordHash: string | null;
        expiresAt: Date;
        userId: number;
        storageName: string;
        tags: { label: string }[];
      };

    it("enregistre le fichier de l'utilisateur, sans mot de passe, expirant dans le nombre de jours demandé", async () => {
      const avant = Date.now();

      const reponse = await service.create(7, fichier, {
        expiresInDays: 3,
        tags: [],
      });

      const ligne = ligneCreee();
      expect(ligne.userId).toBe(7);
      expect(ligne.storageName).toBe(fichier.filename);
      expect(ligne.passwordHash).toBeNull();
      // 3 jours plus tard (à la milliseconde près, le temps du test)
      const troisJours = 3 * 24 * 60 * 60 * 1000;
      expect(ligne.expiresAt.getTime()).toBeGreaterThanOrEqual(
        avant + troisJours,
      );
      expect(ligne.expiresAt.getTime()).toBeLessThanOrEqual(
        Date.now() + troisJours,
      );
      expect(reponse).toMatchObject({
        id: 12,
        originalName: 'photo.jpg',
        isProtected: false,
        isExpired: false,
      });
    });

    it('génère un jeton aléatoire de 43 caractères, différent à chaque envoi', async () => {
      await service.create(7, fichier, { expiresInDays: 7, tags: [] });
      await service.create(7, fichier, { expiresInDays: 7, tags: [] });

      const jeton1 = (repository.create.mock.calls[0][0] as { token: string })
        .token;
      const jeton2 = (repository.create.mock.calls[1][0] as { token: string })
        .token;
      // base64url : lettres, chiffres, « - » et « _ » uniquement (sans risque dans une adresse)
      expect(jeton1).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(jeton1).not.toBe(jeton2);
    });

    it("stocke l'empreinte bcrypt du mot de passe, jamais le mot de passe, et ne la renvoie pas", async () => {
      const reponse = await service.create(7, fichier, {
        expiresInDays: 7,
        password: 'secret1',
        tags: [],
      });

      const { passwordHash } = ligneCreee();
      expect(passwordHash).not.toBe('secret1');
      expect(await bcrypt.compare('secret1', passwordHash!)).toBe(true);
      expect(reponse.isProtected).toBe(true);
      expect(reponse).not.toHaveProperty('passwordHash');
      expect(reponse).not.toHaveProperty('storageName');
    });

    it('enregistre les tags avec le fichier', async () => {
      const reponse = await service.create(7, fichier, {
        expiresInDays: 7,
        tags: ['vacances', 'photos'],
      });

      expect(ligneCreee().tags).toEqual([
        { label: 'vacances' },
        { label: 'photos' },
      ]);
      expect(reponse.tags).toEqual(['vacances', 'photos']);
    });

    it('refuse (400) un nom de fichier de plus de 255 caractères, sans rien enregistrer', async () => {
      const nomTropLong = { ...fichier, originalname: 'a'.repeat(256) };

      await expect(
        service.create(7, nomTropLong, { expiresInDays: 7, tags: [] }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });
});
