// ================================================================================================
// Fichier : 1791355761850-CreateUsers.ts
// Rôle : Migration n°1 : création de la table « users » (générée par npm run migration:generate, puis relue).
//   Une migration = une modification de la structure de la base, versionnée dans Git et rejouable.
//   Le nombre dans le nom est sa date de création (horodatage) : il fixe l'ordre d'exécution.
// Utilise :
//   - typeorm (QueryRunner) : exécute le SQL
// Utilisé par :
//   - database/data-source.ts (liste des migrations)
//   - npm run migration:run / migration:revert
// ================================================================================================
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsers1791355761850 implements MigrationInterface {
  // Nom enregistré dans la table "migrations" une fois appliquée : TypeORM ne la rejouera jamais deux fois.
  name = 'CreateUsers1791355761850';

  // up : ce qui est exécuté par "npm run migration:run" (on avance d'une version).
  public async up(queryRunner: QueryRunner): Promise<void> {
    // SERIAL : numéro auto-incrémenté (1, 2, 3…). NOT NULL : la colonne ne peut pas rester vide.
    // 🔒 CONSTRAINT … UNIQUE ("email") : la base elle-même refuse deux comptes avec le même email.
    // PRIMARY KEY ("id") : l'identifiant unique de chaque ligne.
    await queryRunner.query(
      `CREATE TABLE "users" ("id" SERIAL NOT NULL, "email" character varying(255) NOT NULL, "password_hash" character varying(255) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
  }

  // down : ce qui est exécuté par "npm run migration:revert" (retour arrière d'une version).
  // ⚠️ Supprimer la table efface aussi tous les comptes : à n'utiliser qu'en connaissance de cause.
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
