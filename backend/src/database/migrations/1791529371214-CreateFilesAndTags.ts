// ================================================================================================
// Fichier : 1791529371214-CreateFilesAndTags.ts
// Rôle : Migration n°2 : création des tables « files » et « tags » (générée par npm run migration:generate,
//   relue avant application). Crée aussi l'index sur expires_at et les deux clés étrangères.
// Utilise :
//   - typeorm (QueryRunner) : exécute le SQL
// Utilisé par :
//   - database/data-source.ts (liste des migrations) ; npm run migration:run / migration:revert
// ================================================================================================
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFilesAndTags1791529371214 implements MigrationInterface {
  name = 'CreateFilesAndTags1791529371214';

  // up : appliquée par « npm run migration:run ». Ordre : tables, index, puis clés étrangères
  // (une clé étrangère ne peut viser qu'une table qui existe déjà).
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "tags" ("id" SERIAL NOT NULL, "label" character varying(30) NOT NULL, "file_id" integer NOT NULL, CONSTRAINT "UQ_0cd72a2d043ff1a21312867fd34" UNIQUE ("file_id", "label"), CONSTRAINT "PK_e7dc17249a1148a1970748eda99" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "files" ("id" SERIAL NOT NULL, "original_name" character varying(255) NOT NULL, "size" bigint NOT NULL, "mime_type" character varying(255) NOT NULL, "storage_name" character varying(64) NOT NULL, "token" character varying(64) NOT NULL, "password_hash" character varying(255), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "user_id" integer NOT NULL, CONSTRAINT "UQ_611dcae2ecc1969d0566daef643" UNIQUE ("storage_name"), CONSTRAINT "UQ_7c7b95b0da1d6a523dd122905b1" UNIQUE ("token"), CONSTRAINT "PK_6c16b9093a142e0e7613b04a3d9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c3351d130d1f6a1ec0f694f0d2" ON "files"  ("expires_at") `,
    );
    await queryRunner.query(
      `ALTER TABLE "tags" ADD CONSTRAINT "FK_62fc3280f46325a567b1918ae4b" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "files" ADD CONSTRAINT "FK_a7435dbb7583938d5e7d1376041" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  // down : « npm run migration:revert ». Ordre inverse : on retire d'abord les clés étrangères.
  // ⚠️ Supprime les tables, donc tous les fichiers enregistrés et leurs tags.
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "files" DROP CONSTRAINT "FK_a7435dbb7583938d5e7d1376041"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tags" DROP CONSTRAINT "FK_62fc3280f46325a567b1918ae4b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c3351d130d1f6a1ec0f694f0d2"`,
    );
    await queryRunner.query(`DROP TABLE "files"`);
    await queryRunner.query(`DROP TABLE "tags"`);
  }
}
