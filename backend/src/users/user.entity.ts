// Entité User : la description de la table "users" en TypeScript (issue du MCD : entité UTILISATEUR).
// TypeORM lit cette classe pour savoir quelles colonnes existent et comment les lire / écrire.
// Les "décorateurs" (@Entity, @Column…) sont des étiquettes posées sur la classe et ses propriétés.
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

// @Entity : cette classe décrit une table. Nom "users" car "user" est un mot réservé en PostgreSQL.
@Entity({ name: 'users' })
export class User {
  // Clé primaire : numéro interne généré automatiquement par la base (1, 2, 3…)
  // Le "!" dit à TypeScript (mode strict) : « cette valeur sera remplie par TypeORM, pas par moi ».
  @PrimaryGeneratedColumn()
  id!: number;

  // 🔒 unique: true crée une contrainte UNIQUE en base : même si deux inscriptions arrivent
  // en même temps, la base refusera le doublon (le contrôle dans le code seul ne suffit pas).
  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  // 🔒 On stocke uniquement l'empreinte (bcrypt), jamais le mot de passe.
  // 🔒 select: false : cette colonne n'est PAS lue par défaut, on ne peut donc pas
  // la renvoyer par erreur dans une réponse de l'API. Il faudra la demander explicitement à la connexion.
  // name: 'password_hash' : nom de la colonne en base (convention SQL), passwordHash dans le code (convention TS).
  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    select: false,
  })
  passwordHash!: string;

  // Date de création remplie automatiquement par la base, avec fuseau horaire (timestamptz)
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
