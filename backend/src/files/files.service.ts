// ================================================================================================
// Fichier : files.service.ts
// Rôle : Service des fichiers (logique métier) : pour l'instant, l'historique d'un utilisateur (US05).
//   Lit la table files via le Repository de TypeORM, filtre selon le statut (actifs / expirés / tous),
//   et construit une réponse sans aucune donnée sensible (l'empreinte du mot de passe devient un simple booléen).
//   Accueillera ensuite la suppression (US06) et la purge planifiée.
// Utilise :
//   - file.entity.ts (FileEntity) : la table files (et sa relation tags)
//   - dto/list-files-query.dto.ts (type StatutFichier)
//   - typeorm : Repository, MoreThan, LessThanOrEqual (requêtes paramétrées, sans SQL écrit à la main)
// Utilisé par :
//   - files.controller.ts (findForUser)
// ================================================================================================
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  LessThanOrEqual,
  MoreThan,
  Repository,
  type FindOptionsWhere,
} from 'typeorm';
import type { StatutFichier } from './dto/list-files-query.dto.js';
import { FileEntity } from './file.entity.js';

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
  // @InjectRepository : NestJS fournit « l'archiviste » de la table files
  constructor(
    @InjectRepository(FileEntity)
    private readonly filesRepository: Repository<FileEntity>,
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
}
