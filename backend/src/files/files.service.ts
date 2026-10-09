// ================================================================================================
// Fichier : files.service.ts
// Rôle : Service des fichiers (logique métier) : historique d'un utilisateur (US05) et suppression (US06).
//   Lit la table files via le Repository de TypeORM, filtre selon le statut (actifs / expirés / tous),
//   et construit une réponse sans aucune donnée sensible (l'empreinte du mot de passe devient un simple booléen).
//   Accueillera ensuite le téléversement (US01) et la purge planifiée.
// Utilise :
//   - file.entity.ts (FileEntity) : la table files (et sa relation tags)
//   - dto/list-files-query.dto.ts (type StatutFichier)
//   - storage.service.ts (StorageService) : suppression du fichier sur le disque
//   - typeorm : Repository, MoreThan, LessThanOrEqual (requêtes paramétrées, sans SQL écrit à la main)
// Utilisé par :
//   - files.controller.ts (findForUser, remove)
// ================================================================================================
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  LessThanOrEqual,
  MoreThan,
  Repository,
  type FindOptionsWhere,
} from 'typeorm';
import type { StatutFichier } from './dto/list-files-query.dto.js';
import { FileEntity } from './file.entity.js';
import { StorageService } from './storage.service.js';

// Plus grand entier d'une colonne integer PostgreSQL (2^31 - 1) : au-delà, la requête planterait (500)
const ID_MAX = 2_147_483_647;

// Forme d'une ligne de l'historique renvoyée au front (contrat d'interface, § 4.2)
export interface FichierHistorique {
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

@Injectable()
export class FilesService {
  // @InjectRepository : NestJS fournit « l'archiviste » de la table files ; StorageService : le « magasinier »
  constructor(
    @InjectRepository(FileEntity)
    private readonly filesRepository: Repository<FileEntity>,
    private readonly storageService: StorageService,
  ) {}

  async findForUser(
    userId: number,
    status: StatutFichier,
  ): Promise<FichierHistorique[]> {
    // Une seule date de référence pour le filtre ET le calcul de isExpired (résultats cohérents)
    const maintenant = new Date();
    // 🔒 Condition TOUJOURS présente : uniquement les fichiers de cet utilisateur (identifiant tiré du jeton)
    const where: FindOptionsWhere<FileEntity> = { userId };
    // Actif : expire APRÈS maintenant ; expiré : expire AVANT ou MAINTENANT ; all : pas de condition de date
    if (status === 'active') where.expiresAt = MoreThan(maintenant);
    if (status === 'expired') where.expiresAt = LessThanOrEqual(maintenant);

    // find : SELECT généré par TypeORM. relations : charge aussi les tags de chaque fichier.
    // select : liste explicite des colonnes ; passwordHash (select: false par défaut) est demandé ICI
    // uniquement pour savoir si le fichier est protégé.
    const fichiers = await this.filesRepository.find({
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
    // 🔒 isProtected : l'empreinte devient true/false et ne sort jamais du service.
    // isExpired : calculé à la volée (le statut n'est jamais stocké, règle RG4 du MCD).
    return fichiers.map((f) => ({
      id: f.id,
      originalName: f.originalName,
      size: f.size,
      createdAt: f.createdAt,
      expiresAt: f.expiresAt,
      isExpired: f.expiresAt <= maintenant,
      isProtected: f.passwordHash !== null,
      tags: f.tags.map((t) => t.label),
      token: f.token,
    }));
  }

  // Suppression d'un fichier (US06) : 404 s'il n'existe pas ou appartient à un autre, sinon base puis disque.
  async remove(userId: number, id: number): Promise<void> {
    // Numéro impossible (≤ 0 ou au-delà d'un integer) : 404 sans interroger la base
    if (id < 1 || id > ID_MAX) {
      throw new NotFoundException('Fichier introuvable');
    }
    // 🔒 Recherche par numéro ET propriétaire : le fichier d'un autre est introuvable.
    // Même réponse 404 dans les deux cas : on ne révèle même pas son existence.
    const fichier = await this.filesRepository.findOne({
      where: { id, userId },
      select: { id: true, storageName: true },
    });
    if (!fichier) {
      throw new NotFoundException('Fichier introuvable');
    }

    // Ordre voulu : la ligne en base d'abord (ses tags partent avec, ON DELETE CASCADE), puis le disque.
    // En cas de panne entre les deux, il reste au pire un fichier orphelin, jamais une ligne vers un fichier absent.
    await this.filesRepository.delete({ id: fichier.id });
    await this.storageService.remove(fichier.storageName);
  }
}
