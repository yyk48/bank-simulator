import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import type { Relation } from 'typeorm';

import type {
  CallbackDeliveryStatus,
  JsonObject,
} from '../../banking/bank.types.js';
import { Transfer } from '../../banking/entities/transfer.entity.js';

@Entity({ name: 'callback_events', schema: 'public' })
export class CallbackEvent {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'transfer_id', type: 'uuid' })
  transferId!: string;

  @Column({
    name: 'event_type',
    type: 'text',
    default: 'transfer.completed',
  })
  eventType!: 'transfer.completed';

  @Column({ name: 'destination_key', type: 'varchar', length: 100 })
  destinationKey!: string;

  @Column({ type: 'jsonb' })
  payload!: JsonObject;

  @Column({ name: 'delivery_status', type: 'text', default: 'PENDING' })
  deliveryStatus!: CallbackDeliveryStatus;

  @Column({ name: 'attempt_count', type: 'integer', default: 0 })
  attemptCount!: number;

  @Column({ name: 'next_attempt_at', type: 'timestamptz', nullable: true })
  nextAttemptAt!: Date | null;

  @Column({ name: 'lease_token', type: 'uuid', nullable: true })
  leaseToken!: string | null;

  @Column({ name: 'lease_expires_at', type: 'timestamptz', nullable: true })
  leaseExpiresAt!: Date | null;

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

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt!: Date | null;

  @OneToOne(() => Transfer, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'NO ACTION',
    cascade: false,
    eager: false,
  })
  @JoinColumn({
    name: 'transfer_id',
    foreignKeyConstraintName: 'fk_callback_events_transfer_id',
  })
  transfer?: Relation<Transfer>;
}
