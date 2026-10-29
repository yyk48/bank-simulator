import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import type { Relation } from 'typeorm';

import { AccountHolder } from '../../banking/entities/account-holder.entity.js';

export type BankUserStatus = 'ACTIVE' | 'DISABLED';

@Entity({
  name: 'bank_users',
  schema: 'public',
})
@Unique('bank_users_username_unique', ['username'])
@Index('bank_users_holder_idx', ['accountHolderId'])
@Check(
  'bank_users_username_check',
  `"username" <> ''
   AND "username" = lower(btrim("username"))
   AND "username" !~ '[[:space:]]'`,
)
@Check('bank_users_password_hash_check', `length(btrim("password_hash")) > 0`)
@Check('bank_users_status_check', `"status" IN ('ACTIVE', 'DISABLED')`)
export class BankUser {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'account_holder_id', type: 'uuid' })
  accountHolderId!: string;

  @Column({ type: 'varchar', length: 100 })
  username!: string;

  @Column({
    name: 'password_hash',
    type: 'text',
    select: false,
  })
  passwordHash!: string;

  @Column({ type: 'text', default: 'ACTIVE' })
  status!: BankUserStatus;

  @ManyToOne(() => AccountHolder, {
    nullable: false,
    onDelete: 'RESTRICT',
    cascade: false,
    eager: false,
  })
  @JoinColumn({
    name: 'account_holder_id',
    foreignKeyConstraintName: 'bank_users_holder_fk',
  })
  accountHolder?: Relation<AccountHolder>;
}
