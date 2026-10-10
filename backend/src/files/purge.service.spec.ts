// =============================================================================
// Fichier : purge.service.spec.ts
// Rôle : Tests unitaires de PurgeService – purge planifiée en deux temps (US10)
//   (Vitest : npm test). Archiviste, magasinier, configuration et registre des
//   tâches sont remplacés par des doublures : on vérifie l'effacement du disque
//   puis le marquage (purged_at), la suppression des lignes après la durée de
//   conservation, la poursuite après une erreur et la programmation de la
//   tâche répétée.
// Utilise :
//   - purge.service.ts (la pièce testée), file.entity.ts (FileEntity),
//     storage.service.ts (doublure), @nestjs/schedule (SchedulerRegistry)
// Utilisé par :
//   - Vitest (vitest.config.ts)
// =============================================================================
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual } from 'typeorm';
import { FileEntity } from './file.entity.js';
import { PurgeService } from './purge.service.js';
import { StorageService } from './storage.service.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

describe('PurgeService', () => {
  const repository = { find: vi.fn(), update: vi.fn(), delete: vi.fn() };
  const storage = { remove: vi.fn() };
  const scheduler = { addInterval: vi.fn() };
  // Valeurs renvoyées par la fausse configuration (modifiables par test)
  let settings: Record<string, string>;

  // Fabrique le service avec la configuration du moment
  const createService = async () => {
    const module = await Test.createTestingModule({
      providers: [
        PurgeService,
        { provide: getRepositoryToken(FileEntity), useValue: repository },
        { provide: StorageService, useValue: storage },
        { provide: SchedulerRegistry, useValue: scheduler },
        {
          provide: ConfigService,
          useValue: { getOrThrow: (name: string) => settings[name] },
        },
      ],
    }).compile();
    return module.get<PurgeService>(PurgeService);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Faux minuteurs : le temps est piloté par le test (aucune vraie attente)
    vi.useFakeTimers();
    // Journal rendu silencieux pendant les tests
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    settings = { PURGE_INTERVAL_MINUTES: '60', HISTORY_RETENTION_DAYS: '30' };
    repository.find.mockResolvedValue([]);
    repository.delete.mockResolvedValue({ affected: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('purgeExpired', () => {
    it('efface du disque les fichiers expirés pas encore purgés, puis les marque', async () => {
      const service = await createService();
      repository.find.mockResolvedValue([
        { id: 1, storageName: 'abc' },
        { id: 2, storageName: 'def' },
      ]);

      const result = await service.purgeExpired();

      expect(result.filesErased).toBe(2);
      // Recherche : date dépassée ET purged_at vide (traité une seule fois)
      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            expiresAt: LessThanOrEqual(expect.any(Date)),
            purgedAt: IsNull(),
          },
        }),
      );
      expect(storage.remove).toHaveBeenCalledWith('abc');
      expect(repository.update).toHaveBeenCalledWith(
        { id: 1 },
        { purgedAt: expect.any(Date) },
      );
      // invocationCallOrder : le disque est effacé AVANT le marquage
      expect(storage.remove.mock.invocationCallOrder[0]).toBeLessThan(
        repository.update.mock.invocationCallOrder[0],
      );
    });

    it('supprime les lignes purgées depuis plus de HISTORY_RETENTION_DAYS jours', async () => {
      const service = await createService();
      repository.delete.mockResolvedValue({ affected: 3 });
      const before = Date.now();

      const result = await service.purgeExpired();

      expect(result.rowsDeleted).toBe(3);
      // La limite passée à la requête est « maintenant - 30 jours »
      const where = repository.delete.mock.calls[0][0] as {
        purgedAt: { value: Date };
      };
      expect(where.purgedAt).toEqual(LessThanOrEqual(expect.any(Date)));
      expect(where.purgedAt.value.getTime()).toBe(before - 30 * ONE_DAY_MS);
    });

    it('continue avec les fichiers suivants si l’un d’eux échoue', async () => {
      const service = await createService();
      repository.find.mockResolvedValue([
        { id: 1, storageName: 'abc' },
        { id: 2, storageName: 'def' },
      ]);
      storage.remove.mockRejectedValueOnce(new Error('disque en panne'));

      const result = await service.purgeExpired();

      expect(result.filesErased).toBe(1);
      // Le premier fichier n'est pas marqué (il sera retraité la fois suivante)
      expect(repository.update).toHaveBeenCalledTimes(1);
      expect(repository.update).toHaveBeenCalledWith(
        { id: 2 },
        { purgedAt: expect.any(Date) },
      );
    });

    it('ne fait rien s’il n’y a rien à purger', async () => {
      const service = await createService();

      expect(await service.purgeExpired()).toEqual({
        filesErased: 0,
        rowsDeleted: 0,
      });
      expect(storage.remove).not.toHaveBeenCalled();
    });
  });

  describe('démarrage', () => {
    it('purge au démarrage, puis à chaque intervalle configuré', async () => {
      settings.PURGE_INTERVAL_MINUTES = '15';
      const service = await createService();
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

    it('refuse de démarrer avec une valeur invalide', async () => {
      for (const name of ['PURGE_INTERVAL_MINUTES', 'HISTORY_RETENTION_DAYS']) {
        for (const value of ['0', '-5', 'abc', '1.5']) {
          settings = {
            PURGE_INTERVAL_MINUTES: '60',
            HISTORY_RETENTION_DAYS: '30',
            [name]: value,
          };
          await expect(createService()).rejects.toThrow(
            `${name} doit être un entier ≥ 1`,
          );
        }
      }
    });
  });
});
