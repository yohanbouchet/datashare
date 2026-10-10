// =============================================================================
// Fichier : purge.service.spec.ts
// Rôle : Tests unitaires de PurgeService – purge planifiée (US10) (Vitest :
//   npm test). Archiviste, magasinier, configuration et registre des tâches
//   sont remplacés par des doublures : on vérifie la recherche des fichiers
//   expirés, l'ordre base puis disque, la poursuite après une erreur et la
//   programmation de la tâche répétée.
// Utilise :
//   - purge.service.ts (la pièce testée), file.entity.ts (FileEntity),
//     storage.service.ts (doublure), @nestjs/schedule (SchedulerRegistry)
// Utilisé par :
//   - Vitest (vitest.config.ts)
// =============================================================================
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LessThanOrEqual } from 'typeorm';
import { FileEntity } from './file.entity.js';
import { PurgeService } from './purge.service.js';
import { StorageService } from './storage.service.js';

describe('PurgeService', () => {
  let service: PurgeService;
  const repository = { find: vi.fn(), delete: vi.fn() };
  const storage = { remove: vi.fn() };
  const scheduler = { addInterval: vi.fn() };
  // Valeur de PURGE_INTERVAL_MINUTES renvoyée par la fausse configuration
  let interval = '60';

  beforeEach(async () => {
    vi.clearAllMocks();
    // Faux minuteurs : le temps est piloté par le test (aucune vraie attente)
    vi.useFakeTimers();
    // Journal rendu silencieux pendant les tests
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    interval = '60';
    repository.find.mockResolvedValue([]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurgeService,
        { provide: getRepositoryToken(FileEntity), useValue: repository },
        { provide: StorageService, useValue: storage },
        { provide: ConfigService, useValue: { getOrThrow: () => interval } },
        { provide: SchedulerRegistry, useValue: scheduler },
      ],
    }).compile();
    service = module.get<PurgeService>(PurgeService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('purgeExpired', () => {
    it('cherche les fichiers expirés (date dépassée) et les supprime : base puis disque', async () => {
      repository.find.mockResolvedValue([
        { id: 1, storageName: 'abc' },
        { id: 2, storageName: 'def' },
      ]);

      expect(await service.purgeExpired()).toBe(2);

      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { expiresAt: LessThanOrEqual(expect.any(Date)) },
        }),
      );
      expect(repository.delete).toHaveBeenCalledWith({ id: 1 });
      expect(storage.remove).toHaveBeenCalledWith('abc');
      // invocationCallOrder : la ligne en base est supprimée AVANT le fichier
      expect(repository.delete.mock.invocationCallOrder[0]).toBeLessThan(
        storage.remove.mock.invocationCallOrder[0],
      );
    });

    it('continue avec les fichiers suivants si l’un d’eux échoue', async () => {
      repository.find.mockResolvedValue([
        { id: 1, storageName: 'abc' },
        { id: 2, storageName: 'def' },
      ]);
      repository.delete.mockRejectedValueOnce(new Error('base indisponible'));

      expect(await service.purgeExpired()).toBe(1);

      expect(storage.remove).toHaveBeenCalledTimes(1);
      expect(storage.remove).toHaveBeenCalledWith('def');
    });

    it('ne fait rien s’il n’y a aucun fichier expiré', async () => {
      expect(await service.purgeExpired()).toBe(0);

      expect(repository.delete).not.toHaveBeenCalled();
    });
  });

  describe('onApplicationBootstrap', () => {
    it('purge au démarrage, puis à chaque intervalle configuré', async () => {
      interval = '15';
      const purge = vi.spyOn(service, 'purgeExpired');

      service.onApplicationBootstrap();

      expect(scheduler.addInterval).toHaveBeenCalledWith(
        'purge-expired-files',
        expect.anything(),
      );
      expect(purge).toHaveBeenCalledTimes(1);
      // On avance l'horloge factice de 15 minutes : nouvelle purge
      await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
      expect(purge).toHaveBeenCalledTimes(2);
    });

    it('refuse de démarrer avec une fréquence invalide', () => {
      for (const value of ['0', '-5', 'abc', '1.5']) {
        interval = value;
        expect(() => service.onApplicationBootstrap()).toThrow(
          'PURGE_INTERVAL_MINUTES doit être un entier ≥ 1',
        );
      }
    });
  });
});
