import { Column, Entity, PrimaryColumn } from 'typeorm';

import type { JsonObject, SimulationScenario } from '../bank.types.js';

@Entity({ name: 'simulation_rules', schema: 'public' })
export class SimulationRule {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'client_id', type: 'varchar', length: 100 })
  clientId!: string;

  @Column({ name: 'client_request_id', type: 'varchar', length: 128 })
  clientRequestId!: string;

  @Column({ type: 'text' })
  scenario!: SimulationScenario;

  @Column({
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  parameters!: JsonObject;

  @Column({ name: 'created_by', type: 'varchar', length: 100 })
  createdBy!: string;

  @Column({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    insert: false,
    update: false,
  })
  createdAt!: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'consumed_at', type: 'timestamptz', nullable: true })
  consumedAt!: Date | null;

  @Column({ name: 'resumed_at', type: 'timestamptz', nullable: true })
  resumedAt!: Date | null;

  @Column({ name: 'resumed_by', type: 'varchar', length: 100, nullable: true })
  resumedBy!: string | null;
}
