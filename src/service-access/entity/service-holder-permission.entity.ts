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

@Entity({
  name: 'service_holder_permissions',
  schema: 'public',
})
@Unique('service_holder_permissions_client_holder_unique', [
  'clientCode',
  'accountHolderId',
])
@Index('service_holder_permissions_holder_idx', ['accountHolderId'])
@Check(
  'service_holder_permissions_client_code_check',
  `"client_code" ~ '^[A-Za-z0-9][A-Za-z0-9_-]*$'`,
)
export class ServiceHolderPermission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'client_code', type: 'text' })
  clientCode!: string;

  @Column({ name: 'account_holder_id', type: 'uuid' })
  accountHolderId!: string;

  @Column({ type: 'boolean', default: false })
  enabled!: boolean;

  @ManyToOne(() => AccountHolder, {
    nullable: false,
    onDelete: 'RESTRICT',
    cascade: false,
    eager: false,
  })
  @JoinColumn({ name: 'account_holder_id' })
  accountHolder?: Relation<AccountHolder>;
}
