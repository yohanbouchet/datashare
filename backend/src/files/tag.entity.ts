// ================================================================================================
// Fichier : tag.entity.ts
// Rôle : Entité Tag : la table « tags » (entité TAG du MCD, option B : chaque tag appartient à UN fichier).
//   Libellé libre de 30 caractères maximum (US08), sans doublon pour un même fichier.
// Utilise :
//   - typeorm (décorateurs, type Relation)
//   - file.entity.ts (FileEntity) : le fichier étiqueté
// Utilisé par :
//   - file.entity.ts (relation tags), files.module.ts (forFeature), database/data-source.ts (migrations)
// ================================================================================================
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  type Relation,
} from 'typeorm';
import { FileEntity } from './file.entity.js';

@Entity({ name: 'tags' })
// 🔒 Contrainte UNIQUE sur (fichier, libellé) : la base elle-même refuse un tag en double sur un même fichier
@Unique(['file', 'label'])
export class Tag {
  @PrimaryGeneratedColumn()
  id!: number;

  // Libellé : texte libre, 30 caractères maximum (règle de l'US08)
  @Column({ type: 'varchar', length: 30 })
  label!: string;

  // PLUSIEURS tags → UN fichier (cardinalité 1,1 côté tag). Clé étrangère file_id.
  // onDelete CASCADE : supprimer un fichier supprime ses tags (règle RG8 du MCD), garanti par la base.
  @ManyToOne(() => FileEntity, (file) => file.tags, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'file_id' })
  file!: Relation<FileEntity>;
}
