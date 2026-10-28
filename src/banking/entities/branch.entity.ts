import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { BankCode } from '../../database/bank-code.js';

/**
 * Data Mapper pattern:
 * Maps branch records to the existing migration-managed table.
 */
@Entity({ name: 'branches', schema: 'public' })
export class Branch {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  // The bank-specific default and CHECK remain in the migration.
  @Column({ name: 'bank_code', type: 'text' })
  bankCode!: BankCode;

  @Column({ name: 'branch_name', type: 'text' })
  branchName!: string;

  @Column({
    name: 'ifsc_code',
    type: 'varchar',
    length: 11,
    unique: true,
  })
  ifscCode!: string;

  @Column({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    insert: false,
    update: false,
  })
  createdAt!: Date;

  // Maintained by the existing PostgreSQL update trigger.
  @Column({
    name: 'updated_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    insert: false,
    update: false,
  })
  updatedAt!: Date;
}
