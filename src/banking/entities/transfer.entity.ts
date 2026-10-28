import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import type { Relation } from 'typeorm';

import type { BankCode } from '../../database/bank-code.js';
import type {
  ApprovalStatus,
  SimulationScenario,
  TransferPurpose,
  TransferRecordSide,
  TransferStage,
  TransferStatus,
} from '../bank.types.js';

import { BankAccount } from './bank-account.entity.js';
import { AccountHolder } from './account-holder.entity.js';

@Entity({ name: 'transfers', schema: 'public' })
export class Transfer {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'network_transfer_id', type: 'uuid' })
  networkTransferId!: string;

  @Column({ name: 'local_bank', type: 'text' })
  localBank!: BankCode;

  @Column({ name: 'record_side', type: 'text' })
  recordSide!: TransferRecordSide;

  @Column({ name: 'client_id', type: 'varchar', length: 100 })
  clientId!: string;

  @Column({ name: 'client_request_id', type: 'varchar', length: 128 })
  clientRequestId!: string;

  @Column({ name: 'request_fingerprint', type: 'char', length: 64 })
  requestFingerprint!: string;

  @Column({ type: 'text' })
  purpose!: TransferPurpose;

  @Column({ name: 'source_bank', type: 'text' })
  sourceBank!: BankCode;

  @Column({ name: 'destination_bank', type: 'text' })
  destinationBank!: BankCode;

  @Column({ name: 'source_account_id', type: 'uuid', nullable: true })
  sourceAccountId!: string | null;

  @Column({ name: 'destination_account_id', type: 'uuid', nullable: true })
  destinationAccountId!: string | null;

  @Column({ name: 'source_account_number', type: 'varchar', length: 32 })
  sourceAccountNumber!: string;

  @Column({ name: 'destination_account_number', type: 'varchar', length: 32 })
  destinationAccountNumber!: string;

  @Column({ name: 'source_ifsc', type: 'varchar', length: 11 })
  sourceIfsc!: string;

  @Column({ name: 'destination_ifsc', type: 'varchar', length: 11 })
  destinationIfsc!: string;

  @Column({
    name: 'expected_source_owner_taxID_ref',
    type: 'varchar',
    length: 100,
  })
  expectedSourceOwnerTaxIdRef!: string;

  @Column({
    name: 'expected_destination_owner_taxID_ref',
    type: 'varchar',
    length: 100,
  })
  expectedDestinationOwnerTaxIdRef!: string;

  @Column({ name: 'approval_status', type: 'text' })
  approvalStatus!: ApprovalStatus;

  @Column({
    name: 'approval_requested_at',
    type: 'timestamptz',
    nullable: true,
  })
  approvalRequestedAt!: Date | null;

  @Column({ name: 'request_expires_at', type: 'timestamptz', nullable: true })
  requestExpiresAt!: Date | null;

  @Column({
    name: 'otp_digest',
    type: 'char',
    length: 64,
    nullable: true,
    select: false,
  })
  otpDigest!: string | null;

  @Column({
    name: 'otp_nonce',
    type: 'uuid',
    nullable: true,
    select: false,
  })
  otpNonce!: string | null;

  @Column({ name: 'otp_key_id', type: 'varchar', length: 100, nullable: true })
  otpKeyId!: string | null;

  @Column({ name: 'otp_expires_at', type: 'timestamptz', nullable: true })
  otpExpiresAt!: Date | null;

  @Column({ name: 'otp_failed_attempts', type: 'integer', default: 0 })
  otpFailedAttempts!: number;

  @Column({ name: 'otp_generation', type: 'integer', default: 0 })
  otpGeneration!: number;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt!: Date | null;

  @Column({ name: 'approved_by_holder_id', type: 'uuid', nullable: true })
  approvedByHolderId!: string | null;

  // Use BigInt(amountPaise) for arithmetic, never Number(amountPaise).
  @Column({ name: 'amount_paise', type: 'bigint' })
  amountPaise!: string;

  @Column({ type: 'char', length: 3, default: 'INR' })
  currency!: 'INR';

  @Column({ type: 'text' })
  status!: TransferStatus;

  @Column({ type: 'text' })
  stage!: TransferStage;

  @Column({ name: 'failure_code', type: 'varchar', length: 64, nullable: true })
  failureCode!: string | null;

  @Column({
    name: 'last_error_code',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  lastErrorCode!: string | null;

  @Column({ name: 'simulation_scenario', type: 'text', default: 'NORMAL' })
  simulationScenario!: SimulationScenario;

  @Column({
    name: 'callback_destination_key',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  callbackDestinationKey!: string | null;

  @Column({ name: 'debit_applied_at', type: 'timestamptz', nullable: true })
  debitAppliedAt!: Date | null;

  @Column({ name: 'credit_applied_at', type: 'timestamptz', nullable: true })
  creditAppliedAt!: Date | null;

  @Column({ name: 'refunded_at', type: 'timestamptz', nullable: true })
  refundedAt!: Date | null;

  @Column({ name: 'recovery_attempts', type: 'integer', default: 0 })
  recoveryAttempts!: number;

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

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @ManyToOne(() => BankAccount, {
    nullable: true,
    onDelete: 'RESTRICT',
    onUpdate: 'NO ACTION',
    cascade: false,
    eager: false,
  })
  @JoinColumn({
    name: 'source_account_id',
    foreignKeyConstraintName: 'fk_transfers_source_account_id',
  })
  sourceAccount?: Relation<BankAccount> | null;

  @ManyToOne(() => BankAccount, {
    nullable: true,
    onDelete: 'RESTRICT',
    onUpdate: 'NO ACTION',
    cascade: false,
    eager: false,
  })
  @JoinColumn({
    name: 'destination_account_id',
    foreignKeyConstraintName: 'fk_transfers_destination_account_id',
  })
  destinationAccount?: Relation<BankAccount> | null;

  @ManyToOne(() => AccountHolder, {
    nullable: true,
    onDelete: 'RESTRICT',
    onUpdate: 'NO ACTION',
    cascade: false,
    eager: false,
  })
  @JoinColumn({
    name: 'approved_by_holder_id',
    foreignKeyConstraintName: 'fk_transfers_approved_by_holder_id',
  })
  approvedByHolder?: Relation<AccountHolder> | null;
}
