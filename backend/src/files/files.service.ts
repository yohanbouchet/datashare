// =============================================================================
// Fichier : files.service.ts
// Rôle : Service des fichiers (logique métier) : téléversement (US01),
//   historique (US05) et suppression (US06). Lit la table files via le
//   Repository de TypeORM, filtre selon le statut (actifs / expirés / tous), et
//   construit une réponse sans aucune donnée sensible (l'empreinte du mot de
//   passe devient un simple booléen). Accueillera ensuite la purge planifiée.
// Utilise :
//   - file.entity.ts (FileEntity) : la table files (et sa relation tags)
//   - dto/list-files-query.dto.ts (type FileStatus), dto/upload-file.dto.ts
//     (UploadFileDto)
//   - auth/auth.service.ts (BCRYPT_ROUNDS) ; bcrypt (hachage du mot de passe du
//     fichier)
//   - node:crypto (randomBytes : jeton du lien de partage)
//   - storage.service.ts (StorageService) : suppression du fichier sur le
//     disque
//   - typeorm : Repository, MoreThan, LessThanOrEqual (requêtes paramétrées,
//     sans SQL écrit à la main)
// Utilisé par :
//   - files.controller.ts (create, findForUser, remove)
// =============================================================================
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  LessThanOrEqual,
  MoreThan,
  Repository,
  type FindOptionsWhere,
} from 'typeorm';
import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { BCRYPT_ROUNDS } from '../auth/auth.service.js';
import type { FileStatus } from './dto/list-files-query.dto.js';
import { UploadFileDto } from './dto/upload-file.dto.js';
import { FileEntity } from './file.entity.js';
import { StorageService } from './storage.service.js';

