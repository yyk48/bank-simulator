import { Column, Entity, PrimaryColumn } from 'typeorm';

import type { HolderType } from '../bank.types.js';

/**
 * Data Mapper pattern:
 * Maps holder identity and contact fields to the existing table.
 * Contact details belong to the holder, rather than each bank account.
 */
@Entity({ name: 'account_holders', schema: 'public' })
export class AccountHolder {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'holder_name', type: 'text' })
  holderName!: string;

  @Column({
    name: 'owner_taxID_ref',
    type: 'varchar',
    length: 100,
    unique: true,
  })
  ownerTaxIdRef!: string;

  @Column({ name: 'holder_type', type: 'text' })
  holderType!: HolderType;

  @Column({
    name: 'mobile_number',
    type: 'varchar',
    length: 32,
  })
  mobileNumber!: string;

  @Column({
    name: 'email',
    type: 'varchar',
    length: 254,
  })
  email!: string;

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
