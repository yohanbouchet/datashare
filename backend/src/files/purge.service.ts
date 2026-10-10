// =============================================================================
// Fichier : purge.service.ts
// Rôle : Purge planifiée des fichiers expirés (US10). Une tâche automatique
//   supprime, à intervalle régulier, chaque fichier dont la date d'expiration
//   est dépassée : sa ligne en base (tags compris, ON DELETE CASCADE), puis le
//   fichier sur le disque. Elle s'exécute aussi une fois au démarrage de l'API
//   (rattrapage si le serveur était arrêté). Fréquence : PURGE_INTERVAL_MINUTES.
// Utilise :
//   - file.entity.ts (FileEntity) via le Repository de TypeORM
//   - storage.service.ts (remove : suppression sur le disque)
//   - @nestjs/schedule (SchedulerRegistry : enregistre la tâche répétée, que
//     NestJS arrête proprement à l'arrêt de l'API)
//   - .env (PURGE_INTERVAL_MINUTES) via ConfigService
// Utilisé par :
//   - files.module.ts (providers) ; démarrée automatiquement par NestJS
// =============================================================================
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { FileEntity } from './file.entity.js';
import { StorageService } from './storage.service.js';

const ONE_MINUTE_MS = 60 * 1000;

@Injectable()
export class PurgeService implements OnApplicationBootstrap {
  // Journal de l'API : chaque purge y laisse une trace (nombre de fichiers)
  private readonly logger = new Logger(PurgeService.name);

  constructor(
    @InjectRepository(FileEntity)
    private readonly filesRepository: Repository<FileEntity>,
    private readonly storageService: StorageService,
    private readonly config: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  // Appelée une fois par NestJS, quand toute l'API est prête : on programme
  // la tâche répétée, puis on lance une première purge immédiatement.
  onApplicationBootstrap(): void {
    const minutes = Number(
      this.config.getOrThrow<string>('PURGE_INTERVAL_MINUTES'),
    );
    // Échouer tôt : une fréquence absurde (0, -5, « abc ») bloque le démarrage
    if (!Number.isInteger(minutes) || minutes < 1) {
      throw new Error('PURGE_INTERVAL_MINUTES doit être un entier ≥ 1');
    }
    const interval = setInterval(
      () => void this.purgeExpired(),
      minutes * ONE_MINUTE_MS,
    );
    this.schedulerRegistry.addInterval('purge-expired-files', interval);
    void this.purgeExpired();
  }

  // Supprime tous les fichiers expirés et renvoie leur nombre.
  async purgeExpired(): Promise<number> {
    // L'index sur expires_at (PERF.md) rend cette recherche rapide
    const expiredFiles = await this.filesRepository.find({
      where: { expiresAt: LessThanOrEqual(new Date()) },
      select: { id: true, storageName: true },
    });

    let purged = 0;
    for (const file of expiredFiles) {
      // Un échec sur un fichier n'arrête pas la purge des autres
      try {
        // Même ordre que la suppression manuelle (US06) : base, puis disque
        await this.filesRepository.delete({ id: file.id });
        await this.storageService.remove(file.storageName);
        purged++;
      } catch (error) {
        this.logger.error(`Purge du fichier ${file.id} impossible`, error);
      }
    }

    if (expiredFiles.length > 0) {
      this.logger.log(`Purge : ${purged} fichier(s) expiré(s) supprimé(s)`);
    }
    return purged;
  }
}
