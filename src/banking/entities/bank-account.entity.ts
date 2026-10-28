import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import type { Relation } from 'typeorm';

import { AccountHolder } from './account-holder.entity.js';
import { Branch } from './branch.entity.js';

import type {
  AccountType,
  AccountPurpose,
  AccountStatus,
} from '../bank.types.js';

/**
 * Data Mapper pattern:
 * Maps account records and their holder/branch relationships.
 * Repository classes perform queries; services apply business rules.
 */
@Entity({ name: 'bank_accounts', schema: 'public' })
export class BankAccount {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({
    name: 'account_number',
    type: 'varchar',
    length: 32,
    unique: true,
  })
  accountNumber!: string;

  @Column({ name: 'account_holder_id', type: 'uuid' })
  accountHolderId!: string;

  @ManyToOne(() => AccountHolder, {
    nullable: false,
    onDelete: 'RESTRICT',
    cascade: false,
    eager: false,
  })
  @JoinColumn({ name: 'account_holder_id' })
  accountHolder?: Relation<AccountHolder>;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => Branch, {
    nullable: false,
    onDelete: 'RESTRICT',
    cascade: false,
    eager: false,
  })
  @JoinColumn({ name: 'branch_id' })
  branch?: Relation<Branch>;

  @Column({ name: 'account_type', type: 'text' })
  accountType!: AccountType;

  // Purpose describes the account; it does not grant debit authority.
  @Column({ name: 'account_purpose', type: 'text' })
  accountPurpose!: AccountPurpose;

  @Column({
    type: 'char',
    length: 3,
    default: 'INR',
  })
  currency!: 'INR';

  @Column({
    type: 'text',
    default: 'ACTIVE',
  })
  status!: AccountStatus;

  // Preserve BIGINT precision. Use BigInt() for arithmetic, not Number().
  @Column({
    name: 'balance_paise',
    type: 'bigint',
    default: '0',
  })
  balancePaise!: string;

  @Column({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    insert: false,
    update: false,
  })
  createdAt!: Date;

  @Column({
    name: 'updated_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    insert: false,
    update: false,
  })
  updatedAt!: Date;
}
