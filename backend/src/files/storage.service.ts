// ================================================================================================
// Fichier : storage.service.ts
// Rôle : Service de stockage (le « magasinier ») : SEULE pièce de l'API qui touche au disque.
//   Les autres services lui donnent un nom de stockage, il s'occupe du reste (dossier, chemin, système de fichiers).
//   Passer à AWS S3 ne changerait que ce fichier. Pour l'instant : suppression (US06) ;
//   l'enregistrement (US01) et la lecture (US02) viendront s'ajouter ici.
// Utilise :
//   - .env (UPLOAD_DIR) via ConfigService : dossier de stockage
//   - node:fs/promises (unlink : suppression d'un fichier), node:path (construction des chemins)
// Utilisé par :
//   - files.service.ts (remove) ; déclaré dans files.module.ts (providers)
// ================================================================================================
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { unlink } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

@Injectable()
export class StorageService {
  // Chemin complet du dossier de stockage, calculé une fois au démarrage
  private readonly dossier: string;

  // resolve : chemin relatif (uploads) → chemin complet ; getOrThrow : l'API refuse de démarrer sans UPLOAD_DIR
  constructor(config: ConfigService) {
    this.dossier = resolve(config.getOrThrow<string>('UPLOAD_DIR'));
  }

  // Chemin complet d'un fichier stocké, utilisé par toutes les méthodes du magasinier.
  // 🔒 Défense en profondeur contre la traversée de chemin : un nom contenant « ../ » ou « / » est refusé
  // (normalement impossible : le nom est généré par l'API, jamais choisi par l'utilisateur).
  private chemin(storageName: string): string {
    if (basename(storageName) !== storageName) {
      throw new Error('Nom de stockage invalide');
    }
    return join(this.dossier, storageName);
  }

  // Supprime un fichier du disque (unlink = appel système qui retire le fichier, comme rm).
  // Fichier déjà absent (ENOENT) : le but est atteint, on ne fait rien ; toute autre erreur remonte.
  async remove(storageName: string): Promise<void> {
    try {
      await unlink(this.chemin(storageName));
    } catch (erreur) {
      if ((erreur as { code?: string }).code !== 'ENOENT') {
        throw erreur;
      }
    }
  }
}
