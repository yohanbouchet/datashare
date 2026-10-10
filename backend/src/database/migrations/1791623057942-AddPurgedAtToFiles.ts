// =============================================================================
// Fichier : 1791623057942-AddPurgedAtToFiles.ts
// Rôle : Migration n°3 : ajoute à la table « files » la colonne « purged_at »
//   (générée par npm run migration:generate, puis relue). Elle mémorise la
//   date à laquelle la purge a effacé le fichier du disque : la ligne reste
//   alors dans l'historique pendant HISTORY_RETENTION_DAYS jours (purge en
//   deux temps, US10). Colonne facultative (NULL) : les lignes existantes ne
//   sont pas modifiées.
// Utilise :
//   - typeorm (QueryRunner) : exécute le SQL
// Utilisé par :
//   - database/data-source.ts (liste des migrations)
//   - npm run migration:run / migration:revert
// =============================================================================
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPurgedAtToFiles1791623057942 implements MigrationInterface {
  // Nom enregistré dans la table "migrations" une fois appliquée
  name = 'AddPurgedAtToFiles1791623057942';

  // up : ajoute la colonne (date avec fuseau horaire, vide par défaut)
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "files" ADD "purged_at" TIMESTAMP WITH TIME ZONE`,
    );
  }

  // down : retour arrière (npm run migration:revert), supprime la colonne
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "files" DROP COLUMN "purged_at"`);
  }
}
