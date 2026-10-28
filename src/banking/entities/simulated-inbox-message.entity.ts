import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import type { Relation } from 'typeorm';

import { AccountHolder } from './account-holder.entity.js';
import { Transfer } from './transfer.entity.js';

@Entity({ name: 'simulated_inbox_messages', schema: 'public' })
export class SimulatedInboxMessage {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'recipient_holder_id', type: 'uuid' })
  recipientHolderId!: string;

  @Column({ name: 'transfer_id', type: 'uuid' })
  transferId!: string;

  @Column({ name: 'otp_generation', type: 'integer' })
  otpGeneration!: number;

  @Column({
    name: 'message_type',
    type: 'text',
    default: 'TRANSFER_APPROVAL',
  })
  messageType!: 'TRANSFER_APPROVAL';

  @Column({ name: 'message_body', type: 'text' })
  messageBody!: string;

  @Column({
    name: 'test_otp',
    type: 'varchar',
    length: 6,
    nullable: true,
    select: false,
  })
  testOtp!: string | null;

  @Column({
    name: 'mobile_number_snapshot',
    type: 'varchar',
    length: 32,
  })
  mobileNumberSnapshot!: string;

  @Column({
    name: 'email_snapshot',
    type: 'varchar',
    length: 254,
  })
  emailSnapshot!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt!: Date | null;

  @Column({ name: 'consumed_at', type: 'timestamptz', nullable: true })
  consumedAt!: Date | null;

  @Column({ name: 'superseded_at', type: 'timestamptz', nullable: true })
  supersededAt!: Date | null;

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

  @ManyToOne(() => AccountHolder, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'NO ACTION',
    cascade: false,
    eager: false,
  })
  @JoinColumn({
    name: 'recipient_holder_id',
    foreignKeyConstraintName: 'fk_simulated_inbox_messages_recipient_holder_id',
  })
  recipientHolder?: Relation<AccountHolder>;

  @ManyToOne(() => Transfer, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'NO ACTION',
    cascade: false,
    eager: false,
  })
  @JoinColumn({
    name: 'transfer_id',
    foreignKeyConstraintName: 'fk_simulated_inbox_messages_transfer_id',
  })
  transfer?: Relation<Transfer>;
}
