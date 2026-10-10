// =============================================================================
// Fichier : download.service.ts
// Rôle : Service du téléchargement public (US02). Retrouve un fichier grâce au
//   jeton de son lien, vérifie qu'il n'a pas expiré et, s'il est protégé, que
//   le mot de passe est correct ; ouvre ensuite le fichier en flux.
//   Aucune connexion n'est demandée : le jeton aléatoire du lien suffit.
// Utilise :
//   - file.entity.ts (FileEntity) via le Repository de TypeORM
//   - storage.service.ts (openStream : lecture du fichier sur le disque)
//   - bcrypt (compare : vérification du mot de passe du fichier)
// Utilisé par :
//   - download.controller.ts (getInfo, verify, open)
// =============================================================================
import {
  GoneException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import type { ReadStream } from 'node:fs';
import { Repository } from 'typeorm';
import { FileEntity } from './file.entity.js';
import { StorageService } from './storage.service.js';

// Informations affichées avant le téléchargement (contrat d'interface, § 5.1)
export interface DownloadInfo {
  originalName: string;
  size: number;
  mimeType: string;
  expiresAt: Date;
  isProtected: boolean;
}

// Fichier prêt à être envoyé : ses informations + son contenu en flux
export interface OpenedFile {
  file: FileEntity;
  stream: ReadStream;
}

// Même message pour un jeton inconnu et un fichier introuvable sur le disque
const INVALID_LINK = 'Ce lien est invalide ou a expiré';

@Injectable()
export class DownloadService {
  // L'archiviste de la table files et le magasinier
  constructor(
    @InjectRepository(FileEntity)
    private readonly filesRepository: Repository<FileEntity>,
    private readonly storageService: StorageService,
  ) {}

  // GET /api/download/:token : ce que la page affiche avant le téléchargement.
  // 🔒 Ni l'empreinte, ni le nom de stockage, ni le propriétaire : seulement
  // ce dont le destinataire a besoin (isProtected à la place de l'empreinte).
  async getInfo(token: string): Promise<DownloadInfo> {
    const file = await this.findValidFile(token);
    return {
      originalName: file.originalName,
      size: file.size,
      mimeType: file.mimeType,
      expiresAt: file.expiresAt,
      isProtected: file.passwordHash !== null,
    };
  }

  // POST /api/download/:token/verify : le mot de passe est-il correct ?
  // (confort du front : prévenir l'utilisateur sans lancer de téléchargement)
  async verify(token: string, password: string): Promise<void> {
    const file = await this.findValidFile(token);
    await this.checkPassword(file, password);
  }

  // POST /api/download/:token : 🔒 le mot de passe est revérifié ici, car
  // n'importe qui peut appeler cette route directement, sans passer par verify.
  async open(token: string, password?: string): Promise<OpenedFile> {
    const file = await this.findValidFile(token);
    await this.checkPassword(file, password);
    const stream = await this.storageService.openStream(file.storageName);
    if (!stream) {
      throw new NotFoundException(INVALID_LINK);
    }
    return { file, stream };
  }

  // Retrouve le fichier du lien : jeton inconnu → 404 ; date dépassée → 410.
  // Le statut « expiré » se calcule (règle RG4) : il est exact même si la
  // purge n'est pas encore passée.
  private async findValidFile(token: string): Promise<FileEntity> {
    const file = await this.filesRepository.findOne({
      where: { token },
      // passwordHash est en select: false : on le demande explicitement,
      // uniquement pour vérifier le mot de passe (il ne sort jamais d'ici)
      select: {
        id: true,
        originalName: true,
        size: true,
        mimeType: true,
        expiresAt: true,
        storageName: true,
        passwordHash: true,
      },
    });
    if (!file) {
      throw new NotFoundException(INVALID_LINK);
    }
    if (file.expiresAt <= new Date()) {
      throw new GoneException(
        "Ce fichier n'est plus disponible en téléchargement car il a expiré.",
      );
    }
    return file;
  }

  // Fichier non protégé : rien à vérifier. Protégé : mot de passe absent ou
  // faux → 401. bcrypt.compare hache le mot de passe reçu avec le sel stocké
  // dans l'empreinte et compare les deux résultats.
  private async checkPassword(
    file: FileEntity,
    password?: string,
  ): Promise<void> {
    if (file.passwordHash === null) {
      return;
    }
    const isValid =
      password !== undefined &&
      (await bcrypt.compare(password, file.passwordHash));
    if (!isValid) {
      throw new UnauthorizedException('Mot de passe incorrect');
    }
  }
}
