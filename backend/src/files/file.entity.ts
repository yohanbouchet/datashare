// =============================================================================
// Fichier : file.entity.ts
// Rôle : Entité FileEntity : la table « files » (entité FICHIER du MCD). Un
//   enregistrement = un fichier déposé : nom d'origine, taille, type, nom de
//   stockage sur le disque, jeton du lien de partage, mot de passe facultatif
//   (empreinte), dates d'envoi et d'expiration, propriétaire. Nom « FileEntity
//   » et non « File » : File existe déjà en JavaScript (fichier envoyé par un
//   formulaire).
// Utilise :
//   - typeorm (décorateurs, type Relation)
//   - users/user.entity.ts (User) : le propriétaire (association POSSÉDER du
//     MCD)
//   - tag.entity.ts (Tag) : les tags du fichier (association ÉTIQUETER du MCD)
// Utilisé par :
//   - files.module.ts (forFeature), database/data-source.ts (migrations)
//   - plus tard : les services des US01 (upload), US02 (téléchargement), US05
//     (historique), US06 (suppression)
// =============================================================================
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { User } from '../users/user.entity.js';
import { Tag } from './tag.entity.js';

// @Entity : cette classe décrit la table « files »
@Entity({ name: 'files' })
export class FileEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  // Nom d'origine, affiché à l'utilisateur (jamais utilisé pour écrire sur le
  // disque)
  @Column({ name: 'original_name', type: 'varchar', length: 255 })
  originalName!: string;

  // Taille en octets. bigint : nombres très grands. PostgreSQL renvoie un
  // bigint sous forme de TEXTE, le transformer le reconvertit en nombre à la
  // lecture (from) et le laisse tel quel à l'écriture (to).
  @Column({
    type: 'bigint',
    transformer: { to: (v: number) => v, from: (v: string) => Number(v) },
  })
  size!: number;

  // Type du fichier (ex. image/jpeg), affiché avant téléchargement (US02)
  @Column({ name: 'mime_type', type: 'varchar', length: 255 })
  mimeType!: string;

  // 🔒 Nom GÉNÉRÉ sous lequel le fichier est rangé sur le disque : jamais le nom
  // d'origine (évite les doublons et les attaques par chemin « ../ »). Unique.
  @Column({ name: 'storage_name', type: 'varchar', length: 64, unique: true })
  storageName!: string;

  // 🔒 Jeton du lien de partage : long, aléatoire, unique, distinct de l'id (non
  // prédictible, US02)
  @Column({ type: 'varchar', length: 64, unique: true })
  token!: string;

  // 🔒 Empreinte du mot de passe du fichier (bcrypt) ; nullable : le mot de
  // passe est facultatif.
  // select: false : jamais lue par défaut (comme pour les comptes), demandée
  // seulement pour la vérifier.
  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    nullable: true,
    select: false,
  })
  passwordHash!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  // ⚙️ Index : la purge planifiée retrouve vite les fichiers expirés, même s'il
  // y en a beaucoup.
  // Le statut « expiré » n'est pas stocké : il se calcule en comparant
  // expires_at à la date du jour.
  @Index()
  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  // Propriétaire : PLUSIEURS fichiers → UN utilisateur (cardinalité 1,1 côté
  // fichier dans le MCD).
  // 🔒 Clé étrangère user_id : un fichier appartient forcément à un compte
  // existant.
  // onDelete CASCADE : si un compte est supprimé, ses fichiers le sont aussi
  // (pas de fichier orphelin).
  // Relation<…> : indispensable en ESM quand deux entités s'importent
  // mutuellement (sinon plantage au démarrage).
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<User>;

  // Accès direct à l'identifiant du propriétaire, sans charger tout
  // l'utilisateur (utile pour vérifier « ce fichier est-il à moi ? »)
  @Column({ name: 'user_id' })
  userId!: number;

  // Tags : UN fichier → PLUSIEURS tags (0,n). cascade: true : les tags sont
  // enregistrés en même temps que le fichier.
  @OneToMany(() => Tag, (tag) => tag.file, { cascade: true })
  tags!: Relation<Tag[]>;
}
