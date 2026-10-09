// ================================================================================================
// Fichier : storage.service.ts
// Rôle : Service de stockage (le « magasinier ») : SEULE pièce de l'API qui décide où et comment
//   les fichiers sont rangés sur le disque. Passer à AWS S3 ne changerait que ce fichier.
//   - US01 : fournit à multer (réception des fichiers envoyés) ses réglages : dossier, nom généré,
//     taille maximale, extensions interdites (createMulterOptions).
//   - US06 : supprime un fichier du disque (remove).
//   La lecture (US02) viendra s'ajouter ici.
// Utilise :
//   - .env (UPLOAD_DIR, FORBIDDEN_EXTENSIONS) via ConfigService
//   - multer (diskStorage : écriture du fichier sur le disque au fil de la réception)
//   - node:crypto (randomBytes : nom de stockage aléatoire), node:fs/promises (unlink), node:path (chemins)
// Utilisé par :
//   - files.module.ts (providers + MulterModule.registerAsync), files.service.ts (remove),
//     upload-exception.filter.ts (remove), request-size.guard.ts (MAX_FILE_SIZE)
// ================================================================================================
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  MulterModuleOptions,
  MulterOptionsFactory,
} from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomBytes } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';

// Taille maximale d'un fichier (US01) : 1 Go = 1024 × 1024 × 1024 octets
export const MAX_FILE_SIZE = 1024 ** 3;
export const MAX_FILE_SIZE_MESSAGE =
  'La taille des fichiers est limitée à 1 Go';

// implements MulterOptionsFactory : le magasinier sait fabriquer les réglages de multer
// (NestJS appelle createMulterOptions au démarrage, voir files.module.ts)
@Injectable()
export class StorageService implements MulterOptionsFactory {
  // Chemin complet du dossier de stockage, calculé une fois au démarrage
  private readonly directory: string;
  // Extensions refusées, en minuscules (ex. ['.exe', '.sh'])
  private readonly forbiddenExtensions: string[];

  // resolve : chemin relatif (uploads) → chemin complet ; getOrThrow : l'API refuse de démarrer sans ces variables
  constructor(config: ConfigService) {
    this.directory = resolve(config.getOrThrow<string>('UPLOAD_DIR'));
    this.forbiddenExtensions = config
      .getOrThrow<string>('FORBIDDEN_EXTENSIONS')
      .split(',')
      .map((extension) => extension.trim().toLowerCase())
      .filter((extension) => extension !== '');
  }

  // Réglages de multer pour la réception d'un fichier (US01)
  createMulterOptions(): MulterModuleOptions {
    return {
      // diskStorage : le fichier est écrit sur le disque AU FIL de la réception (jamais 1 Go en mémoire)
      storage: diskStorage({
        // multer crée le dossier s'il n'existe pas
        destination: this.directory,
        // 🔒 Nom de stockage aléatoire (32 octets = 64 caractères hexadécimaux), jamais le nom d'origine :
        // pas de doublon, pas d'attaque par chemin (« ../ »), pas de nom devinable
        filename: (_request, _file, callback) =>
          callback(null, randomBytes(32).toString('hex')),
      }),
      limits: {
        // 🔒 Réception interrompue dès que le fichier dépasse 1 Go (413) ; multer efface alors le morceau reçu
        fileSize: MAX_FILE_SIZE,
        // Un seul fichier par envoi, et peu de champs texte (durée, mot de passe, tags)
        files: 1,
        fields: 20,
      },
      // Noms de fichiers accentués (é, ç…) correctement lus (sinon multer les lit en latin1)
      defParamCharset: 'utf8',
      // 🔒 Extensions interdites refusées AVANT d'écrire quoi que ce soit sur le disque (400)
      fileFilter: (_request, file, callback) => {
        const extension = extname(file.originalname).toLowerCase();
        if (this.forbiddenExtensions.includes(extension)) {
          callback(
            new BadRequestException("Ce type de fichier n'est pas autorisé"),
            false,
          );
          return;
        }
        callback(null, true);
      },
    };
  }

  // Chemin complet d'un fichier stocké, utilisé par toutes les méthodes du magasinier.
  // 🔒 Défense en profondeur contre la traversée de chemin : un nom contenant « ../ » ou « / » est refusé
  // (normalement impossible : le nom est généré par l'API, jamais choisi par l'utilisateur).
  private pathOf(storageName: string): string {
    if (basename(storageName) !== storageName) {
      throw new Error('Nom de stockage invalide');
    }
    return join(this.directory, storageName);
  }

  // Supprime un fichier du disque (unlink = appel système qui retire le fichier, comme rm).
  // Fichier déjà absent (ENOENT) : le but est atteint, on ne fait rien ; toute autre erreur remonte.
  async remove(storageName: string): Promise<void> {
    try {
      await unlink(this.pathOf(storageName));
    } catch (error) {
      if ((error as { code?: string }).code !== 'ENOENT') {
        throw error;
      }
    }
  }
}