// Plus grand entier d'une colonne integer PostgreSQL (2^31 - 1) : au-delà, la
// requête planterait (500)
const MAX_ID = 2_147_483_647;
// Une journée en millisecondes (les dates JavaScript se calculent en
// millisecondes)
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Forme d'une ligne de l'historique renvoyée au front (contrat d'interface, §
// 4.2)
export interface FileHistoryItem {
  id: number;
  originalName: string;
  size: number;
  createdAt: Date;
  expiresAt: Date;
  isExpired: boolean;
  isProtected: boolean;
  tags: string[];
  token: string;
}

// Réponse du téléversement (contrat d'interface, § 4.1) : une ligne
// d'historique + le type du fichier
export interface UploadedFileResponse extends FileHistoryItem {
  mimeType: string;
}

@Injectable()
export class FilesService {
  // @InjectRepository : NestJS fournit « l'archiviste » de la table files ;
  // StorageService : le « magasinier »
  constructor(
    @InjectRepository(FileEntity)
    private readonly filesRepository: Repository<FileEntity>,
    private readonly storageService: StorageService,
  ) {}

  // Téléversement (US01) : le fichier est déjà sur le disque (multer) ; on
  // l'enregistre en base.
  // En cas d'erreur, upload-exception.filter.ts efface le fichier du disque.
  async create(
    userId: number,
    file: Express.Multer.File,
    dto: UploadFileDto,
  ): Promise<UploadedFileResponse> {
    // La colonne original_name accepte 255 caractères : au-delà, 400 plutôt
    // qu'une erreur 500
    if (file.originalname.length > 255) {
      throw new BadRequestException(
        'Le nom du fichier ne doit pas dépasser 255 caractères',
      );
    }

    // 🔒 Mot de passe facultatif : seule son empreinte bcrypt est stockée (même
    // coût que les comptes)
    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, BCRYPT_ROUNDS)
      : null;

    // create prépare l'objet, save l'enregistre (INSERT) avec ses tags
    // (cascade: true sur la relation)
    const saved = await this.filesRepository.save(
      this.filesRepository.create({
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        // Nom aléatoire choisi par storage.service.ts au moment de l'écriture
        // sur le disque
        storageName: file.filename,
        // 🔒 Jeton du lien de partage : 32 octets aléatoires (256 bits),
        // impossible à deviner, sans rapport avec l'id ; base64url = caractères
        // sans risque dans une adresse
        token: randomBytes(32).toString('base64url'),
        passwordHash,
        expiresAt: new Date(Date.now() + dto.expiresInDays * ONE_DAY_MS),
        userId,
        tags: dto.tags.map((label) => ({ label })),
      }),
    );

    // 🔒 Réponse construite champ par champ : jamais l'empreinte ni le nom de
    // stockage
    return {
      id: saved.id,
      originalName: saved.originalName,
      size: saved.size,
      mimeType: saved.mimeType,
      createdAt: saved.createdAt,
      expiresAt: saved.expiresAt,
      isExpired: false,
      isProtected: passwordHash !== null,
      tags: dto.tags,
      token: saved.token,
    };
  }

  async findForUser(
    userId: number,
    status: FileStatus,
  ): Promise<FileHistoryItem[]> {
    // Une seule date de référence pour le filtre ET le calcul de isExpired
    // (résultats cohérents)
    const now = new Date();
    // 🔒 Condition TOUJOURS présente : uniquement les fichiers de cet
    // utilisateur (identifiant tiré du jeton)
    const where: FindOptionsWhere<FileEntity> = { userId };
    // Actif : expire APRÈS maintenant ; expiré : expire AVANT ou MAINTENANT ;
    // all : pas de condition de date
    if (status === 'active') where.expiresAt = MoreThan(now);
    if (status === 'expired') where.expiresAt = LessThanOrEqual(now);

    // find : SELECT généré par TypeORM. relations : charge aussi les tags de
    // chaque fichier.
    // select : liste explicite des colonnes ; passwordHash (select: false par
    // défaut) est demandé ICI uniquement pour savoir si le fichier est protégé.
    const files = await this.filesRepository.find({
      where,
      relations: { tags: true },
      select: {
        id: true,
        originalName: true,
        size: true,
        createdAt: true,
        expiresAt: true,
        token: true,
        passwordHash: true,
        tags: { id: true, label: true },
      },
      // Les plus récents en premier
      order: { createdAt: 'DESC' },
    });

    // map : transforme chaque fichier en ligne d'historique.
    // 🔒 isProtected : l'empreinte devient true/false et ne sort jamais du
    // service.
    // isExpired : calculé à la volée (le statut n'est jamais stocké, règle RG4
    // du MCD).
    return files.map((file) => ({
      id: file.id,
      originalName: file.originalName,
      size: file.size,
      createdAt: file.createdAt,
      expiresAt: file.expiresAt,
      isExpired: file.expiresAt <= now,
      isProtected: file.passwordHash !== null,
      tags: file.tags.map((t) => t.label),
      token: file.token,
    }));
  }

  // Suppression d'un fichier (US06) : 404 s'il n'existe pas ou appartient à un
  // autre, sinon base puis disque.
  async remove(userId: number, id: number): Promise<void> {
    // Numéro impossible (≤ 0 ou au-delà d'un integer) : 404 sans interroger la
    // base
    if (id < 1 || id > MAX_ID) {
      throw new NotFoundException('Fichier introuvable');
    }
    // 🔒 Recherche par numéro ET propriétaire : le fichier d'un autre est
    // introuvable.
    // Même réponse 404 dans les deux cas : on ne révèle même pas son existence.
    const file = await this.filesRepository.findOne({
      where: { id, userId },
      select: { id: true, storageName: true },
    });
    if (!file) {
      throw new NotFoundException('Fichier introuvable');
    }

    // Ordre voulu : la ligne en base d'abord (ses tags partent avec, ON DELETE
    // CASCADE), puis le disque.
    // En cas de panne entre les deux, il reste au pire un fichier orphelin,
    // jamais une ligne vers un fichier absent.
    await this.filesRepository.delete({ id: file.id });
    await this.storageService.remove(file.storageName);
  }
}
