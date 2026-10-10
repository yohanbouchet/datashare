// =============================================================================
// Fichier : purge.service.ts
// Rôle : Purge planifiée des fichiers expirés (US10), en deux temps :
//   1. dès qu'un fichier a expiré, il est effacé du DISQUE (son contenu
//      disparaît, la place est libérée) et marqué « purgé » (purged_at) ; sa
//      ligne reste dans l'historique (« Ce fichier a expiré, il n'est plus
//      stocké chez nous », maquette Mon espace) ;
//   2. après HISTORY_RETENTION_DAYS jours, la ligne est supprimée de la base
//      (tags compris, ON DELETE CASCADE) : conservation limitée (RGPD).
//   La purge s'exécute au démarrage de l'API (rattrapage si le serveur était
//   arrêté), puis toutes les PURGE_INTERVAL_MINUTES minutes.
// Utilise :
//   - file.entity.ts (FileEntity) via le Repository de TypeORM
//   - storage.service.ts (remove : suppression sur le disque)
//   - @nestjs/schedule (SchedulerRegistry : enregistre la tâche répétée, que
//     NestJS arrête proprement à l'arrêt de l'API)
//   - .env (PURGE_INTERVAL_MINUTES, HISTORY_RETENTION_DAYS) via ConfigService
// Utilisé par :
//   - files.module.ts (providers) ; démarrée automatiquement par NestJS
// =============================================================================
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { FileEntity } from './file.entity.js';
import { StorageService } from './storage.service.js';

const ONE_MINUTE_MS = 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Bilan d'une purge : fichiers effacés du disque, lignes supprimées de la base
export interface PurgeResult {
  filesErased: number;
  rowsDeleted: number;
}

@Injectable()
export class PurgeService implements OnApplicationBootstrap {
  // Journal de l'API : chaque purge y laisse une trace (bilan)
  private readonly logger = new Logger(PurgeService.name);
  // Réglages lus une fois, à la création du service
  private readonly intervalMinutes: number;
  private readonly retentionDays: number;

  constructor(
    @InjectRepository(FileEntity)
    private readonly filesRepository: Repository<FileEntity>,
    private readonly storageService: StorageService,
    private readonly schedulerRegistry: SchedulerRegistry,
    config: ConfigService,
  ) {
    this.intervalMinutes = readPositiveInteger(
      config,
      'PURGE_INTERVAL_MINUTES',
    );
    this.retentionDays = readPositiveInteger(config, 'HISTORY_RETENTION_DAYS');
  }

  // Appelée une fois par NestJS, quand toute l'API est prête : on programme
  // la tâche répétée, puis on lance une première purge immédiatement.
  onApplicationBootstrap(): void {
    const interval = setInterval(
      () => void this.purgeExpired(),
      this.intervalMinutes * ONE_MINUTE_MS,
    );
    this.schedulerRegistry.addInterval('purge-expired-files', interval);
    void this.purgeExpired();
  }

  async purgeExpired(): Promise<PurgeResult> {
    const now = new Date();

    // 1. Fichiers expirés encore sur le disque (purged_at vide) : effacés du
    //    disque, puis marqués. Cet ordre peut être rejoué sans risque : si le
    //    marquage échoue, la purge suivante refera l'effacement (« déjà
    //    absent » est accepté) puis le marquage.
    const toErase = await this.filesRepository.find({
      where: { expiresAt: LessThanOrEqual(now), purgedAt: IsNull() },
      select: { id: true, storageName: true },
    });
    let filesErased = 0;
    for (const file of toErase) {
      // Un échec sur un fichier n'arrête pas la purge des autres
      try {
        await this.storageService.remove(file.storageName);
        await this.filesRepository.update({ id: file.id }, { purgedAt: now });
        filesErased++;
      } catch (error) {
        this.logger.error(`Purge du fichier ${file.id} impossible`, error);
      }
    }

    // 2. Lignes dont le fichier a été effacé il y a plus de N jours :
    //    supprimées de la base (DELETE … WHERE purged_at <= limite)
    const limit = new Date(now.getTime() - this.retentionDays * ONE_DAY_MS);
    const result = await this.filesRepository.delete({
      purgedAt: LessThanOrEqual(limit),
    });
    const rowsDeleted = result.affected ?? 0;

    if (filesErased > 0 || rowsDeleted > 0) {
      this.logger.log(
        `Purge : ${filesErased} fichier(s) effacé(s) du disque, ` +
          `${rowsDeleted} ligne(s) supprimée(s) de l'historique`,
      );
    }
    return { filesErased, rowsDeleted };
  }
}

// Lit une variable d'environnement qui doit être un entier ≥ 1. Échouer tôt :
// une valeur absurde (0, -5, « abc ») empêche l'API de démarrer.
function readPositiveInteger(config: ConfigService, name: string): number {
  const value = Number(config.getOrThrow<string>(name));
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} doit être un entier ≥ 1`);
  }
  return value;
}
